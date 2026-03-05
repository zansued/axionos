// Layer 3.25 — Project Bootstrap Intelligence
// Validates structural buildability BEFORE Foundation Scaffold.
// Detects stack, validates entrypoints, dependencies, and scripts.
// Predicts build viability and auto-repairs missing bootstrap files.
// Injects bootstrap nodes into Project Brain for downstream stages.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import {
  pipelineLog, updateInitiative,
  createJob, completeJob, failJob,
} from "../_shared/pipeline-helpers.ts";
import {
  upsertNode, recordDecision, generateBrainContext,
  getNodeByPath,
} from "../_shared/brain-helpers.ts";

// ═══════════════════════════════════════════════
// STACK DEFINITIONS
// ═══════════════════════════════════════════════

type SupportedStack = "react-vite" | "nextjs" | "node-api" | "python-fastapi";

interface StackRequirement {
  files: Array<{ path: string; required: boolean; description: string }>;
  scripts: Record<string, string>;
  dependencies: Array<{ name: string; dev: boolean }>;
  entrypoint: { htmlFile?: string; scriptRef?: string; mainFile: string };
  buildCommands: string[];
}

const STACK_REQUIREMENTS: Record<SupportedStack, StackRequirement> = {
  "react-vite": {
    files: [
      { path: "index.html", required: true, description: "HTML entrypoint referencing /src/main.tsx" },
      { path: "src/main.tsx", required: true, description: "React bootstrap — createRoot + App import" },
      { path: "src/App.tsx", required: true, description: "Root React component" },
      { path: "vite.config.ts", required: true, description: "Vite build configuration with React plugin" },
      { path: "tsconfig.json", required: true, description: "TypeScript compiler configuration" },
      { path: "package.json", required: true, description: "NPM package manifest with build scripts" },
    ],
    scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
    dependencies: [
      { name: "react", dev: false },
      { name: "react-dom", dev: false },
      { name: "vite", dev: true },
      { name: "typescript", dev: true },
    ],
    entrypoint: { htmlFile: "index.html", scriptRef: "src/main.tsx", mainFile: "src/main.tsx" },
    buildCommands: ["npm install", "tsc --noEmit", "vite build"],
  },
  nextjs: {
    files: [
      { path: "package.json", required: true, description: "NPM package manifest" },
      { path: "next.config.js", required: true, description: "Next.js configuration" },
      { path: "tsconfig.json", required: true, description: "TypeScript configuration" },
      { path: "pages/index.tsx", required: true, description: "Home page" },
      { path: "pages/_app.tsx", required: true, description: "Custom App component" },
    ],
    scripts: { dev: "next dev", build: "next build", start: "next start" },
    dependencies: [
      { name: "next", dev: false },
      { name: "react", dev: false },
      { name: "react-dom", dev: false },
      { name: "typescript", dev: true },
    ],
    entrypoint: { mainFile: "pages/index.tsx" },
    buildCommands: ["npm install", "next build"],
  },
  "node-api": {
    files: [
      { path: "package.json", required: true, description: "NPM package manifest" },
      { path: "tsconfig.json", required: true, description: "TypeScript configuration" },
      { path: "src/index.ts", required: true, description: "Express/Node API entrypoint" },
    ],
    scripts: { dev: "ts-node src/index.ts", build: "tsc", start: "node dist/index.js" },
    dependencies: [
      { name: "express", dev: false },
      { name: "typescript", dev: true },
      { name: "ts-node", dev: true },
    ],
    entrypoint: { mainFile: "src/index.ts" },
    buildCommands: ["npm install", "tsc --noEmit"],
  },
  "python-fastapi": {
    files: [
      { path: "requirements.txt", required: true, description: "Python dependencies" },
      { path: "main.py", required: true, description: "FastAPI entrypoint" },
      { path: "Dockerfile", required: false, description: "Container configuration" },
    ],
    scripts: {},
    dependencies: [
      { name: "fastapi", dev: false },
      { name: "uvicorn", dev: false },
    ],
    entrypoint: { mainFile: "main.py" },
    buildCommands: ["pip install -r requirements.txt", "python -c 'import main'"],
  },
};

// ═══════════════════════════════════════════════
// STACK DETECTION
// ═══════════════════════════════════════════════

function detectStack(dp: Record<string, any>): SupportedStack {
  const stack = (dp.suggested_stack || dp.stack || "").toLowerCase();
  const sysArch = dp.system_architecture || {};
  const sysStack = sysArch.stack || {};
  const framework = (sysStack.frontend?.framework || "").toLowerCase();
  const files = dp.dependency_graph?.dependency_graph?.nodes || [];
  const allFiles: string[] = Array.isArray(files)
    ? files.map((f: any) => (typeof f === "string" ? f : f.id || f.path || ""))
    : [];

  if (stack.includes("next") || framework.includes("next") || allFiles.some((f) => f.includes("next.config"))) {
    return "nextjs";
  }
  if (stack.includes("python") || stack.includes("fastapi") || allFiles.some((f) => f.endsWith(".py"))) {
    return "python-fastapi";
  }
  if (
    stack.includes("node") || stack.includes("express") ||
    (allFiles.some((f) => f === "src/index.ts") && !allFiles.some((f) => f.includes("main.tsx")))
  ) {
    return "node-api";
  }

  return "react-vite";
}

// ═══════════════════════════════════════════════
// BOOTSTRAP FILE TEMPLATES
// ═══════════════════════════════════════════════

function getBootstrapTemplate(stack: SupportedStack, filePath: string, projectName: string): string | null {
  if (stack === "react-vite") {
    const templates: Record<string, string> = {
      "index.html": `<!DOCTYPE html>
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
      "src/main.tsx": `import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)`,
      "src/App.tsx": `export default function App() {
  return (
    <div>
      AxionOS App Bootstrapped
    </div>
  )
}`,
      "vite.config.ts": `import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
})`,
      "tsconfig.json": JSON.stringify(
        {
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
          },
          include: ["src"],
        },
        null,
        2,
      ),
      "package.json": JSON.stringify(
        {
          name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
          private: true,
          version: "0.1.0",
          type: "module",
          scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
          dependencies: { react: "^18.3.1", "react-dom": "^18.3.1" },
          devDependencies: {
            "@types/react": "^18.3.0",
            "@types/react-dom": "^18.3.0",
            "@vitejs/plugin-react": "^4.3.0",
            typescript: "^5.5.0",
            vite: "^5.4.0",
          },
        },
        null,
        2,
      ),
    };
    return templates[filePath] ?? null;
  }

  if (stack === "nextjs") {
    const templates: Record<string, string> = {
      "pages/index.tsx": `export default function Home() {
  return <div><h1>${projectName}</h1></div>
}`,
      "pages/_app.tsx": `import type { AppProps } from "next/app"
export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}`,
      "next.config.js": `/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true }
module.exports = nextConfig`,
      "tsconfig.json": JSON.stringify(
        { compilerOptions: { target: "es5", lib: ["dom", "dom.iterable", "esnext"], strict: true, jsx: "preserve" }, include: ["**/*.ts", "**/*.tsx"] },
        null, 2,
      ),
      "package.json": JSON.stringify(
        { name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-"), private: true, scripts: { dev: "next dev", build: "next build", start: "next start" }, dependencies: { next: "^14.0.0", react: "^18.3.1", "react-dom": "^18.3.1" }, devDependencies: { typescript: "^5.5.0", "@types/react": "^18.3.0" } },
        null, 2,
      ),
    };
    return templates[filePath] ?? null;
  }

  if (stack === "node-api") {
    const templates: Record<string, string> = {
      "src/index.ts": `import express from "express"
const app = express()
app.use(express.json())
app.get("/", (_, res) => res.json({ status: "ok" }))
app.listen(3000, () => console.log("Server on :3000"))`,
      "tsconfig.json": JSON.stringify(
        { compilerOptions: { target: "ES2020", module: "commonjs", outDir: "dist", strict: true, esModuleInterop: true }, include: ["src"] },
        null, 2,
      ),
      "package.json": JSON.stringify(
        { name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-"), private: true, scripts: { dev: "ts-node src/index.ts", build: "tsc", start: "node dist/index.js" }, dependencies: { express: "^4.18.0" }, devDependencies: { typescript: "^5.5.0", "ts-node": "^10.9.0", "@types/express": "^4.17.0" } },
        null, 2,
      ),
    };
    return templates[filePath] ?? null;
  }

  if (stack === "python-fastapi") {
    const templates: Record<string, string> = {
      "main.py": `from fastapi import FastAPI

app = FastAPI(title="${projectName}")

@app.get("/")
def root():
    return {"status": "ok", "project": "${projectName}"}`,
      "requirements.txt": "fastapi>=0.104.0\nuvicorn>=0.24.0",
    };
    return templates[filePath] ?? null;
  }

  return null;
}

// ═══════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════

interface BootstrapIssue {
  severity: "critical" | "warning" | "info";
  category: string;
  message: string;
  fix_applied: string | null;
  file_path?: string;
}

function validateBootstrap(
  stack: SupportedStack,
  dp: Record<string, any>,
  brainPaths: Set<string>,
): { issues: BootstrapIssue[]; missingFiles: string[] } {
  const req = STACK_REQUIREMENTS[stack];
  const issues: BootstrapIssue[] = [];
  const missingFiles: string[] = [];

  // Collect all planned files from discovery_payload
  const plannedFiles = new Set<string>();
  const depGraph = dp.dependency_graph || {};
  for (const phase of depGraph.generation_order || []) {
    for (const f of phase.files || []) plannedFiles.add(f);
  }
  for (const n of depGraph.dependency_graph?.nodes || []) {
    if (n.id) plannedFiles.add(n.id);
  }

  const hasFile = (path: string) =>
    plannedFiles.has(path) || brainPaths.has(path) ||
    [...plannedFiles].some((f) => f.endsWith(`/${path}`));

  // 1. Check required files
  for (const file of req.files) {
    if (!hasFile(file.path)) {
      issues.push({
        severity: file.required ? "critical" : "warning",
        category: "missing_file",
        message: `Required bootstrap file '${file.path}' not found in plan or Project Brain`,
        fix_applied: null,
        file_path: file.path,
      });
      missingFiles.push(file.path);
    }
  }

  // 2. Validate entrypoint reference (for stacks with HTML entrypoint)
  if (req.entrypoint.htmlFile && req.entrypoint.scriptRef) {
    if (hasFile(req.entrypoint.htmlFile) && !hasFile(req.entrypoint.scriptRef)) {
      issues.push({
        severity: "critical",
        category: "entrypoint_missing",
        message: `${req.entrypoint.htmlFile} references ${req.entrypoint.scriptRef} but the file is missing`,
        fix_applied: null,
        file_path: req.entrypoint.scriptRef,
      });
      if (!missingFiles.includes(req.entrypoint.scriptRef)) {
        missingFiles.push(req.entrypoint.scriptRef);
      }
    }
  }

  // 3. Validate package.json scripts (for JS/TS stacks)
  if (Object.keys(req.scripts).length > 0) {
    const npmDeps = depGraph.npm_dependencies || [];
    const pkgScripts = dp.package_scripts || {};

    for (const [scriptName, scriptValue] of Object.entries(req.scripts)) {
      // Check if discovery payload explicitly defines scripts
      if (pkgScripts[scriptName] && pkgScripts[scriptName] !== scriptValue) {
        issues.push({
          severity: "warning",
          category: "invalid_script",
          message: `package.json script '${scriptName}' should be '${scriptValue}', found '${pkgScripts[scriptName]}'`,
          fix_applied: null,
        });
      }
    }

    // 4. Validate dependencies
    for (const dep of req.dependencies) {
      const found = npmDeps.some((d: any) => d.package === dep.name);
      if (!found) {
        issues.push({
          severity: "warning",
          category: "missing_dependency",
          message: `Required dependency '${dep.name}' not found in npm_dependencies`,
          fix_applied: null,
        });
      }
    }
  }

  return { issues, missingFiles };
}

// ═══════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════

serve(async (req) => {
  const result = await bootstrapPipeline(req, "project-bootstrap-intelligence");
  if (result instanceof Response) return result;
  const { initiative, ctx, serviceClient, apiKey } = result;

  const jobId = await createJob(ctx, "bootstrap_intelligence", {
    title: initiative.title,
    stage_status: initiative.stage_status,
  });

  await updateInitiative(ctx, { stage_status: "bootstrapping" });
  await pipelineLog(ctx, "bootstrap_intelligence_start", "🧠 Project Bootstrap Intelligence started");

  try {
    const dp = initiative.discovery_payload || {};
    const projectName = initiative.title || "generated-app";

    // ── Step 1: Detect stack ──
    const stack = detectStack(dp);
    const req = STACK_REQUIREMENTS[stack];
    await pipelineLog(ctx, "bootstrap_stack_detected", `Stack detected: ${stack}`, {
      stack,
      required_files: req.files.map((f) => f.path),
      build_commands: req.buildCommands,
    });

    // ── Step 2: Query Project Brain for existing bootstrap nodes ──
    const brainPaths = new Set<string>();
    for (const file of req.files) {
      const node = await getNodeByPath(ctx, file.path);
      if (node) brainPaths.add(file.path);
    }

    await pipelineLog(ctx, "bootstrap_brain_check", `Project Brain has ${brainPaths.size}/${req.files.length} bootstrap files`, {
      existing: [...brainPaths],
    });

    // ── Step 3: Validate bootstrap structure ──
    const { issues, missingFiles } = validateBootstrap(stack, dp, brainPaths);

    if (issues.length > 0) {
      await pipelineLog(ctx, "bootstrap_issues_found", `Found ${issues.length} bootstrap issues (${issues.filter((i) => i.severity === "critical").length} critical)`, {
        issues: issues.slice(0, 30),
      });
    }

    // ── Step 4: Auto-repair — inject missing files ──
    const injectedFiles: Array<{ path: string; reason: string }> = [];
    const updatedDp = { ...dp };
    const depGraph = updatedDp.dependency_graph || {};
    const graphNodes = depGraph.dependency_graph?.nodes || [];
    const npmDeps = depGraph.npm_dependencies || [];

    for (const filePath of missingFiles) {
      const template = getBootstrapTemplate(stack, filePath, projectName);
      if (template) {
        // Inject into Project Brain
        await upsertNode(ctx, {
          name: filePath.split("/").pop() || filePath,
          file_path: filePath,
          node_type: filePath.endsWith(".json") || filePath.endsWith(".ts") && !filePath.includes("src/")
            ? "config"
            : filePath.endsWith(".tsx") || filePath.endsWith(".jsx")
              ? "component"
              : "file",
          status: "generated",
          metadata: {
            bootstrap: true,
            source: "project-bootstrap-intelligence",
            content: template,
            content_preview: template.slice(0, 200),
            stack,
          },
        });

        // Also add to dependency graph
        const fileDesc = req.files.find((f) => f.path === filePath);
        if (!graphNodes.some((n: any) => n.id === filePath)) {
          graphNodes.push({
            id: filePath,
            type: filePath.endsWith(".json") ? "config" : "page",
            layer: "infra",
            description: fileDesc?.description || `Bootstrap file: ${filePath}`,
          });
        }

        injectedFiles.push({ path: filePath, reason: `Missing ${filePath} — injected from ${stack} template` });

        // Mark the issue as fixed
        const issueIdx = issues.findIndex((i) => i.file_path === filePath && !i.fix_applied);
        if (issueIdx >= 0) {
          issues[issueIdx].fix_applied = `Auto-generated from ${stack} template and injected into Project Brain`;
        }
      }
    }

    // Auto-fix missing dependencies
    for (const dep of req.dependencies) {
      const found = npmDeps.some((d: any) => d.package === dep.name);
      if (!found) {
        npmDeps.push({
          package: dep.name,
          version: "latest",
          dev: dep.dev,
          justification: `Required by ${stack} stack`,
        });
        const issueIdx = issues.findIndex((i) => i.message.includes(`'${dep.name}'`) && !i.fix_applied);
        if (issueIdx >= 0) {
          issues[issueIdx].fix_applied = `Added ${dep.name} to npm_dependencies`;
        }
      }
    }

    if (injectedFiles.length > 0) {
      await pipelineLog(ctx, "bootstrap_files_injected", `Injected ${injectedFiles.length} bootstrap files into Project Brain`, {
        files: injectedFiles,
      });
    }

    // ── Step 5: AI build viability prediction ──
    const brainContext = await generateBrainContext(ctx);
    const fileList = req.files
      .map((f) => {
        const exists = brainPaths.has(f.path) || injectedFiles.some((ij) => ij.path === f.path);
        return `- ${f.path}: ${exists ? "✅ present" : "❌ missing"} (${f.description})`;
      })
      .join("\n");

    const simResult = await callAI({
      prompt: `Analyze this ${stack} project bootstrap for build viability.

## Required Files
${fileList}

## Build Commands
${req.buildCommands.map((c) => `- ${c}`).join("\n")}

## Dependencies
${req.dependencies.map((d) => `- ${d.name} (${d.dev ? "dev" : "runtime"})`).join("\n")}

## Issues Found (${issues.length})
${issues.map((i) => `- [${i.severity}] ${i.message}${i.fix_applied ? ` → FIXED: ${i.fix_applied}` : ""}`).join("\n")}

${brainContext ? `## Project Context\n${brainContext.slice(0, 2000)}` : ""}

Predict if the build commands would succeed. Return JSON:
{
  "would_build": boolean,
  "confidence": number (0-1),
  "build_steps": [
    { "command": "string", "prediction": "pass" | "fail", "reason": "string" }
  ],
  "remaining_risks": ["string"]
}`,
      systemPrompt: "You are a build verification expert. Analyze project bootstraps for build readiness. Return only valid JSON.",
      model: "google/gemini-2.5-flash",
      apiKey,
    });

    let buildPrediction = {
      would_build: true,
      confidence: 0.8,
      build_steps: [] as Array<{ command: string; prediction: string; reason: string }>,
      remaining_risks: [] as string[],
    };
    try {
      const jsonMatch = simResult.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) buildPrediction = JSON.parse(jsonMatch[0]);
    } catch { /* use default */ }

    await pipelineLog(ctx, "bootstrap_build_prediction",
      `Build prediction: ${buildPrediction.would_build ? "PASS" : "FAIL"} (confidence: ${(buildPrediction.confidence * 100).toFixed(0)}%)`,
      { prediction: buildPrediction },
    );

    // If AI predicts failure and there are unfixed critical issues, attempt additional repairs
    if (!buildPrediction.would_build) {
      const unfixedCritical = issues.filter((i) => i.severity === "critical" && !i.fix_applied);
      if (unfixedCritical.length > 0) {
        await pipelineLog(ctx, "bootstrap_repair_needed",
          `Build prediction failed with ${unfixedCritical.length} unfixed critical issues — attempting additional repair`,
        );

        // Try to generate any remaining missing files
        for (const issue of unfixedCritical) {
          if (issue.file_path) {
            const template = getBootstrapTemplate(stack, issue.file_path, projectName);
            if (template) {
              await upsertNode(ctx, {
                name: issue.file_path.split("/").pop() || issue.file_path,
                file_path: issue.file_path,
                node_type: "file",
                status: "generated",
                metadata: { bootstrap: true, source: "bootstrap-repair", content: template, stack },
              });
              issue.fix_applied = "Emergency repair: generated from template after failed build prediction";
              injectedFiles.push({ path: issue.file_path, reason: "Emergency bootstrap repair" });
            }
          }
        }
      }
    }

    // ── Step 6: Store results in discovery_payload ──
    updatedDp.dependency_graph = {
      ...depGraph,
      dependency_graph: { ...(depGraph.dependency_graph || {}), nodes: graphNodes },
      npm_dependencies: npmDeps,
    };
    updatedDp.bootstrap_intelligence = {
      stack,
      validated_at: new Date().toISOString(),
      issues_found: issues.length,
      critical_issues: issues.filter((i) => i.severity === "critical").length,
      fixes_applied: issues.filter((i) => i.fix_applied).length,
      files_injected: injectedFiles.length,
      build_prediction: buildPrediction,
      required_files: req.files.map((f) => f.path),
      existing_in_brain: [...brainPaths],
    };

    await updateInitiative(ctx, {
      stage_status: "bootstrapped",
      discovery_payload: updatedDp,
    });

    // Record decision
    await recordDecision(
      ctx,
      `Bootstrap Intelligence: ${stack} stack validated, ${injectedFiles.length} files injected, build confidence ${(buildPrediction.confidence * 100).toFixed(0)}%`,
      "Ensure structural buildability before scaffold and feature generation",
      `${issues.length} issues found, ${issues.filter((i) => i.fix_applied).length} auto-fixed. Build prediction: ${buildPrediction.would_build ? "PASS" : "FAIL"}`,
      "architecture",
    );

    const summary = `Bootstrap Intelligence: ${stack} stack, ${issues.length} issues (${
      issues.filter((i) => i.severity === "critical").length} critical), ${
      injectedFiles.length} files injected, build confidence ${(buildPrediction.confidence * 100).toFixed(0)}%`;

    await pipelineLog(ctx, "bootstrap_intelligence_complete", `🧠 ${summary}`);

    if (jobId) await completeJob(ctx, jobId, {
      stack,
      issues,
      files_injected: injectedFiles,
      build_prediction: buildPrediction,
    }, { costUsd: simResult.cost || 0, durationMs: 0 });

    return jsonResponse({
      success: true,
      stack,
      issues_found: issues.length,
      critical_issues: issues.filter((i) => i.severity === "critical").length,
      fixes_applied: issues.filter((i) => i.fix_applied).length,
      files_injected: injectedFiles.length,
      build_prediction: buildPrediction.would_build,
      build_confidence: buildPrediction.confidence,
      remaining_risks: buildPrediction.remaining_risks,
    });
  } catch (e) {
    if (jobId) await failJob(ctx, jobId, e instanceof Error ? e.message : "Unknown error");
    await updateInitiative(ctx, { stage_status: "architecture_validated" });
    await pipelineLog(ctx, "bootstrap_intelligence_error", `❌ Bootstrap Intelligence failed: ${e}`);
    return errorResponse(e instanceof Error ? e.message : "Unknown error", 500);
  }
});
