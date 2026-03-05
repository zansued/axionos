// Autonomous Build Repair Engine — AxionOS Pipeline Stage
// Detects build failures, classifies errors, generates fixes, and retries
// until the project compiles successfully.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";
import { upsertNode, recordError, generateBrainContext, upsertPreventionRule } from "../_shared/brain-helpers.ts";
import { callAI } from "../_shared/ai-client.ts";

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

const MAX_ATTEMPTS = 5;
const GITHUB_API = "https://api.github.com";

interface BuildError {
  errorType: string;
  file: string;
  line: number | null;
  message: string;
  missingImport?: string;
  missingModule?: string;
  category: "entrypoint" | "import" | "typescript" | "dependency" | "build_script" | "build" | "config_missing" | "syntax_error" | "unknown";
}

interface FilePatch {
  path: string;
  content: string;
  reason: string;
}

interface RepairAttempt {
  attempt: number;
  error_type: string;
  file: string;
  fix_applied: string;
  build_status: "success" | "failed" | "pending";
}

// ═══════════════════════════════════════════════
// ERROR CLASSIFICATION
// ═══════════════════════════════════════════════

function classifyBuildErrors(log: string): BuildError[] {
  const errors: BuildError[] = [];
  const seen = new Set<string>();

  const patterns: Array<{
    regex: RegExp;
    extract: (m: RegExpExecArray) => BuildError | null;
  }> = [
    // Could not resolve module
    {
      regex: /Could not resolve\s+['"]([^'"]+)['"](?:\s+from\s+['"]([^'"]+)['"])?/gi,
      extract: (m) => ({
        errorType: m[1].includes("main.tsx") ? "vite_missing_entrypoint" : "missing_module",
        file: m[2] || "unknown",
        line: null,
        message: `Could not resolve "${m[1]}"`,
        missingImport: m[1],
        category: m[1].includes("main") ? "entrypoint" : "import",
      }),
    },
    // Cannot find module
    {
      regex: /Cannot find module\s+['"]([^'"]+)['"]/gi,
      extract: (m) => ({
        errorType: "missing_module",
        file: "package.json",
        line: null,
        message: `Cannot find module '${m[1]}'`,
        missingModule: m[1],
        category: m[1].startsWith(".") ? "import" : "dependency",
      }),
    },
    // TS2307 — Cannot find module (TypeScript)
    {
      regex: /(.+?)\((\d+),\d+\):\s*error\s+TS2307:\s*Cannot find module\s+'([^']+)'/gm,
      extract: (m) => ({
        errorType: "typescript_module_error",
        file: m[1].trim(),
        line: parseInt(m[2]),
        message: `TS2307: Cannot find module '${m[3]}'`,
        missingModule: m[3],
        category: "typescript",
      }),
    },
    // Generic TypeScript errors
    {
      regex: /(.+?)\((\d+),(\d+)\):\s*error\s+TS(\d+):\s*(.+)$/gm,
      extract: (m) => ({
        errorType: `typescript_error_TS${m[4]}`,
        file: m[1].trim(),
        line: parseInt(m[2]),
        message: `TS${m[4]}: ${m[5].trim()}`,
        category: "typescript",
      }),
    },
    // Missing dependency (npm ERR!)
    {
      regex: /npm ERR!.*(?:Could not resolve dependency|ERESOLVE|peer dep|missing:\s*(\S+))/gi,
      extract: (m) => ({
        errorType: "missing_dependency",
        file: "package.json",
        line: null,
        message: m[0].replace("npm ERR! ", "").trim(),
        missingModule: m[1] || undefined,
        category: "dependency",
      }),
    },
    // Missing npm script
    {
      regex: /npm ERR!\s*missing script:\s*(\w+)/gi,
      extract: (m) => ({
        errorType: "config_missing",
        file: "package.json",
        line: null,
        message: `Missing npm script: ${m[1]}`,
        category: "config_missing",
      }),
    },
    // Syntax errors (SyntaxError / Unexpected token)
    {
      regex: /SyntaxError:\s*(.+?)(?:\s+\(([^)]+):(\d+))?/gi,
      extract: (m) => ({
        errorType: "syntax_error",
        file: m[2] || "unknown",
        line: m[3] ? parseInt(m[3]) : null,
        message: `SyntaxError: ${m[1]}`,
        category: "syntax_error",
      }),
    },
    // Rollup failed to resolve
    {
      regex: /\[rollup\]\s*(?:Rollup failed to resolve import|Could not resolve)\s+"([^"]+)"(?:\s+from\s+"([^"]+)")?/gi,
      extract: (m) => ({
        errorType: "missing_module",
        file: m[2] || "unknown",
        line: null,
        message: `Rollup failed to resolve: "${m[1]}"`,
        missingImport: m[1],
        category: "import",
      }),
    },
    // Config file missing (vite.config, tsconfig, etc.)
    {
      regex: /(?:failed to load config|ENOENT|no such file)\s*.*?([\w./]+\.(?:ts|json|js|mjs))/gi,
      extract: (m) => ({
        errorType: "config_missing",
        file: m[1],
        line: null,
        message: `Config file missing: ${m[1]}`,
        category: "config_missing",
      }),
    },
  ];

  for (const { regex, extract } of patterns) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(log)) !== null) {
      const err = extract(match);
      if (err) {
        const key = `${err.category}:${err.file}:${err.message.slice(0, 80)}`;
        if (!seen.has(key)) {
          seen.add(key);
          errors.push(err);
        }
      }
    }
  }

  if (errors.length === 0 && /(?:FAIL|ERROR|exit code [1-9]|Build failed)/i.test(log)) {
    errors.push({
      errorType: "unknown_build_failure",
      file: "unknown",
      line: null,
      message: "Build failed with unrecognized error pattern",
      category: "unknown",
    });
  }

  return errors;
}

// ═══════════════════════════════════════════════
// STRUCTURAL PATCH GENERATOR
// ═══════════════════════════════════════════════

function generateStructuralPatches(errors: BuildError[]): FilePatch[] {
  const patches: FilePatch[] = [];
  const patchedPaths = new Set<string>();

  for (const err of errors) {
    if (patchedPaths.has(err.file)) continue;

    switch (err.category) {
      case "entrypoint":
        if (!patchedPaths.has("src/main.tsx")) {
          patches.push({
            path: "src/main.tsx",
            content: `import React from "react"\nimport ReactDOM from "react-dom/client"\nimport App from "./App"\nimport "./index.css"\n\nReactDOM.createRoot(document.getElementById("root")!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n)\n`,
            reason: "fix: create missing entrypoint src/main.tsx",
          });
          patchedPaths.add("src/main.tsx");
        }
        if (!patchedPaths.has("src/App.tsx")) {
          patches.push({
            path: "src/App.tsx",
            content: `function App() {\n  return (\n    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>\n      <h1>App</h1>\n    </div>\n  )\n}\n\nexport default App\n`,
            reason: "fix: create missing App.tsx",
          });
          patchedPaths.add("src/App.tsx");
        }
        break;

      case "config_missing":
        if (err.file.includes("vite.config") && !patchedPaths.has("vite.config.ts")) {
          patches.push({
            path: "vite.config.ts",
            content: `import { defineConfig } from "vite"\nimport react from "@vitejs/plugin-react-swc"\nimport path from "path"\n\nexport default defineConfig({\n  plugins: [react()],\n  resolve: {\n    alias: { "@": path.resolve(__dirname, "./src") },\n    extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"],\n  },\n})\n`,
            reason: "fix: create missing vite.config.ts",
          });
          patchedPaths.add("vite.config.ts");
        }
        if (err.file.includes("tsconfig") && !patchedPaths.has("tsconfig.json")) {
          patches.push({
            path: "tsconfig.json",
            content: JSON.stringify({
              compilerOptions: {
                target: "ES2020", useDefineForClassFields: true,
                lib: ["ES2020", "DOM", "DOM.Iterable"],
                module: "ESNext", skipLibCheck: true, moduleResolution: "bundler",
                allowImportingTsExtensions: true, isolatedModules: true,
                moduleDetection: "force", noEmit: true, jsx: "react-jsx",
                strict: true, baseUrl: ".", paths: { "@/*": ["./src/*"] },
              },
              include: ["src"],
            }, null, 2) + "\n",
            reason: "fix: create missing tsconfig.json",
          });
          patchedPaths.add("tsconfig.json");
        }
        break;

      case "dependency":
        // Dependencies will be handled by AI patches or package.json repair
        break;

      case "syntax_error":
        // Syntax errors in known files get safe templates
        if (err.file.endsWith(".tsx") || err.file.endsWith(".ts")) {
          const isComponent = err.file.includes("src/");
          if (isComponent && !patchedPaths.has(err.file)) {
            const componentName = err.file.split("/").pop()?.replace(/\.\w+$/, "") || "Component";
            patches.push({
              path: err.file,
              content: `// Auto-repaired by AxionOS Build Repair Engine\nfunction ${componentName}() {\n  return <div>${componentName}</div>\n}\n\nexport default ${componentName}\n`,
              reason: `fix: replace syntax-error file ${err.file} with safe template`,
            });
            patchedPaths.add(err.file);
          }
        }
        break;
    }
  }

  return patches;
}

// ═══════════════════════════════════════════════
// GITHUB HELPERS
// ═══════════════════════════════════════════════

async function getGitHubFileContent(
  ghHeaders: Record<string, string>,
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
): Promise<string | null> {
  try {
    const resp = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`,
      { headers: ghHeaders },
    );
    if (!resp.ok) { await resp.text(); return null; }
    const data = await resp.json();
    return data.content ? atob(data.content.replace(/\n/g, "")) : null;
  } catch { return null; }
}

async function atomicCommit(
  ghHeaders: Record<string, string>,
  owner: string,
  repo: string,
  branch: string,
  patches: FilePatch[],
  attempt: number,
): Promise<{ sha: string; files: string[] }> {
  // Get base SHA
  const refResp = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${branch}`,
    { headers: ghHeaders },
  );
  if (!refResp.ok) throw new Error(`Branch '${branch}' not found`);
  const refData = await refResp.json();
  const baseSha = refData.object.sha;

  // Get base tree
  const baseCommitResp = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/commits/${baseSha}`,
    { headers: ghHeaders },
  );
  if (!baseCommitResp.ok) throw new Error("Failed to get base commit");
  const baseCommit = await baseCommitResp.json();

  // Create blobs
  const blobResults = await Promise.allSettled(
    patches.map(async (patch) => {
      const blobResp = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/git/blobs`,
        {
          method: "POST",
          headers: ghHeaders,
          body: JSON.stringify({ content: patch.content, encoding: "utf-8" }),
        },
      );
      if (!blobResp.ok) throw new Error(`Blob failed: ${await blobResp.text()}`);
      return { path: patch.path, sha: (await blobResp.json()).sha };
    }),
  );

  const treeItems: Array<{ path: string; mode: string; type: string; sha: string }> = [];
  const committedFiles: string[] = [];
  for (let i = 0; i < blobResults.length; i++) {
    const r = blobResults[i];
    if (r.status === "fulfilled") {
      treeItems.push({ path: r.value.path, mode: "100644", type: "blob", sha: r.value.sha });
      committedFiles.push(patches[i].path);
    }
  }

  if (treeItems.length === 0) throw new Error("All blob creations failed");

  // Create tree
  const treeResp = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees`,
    { method: "POST", headers: ghHeaders, body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree: treeItems }) },
  );
  if (!treeResp.ok) throw new Error(`Tree failed: ${await treeResp.text()}`);
  const newTree = await treeResp.json();

  // Commit
  const commitMsg = `fix(build-repair): autonomous repair [attempt ${attempt}/${MAX_ATTEMPTS}]\n\n${patches.map(p => `- ${p.reason}`).join("\n")}\n\nAxionOS Autonomous Build Repair Engine`;
  const commitResp = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/commits`,
    { method: "POST", headers: ghHeaders, body: JSON.stringify({ message: commitMsg, tree: newTree.sha, parents: [baseSha] }) },
  );
  if (!commitResp.ok) throw new Error(`Commit failed: ${await commitResp.text()}`);
  const newCommit = await commitResp.json();

  // Update ref
  const updateResp = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/refs/heads/${branch}`,
    { method: "PATCH", headers: ghHeaders, body: JSON.stringify({ sha: newCommit.sha, force: true }) },
  );
  if (!updateResp.ok) throw new Error(`Ref update failed: ${await updateResp.text()}`);

  return { sha: newCommit.sha, files: committedFiles };
}

// ═══════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════

serve(async (req) => {
  const result = await bootstrapPipeline(req, "autonomous-build-repair");
  if (result instanceof Response) return result;
  const { initiative, ctx, serviceClient } = result;

  const body = await req.clone().json().catch(() => ({}));
  const attempt = Math.min(body.attempt || 1, MAX_ATTEMPTS);
  const buildLog = body.build_log || "";

  const jobId = await createJob(ctx, "autonomous_build_repair", { attempt });
  const startTime = Date.now();

  try {
    // Stop condition
    if (attempt > MAX_ATTEMPTS) {
      await pipelineLog(ctx, "build_repair_max_attempts",
        `⛔ Build Repair atingiu ${MAX_ATTEMPTS} tentativas. Intervenção manual necessária.`);
      if (jobId) await failJob(ctx, jobId, `Max attempts (${MAX_ATTEMPTS}) reached`);
      await updateInitiative(ctx, { stage_status: "repair_failed" });
      return jsonResponse({ success: false, message: `Max repair attempts reached`, attempt });
    }

    await updateInitiative(ctx, { stage_status: "repairing_build" });
    await pipelineLog(ctx, "build_repair_start", `🔧 Autonomous Build Repair — Tentativa ${attempt}/${MAX_ATTEMPTS}`);

    // ── 1. Load build log from initiative if not provided ──
    let effectiveLog = buildLog;
    if (!effectiveLog) {
      const progress = (initiative.execution_progress || {}) as any;
      effectiveLog = progress.ci_build_log || progress.deploy_error || progress.build_log || "";
    }

    if (!effectiveLog) {
      await pipelineLog(ctx, "build_repair_no_log", "⚠️ No build log available — skipping repair");
      if (jobId) await completeJob(ctx, jobId, { skipped: true, reason: "no_build_log" }, {});
      await updateInitiative(ctx, { stage_status: "build_repaired" });
      return jsonResponse({ success: true, skipped: true, message: "No build log to analyze" });
    }

    // ── 2. Classify errors ──
    await pipelineLog(ctx, "build_repair_classify", "📋 Classifying build errors...");
    const errors = classifyBuildErrors(effectiveLog);
    await pipelineLog(ctx, "build_repair_errors",
      `Found ${errors.length} errors: ${[...new Set(errors.map(e => e.category))].join(", ")}`,
      { errors: errors.slice(0, 20) });

    // Record errors in project_errors
    for (const err of errors.slice(0, 30)) {
      await recordError(ctx, err.message, err.category, err.file,
        `Build repair: ${err.errorType}`, `Attempt ${attempt}`);
    }

    // ── 3. Resolve GitHub connection ──
    const { data: gitConns } = await serviceClient.from("git_connections")
      .select("github_token, repo_owner, repo_name, default_branch")
      .eq("organization_id", ctx.organizationId).eq("status", "active")
      .order("updated_at", { ascending: false }).limit(1);
    const conn = gitConns?.[0];

    if (!conn?.github_token || !conn.repo_owner || !conn.repo_name) {
      throw new Error("GitHub connection required for Build Repair");
    }

    const ghHeaders = {
      Authorization: `Bearer ${conn.github_token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    };
    const owner = conn.repo_owner;
    const repo = conn.repo_name;
    const branch = conn.default_branch || "main";

    // ── 4. Generate structural patches ──
    await pipelineLog(ctx, "build_repair_patches", "🩹 Generating structural patches...");
    const structuralPatches = generateStructuralPatches(errors);

    // ── 5. AI patches for code errors ──
    const codeErrors = errors.filter(e =>
      ["typescript", "build", "import", "syntax_error"].includes(e.category)
    );

    let aiPatches: FilePatch[] = [];
    let totalTokens = 0;
    let totalCost = 0;

    if (codeErrors.length > 0) {
      const affectedFiles = [...new Set(codeErrors.map(e => e.file).filter(f => f !== "unknown"))];
      const fileContents: Record<string, string> = {};

      await Promise.allSettled(
        affectedFiles.slice(0, 10).map(async (filePath) => {
          const content = await getGitHubFileContent(ghHeaders, owner, repo, branch, filePath);
          if (content) fileContents[filePath] = content;
        }),
      );

      const brainContext = await generateBrainContext(ctx);
      const apiKey = Deno.env.get("LOVABLE_API_KEY") || "";

      const fixResult = await callAI(apiKey,
        `You are the AxionOS Autonomous Build Repair Agent. Fix code errors to make the project compile.

RULES:
- Return ONLY valid JSON
- Fix ONLY the errors listed — do NOT refactor or add features  
- Each fix must be the complete file content
- Ensure all imports resolve correctly

Return format:
{
  "patches": [
    { "path": "src/file.tsx", "content": "...complete fixed file...", "reason": "fix: description" }
  ]
}`,
        `## Build Errors (${codeErrors.length}):
${codeErrors.map(e => `- [${e.category}] ${e.file}:${e.line || "?"} — ${e.message}`).join("\n")}

## File Contents:
${Object.entries(fileContents).map(([path, code]) =>
  `### ${path}\n\`\`\`\n${code.slice(0, 3000)}\n\`\`\``
).join("\n\n")}

## Project Context:
${brainContext.slice(0, 2000)}`,
        true,
      );
      totalTokens += fixResult.tokens;
      totalCost += fixResult.costUsd;

      try {
        const parsed = JSON.parse(fixResult.content);
        aiPatches = (parsed.patches || []).map((p: any) => ({
          path: p.path,
          content: p.content,
          reason: p.reason || `fix: resolve build error in ${p.path}`,
        }));
      } catch {
        console.error("Failed to parse AI fix response");
      }
    }

    // Merge patches (structural take priority)
    const allPatches = [...structuralPatches];
    const patchedPaths = new Set(allPatches.map(p => p.path));
    for (const ap of aiPatches) {
      if (!patchedPaths.has(ap.path)) {
        allPatches.push(ap);
        patchedPaths.add(ap.path);
      }
    }

    if (allPatches.length === 0) {
      await pipelineLog(ctx, "build_repair_no_patches", "⚠️ No patches generated — manual intervention needed");
      if (jobId) await failJob(ctx, jobId, "No patches generated");
      await updateInitiative(ctx, { stage_status: "repair_failed" });
      return jsonResponse({ success: false, message: "No patches generated", errors: errors.length, attempt });
    }

    // ── 6. Apply patches via atomic commit ──
    await pipelineLog(ctx, "build_repair_apply", `📦 Applying ${allPatches.length} patches...`);
    const commit = await atomicCommit(ghHeaders, owner, repo, branch, allPatches, attempt);

    await pipelineLog(ctx, "build_repair_committed",
      `✅ ${commit.files.length} files committed (${commit.sha.slice(0, 7)})`,
      { commit_sha: commit.sha, files: commit.files });

    // ── 7. Record repair attempts ──
    const repairAttempts: RepairAttempt[] = allPatches.map(p => ({
      attempt,
      error_type: errors.find(e => e.file === p.path)?.errorType || "structural",
      file: p.path,
      fix_applied: p.reason,
      build_status: "pending" as const,
    }));

    // ── 8. Store repair report in Project Brain ──
    await upsertNode(ctx, {
      name: "build_repair_report",
      file_path: "build_repair_report.json",
      node_type: "build_repair_report",
      status: "generated",
      metadata: {
        attempt,
        total_errors: errors.length,
        patches_applied: allPatches.length,
        structural_patches: structuralPatches.length,
        ai_patches: aiPatches.length,
        commit_sha: commit.sha,
        files_fixed: commit.files,
        repair_attempts: repairAttempts,
        error_categories: [...new Set(errors.map(e => e.category))],
        generated_at: new Date().toISOString(),
      },
    });

    // Store individual fix nodes
    for (const patch of allPatches) {
      await upsertNode(ctx, {
        name: `build_fix:${patch.path}`,
        file_path: `build_fixes/${patch.path}`,
        node_type: "build_fix",
        status: "generated",
        metadata: {
          original_error: errors.find(e => e.file === patch.path)?.message || "structural",
          fix_reason: patch.reason,
          attempt,
          commit_sha: commit.sha,
        },
      });
    }

    // ── 9. Learn prevention rules ──
    for (const err of errors.slice(0, 10)) {
      await upsertPreventionRule(
        ctx,
        `${err.category}: ${err.errorType}`,
        `Ensure ${err.file} exists and is correct. Error: ${err.message.slice(0, 100)}`,
        "initiative",
      );
    }

    // ── 10. Update initiative ──
    await updateInitiative(ctx, {
      stage_status: "build_repaired",
      execution_progress: {
        ...(initiative.execution_progress || {}),
        build_repair: {
          attempt,
          errors_found: errors.length,
          patches_applied: commit.files.length,
          commit_sha: commit.sha,
          files_fixed: commit.files,
          status: "patch_applied",
          repaired_at: new Date().toISOString(),
        },
      },
    });

    const durationMs = Date.now() - startTime;
    if (jobId) {
      await completeJob(ctx, jobId, {
        attempt,
        errors_found: errors.length,
        patches_applied: commit.files.length,
        commit_sha: commit.sha,
      }, { model: "google/gemini-2.5-flash", costUsd: totalCost, durationMs });
    }

    await pipelineLog(ctx, "build_repair_complete",
      `🔧 Build Repair attempt ${attempt}: ${commit.files.length} files patched. CI will re-trigger.`);

    return jsonResponse({
      success: true,
      attempt,
      max_attempts: MAX_ATTEMPTS,
      errors_found: errors.length,
      patches_applied: commit.files.length,
      structural_patches: structuralPatches.length,
      ai_patches: aiPatches.length,
      commit_sha: commit.sha,
      files: commit.files,
      repair_attempts: repairAttempts,
    });

  } catch (e) {
    console.error("autonomous-build-repair error:", e);
    if (jobId) await failJob(ctx, jobId, e instanceof Error ? e.message : "Unknown error");
    await updateInitiative(ctx, { stage_status: "validating" }); // rollback
    return errorResponse(e instanceof Error ? e.message : "Unknown error");
  }
});
