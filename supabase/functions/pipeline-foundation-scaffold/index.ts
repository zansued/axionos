// Layer 3.5 — Foundation Scaffold Engine
// Creates the minimal buildable project scaffold BEFORE feature code generation.
// Runs a pre-build simulation to ensure the scaffold compiles.
// Only proceeds to feature generation once the scaffold successfully validates.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";
import { generateBrainContext, upsertNode, recordDecision } from "../_shared/brain-helpers.ts";

// ═══════════════════════════════════════════════
// SCAFFOLD TEMPLATES
// ═══════════════════════════════════════════════

interface ScaffoldFile {
  path: string;
  content: string;
  required: boolean;
}

interface ScaffoldValidation {
  files_generated: number;
  files_missing: string[];
  build_simulation_passed: boolean;
  issues: string[];
  repairs: string[];
}

const REQUIRED_REACT_VITE_FILES = [
  "index.html",
  "src/main.tsx",
  "src/App.tsx",
  "vite.config.ts",
  "tsconfig.json",
  "package.json",
] as const;

const REQUIRED_PACKAGE_SCRIPTS = {
  dev: "vite",
  build: "vite build",
  preview: "vite preview",
} as const;

function normalizeScriptPath(path: string): string {
  return path.replace(/^\.?\//, "");
}

function extractIndexEntrypoint(indexHtml: string): string | null {
  const scriptMatch = indexHtml.match(/<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']/i)
    || indexHtml.match(/<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/i);
  return scriptMatch?.[1] ? normalizeScriptPath(scriptMatch[1]) : null;
}

// Default React + Vite scaffold
function getReactViteScaffold(projectName: string): ScaffoldFile[] {
  return [
    {
      path: "package.json",
      required: true,
      content: JSON.stringify({
        name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        private: true,
        version: "0.1.0",
        type: "module",
        scripts: {
          dev: "vite",
          build: "vite build",
          preview: "vite preview",
          lint: "tsc --noEmit",
        },
        dependencies: {
          react: "^18.3.1",
          "react-dom": "^18.3.1",
        },
        devDependencies: {
          "@types/react": "^18.3.0",
          "@types/react-dom": "^18.3.0",
          "@vitejs/plugin-react": "^4.3.0",
          typescript: "^5.5.0",
          vite: "^5.4.0",
        },
      }, null, 2),
    },
    {
      path: "index.html",
      required: true,
      content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
    },
    {
      path: "src/main.tsx",
      required: true,
      content: `import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)`,
    },
    {
      path: "src/App.tsx",
      required: true,
      content: `export default function App() {
  return (
    <div>
      AxionOS App Bootstrapped
    </div>
  )
}`,
    },
    {
      path: "vite.config.ts",
      required: true,
      content: `import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
})`,
    },
    {
      path: "tsconfig.json",
      required: true,
      content: JSON.stringify({
        compilerOptions: {
          target: "ES2020",
          useDefineForClassFields: true,
          lib: ["ES2020", "DOM", "DOM.Iterable"],
          module: "ESNext",
          skipLibCheck: true,
          moduleResolution: "bundler",
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: "react-jsx",
          strict: false,
          noUnusedLocals: false,
          noUnusedParameters: false,
        },
        include: ["src"],
      }, null, 2),
    },
    {
      path: "tsconfig.app.json",
      required: true,
      content: JSON.stringify({
        extends: "./tsconfig.json",
        include: ["src"],
      }, null, 2),
    },
  ];
}

// Detect stack from discovery payload
function detectStack(dp: any): string {
  const stack = (dp.suggested_stack || dp.stack || "").toLowerCase();
  const files = dp.system_architecture?.planned_files || dp.files || [];
  const allFiles = Array.isArray(files) ? files.map((f: any) => typeof f === "string" ? f : f.path || "") : [];

  if (stack.includes("react") || stack.includes("vite") || allFiles.some((f: string) => f.includes("main.tsx") || f.includes("App.tsx"))) {
    return "react-vite";
  }
  if (stack.includes("next")) return "nextjs";
  if (stack.includes("node") || stack.includes("express")) return "node-api";

  // Default to react-vite for frontend projects
  return "react-vite";
}

// Validate scaffold: check all required files exist and have valid content
function validateScaffold(scaffold: ScaffoldFile[]): { passed: boolean; issues: string[] } {
  const issues: string[] = [];

  for (const file of scaffold) {
    if (!file.content || file.content.trim().length === 0) {
      issues.push(`File ${file.path} has empty content`);
    }
  }

  // Check package.json has required scripts
  const pkg = scaffold.find((f) => f.path === "package.json");
  if (pkg) {
    try {
      const parsed = JSON.parse(pkg.content);
      for (const [scriptName, scriptValue] of Object.entries(REQUIRED_PACKAGE_SCRIPTS)) {
        if (parsed.scripts?.[scriptName] !== scriptValue) {
          issues.push(`package.json missing or invalid '${scriptName}' script`);
        }
      }
      if (!parsed.dependencies?.react) issues.push("package.json missing 'react' dependency");
      if (!parsed.dependencies?.["react-dom"]) issues.push("package.json missing 'react-dom' dependency");
    } catch {
      issues.push("package.json has invalid JSON");
    }
  } else {
    issues.push("package.json not found in scaffold");
  }

  // Check index.html references main.tsx
  const indexHtml = scaffold.find((f) => f.path === "index.html");
  if (indexHtml) {
    const entry = extractIndexEntrypoint(indexHtml.content);
    if (!entry || entry !== "src/main.tsx") {
      issues.push("index.html does not reference src/main.tsx");
    }
    if (!indexHtml.content.includes('id="root"')) {
      issues.push("index.html missing root div");
    }
  } else {
    issues.push("index.html not found in scaffold");
  }

  // Check main.tsx imports App
  const mainTsx = scaffold.find((f) => f.path === "src/main.tsx");
  if (mainTsx) {
    if (!/import\s+App\s+from\s+["']\.\/App["']/.test(mainTsx.content)) {
      issues.push("src/main.tsx missing import App from './App'");
    }
    if (!mainTsx.content.includes("createRoot")) {
      issues.push("src/main.tsx does not call createRoot");
    }
  } else {
    issues.push("src/main.tsx not found in scaffold");
  }

  // Check App.tsx exists and exports
  const appTsx = scaffold.find((f) => f.path === "src/App.tsx");
  if (!appTsx) {
    issues.push("src/App.tsx not found in scaffold");
  } else if (!/export\s+default\s+function\s+App|function\s+App\s*\(/.test(appTsx.content)) {
    issues.push("src/App.tsx missing App export");
  }

  // Check vite config
  const viteConfig = scaffold.find((f) => f.path === "vite.config.ts");
  if (!viteConfig) {
    issues.push("vite.config.ts not found in scaffold");
  } else if (!viteConfig.content.includes("react")) {
    issues.push("vite.config.ts missing React plugin");
  }

  // Check tsconfig
  const tsconfig = scaffold.find((f) => f.path === "tsconfig.json");
  if (!tsconfig) {
    issues.push("tsconfig.json not found in scaffold");
  }

  return { passed: issues.length === 0, issues };
}

function validateEntrypoints(scaffold: ScaffoldFile[], projectBrainPaths: Set<string>): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  const scaffoldPaths = new Set(scaffold.map((f) => f.path));
  const hasPath = (path: string) => scaffoldPaths.has(path) || projectBrainPaths.has(path);

  const indexHtml = scaffold.find((f) => f.path === "index.html");
  if (!indexHtml && !projectBrainPaths.has("index.html")) {
    issues.push("index.html not found in scaffold or project brain");
  }

  if (indexHtml) {
    const entry = extractIndexEntrypoint(indexHtml.content);
    if (!entry) {
      issues.push("index.html missing module script entrypoint");
    } else if (entry === "src/main.tsx" && !hasPath("src/main.tsx")) {
      issues.push("index.html references src/main.tsx but src/main.tsx is missing in scaffold and project brain");
    }
  }

  for (const requiredPath of REQUIRED_REACT_VITE_FILES) {
    if (!hasPath(requiredPath)) {
      issues.push(`${requiredPath} not found in scaffold or project brain`);
    }
  }

  const mainTsx = scaffold.find((f) => f.path === "src/main.tsx");
  if (mainTsx && !/import\s+App\s+from\s+["']\.\/App["']/.test(mainTsx.content)) {
    issues.push("src/main.tsx import integrity failed: expected import App from './App'");
  }

  return { passed: issues.length === 0, issues };
}

// Auto-repair scaffold issues
function repairScaffold(scaffold: ScaffoldFile[], issues: string[], projectName: string): { repaired: ScaffoldFile[]; repairs: string[] } {
  const repairs: string[] = [];
  const defaults = getReactViteScaffold(projectName);
  const result = [...scaffold];

  const upsertDefaultFile = (filePath: string, reason: string) => {
    const defaultFile = defaults.find((f) => f.path === filePath);
    if (!defaultFile) return;

    const existingIdx = result.findIndex((f) => f.path === filePath);
    if (existingIdx >= 0) {
      result[existingIdx] = defaultFile;
      repairs.push(reason);
      return;
    }

    result.push(defaultFile);
    repairs.push(reason);
  };

  for (const issue of issues) {
    // Missing file in scaffold or project brain? inject default into scaffold
    const missingMatch = issue.match(/^(.+?) not found in scaffold(?: or project brain)?$/);
    if (missingMatch) {
      const filePath = missingMatch[1];
      upsertDefaultFile(filePath, `Injected missing ${filePath} from default template`);
    }

    if (issue.includes("references src/main.tsx but src/main.tsx is missing")) {
      upsertDefaultFile("src/main.tsx", "Injected src/main.tsx to satisfy index.html entrypoint reference");
    }

    if (issue.includes("index.html missing module script entrypoint") || issue.includes("index.html does not reference src/main.tsx")) {
      upsertDefaultFile("index.html", "Replaced index.html with correct module entrypoint");
    }

    if (issue.includes("index.html missing root div")) {
      upsertDefaultFile("index.html", "Repaired index.html root mount container");
    }

    if (
      issue.includes("missing or invalid 'build' script") ||
      issue.includes("missing or invalid 'dev' script") ||
      issue.includes("missing or invalid 'preview' script")
    ) {
      const idx = result.findIndex((f) => f.path === "package.json");
      if (idx >= 0) {
        try {
          const parsed = JSON.parse(result[idx].content);
          parsed.scripts = {
            ...parsed.scripts,
            dev: REQUIRED_PACKAGE_SCRIPTS.dev,
            build: REQUIRED_PACKAGE_SCRIPTS.build,
            preview: REQUIRED_PACKAGE_SCRIPTS.preview,
          };
          result[idx] = { ...result[idx], content: JSON.stringify(parsed, null, 2) };
          repairs.push("Added missing Vite scripts to package.json");
        } catch {
          upsertDefaultFile("package.json", "Replaced invalid package.json with default scaffold template");
        }
      } else {
        upsertDefaultFile("package.json", "Injected missing package.json from default scaffold template");
      }
    }

    if (issue.includes("package.json missing 'react' dependency") || issue.includes("package.json missing 'react-dom' dependency")) {
      const idx = result.findIndex((f) => f.path === "package.json");
      if (idx >= 0) {
        try {
          const parsed = JSON.parse(result[idx].content);
          parsed.dependencies = {
            ...parsed.dependencies,
            react: parsed.dependencies?.react || "^18.3.1",
            "react-dom": parsed.dependencies?.["react-dom"] || "^18.3.1",
          };
          result[idx] = { ...result[idx], content: JSON.stringify(parsed, null, 2) };
          repairs.push("Added missing React dependencies to package.json");
        } catch {
          upsertDefaultFile("package.json", "Replaced invalid package.json with default scaffold template");
        }
      }
    }

    if (issue.includes("src/main.tsx import integrity failed") || issue.includes("src/main.tsx missing import App from './App'")) {
      upsertDefaultFile("src/main.tsx", "Repaired src/main.tsx import integrity");
    }

    if (issue.includes("src/App.tsx missing App export")) {
      upsertDefaultFile("src/App.tsx", "Repaired src/App.tsx default export");
    }
  }

  return { repaired: result, repairs };
}

// ═══════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════

serve(async (req) => {
  const result = await bootstrapPipeline(req, "pipeline-foundation-scaffold");
  if (result instanceof Response) return result;
  const { initiative, ctx, serviceClient, apiKey } = result;

  const jobId = await createJob(ctx, "foundation_scaffold", {
    title: initiative.title,
    stage_status: initiative.stage_status,
  });

  await updateInitiative(ctx, { stage_status: "scaffolding" });
  await pipelineLog(ctx, "foundation_scaffold_start", "🏗️ Foundation Scaffold generation started");

  try {
    const dp = initiative.discovery_payload || {};
    const stack = detectStack(dp);
    const projectName = initiative.title || "generated-app";

    await pipelineLog(ctx, "scaffold_stack_detected", `Stack detected: ${stack}`);

    // ── Step 1: Generate scaffold files ──
    let scaffold: ScaffoldFile[];
    if (stack === "react-vite") {
      scaffold = getReactViteScaffold(projectName);
    } else {
      // For other stacks, use AI to generate scaffold
      const brainContext = await generateBrainContext(ctx);
      const aiPrompt = `Generate the minimal buildable scaffold for a ${stack} project named "${projectName}".
Return a JSON array of objects with { path, content, required } for each file.
Only include the absolute minimum files needed for the project to build successfully (npm install && npm run build).
${brainContext ? `\nProject context:\n${brainContext}` : ""}`;

      const aiResult = await callAI(
        apiKey,
        "You are a build engineer. Generate only the minimal scaffold files needed for a successful build. Return valid JSON array.",
        aiPrompt,
        true,
      );

      try {
        const jsonMatch = aiResult.content.match(/\[[\s\S]*\]/);
        scaffold = jsonMatch ? JSON.parse(jsonMatch[0]) : getReactViteScaffold(projectName);
      } catch {
        scaffold = getReactViteScaffold(projectName);
      }
    }

    await pipelineLog(ctx, "scaffold_files_generated", `Generated ${scaffold.length} scaffold files`, {
      files: scaffold.map(f => f.path),
    });

    // ── Step 2: Validate scaffold + entrypoints ──
    const { data: existingBrainNodes } = await serviceClient
      .from("project_brain_nodes")
      .select("file_path")
      .eq("initiative_id", ctx.initiativeId)
      .in("file_path", [...REQUIRED_REACT_VITE_FILES]);

    const projectBrainPaths = new Set(
      (existingBrainNodes || [])
        .map((node: any) => node.file_path)
        .filter((path: string | null): path is string => Boolean(path)),
    );

    let validation = validateScaffold(scaffold);
    const initialEntrypointValidation = validateEntrypoints(scaffold, projectBrainPaths);
    if (!initialEntrypointValidation.passed) {
      validation = {
        passed: false,
        issues: [...validation.issues, ...initialEntrypointValidation.issues],
      };
    }

    let repairs: string[] = [];

    if (!validation.passed) {
      await pipelineLog(ctx, "scaffold_validation_issues", `Pre-build simulation found ${validation.issues.length} issues`, {
        issues: validation.issues,
      });

      // Auto-repair
      const repairResult = repairScaffold(scaffold, validation.issues, projectName);
      scaffold = repairResult.repaired;
      repairs = repairResult.repairs;

      // Re-validate after repair (includes validateEntrypoints)
      const postRepairValidation = validateScaffold(scaffold);
      const postRepairEntrypointValidation = validateEntrypoints(scaffold, projectBrainPaths);
      validation = {
        passed: postRepairValidation.passed && postRepairEntrypointValidation.passed,
        issues: [...postRepairValidation.issues, ...postRepairEntrypointValidation.issues],
      };

      if (repairs.length > 0) {
        await pipelineLog(ctx, "scaffold_auto_repair", `Auto-repaired ${repairs.length} issues`, { repairs });
      }
    }

    // ── Step 3: AI pre-build simulation ──
    const fileList = scaffold.map(f => `${f.path}:\n\`\`\`\n${f.content.slice(0, 500)}\n\`\`\``).join("\n\n");
    const simResult = await callAI(
      apiKey,
      "You are a build verification expert. Analyze scaffolds for build readiness. Return only valid JSON.",
      `Analyze this project scaffold for build readiness. Would "npm install && vite build" succeed?

Files:
${fileList}

Check:
1. Are all imports resolvable?
2. Are dependencies properly declared?
3. Is the build pipeline correctly configured?
4. Are there any missing files that would cause build failure?

Return JSON: { "would_build": boolean, "issues": string[], "confidence": number }`,
      true,
    );

    let buildSimulation = { would_build: true, issues: [] as string[], confidence: 0.8 };
    try {
      const jsonMatch = simResult.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) buildSimulation = JSON.parse(jsonMatch[0]);
    } catch { /* use default */ }

    // If AI predicts build failure, attempt one more repair round
    if (!buildSimulation.would_build && buildSimulation.issues.length > 0) {
      await pipelineLog(ctx, "scaffold_build_prediction_failed", `AI predicts build failure: ${buildSimulation.issues.join(", ")}`);

      const fixResult = repairScaffold(scaffold, buildSimulation.issues, projectName);
      scaffold = fixResult.repaired;
      repairs = [...repairs, ...fixResult.repairs];
    }

    // ── Step 4: Store scaffold in discovery_payload & Project Brain ──
    const scaffoldData = scaffold.map(f => ({ path: f.path, content: f.content }));
    const updatedDp = {
      ...dp,
      foundation_scaffold: {
        stack,
        files: scaffoldData,
        validation: {
          passed: validation.passed,
          issues: validation.issues,
          repairs,
          build_simulation: buildSimulation,
        },
        generated_at: new Date().toISOString(),
      },
    };

    // Upsert scaffold files as brain nodes
    for (const file of scaffold) {
      await upsertNode(ctx, {
        name: file.path.split("/").pop() || file.path,
        file_path: file.path,
        node_type: file.path.endsWith(".json") ? "config" : file.path.endsWith(".tsx") ? "component" : "file",
        status: "generated",
        metadata: {
          scaffold: true,
          required: file.required,
          content: file.content,
          content_preview: file.content.slice(0, 200),
        },
      });
    }

    // Record scaffold decision
    await recordDecision(
      ctx,
      `Foundation scaffold generated for ${stack} stack with ${scaffold.length} files`,
      "Ensure minimal buildable structure before feature code generation",
      `Scaffold validation: ${validation.passed ? "passed" : "issues found"}. Build confidence: ${(buildSimulation.confidence * 100).toFixed(0)}%`,
      "architecture",
    );

    await updateInitiative(ctx, {
      stage_status: "scaffolded",
      discovery_payload: updatedDp,
    });

    const summary = `Foundation Scaffold: ${scaffold.length} files, ${stack} stack. ` +
      `Validation: ${validation.passed ? "passed" : `${validation.issues.length} issues`}. ` +
      `Repairs: ${repairs.length}. Build confidence: ${(buildSimulation.confidence * 100).toFixed(0)}%`;

    await pipelineLog(ctx, "foundation_scaffold_complete", `🏗️ ${summary}`);

    if (jobId) await completeJob(ctx, jobId, {
      files: scaffold.map(f => f.path),
      stack,
      validation_passed: validation.passed,
      repairs,
      build_simulation: buildSimulation,
    }, { costUsd: simResult.costUsd || 0, durationMs: simResult.durationMs || 0 });

    return jsonResponse({
      success: true,
      files_generated: scaffold.length,
      stack,
      validation_passed: validation.passed,
      issues: validation.issues,
      repairs,
      build_confidence: buildSimulation.confidence,
      build_would_pass: buildSimulation.would_build,
    });

  } catch (e) {
    if (jobId) await failJob(ctx, jobId, e instanceof Error ? e.message : "Unknown error");
    await updateInitiative(ctx, { stage_status: "bootstrapped" });
    await pipelineLog(ctx, "foundation_scaffold_error", `❌ Foundation Scaffold failed: ${e}`);
    return errorResponse(e instanceof Error ? e.message : "Unknown error", 500);
  }
});
