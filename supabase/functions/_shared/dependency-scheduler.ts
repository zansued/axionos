/**
 * Dependency Scheduler — DAG-based execution ordering for AxionOS
 * 
 * Builds a Directed Acyclic Graph from Project Brain nodes/edges,
 * performs topological sorting, and executes files in parallel "waves"
 * where all dependencies of a node are satisfied before it runs.
 */

import { PipelineContext } from "./pipeline-helpers.ts";

// ── Types ──

export type DAGNodeStatus = "pending" | "generating" | "generated" | "failed" | "skipped";

export interface DAGNode {
  id: string;                    // brain node id
  filePath: string;
  fileName: string;
  nodeType: string;
  fileType: string | null;
  description: string;
  subtaskId: string | null;
  storyId: string | null;
  dependencies: Set<string>;     // set of node ids this depends on
  dependents: Set<string>;       // set of node ids that depend on this
  status: DAGNodeStatus;
  retries: number;
  brainNodeId: string;
}

export interface ExecutionDAG {
  nodes: Map<string, DAGNode>;
  waves: string[][];             // computed wave order (arrays of node ids)
  totalNodes: number;
}

export interface SchedulerConfig {
  maxParallelWorkers: number;
  maxRetries: number;
}

const DEFAULT_CONFIG: SchedulerConfig = {
  maxParallelWorkers: 4,
  maxRetries: 2,
};

// ── DAG Building ──

/**
 * Build execution DAG from Project Brain nodes and edges + subtask mapping.
 * Falls back to subtask order if no brain nodes exist.
 */
export async function buildExecutionDAG(
  ctx: PipelineContext,
  subtasksWithMeta: Array<{
    id: string;
    file_path: string | null;
    file_type: string | null;
    description: string;
    story_id: string;
    sort_order: number;
  }>
): Promise<ExecutionDAG> {
  const dag: ExecutionDAG = {
    nodes: new Map(),
    waves: [],
    totalNodes: 0,
  };

  // Only file-based subtasks participate in the DAG
  const fileSubtasks = subtasksWithMeta.filter(st => !!st.file_path);
  if (fileSubtasks.length === 0) return dag;

  // Fetch brain nodes for this initiative
  const { data: brainNodes } = await ctx.serviceClient
    .from("project_brain_nodes")
    .select("id, name, file_path, node_type, status")
    .eq("initiative_id", ctx.initiativeId);

  // Fetch brain edges
  const { data: brainEdges } = await ctx.serviceClient
    .from("project_brain_edges")
    .select("source_node_id, target_node_id, relation_type")
    .eq("initiative_id", ctx.initiativeId)
    .in("relation_type", ["imports", "depends_on"]);

  // Build path → brain node lookup
  const brainByPath = new Map<string, { id: string; node_type: string; status: string }>();
  for (const bn of (brainNodes || [])) {
    if (bn.file_path) brainByPath.set(bn.file_path, bn);
  }

  // Build brain node id → DAG node id mapping
  const brainIdToPath = new Map<string, string>();
  for (const bn of (brainNodes || [])) {
    if (bn.file_path) brainIdToPath.set(bn.id, bn.file_path);
  }

  // Create DAG nodes from subtasks
  const pathToNodeId = new Map<string, string>();
  for (const st of fileSubtasks) {
    const brainNode = brainByPath.get(st.file_path!);
    const nodeId = brainNode?.id || `subtask:${st.id}`;
    
    // Skip already generated nodes (from previous runs)
    if (brainNode?.status === "generated" || brainNode?.status === "validated" || brainNode?.status === "published") {
      continue;
    }

    const dagNode: DAGNode = {
      id: nodeId,
      filePath: st.file_path!,
      fileName: st.file_path!.split("/").pop() || st.file_path!,
      nodeType: brainNode?.node_type || inferNodeType(st.file_type),
      fileType: st.file_type,
      description: st.description,
      subtaskId: st.id,
      storyId: st.story_id,
      dependencies: new Set(),
      dependents: new Set(),
      status: "pending",
      retries: 0,
      brainNodeId: brainNode?.id || "",
    };

    dag.nodes.set(nodeId, dagNode);
    pathToNodeId.set(st.file_path!, nodeId);
  }

  // Add dependency edges from Brain
  for (const edge of (brainEdges || [])) {
    const sourcePath = brainIdToPath.get(edge.source_node_id);
    const targetPath = brainIdToPath.get(edge.target_node_id);
    if (!sourcePath || !targetPath) continue;

    const sourceNodeId = pathToNodeId.get(sourcePath);
    const targetNodeId = pathToNodeId.get(targetPath);
    if (!sourceNodeId || !targetNodeId) continue;

    // source imports target → source depends on target
    const sourceNode = dag.nodes.get(sourceNodeId);
    const targetNode = dag.nodes.get(targetNodeId);
    if (sourceNode && targetNode) {
      sourceNode.dependencies.add(targetNodeId);
      targetNode.dependents.add(sourceNodeId);
    }
  }

  // Add implicit ordering: infrastructure files have no deps, 
  // Apply file-type layer priorities as soft dependencies
  applyLayerPriorities(dag);

  // Detect and break cycles
  breakCycles(dag);

  // Compute waves via topological sort
  dag.waves = computeWaves(dag);
  dag.totalNodes = dag.nodes.size;

  return dag;
}

// ── Wave Computation ──

/**
 * Kahn's algorithm variant that groups nodes by "wave" level.
 * Wave N contains nodes whose dependencies are all in waves < N.
 */
function computeWaves(dag: ExecutionDAG): string[][] {
  const waves: string[][] = [];
  const inDegree = new Map<string, number>();
  
  for (const [id, node] of dag.nodes) {
    // Only count dependencies that are in the DAG (pending nodes)
    let count = 0;
    for (const depId of node.dependencies) {
      if (dag.nodes.has(depId)) count++;
    }
    inDegree.set(id, count);
  }

  const remaining = new Set(dag.nodes.keys());

  while (remaining.size > 0) {
    // Find all nodes with in-degree 0 among remaining
    const wave: string[] = [];
    for (const id of remaining) {
      if ((inDegree.get(id) || 0) === 0) {
        wave.push(id);
      }
    }

    if (wave.length === 0) {
      // All remaining have dependencies — force one with lowest in-degree
      let minId = "";
      let minDeg = Infinity;
      for (const id of remaining) {
        const deg = inDegree.get(id) || 0;
        if (deg < minDeg) { minDeg = deg; minId = id; }
      }
      if (minId) wave.push(minId);
      else break; // safety exit
    }

    // Sort wave by layer priority for deterministic ordering
    wave.sort((a, b) => {
      const na = dag.nodes.get(a)!;
      const nb = dag.nodes.get(b)!;
      return getLayerPriority(na.fileType) - getLayerPriority(nb.fileType);
    });

    waves.push(wave);

    // Remove wave nodes and update in-degrees
    for (const id of wave) {
      remaining.delete(id);
      const node = dag.nodes.get(id)!;
      for (const depId of node.dependents) {
        if (remaining.has(depId)) {
          inDegree.set(depId, (inDegree.get(depId) || 1) - 1);
        }
      }
    }
  }

  return waves;
}

// ── Ready Nodes ──

/**
 * Get nodes that are ready to execute (all dependencies generated).
 */
export function getReadyNodes(dag: ExecutionDAG): DAGNode[] {
  const ready: DAGNode[] = [];
  for (const [_, node] of dag.nodes) {
    if (node.status !== "pending") continue;
    
    let allDepsReady = true;
    for (const depId of node.dependencies) {
      const dep = dag.nodes.get(depId);
      // Dependency satisfied if: generated, or not in DAG (already existed)
      if (dep && dep.status !== "generated" && dep.status !== "skipped") {
        allDepsReady = false;
        break;
      }
    }
    if (allDepsReady) ready.push(node);
  }
  return ready;
}

/**
 * Check if DAG has any pending nodes left.
 */
export function hasPendingNodes(dag: ExecutionDAG): boolean {
  for (const [_, node] of dag.nodes) {
    if (node.status === "pending" || node.status === "generating") return true;
  }
  return false;
}

/**
 * Mark a node's status in the DAG.
 */
export function markNodeStatus(dag: ExecutionDAG, nodeId: string, status: DAGNodeStatus): void {
  const node = dag.nodes.get(nodeId);
  if (node) node.status = status;
}

// ── Import Edge Extraction ──

/**
 * Parse generated code to extract import paths and create Brain edges.
 */
export async function updateBrainEdgesFromImports(
  ctx: PipelineContext,
  filePath: string,
  codeContent: string
): Promise<void> {
  const imports = extractImports(codeContent);
  if (imports.length === 0) return;

  // Get the source node
  const { data: sourceNode } = await ctx.serviceClient
    .from("project_brain_nodes")
    .select("id")
    .eq("initiative_id", ctx.initiativeId)
    .eq("file_path", filePath)
    .maybeSingle();
  
  if (!sourceNode) return;

  // Resolve import paths relative to the file and find matching brain nodes
  const resolvedPaths = imports
    .map(imp => resolveImportPath(filePath, imp))
    .filter(Boolean) as string[];

  for (const targetPath of resolvedPaths) {
    // Try exact match and common extensions
    const candidates = [
      targetPath,
      `${targetPath}.ts`,
      `${targetPath}.tsx`,
      `${targetPath}/index.ts`,
      `${targetPath}/index.tsx`,
    ];

    for (const candidate of candidates) {
      const { data: targetNode } = await ctx.serviceClient
        .from("project_brain_nodes")
        .select("id")
        .eq("initiative_id", ctx.initiativeId)
        .eq("file_path", candidate)
        .maybeSingle();

      if (targetNode) {
        // Check if edge already exists
        const { data: existing } = await ctx.serviceClient
          .from("project_brain_edges")
          .select("id")
          .eq("source_node_id", sourceNode.id)
          .eq("target_node_id", targetNode.id)
          .eq("relation_type", "imports")
          .maybeSingle();

        if (!existing) {
          await ctx.serviceClient.from("project_brain_edges").insert({
            initiative_id: ctx.initiativeId,
            organization_id: ctx.organizationId,
            source_node_id: sourceNode.id,
            target_node_id: targetNode.id,
            relation_type: "imports",
            metadata: { source: "code_extraction", detected_at: new Date().toISOString() },
          });
        }
        break; // Found match, no need to try other candidates
      }
    }
  }
}

/**
 * Extract import paths from TypeScript/JavaScript code.
 */
function extractImports(code: string): string[] {
  const imports: string[] = [];
  
  // ES6 imports: import { X } from "path" | import X from "path"
  const esImportRegex = /(?:import\s+(?:[\w{}\s,*]+)\s+from\s+["'])(\.\.?\/[^"']+|@\/[^"']+)["']/g;
  let match;
  while ((match = esImportRegex.exec(code)) !== null) {
    imports.push(match[1]);
  }

  // Dynamic imports: import("path")
  const dynamicImportRegex = /import\(\s*["'](\.\.?\/[^"']+|@\/[^"']+)["']\s*\)/g;
  while ((match = dynamicImportRegex.exec(code)) !== null) {
    imports.push(match[1]);
  }

  return [...new Set(imports)];
}

/**
 * Resolve an import path relative to the importing file.
 */
function resolveImportPath(fromFile: string, importPath: string): string | null {
  // Handle @/ alias → src/
  if (importPath.startsWith("@/")) {
    return `src/${importPath.slice(2)}`;
  }

  // Handle relative paths
  if (importPath.startsWith("./") || importPath.startsWith("../")) {
    const fromDir = fromFile.substring(0, fromFile.lastIndexOf("/"));
    const parts = [...fromDir.split("/"), ...importPath.split("/")];
    const resolved: string[] = [];
    for (const part of parts) {
      if (part === "." || part === "") continue;
      if (part === "..") { resolved.pop(); continue; }
      resolved.push(part);
    }
    return resolved.join("/");
  }

  // Node module import — not a project file
  return null;
}

// ── Helpers ──

function inferNodeType(fileType: string | null): string {
  const map: Record<string, string> = {
    page: "page", component: "component", hook: "hook",
    service: "service", type: "type", config: "file",
    scaffold: "file", style: "file", schema: "table",
    migration: "table", edge_function: "edge_function",
    util: "util", test: "file",
  };
  return map[fileType || ""] || "file";
}

/**
 * Layer priority for ordering within waves (lower = earlier).
 */
function getLayerPriority(fileType: string | null): number {
  const priorities: Record<string, number> = {
    config: 0, scaffold: 1, schema: 2, migration: 3,
    type: 4, style: 5, util: 6, service: 7,
    hook: 8, component: 9, page: 10, test: 11,
    edge_function: 5,
  };
  return priorities[fileType || ""] ?? 8;
}

/**
 * Apply soft layer-based dependencies:
 * config/scaffold → types → services → hooks → components → pages
 */
function applyLayerPriorities(dag: ExecutionDAG): void {
  // Group nodes by layer
  const layers: Map<number, string[]> = new Map();
  for (const [id, node] of dag.nodes) {
    const priority = getLayerPriority(node.fileType);
    if (!layers.has(priority)) layers.set(priority, []);
    layers.get(priority)!.push(id);
  }

  // Don't add soft deps if brain edges already provide good ordering
  // Only add if very few edges exist
  let totalExplicitEdges = 0;
  for (const [_, node] of dag.nodes) {
    totalExplicitEdges += node.dependencies.size;
  }
  
  // If we have reasonable edge coverage, skip layer priorities
  if (totalExplicitEdges > dag.nodes.size * 0.3) return;

  // Add soft dependencies: each layer depends on all nodes in lower layers
  const sortedLayers = [...layers.entries()].sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < sortedLayers.length; i++) {
    const currentNodes = sortedLayers[i][1];
    const prevNodes = sortedLayers[i - 1][1];
    
    // Only add deps to the immediate previous layer (not all lower)
    for (const currentId of currentNodes) {
      const node = dag.nodes.get(currentId)!;
      // If node already has explicit dependencies, skip soft deps
      if (node.dependencies.size > 0) continue;
      
      for (const prevId of prevNodes) {
        node.dependencies.add(prevId);
        dag.nodes.get(prevId)!.dependents.add(currentId);
      }
    }
  }
}

/**
 * Detect and break cycles by removing the edge with lowest priority.
 */
function breakCycles(dag: ExecutionDAG): void {
  // Simple cycle detection: if topological sort stalls, there's a cycle
  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(nodeId: string): string | null {
    if (stack.has(nodeId)) return nodeId; // cycle found
    if (visited.has(nodeId)) return null;
    
    visited.add(nodeId);
    stack.add(nodeId);
    
    const node = dag.nodes.get(nodeId);
    if (node) {
      for (const depId of node.dependencies) {
        if (dag.nodes.has(depId)) {
          const cycleNode = dfs(depId);
          if (cycleNode) {
            // Break cycle by removing this edge
            node.dependencies.delete(depId);
            dag.nodes.get(depId)?.dependents.delete(nodeId);
            console.warn(`[scheduler] Broke cycle: ${node.filePath} → ${dag.nodes.get(depId)?.filePath}`);
            return null; // cycle broken
          }
        }
      }
    }
    
    stack.delete(nodeId);
    return null;
  }

  for (const id of dag.nodes.keys()) {
    visited.clear();
    stack.clear();
    dfs(id);
  }
}

/**
 * Generate a human-readable execution plan for logging.
 */
export function formatExecutionPlan(dag: ExecutionDAG): string {
  if (dag.waves.length === 0) return "DAG vazio — sem arquivos para executar.";
  
  const lines: string[] = [`Plano de Execução: ${dag.totalNodes} arquivos em ${dag.waves.length} waves\n`];
  for (let i = 0; i < dag.waves.length; i++) {
    const wave = dag.waves[i];
    const nodes = wave.map(id => dag.nodes.get(id)).filter(Boolean) as DAGNode[];
    lines.push(`Wave ${i + 1} (${nodes.length} arquivo${nodes.length > 1 ? "s" : ""}, paralelo):`);
    for (const n of nodes) {
      const deps = [...n.dependencies]
        .map(d => dag.nodes.get(d)?.fileName || "?")
        .join(", ");
      lines.push(`  → ${n.filePath} [${n.fileType || n.nodeType}]${deps ? ` (deps: ${deps})` : ""}`);
    }
  }
  return lines.join("\n");
}
