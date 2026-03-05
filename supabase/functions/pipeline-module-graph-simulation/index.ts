// Layer 3.6 — Module Graph Simulation Engine
// Simulates bundler (Vite/Rollup) module resolution before build.
// Detects broken imports, missing dependencies, and circular references.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";
import { upsertNode, recordError } from "../_shared/brain-helpers.ts";

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

interface ModuleNode {
  path: string;
  imports: ImportRef[];
}

interface ImportRef {
  raw: string;
  resolved: string | null;
  isRelative: boolean;
  isPackage: boolean;
}

interface GraphEdge {
  from: string;
  to: string;
  type: "relative" | "package";
}

interface ModuleGraphReport {
  total_files: number;
  total_imports: number;
  broken_imports: number;
  circular_dependencies: number;
  missing_dependencies: number;
  graph_health_score: number;
  errors: GraphIssue[];
  warnings: GraphIssue[];
  graph: { nodes: string[]; edges: GraphEdge[] };
}

interface GraphIssue {
  type: string;
  file: string;
  detail: string;
}

// ═══════════════════════════════════════════════
// IMPORT EXTRACTION
// ═══════════════════════════════════════════════

const IMPORT_PATTERNS = [
  // import X from "path"
  /import\s+(?:[\w*{}\s,]+)\s+from\s+["']([^"']+)["']/g,
  // import "path" (side-effect)
  /import\s+["']([^"']+)["']/g,
  // export ... from "path"
  /export\s+(?:[\w*{}\s,]+)\s+from\s+["']([^"']+)["']/g,
  // dynamic import("path")
  /import\s*\(\s*["']([^"']+)["']\s*\)/g,
  // require("path")
  /require\s*\(\s*["']([^"']+)["']\s*\)/g,
];

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];
const RESOLVE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".json", ".css", ""];

function extractImports(content: string): string[] {
  const imports = new Set<string>();
  for (const pattern of IMPORT_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (match[1]) imports.add(match[1]);
    }
  }
  return [...imports];
}

function isRelativeImport(spec: string): boolean {
  return spec.startsWith("./") || spec.startsWith("../") || spec.startsWith("/");
}

function isAssetImport(spec: string): boolean {
  return /\.(css|scss|less|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|mp3|mp4|webp|avif)(\?.*)?$/.test(spec);
}

// ═══════════════════════════════════════════════
// PATH RESOLUTION
// ═══════════════════════════════════════════════

function normalizePath(from: string, importSpec: string): string {
  // Remove file extension from `from`
  const dir = from.substring(0, from.lastIndexOf("/")) || ".";
  const parts = [...dir.split("/"), ...importSpec.split("/")];
  const resolved: string[] = [];

  for (const part of parts) {
    if (part === "." || part === "") continue;
    if (part === "..") {
      resolved.pop();
    } else {
      resolved.push(part);
    }
  }
  return resolved.join("/");
}

function resolveAlias(spec: string): string | null {
  // Handle common aliases: @/ → src/
  if (spec.startsWith("@/")) {
    return "src/" + spec.slice(2);
  }
  return null;
}

function tryResolve(normalizedPath: string, allPaths: Set<string>): string | null {
  // Direct match
  if (allPaths.has(normalizedPath)) return normalizedPath;

  // Try with extensions
  for (const ext of RESOLVE_EXTENSIONS) {
    if (allPaths.has(normalizedPath + ext)) return normalizedPath + ext;
  }

  // Try index files
  for (const ext of RESOLVE_EXTENSIONS) {
    if (allPaths.has(normalizedPath + "/index" + ext)) return normalizedPath + "/index" + ext;
  }

  return null;
}

// ═══════════════════════════════════════════════
// CIRCULAR DEPENDENCY DETECTION (DFS)
// ═══════════════════════════════════════════════

function detectCycles(adjacency: Map<string, string[]>): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string) {
    if (inStack.has(node)) {
      const cycleStart = path.indexOf(node);
      if (cycleStart >= 0) {
        cycles.push(path.slice(cycleStart).concat(node));
      }
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    inStack.add(node);
    path.push(node);

    for (const neighbor of adjacency.get(node) || []) {
      dfs(neighbor);
    }

    path.pop();
    inStack.delete(node);
  }

  for (const node of adjacency.keys()) {
    dfs(node);
  }

  return cycles;
}

// ═══════════════════════════════════════════════
// PACKAGE DEPENDENCY CHECK
// ═══════════════════════════════════════════════

const BUILTIN_MODULES = new Set([
  "react", "react-dom", "react-dom/client", "react/jsx-runtime",
]);

function getPackageName(spec: string): string {
  if (spec.startsWith("@")) {
    const parts = spec.split("/");
    return parts.slice(0, 2).join("/");
  }
  return spec.split("/")[0];
}

// ═══════════════════════════════════════════════
// MINIMAL FILE TEMPLATES FOR AUTO-REPAIR
// ═══════════════════════════════════════════════

function generateMinimalTemplate(filePath: string): string {
  const ext = filePath.substring(filePath.lastIndexOf("."));
  const name = filePath.split("/").pop()?.replace(/\.\w+$/, "") || "Module";

  if (ext === ".tsx") {
    if (filePath.includes("/pages/") || filePath.includes("/views/")) {
      return `export default function ${name}() {\n  return <div>${name} Page</div>;\n}\n`;
    }
    if (filePath.includes("/components/")) {
      return `export default function ${name}() {\n  return <div>${name}</div>;\n}\n`;
    }
    if (filePath.includes("/hooks/")) {
      return `export function ${name}() {\n  return {};\n}\n`;
    }
    return `export default function ${name}() {\n  return <div>${name}</div>;\n}\n`;
  }
  if (ext === ".ts") {
    if (filePath.includes("/hooks/")) {
      return `export function ${name}() {\n  return {};\n}\n`;
    }
    if (filePath.includes("/utils/") || filePath.includes("/lib/")) {
      return `// ${name} utility\nexport {};\n`;
    }
    if (filePath.includes("/services/")) {
      return `// ${name} service\nexport const ${name} = {};\n`;
    }
    return `export {};\n`;
  }
  return `// Auto-generated placeholder for ${filePath}\nexport {};\n`;
}

// ═══════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════

serve(async (req) => {
  const result = await bootstrapPipeline(req, "pipeline-module-graph-simulation");
  if (result instanceof Response) return result;
  const { initiative, ctx, serviceClient, body } = result;

  const jobId = await createJob(ctx, "module_graph_simulation", { initiativeId: ctx.initiativeId });
  const startTime = Date.now();

  try {
    // Update status
    await updateInitiative(ctx, { stage_status: "simulating_modules" });

    // ── 1. Load all source files from Project Brain ──
    const validNodeTypes = ["file", "component", "hook", "service", "page", "util", "bootstrap", "scaffold"];
    const { data: brainNodes, error: nodesErr } = await serviceClient
      .from("project_brain_nodes")
      .select("id, name, file_path, node_type, metadata, content_hash")
      .eq("initiative_id", ctx.initiativeId)
      .in("node_type", validNodeTypes);

    if (nodesErr) throw new Error(`Failed to load brain nodes: ${nodesErr.message}`);

    const nodes = brainNodes || [];
    const allPaths = new Set<string>(nodes.filter(n => n.file_path).map(n => n.file_path!));

    // ── 2. Extract package.json dependencies ──
    const pkgNode = nodes.find(n => n.file_path === "package.json" || n.name === "package.json");
    let declaredDeps = new Set<string>();
    if (pkgNode?.metadata) {
      const meta = pkgNode.metadata as any;
      const deps = { ...(meta.dependencies || {}), ...(meta.devDependencies || {}) };
      declaredDeps = new Set(Object.keys(deps));
    }

    // ── 3. Build module graph ──
    const graphNodes: string[] = [];
    const graphEdges: GraphEdge[] = [];
    const adjacency = new Map<string, string[]>();
    const errors: GraphIssue[] = [];
    const warnings: GraphIssue[] = [];
    const missingFiles: string[] = [];
    const missingPackages = new Set<string>();
    let totalImports = 0;
    let brokenImports = 0;

    for (const node of nodes) {
      if (!node.file_path) continue;
      const ext = node.file_path.substring(node.file_path.lastIndexOf("."));
      if (!SOURCE_EXTENSIONS.includes(ext)) continue;

      graphNodes.push(node.file_path);
      adjacency.set(node.file_path, []);

      // Extract content from metadata
      const content = (node.metadata as any)?.content || (node.metadata as any)?.code || "";
      if (!content) continue;

      const imports = extractImports(content);
      totalImports += imports.length;

      for (const imp of imports) {
        // Skip asset imports
        if (isAssetImport(imp)) continue;

        if (isRelativeImport(imp)) {
          // Resolve relative import
          const normalized = normalizePath(node.file_path, imp);
          const resolved = tryResolve(normalized, allPaths);

          if (resolved) {
            graphEdges.push({ from: node.file_path, to: resolved, type: "relative" });
            adjacency.get(node.file_path)!.push(resolved);
          } else {
            brokenImports++;
            // Try alias resolution
            const aliasResolved = resolveAlias(imp);
            if (aliasResolved) {
              const resolved2 = tryResolve(aliasResolved, allPaths);
              if (resolved2) {
                graphEdges.push({ from: node.file_path, to: resolved2, type: "relative" });
                adjacency.get(node.file_path)!.push(resolved2);
                brokenImports--; // Not actually broken
                continue;
              }
            }

            // Determine likely file path for auto-repair
            let likelyPath = normalized;
            if (!likelyPath.match(/\.\w+$/)) {
              likelyPath += ext === ".tsx" ? ".tsx" : ".ts";
            }
            missingFiles.push(likelyPath);

            errors.push({
              type: "missing_module_error",
              file: node.file_path,
              detail: `Import "${imp}" resolves to "${likelyPath}" which does not exist`,
            });
          }
        } else {
          // Package import
          const aliasResolved = resolveAlias(imp);
          if (aliasResolved) {
            const resolved = tryResolve(aliasResolved, allPaths);
            if (resolved) {
              graphEdges.push({ from: node.file_path, to: resolved, type: "relative" });
              adjacency.get(node.file_path)!.push(resolved);
            } else {
              brokenImports++;
              missingFiles.push(aliasResolved + ".ts");
              errors.push({
                type: "missing_module_error",
                file: node.file_path,
                detail: `Alias import "${imp}" resolves to "${aliasResolved}" which does not exist`,
              });
            }
            continue;
          }

          const pkgName = getPackageName(imp);
          if (!BUILTIN_MODULES.has(imp) && !declaredDeps.has(pkgName)) {
            missingPackages.add(pkgName);
            errors.push({
              type: "missing_dependency_error",
              file: node.file_path,
              detail: `Package "${pkgName}" is imported but not declared in package.json`,
            });
          }

          graphEdges.push({ from: node.file_path, to: pkgName, type: "package" });
        }
      }
    }

    // ── 4. Detect circular dependencies ──
    const cycles = detectCycles(adjacency);
    for (const cycle of cycles) {
      warnings.push({
        type: "circular_dependency_warning",
        file: cycle[0],
        detail: `Circular dependency: ${cycle.join(" → ")}`,
      });
    }

    // ── 5. Calculate health score ──
    const totalIssues = brokenImports + missingPackages.size + cycles.length;
    const maxPenalty = Math.max(totalImports, 1);
    const healthScore = Math.max(0, Math.min(1, 1 - (totalIssues / maxPenalty)));

    const report: ModuleGraphReport = {
      total_files: graphNodes.length,
      total_imports: totalImports,
      broken_imports: brokenImports,
      circular_dependencies: cycles.length,
      missing_dependencies: missingPackages.size,
      graph_health_score: Math.round(healthScore * 100) / 100,
      errors,
      warnings,
      graph: { nodes: graphNodes, edges: graphEdges },
    };

    // ── 6. Save report to Project Brain ──
    await upsertNode(ctx, {
      name: "module_graph_report",
      file_path: "module_graph_report.json",
      node_type: "module_graph_report",
      status: "generated",
      metadata: {
        ...report,
        generated_at: new Date().toISOString(),
      },
    });

    // ── 7. Record errors in project_errors ──
    for (const err of errors.slice(0, 50)) {
      await recordError(
        ctx,
        err.detail,
        err.type,
        err.file,
        `Module graph simulation detected: ${err.type}`,
        `Ensure ${err.type === "missing_dependency_error" ? "package is installed" : "file exists"} before build`
      );
    }

    // ── 8. Auto-repair: inject missing files ──
    const uniqueMissing = [...new Set(missingFiles)];
    const repairedFiles: string[] = [];

    for (const filePath of uniqueMissing.slice(0, 20)) {
      const template = generateMinimalTemplate(filePath);
      await upsertNode(ctx, {
        name: filePath.split("/").pop() || filePath,
        file_path: filePath,
        node_type: "file",
        status: "generated",
        metadata: {
          content: template,
          auto_repaired: true,
          source: "module_graph_simulation",
          generated_at: new Date().toISOString(),
        },
      });
      repairedFiles.push(filePath);
    }

    // ── 9. Update initiative status ──
    const passed = brokenImports === 0 && missingPackages.size === 0;
    await updateInitiative(ctx, {
      stage_status: "modules_simulated",
      execution_progress: {
        ...(initiative.execution_progress || {}),
        module_graph: {
          total_files: report.total_files,
          total_imports: report.total_imports,
          broken_imports: report.broken_imports,
          circular_dependencies: report.circular_dependencies,
          missing_dependencies: report.missing_dependencies,
          health_score: report.graph_health_score,
          repaired_files: repairedFiles.length,
          passed,
        },
      },
    });

    await pipelineLog(ctx, "module_graph_simulation_complete",
      `Module Graph: ${report.total_files} files, ${report.total_imports} imports, ${report.broken_imports} broken, ${cycles.length} cycles, score ${report.graph_health_score}`,
      { report: { ...report, graph: undefined } } // Don't log full graph
    );

    const durationMs = Date.now() - startTime;
    if (jobId) {
      await completeJob(ctx, jobId, {
        total_files: report.total_files,
        total_imports: report.total_imports,
        broken_imports: report.broken_imports,
        circular_dependencies: report.circular_dependencies,
        missing_dependencies: report.missing_dependencies,
        health_score: report.graph_health_score,
        repaired_files: repairedFiles.length,
        passed,
      }, { durationMs });
    }

    return jsonResponse({
      success: true,
      total_files: report.total_files,
      total_imports: report.total_imports,
      broken_imports: report.broken_imports,
      circular_dependencies: report.circular_dependencies,
      missing_dependencies: report.missing_dependencies,
      graph_health_score: report.graph_health_score,
      repaired_files: repairedFiles.length,
      missing_packages: [...missingPackages],
      passed,
    });
  } catch (e) {
    console.error("module-graph-simulation error:", e);
    if (jobId) await failJob(ctx, jobId, e instanceof Error ? e.message : "Unknown error");
    await updateInitiative(ctx, { stage_status: "scaffolded" }); // rollback
    return errorResponse(e instanceof Error ? e.message : "Unknown error");
  }
});
