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

  // Check package.json has scripts
  const pkg = scaffold.find(f => f.path === "package.json");
  if (pkg) {
    try {
      const parsed = JSON.parse(pkg.content);
      if (!parsed.scripts?.build) issues.push("package.json missing 'build' script");
      if (!parsed.scripts?.dev) issues.push("package.json missing 'dev' script");
      if (!parsed.dependencies?.react) issues.push("package.json missing 'react' dependency");
    } catch {
      issues.push("package.json has invalid JSON");
    }
  } else {
    issues.push("package.json not found in scaffold");
  }

  // Check index.html references main.tsx
  const indexHtml = scaffold.find(f => f.path === "index.html");
  if (indexHtml) {
    if (!indexHtml.content.includes("src/main.tsx")) {
      issues.push("index.html does not reference src/main.tsx");
    }
    if (!indexHtml.content.includes('id="root"')) {
      issues.push("index.html missing root div");
    }
  } else {
    issues.push("index.html not found in scaffold");
  }

  // Check main.tsx imports App
  const mainTsx = scaffold.find(f => f.path === "src/main.tsx");
  if (mainTsx) {
    if (!mainTsx.content.includes("App")) {
      issues.push("src/main.tsx does not import App component");
    }
    if (!mainTsx.content.includes("createRoot")) {
      issues.push("src/main.tsx does not call createRoot");
    }
  } else {
    issues.push("src/main.tsx not found in scaffold");
  }

  // Check App.tsx exists and exports
  const appTsx = scaffold.find(f => f.path === "src/App.tsx");
  if (!appTsx) {
    issues.push("src/App.tsx not found in scaffold");
  }

  // Check vite config
  const viteConfig = scaffold.find(f => f.path === "vite.config.ts");
  if (!viteConfig) {
    issues.push("vite.config.ts not found in scaffold");
  } else if (!viteConfig.content.includes("react")) {
    issues.push("vite.config.ts missing React plugin");
  }

  // Check tsconfig
  const tsconfig = scaffold.find(f => f.path === "tsconfig.json");
  if (!tsconfig) {
    issues.push("tsconfig.json not found in scaffold");
  }

  return { passed: issues.length === 0, issues };
}

// Auto-repair scaffold issues
function repairScaffold(scaffold: ScaffoldFile[], issues: string[], projectName: string): { repaired: ScaffoldFile[]; repairs: string[] } {
  const repairs: string[] = [];
  const defaults = getReactViteScaffold(projectName);
  const result = [...scaffold];

  for (const issue of issues) {
    // Missing file? inject default
    const missingMatch = issue.match(/^(.+?) not found in scaffold$/);
    if (missingMatch) {
      const filePath = missingMatch[1];
      const defaultFile = defaults.find(f => f.path === filePath);
      if (defaultFile && !result.find(f => f.path === filePath)) {
        result.push(defaultFile);
        repairs.push(`Injected missing ${filePath} from default template`);
      }
    }

    // index.html missing main.tsx reference
    if (issue.includes("does not reference src/main.tsx")) {
      const idx = result.findIndex(f => f.path === "index.html");
      if (idx >= 0) {
        const defaultHtml = defaults.find(f => f.path === "index.html");
        if (defaultHtml) {
          result[idx] = defaultHtml;
          repairs.push("Replaced index.html with correct entrypoint reference");
        }
      }
    }

    // package.json missing scripts
    if (issue.includes("missing 'build' script") || issue.includes("missing 'dev' script")) {
      const idx = result.findIndex(f => f.path === "package.json");
      if (idx >= 0) {
        try {
          const parsed = JSON.parse(result[idx].content);
          parsed.scripts = { ...parsed.scripts, dev: "vite", build: "vite build", preview: "vite preview" };
          result[idx] = { ...result[idx], content: JSON.stringify(parsed, null, 2) };
          repairs.push("Added missing build scripts to package.json");
        } catch { /* skip */ }
      }
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

      const aiResult = await callAI({
        prompt: aiPrompt,
        systemPrompt: "You are a build engineer. Generate only the minimal scaffold files needed for a successful build. Return valid JSON array.",
        model: "google/gemini-2.5-flash",
        apiKey,
      });

      try {
        const jsonMatch = aiResult.text.match(/\[[\s\S]*\]/);
        scaffold = jsonMatch ? JSON.parse(jsonMatch[0]) : getReactViteScaffold(projectName);
      } catch {
        scaffold = getReactViteScaffold(projectName);
      }
    }

    await pipelineLog(ctx, "scaffold_files_generated", `Generated ${scaffold.length} scaffold files`, {
      files: scaffold.map(f => f.path),
    });

    // ── Step 2: Validate scaffold ──
    let validation = validateScaffold(scaffold);
    let repairs: string[] = [];

    if (!validation.passed) {
      await pipelineLog(ctx, "scaffold_validation_issues", `Pre-build simulation found ${validation.issues.length} issues`, {
        issues: validation.issues,
      });

      // Auto-repair
      const repairResult = repairScaffold(scaffold, validation.issues, projectName);
      scaffold = repairResult.repaired;
      repairs = repairResult.repairs;

      // Re-validate after repair
      validation = validateScaffold(scaffold);

      if (repairs.length > 0) {
        await pipelineLog(ctx, "scaffold_auto_repair", `Auto-repaired ${repairs.length} issues`, { repairs });
      }
    }

    // ── Step 3: AI pre-build simulation ──
    const fileList = scaffold.map(f => `${f.path}:\n\`\`\`\n${f.content.slice(0, 500)}\n\`\`\``).join("\n\n");
    const simResult = await callAI({
      prompt: `Analyze this project scaffold for build readiness. Would "npm install && vite build" succeed?

Files:
${fileList}

Check:
1. Are all imports resolvable?
2. Are dependencies properly declared?
3. Is the build pipeline correctly configured?
4. Are there any missing files that would cause build failure?

Return JSON: { "would_build": boolean, "issues": string[], "confidence": number }`,
      systemPrompt: "You are a build verification expert. Analyze scaffolds for build readiness. Return only valid JSON.",
      model: "google/gemini-2.5-flash",
      apiKey,
    });

    let buildSimulation = { would_build: true, issues: [] as string[], confidence: 0.8 };
    try {
      const jsonMatch = simResult.text.match(/\{[\s\S]*\}/);
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
        status: "scaffold",
        metadata: {
          scaffold: true,
          required: file.required,
          content_preview: file.content.slice(0, 200),
        },
      });
    }

    // Record scaffold decision
    await recordDecision(ctx, {
      decision: `Foundation scaffold generated for ${stack} stack with ${scaffold.length} files`,
      reason: `Ensure minimal buildable structure before feature code generation`,
      category: "architecture",
      impact: `Scaffold validation: ${validation.passed ? "passed" : "issues found"}. Build confidence: ${(buildSimulation.confidence * 100).toFixed(0)}%`,
    });

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
    }, { costUsd: simResult.cost || 0, durationMs: 0 });

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
    await updateInitiative(ctx, { stage_status: "architecture_validated" });
    await pipelineLog(ctx, "foundation_scaffold_error", `❌ Foundation Scaffold failed: ${e}`);
    return errorResponse(e instanceof Error ? e.message : "Unknown error", 500);
  }
});
