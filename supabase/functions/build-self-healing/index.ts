import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";
import { recordError, generateBrainContext, upsertPreventionRule } from "../_shared/brain-helpers.ts";
import type { PipelineContext } from "../_shared/pipeline-helpers.ts";

/**
 * Build Self-Healing Pipeline — AxionOS
 *
 * Autonomous build repair system that detects, analyzes, and fixes
 * build errors from CI/CD (Vite, TypeScript, npm, Rollup).
 *
 * Pipeline:
 *   1. Parse CI logs → classify errors
 *   2. Inspect project structure on GitHub
 *   3. Generate structural + AI patches
 *   4. Commit fixes directly to main
 *   5. Re-trigger build (loop up to MAX_ATTEMPTS)
 *
 * Input: { initiative_id, organization_id, build_log, attempt }
 */

const MAX_ATTEMPTS = 5;
const GITHUB_API = "https://api.github.com";

// ═══════════════════════════════════════════════
// ERROR CLASSIFICATION
// ═══════════════════════════════════════════════

interface BuildError {
  errorType: string;
  file: string;
  line: number | null;
  message: string;
  missingImport?: string;
  missingModule?: string;
  category: "entrypoint" | "import" | "typescript" | "dependency" | "build_script" | "build" | "unknown";
}

function parseBuildErrors(log: string): BuildError[] {
  const errors: BuildError[] = [];
  const seen = new Set<string>();

  const patterns: Array<{
    regex: RegExp;
    extract: (m: RegExpExecArray) => BuildError | null;
  }> = [
    // Vite entrypoint — "Could not resolve './src/main.tsx' from index.html"
    {
      regex: /Could not resolve\s+['"]\.?\/?(src\/main\.tsx?)['"](?:\s+from\s+['"]([^'"]+)['"])?/gi,
      extract: (m) => ({
        errorType: "vite_missing_entrypoint",
        file: m[1] || "src/main.tsx",
        line: null,
        message: `Vite entrypoint missing: ${m[1] || "src/main.tsx"} (from ${m[2] || "index.html"})`,
        missingImport: m[1] || "src/main.tsx",
        category: "entrypoint",
      }),
    },
    // Rollup failed to resolve import (generic)
    {
      regex: /\[rollup\]\s*(?:Rollup failed to resolve import|Could not resolve)\s+"([^"]+)"(?:\s+from\s+"([^"]+)")?/gi,
      extract: (m) => ({
        errorType: "missing_import",
        file: m[2] || "unknown",
        line: null,
        message: `Rollup failed to resolve import "${m[1]}"`,
        missingImport: m[1],
        category: m[1].includes("main.tsx") ? "entrypoint" as const : "import" as const,
      }),
    },
    // Vite entrypoint — "Could not resolve entry module" or rollup on /src/main.tsx
    {
      regex: /(?:Could not resolve entry module|failed to resolve import)\s*"?([^\s"]+main\.\w+)"?/gi,
      extract: (m) => ({
        errorType: "vite_missing_entrypoint",
        file: m[1],
        line: null,
        message: `Vite entrypoint missing: ${m[1]}`,
        missingImport: m[1],
        category: "entrypoint",
      }),
    },
    // Module not found / Cannot find module
    {
      regex: /(?:Module not found|Cannot find module)\s*[:'"]?\s*([^\s'"]+)/gi,
      extract: (m) => ({
        errorType: "missing_module",
        file: "package.json",
        line: null,
        message: `Module not found: ${m[1]}`,
        missingModule: m[1],
        category: "dependency",
      }),
    },
    // TypeScript errors: file(line,col): error TSxxxx: message
    {
      regex: /^(.+?)\((\d+),(\d+)\):\s*error\s+TS\d+:\s*(.+)$/gm,
      extract: (m) => ({
        errorType: "typescript_error",
        file: m[1].trim(),
        line: parseInt(m[2]),
        message: m[4].trim(),
        category: "typescript",
      }),
    },
    // Vite/esbuild errors: ERROR in ./path or error at path:line:col
    {
      regex: /(?:ERROR|error)\s+(?:in\s+)?\.?\/?(src\/[^\s:]+)(?::(\d+))?(?::(\d+))?\s*[:\-–]\s*(.+)/gm,
      extract: (m) => ({
        errorType: "build_error",
        file: m[1].trim(),
        line: m[2] ? parseInt(m[2]) : null,
        message: m[4].trim(),
        category: "build",
      }),
    },
    // npm ERR! missing script: build
    {
      regex: /npm ERR!\s*missing script:\s*(\w+)/gi,
      extract: (m) => ({
        errorType: "missing_build_script",
        file: "package.json",
        line: null,
        message: `Missing npm script: ${m[1]}`,
        category: "build_script",
      }),
    },
    // npm ERR! Could not resolve dependency
    {
      regex: /npm ERR!.*(?:Could not resolve dependency|ERESOLVE|peer dep)/gi,
      extract: (m) => ({
        errorType: "dependency_conflict",
        file: "package.json",
        line: null,
        message: m[0].replace("npm ERR! ", "").trim(),
        category: "dependency",
      }),
    },
    // Generic "error" lines with file paths
    {
      regex: /error\[?\]?:?\s+.*?([a-zA-Z0-9_\-./]+\.(?:ts|tsx|js|jsx|json|html)):?(\d+)?/gi,
      extract: (m) => ({
        errorType: "generic_error",
        file: m[1],
        line: m[2] ? parseInt(m[2]) : null,
        message: m[0].trim().slice(0, 200),
        category: "build",
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

  // If no specific errors but log contains failure indicators, add generic
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
// PROJECT STRUCTURE INSPECTOR
// ═══════════════════════════════════════════════

interface StructureReport {
  hasIndexHtml: boolean;
  hasMainTsx: boolean;
  hasAppTsx: boolean;
  hasPackageJson: boolean;
  hasBuildScript: boolean;
  hasViteConfig: boolean;
  hasTsConfig: boolean;
  hasSrcFolder: boolean;
  indexHtmlEntrypoint: string | null;
  packageJsonContent: any | null;
  missingCritical: string[];
}

async function inspectProjectStructure(
  ghHeaders: Record<string, string>,
  owner: string,
  repo: string,
  branch: string
): Promise<StructureReport> {
  const report: StructureReport = {
    hasIndexHtml: false,
    hasMainTsx: false,
    hasAppTsx: false,
    hasPackageJson: false,
    hasBuildScript: false,
    hasViteConfig: false,
    hasTsConfig: false,
    hasSrcFolder: false,
    indexHtmlEntrypoint: null,
    packageJsonContent: null,
    missingCritical: [],
  };

  // Check critical files in parallel
  const checks = [
    { path: "index.html", key: "hasIndexHtml" },
    { path: "src/main.tsx", key: "hasMainTsx" },
    { path: "src/App.tsx", key: "hasAppTsx" },
    { path: "package.json", key: "hasPackageJson" },
    { path: "vite.config.ts", key: "hasViteConfig" },
    { path: "tsconfig.json", key: "hasTsConfig" },
  ];

  const results = await Promise.allSettled(
    checks.map(async ({ path, key }) => {
      const resp = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
        { headers: ghHeaders }
      );
      const exists = resp.ok;
      let content: string | null = null;
      if (exists) {
        const data = await resp.json();
        if (data.content) {
          content = atob(data.content.replace(/\n/g, ""));
        }
      } else {
        await resp.text(); // consume body
      }
      return { key, exists, content, path };
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      const { key, exists, content, path } = result.value;
      (report as any)[key] = exists;

      if (path === "index.html" && content) {
        const entryMatch = content.match(/src=["']([^"']+\.(?:tsx?|jsx?))["']/);
        report.indexHtmlEntrypoint = entryMatch ? entryMatch[1] : null;
      }
      if (path === "package.json" && content) {
        try {
          report.packageJsonContent = JSON.parse(content);
          report.hasBuildScript = !!report.packageJsonContent?.scripts?.build;
        } catch { /* ignore */ }
      }
    }
  }

  // Check src folder
  try {
    const srcResp = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/src?ref=${branch}`,
      { headers: ghHeaders }
    );
    report.hasSrcFolder = srcResp.ok;
    await srcResp.text(); // consume
  } catch { report.hasSrcFolder = false; }

  // Determine missing critical files
  if (!report.hasIndexHtml) report.missingCritical.push("index.html");
  if (!report.hasMainTsx) report.missingCritical.push("src/main.tsx");
  if (!report.hasPackageJson) report.missingCritical.push("package.json");
  if (!report.hasViteConfig) report.missingCritical.push("vite.config.ts");
  if (!report.hasBuildScript) report.missingCritical.push("build script in package.json");

  return report;
}

// ═══════════════════════════════════════════════
// STRUCTURAL PATCH GENERATOR (deterministic)
// ═══════════════════════════════════════════════

interface FilePatch {
  path: string;
  content: string;
  reason: string;
}

function generateStructuralPatches(
  errors: BuildError[],
  structure: StructureReport
): FilePatch[] {
  const patches: FilePatch[] = [];
  const patchedPaths = new Set<string>();

  // CASE 1: Missing entrypoint (src/main.tsx)
  const hasEntrypointError = errors.some(e => e.category === "entrypoint") || !structure.hasMainTsx;
  if (hasEntrypointError && !structure.hasMainTsx) {
    patches.push({
      path: "src/main.tsx",
      content: `import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
`,
      reason: "fix: create missing Vite entrypoint src/main.tsx",
    });
    patchedPaths.add("src/main.tsx");
  }

  // CASE 2: Missing App.tsx
  if (!structure.hasAppTsx) {
    patches.push({
      path: "src/App.tsx",
      content: `function App() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
      <h1>AxionOS Generated App</h1>
    </div>
  )
}

export default App
`,
      reason: "fix: create missing App.tsx component",
    });
    patchedPaths.add("src/App.tsx");
  }

  // CASE 3: Missing or broken index.html
  if (!structure.hasIndexHtml || (structure.indexHtmlEntrypoint && !structure.indexHtmlEntrypoint.includes("src/main"))) {
    patches.push({
      path: "index.html",
      content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
      reason: "fix: create/repair index.html with correct entrypoint",
    });
    patchedPaths.add("index.html");
  }

  // CASE 4: Missing build script
  if (!structure.hasBuildScript && structure.packageJsonContent) {
    const pkg = { ...structure.packageJsonContent };
    pkg.scripts = {
      ...(pkg.scripts || {}),
      dev: pkg.scripts?.dev || "vite",
      build: "vite build",
      preview: pkg.scripts?.preview || "vite preview",
    };
    patches.push({
      path: "package.json",
      content: JSON.stringify(pkg, null, 2) + "\n",
      reason: "fix: add missing build script to package.json",
    });
    patchedPaths.add("package.json");
  }

  // CASE 5: Missing vite.config.ts
  if (!structure.hasViteConfig) {
    patches.push({
      path: "vite.config.ts",
      content: `import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
`,
      reason: "fix: create missing vite.config.ts",
    });
    patchedPaths.add("vite.config.ts");
  }

  // CASE 6: Missing tsconfig.json
  if (!structure.hasTsConfig) {
    patches.push({
      path: "tsconfig.json",
      content: JSON.stringify({
        compilerOptions: {
          target: "ES2020",
          useDefineForClassFields: true,
          lib: ["ES2020", "DOM", "DOM.Iterable"],
          module: "ESNext",
          skipLibCheck: true,
          moduleResolution: "bundler",
          allowImportingTsExtensions: true,
          isolatedModules: true,
          moduleDetection: "force",
          noEmit: true,
          jsx: "react-jsx",
          strict: true,
          noUnusedLocals: false,
          noUnusedParameters: false,
          noFallthroughCasesInSwitch: true,
          baseUrl: ".",
          paths: { "@/*": ["./src/*"] },
        },
        include: ["src"],
      }, null, 2) + "\n",
      reason: "fix: create missing tsconfig.json",
    });
    patchedPaths.add("tsconfig.json");
  }

  // CASE 7: Missing CSS file referenced by main.tsx
  if (hasEntrypointError) {
    patches.push({
      path: "src/index.css",
      content: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, sans-serif; }
`,
      reason: "fix: create minimal index.css",
    });
  }

  return patches;
}

// ═══════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const authHeader = req.headers.get("Authorization");
    const webhookSecret = Deno.env.get("SYNKRAIOS_WEBHOOK_SECRET");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (webhookSecret && authHeader === `Bearer ${webhookSecret}`) { /* OK */ }
    else if (serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) { /* OK */ }
    else { return errorResponse("Unauthorized", 401); }

    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey!);
    const body = await req.json();
    const {
      initiative_id,
      organization_id,
      build_log = "",
      attempt = 1,
      owner: inputOwner,
      repo: inputRepo,
    } = body;

    if (!initiative_id || !organization_id) {
      return errorResponse("initiative_id and organization_id required", 400);
    }

    const ctx: PipelineContext = {
      serviceClient,
      userId: "system",
      initiativeId: initiative_id,
      organizationId: organization_id,
    };

    const apiKey = Deno.env.get("LOVABLE_API_KEY") || "";
    const jobId = await createJob(ctx, "build_self_healing", { attempt });

    // ── Stop condition ──
    if (attempt > MAX_ATTEMPTS) {
      await pipelineLog(ctx, "self_healing_max_attempts",
        `⛔ Self-Healing atingiu máximo de ${MAX_ATTEMPTS} tentativas. Intervenção manual necessária.`);
      if (jobId) await failJob(ctx, jobId, `Max attempts (${MAX_ATTEMPTS}) reached`);
      return jsonResponse({
        success: false,
        message: `Max repair attempts (${MAX_ATTEMPTS}) reached`,
        attempt,
      });
    }

    await pipelineLog(ctx, "self_healing_start",
      `🔧 Build Self-Healing — Tentativa ${attempt}/${MAX_ATTEMPTS}`,
      { attempt });

    // ── Resolve GitHub connection ──
    let resolvedOwner = inputOwner;
    let resolvedRepo = inputRepo;
    let resolvedToken = "";
    let resolvedBranch = "main";

    const { data: gitConns } = await serviceClient.from("git_connections")
      .select("github_token, repo_owner, repo_name, default_branch")
      .eq("organization_id", organization_id).eq("status", "active")
      .order("updated_at", { ascending: false }).limit(1);
    const conn = gitConns?.[0];
    if (conn) {
      resolvedToken = conn.github_token || "";
      resolvedOwner = resolvedOwner || conn.repo_owner;
      resolvedRepo = resolvedRepo || conn.repo_name;
      resolvedBranch = conn.default_branch || "main";
    }

    if (!resolvedToken || !resolvedOwner || !resolvedRepo) {
      throw new Error("GitHub connection required for Build Self-Healing");
    }

    const ghHeaders = {
      Authorization: `Bearer ${resolvedToken}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    };

    // ── Load build log from initiative if not provided ──
    let effectiveLog = build_log;
    if (!effectiveLog) {
      const { data: init } = await serviceClient.from("initiatives")
        .select("execution_progress").eq("id", initiative_id).single();
      const progress = (init?.execution_progress || {}) as any;
      effectiveLog = progress.ci_build_log || progress.deploy_error || "";
    }

    // ═══ STEP 1: Parse CI logs ═══
    await pipelineLog(ctx, "self_healing_step1", "📋 Step 1: Analyzing build errors...");
    const parsedErrors = parseBuildErrors(effectiveLog);
    await pipelineLog(ctx, "self_healing_errors_parsed",
      `Found ${parsedErrors.length} errors: ${parsedErrors.map(e => e.category).join(", ")}`,
      { errors: parsedErrors.slice(0, 20) });

    // Record errors in Project Brain
    for (const err of parsedErrors.slice(0, 30)) {
      await recordError(ctx, err.message, err.category, err.file,
        `Build ${err.category}: ${err.errorType}`,
        `Self-healing attempt ${attempt}`);
    }

    // ═══ STEP 2: Inspect project structure ═══
    await pipelineLog(ctx, "self_healing_step2", "🔍 Step 2: Inspecting project structure...");
    const structure = await inspectProjectStructure(ghHeaders, resolvedOwner, resolvedRepo, resolvedBranch);
    await pipelineLog(ctx, "self_healing_structure",
      `Structure: ${structure.missingCritical.length > 0
        ? `Missing: ${structure.missingCritical.join(", ")}`
        : "All critical files present"}`,
      { structure: { ...structure, packageJsonContent: undefined } });

    // ═══ STEP 3: Generate patches ═══
    await pipelineLog(ctx, "self_healing_step3", "🩹 Step 3: Generating patches...");

    // 3a. Structural patches (deterministic, no AI needed)
    const structuralPatches = generateStructuralPatches(parsedErrors, structure);

    // 3b. AI patches for TypeScript/code errors that need intelligence
    const codeErrors = parsedErrors.filter(e =>
      e.category === "typescript" || e.category === "build" || e.category === "import"
    );

    let aiPatches: FilePatch[] = [];
    let totalTokens = 0;
    let totalCost = 0;

    if (codeErrors.length > 0) {
      // Fetch current content of affected files
      const affectedFiles = [...new Set(codeErrors.map(e => e.file).filter(f => f !== "unknown"))];
      const fileContents: Record<string, string> = {};

      await Promise.allSettled(
        affectedFiles.slice(0, 10).map(async (filePath) => {
          const resp = await fetch(
            `${GITHUB_API}/repos/${resolvedOwner}/${resolvedRepo}/contents/${filePath}?ref=${resolvedBranch}`,
            { headers: ghHeaders }
          );
          if (resp.ok) {
            const data = await resp.json();
            if (data.content) {
              fileContents[filePath] = atob(data.content.replace(/\n/g, ""));
            }
          } else {
            await resp.text();
          }
        })
      );

      const brainContext = await generateBrainContext(ctx);

      const fixResult = await callAI(apiKey,
        `You are the AxionOS Build Self-Healing Agent. Fix code errors to make the project build successfully.

RULES:
- Return ONLY valid JSON
- Fix ONLY the errors listed — do NOT refactor or add features
- Each fix must be the complete file content
- Ensure all imports resolve correctly
- Maintain consistent coding style

Return format:
{
  "patches": [
    {
      "path": "src/file.tsx",
      "content": "...complete fixed file...",
      "reason": "fix: description of what was fixed"
    }
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
        true
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

    // Merge patches (structural take priority, AI fills gaps)
    const allPatches = [...structuralPatches];
    const patchedPaths = new Set(allPatches.map(p => p.path));
    for (const ap of aiPatches) {
      if (!patchedPaths.has(ap.path)) {
        allPatches.push(ap);
        patchedPaths.add(ap.path);
      }
    }

    if (allPatches.length === 0) {
      await pipelineLog(ctx, "self_healing_no_patches",
        "⚠️ No patches generated. Build error may require manual intervention.");
      if (jobId) await failJob(ctx, jobId, "No patches could be generated");
      return jsonResponse({
        success: false,
        message: "No patches generated",
        errors: parsedErrors.length,
        attempt,
      });
    }

    await pipelineLog(ctx, "self_healing_patches",
      `Generated ${allPatches.length} patches: ${allPatches.map(p => p.path).join(", ")}`,
      { patches: allPatches.map(p => ({ path: p.path, reason: p.reason })) });

    // ═══ STEP 4: Apply patches via atomic commit ═══
    await pipelineLog(ctx, "self_healing_step4", "📦 Step 4: Applying patches (atomic commit)...");

    // Get base branch SHA
    const refResp = await fetch(
      `${GITHUB_API}/repos/${resolvedOwner}/${resolvedRepo}/git/ref/heads/${resolvedBranch}`,
      { headers: ghHeaders }
    );
    if (!refResp.ok) throw new Error(`Branch '${resolvedBranch}' not found`);
    const refData = await refResp.json();
    const baseSha = refData.object.sha;

    // Get base tree
    const baseCommitResp = await fetch(
      `${GITHUB_API}/repos/${resolvedOwner}/${resolvedRepo}/git/commits/${baseSha}`,
      { headers: ghHeaders }
    );
    if (!baseCommitResp.ok) throw new Error("Failed to get base commit");
    const baseCommit = await baseCommitResp.json();
    const baseTreeSha = baseCommit.tree.sha;

    // Create blobs in parallel
    const blobResults = await Promise.allSettled(
      allPatches.map(async (patch) => {
        const blobResp = await fetch(
          `${GITHUB_API}/repos/${resolvedOwner}/${resolvedRepo}/git/blobs`,
          {
            method: "POST",
            headers: ghHeaders,
            body: JSON.stringify({ content: patch.content, encoding: "utf-8" }),
          }
        );
        if (!blobResp.ok) throw new Error(`Blob failed for ${patch.path}: ${await blobResp.text()}`);
        const blobData = await blobResp.json();
        return { path: patch.path, sha: blobData.sha };
      })
    );

    const treeItems: Array<{ path: string; mode: string; type: string; sha: string }> = [];
    const committedFiles: string[] = [];

    for (let i = 0; i < blobResults.length; i++) {
      const result = blobResults[i];
      if (result.status === "fulfilled") {
        treeItems.push({ path: result.value.path, mode: "100644", type: "blob", sha: result.value.sha });
        committedFiles.push(allPatches[i].path);
      } else {
        console.error(`Blob failed:`, result.reason);
      }
    }

    if (treeItems.length === 0) {
      if (jobId) await failJob(ctx, jobId, "All blob creations failed");
      return jsonResponse({ success: false, message: "Failed to create blobs" });
    }

    // Create tree (with base_tree to preserve existing files)
    const treeResp = await fetch(
      `${GITHUB_API}/repos/${resolvedOwner}/${resolvedRepo}/git/trees`,
      {
        method: "POST",
        headers: ghHeaders,
        body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
      }
    );
    if (!treeResp.ok) throw new Error(`Tree creation failed: ${await treeResp.text()}`);
    const newTree = await treeResp.json();

    // Atomic commit directly to main
    const commitMsg = `fix(self-healing): repair build errors [attempt ${attempt}/${MAX_ATTEMPTS}]\n\n${
      allPatches.map(p => `- ${p.reason}`).join("\n")
    }\n\nGenerated by AxionOS Build Self-Healing Agent`;

    const commitResp = await fetch(
      `${GITHUB_API}/repos/${resolvedOwner}/${resolvedRepo}/git/commits`,
      {
        method: "POST",
        headers: ghHeaders,
        body: JSON.stringify({ message: commitMsg, tree: newTree.sha, parents: [baseSha] }),
      }
    );
    if (!commitResp.ok) throw new Error(`Commit failed: ${await commitResp.text()}`);
    const newCommit = await commitResp.json();

    // Update branch ref (force push to main)
    const updateRefResp = await fetch(
      `${GITHUB_API}/repos/${resolvedOwner}/${resolvedRepo}/git/refs/heads/${resolvedBranch}`,
      {
        method: "PATCH",
        headers: ghHeaders,
        body: JSON.stringify({ sha: newCommit.sha, force: true }),
      }
    );
    if (!updateRefResp.ok) throw new Error(`Ref update failed: ${await updateRefResp.text()}`);

    await pipelineLog(ctx, "self_healing_committed",
      `✅ Patch applied: ${committedFiles.length} files committed to ${resolvedBranch} (${newCommit.sha.slice(0, 7)})`,
      { commit_sha: newCommit.sha, files: committedFiles });

    // ═══ STEP 5: Learn prevention rules ═══
    if (parsedErrors.length > 0) {
      for (const err of parsedErrors.slice(0, 10)) {
        await upsertPreventionRule(
          ctx,
          `${err.category}: ${err.errorType}`,
          `Ensure ${err.file} exists and is correctly configured. Error: ${err.message.slice(0, 100)}`,
          "initiative"
        );
      }
      await pipelineLog(ctx, "self_healing_rules_learned",
        `Self-Healing: ${Math.min(parsedErrors.length, 10)} prevention rules recorded`);
    }

    // ═══ Update initiative progress ═══
    const { data: currentInit } = await serviceClient
      .from("initiatives").select("execution_progress").eq("id", initiative_id).single();
    const existingProgress = (currentInit?.execution_progress as Record<string, unknown>) || {};

    await serviceClient.from("initiatives").update({
      execution_progress: {
        ...existingProgress,
        self_healing_status: "patch_applied",
        self_healing_attempt: attempt,
        self_healing_files: committedFiles,
        self_healing_commit: newCommit.sha,
        self_healing_at: new Date().toISOString(),
        self_healing_errors_found: parsedErrors.length,
        self_healing_patches_applied: committedFiles.length,
      },
    }).eq("id", initiative_id);

    if (jobId) await completeJob(ctx, jobId, {
      attempt,
      files_fixed: committedFiles.length,
      errors_found: parsedErrors.length,
      commit_sha: newCommit.sha,
      structural_patches: structuralPatches.length,
      ai_patches: aiPatches.length,
    }, { model: "routed", costUsd: totalCost, durationMs: 0 });

    await pipelineLog(ctx, "self_healing_complete",
      `🔧 Self-Healing attempt ${attempt} complete. ${committedFiles.length} files patched. Build will re-trigger via CI.`,
      { attempt, files: committedFiles });

    // ═══ STEP 6: Trigger Error Intelligence Engine (async, non-blocking) ═══
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      fetch(`${supabaseUrl}/functions/v1/error-intelligence`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "analyze_patterns",
          organization_id: organization_id,
        }),
      }).catch(e => console.error("Error Intelligence trigger failed:", e));
    } catch { /* non-blocking */ }

    // ═══ STEP 7: Build re-trigger happens automatically via GitHub push webhook ═══
    // When the commit is pushed, Vercel/CI will rebuild.
    // On failure, github-ci-webhook will call build-self-healing again with attempt+1.

    return jsonResponse({
      success: true,
      attempt,
      max_attempts: MAX_ATTEMPTS,
      errors_found: parsedErrors.length,
      patches_applied: committedFiles.length,
      structural_patches: structuralPatches.length,
      ai_patches: aiPatches.length,
      commit_sha: newCommit.sha,
      files: committedFiles,
      message: `Build Self-Healing attempt ${attempt}: ${committedFiles.length} files patched`,
    });

  } catch (e) {
    console.error("Build Self-Healing error:", e);
    return errorResponse(e instanceof Error ? e.message : "Unknown error", 500);
  }
});
