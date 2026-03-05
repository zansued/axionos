/**
 * Incremental Re-execution Engine
 *
 * Detects which files need regeneration by comparing content_hash in Project Brain.
 * Propagates "dirty" status to dependents: if a dependency changed, its consumers
 * must also be regenerated.
 *
 * Key concepts:
 *  - "clean" node: content_hash matches previous run → skip
 *  - "dirty" node: no hash, hash mismatch, or depends on a dirty node → regenerate
 *  - "cascade dirty": a node whose dependency is dirty (transitive)
 */

import type { PipelineContext } from "./pipeline-helpers.ts";

export interface IncrementalResult {
  /** Subtask IDs that need regeneration */
  dirtySubtaskIds: Set<string>;
  /** File paths that are clean (skip) */
  cleanFilePaths: Set<string>;
  /** File paths that are dirty (regenerate) */
  dirtyFilePaths: Set<string>;
  /** Reason each file is dirty */
  dirtyReasons: Map<string, string>;
  /** Stats */
  stats: IncrementalStats;
}

export interface IncrementalStats {
  totalFiles: number;
  cleanFiles: number;
  dirtyFiles: number;
  cascadeDirty: number;
  newFiles: number;
  hashMismatch: number;
  /** Estimated savings as percentage */
  savingsPercent: number;
}

/**
 * Compute which subtasks need re-execution based on content_hash changes.
 *
 * Algorithm:
 * 1. Fetch all brain nodes with their content_hash
 * 2. For each subtask with a file_path, check if brain node exists with matching hash
 * 3. If hash matches AND status is "generated"/"validated"/"published" → clean
 * 4. Otherwise → dirty
 * 5. Propagate dirty status to dependents (cascade)
 */
export async function computeIncrementalDiff(
  ctx: PipelineContext,
  subtasks: Array<{
    id: string;
    file_path: string | null;
    file_type: string | null;
    description: string;
    story_id: string;
    sort_order: number;
  }>,
): Promise<IncrementalResult> {
  const result: IncrementalResult = {
    dirtySubtaskIds: new Set(),
    cleanFilePaths: new Set(),
    dirtyFilePaths: new Set(),
    dirtyReasons: new Map(),
    stats: {
      totalFiles: 0,
      cleanFiles: 0,
      dirtyFiles: 0,
      cascadeDirty: 0,
      newFiles: 0,
      hashMismatch: 0,
      savingsPercent: 0,
    },
  };

  const fileSubtasks = subtasks.filter(st => !!st.file_path);
  result.stats.totalFiles = fileSubtasks.length;

  if (fileSubtasks.length === 0) return result;

  // 1. Fetch brain nodes
  const { data: brainNodes } = await ctx.serviceClient
    .from("project_brain_nodes")
    .select("id, file_path, content_hash, status, node_type")
    .eq("initiative_id", ctx.initiativeId);

  const nodeByPath = new Map<string, {
    id: string; content_hash: string | null; status: string; node_type: string;
  }>();
  for (const bn of (brainNodes || [])) {
    if (bn.file_path) nodeByPath.set(bn.file_path, bn);
  }

  // 2. Fetch brain edges for cascade detection
  const { data: brainEdges } = await ctx.serviceClient
    .from("project_brain_edges")
    .select("source_node_id, target_node_id")
    .eq("initiative_id", ctx.initiativeId)
    .in("relation_type", ["imports", "depends_on"]);

  // Build dependency graph: nodeId → set of dependent nodeIds
  const dependentsMap = new Map<string, Set<string>>();
  for (const edge of (brainEdges || [])) {
    if (!dependentsMap.has(edge.target_node_id)) {
      dependentsMap.set(edge.target_node_id, new Set());
    }
    dependentsMap.get(edge.target_node_id)!.add(edge.source_node_id);
  }

  // nodeId → filePath for reverse lookup
  const nodeIdToPath = new Map<string, string>();
  for (const bn of (brainNodes || [])) {
    if (bn.file_path) nodeIdToPath.set(bn.id, bn.file_path);
  }
  const pathToNodeId = new Map<string, string>();
  for (const bn of (brainNodes || [])) {
    if (bn.file_path) pathToNodeId.set(bn.file_path, bn.id);
  }

  // 3. Fetch existing subtask outputs to compute current hash
  const subtaskIds = fileSubtasks.map(st => st.id);
  const { data: existingOutputs } = await ctx.serviceClient
    .from("story_subtasks")
    .select("id, file_path, output, status")
    .in("id", subtaskIds.slice(0, 500));

  const outputBySubtaskId = new Map<string, { output: string | null; status: string }>();
  for (const o of (existingOutputs || [])) {
    outputBySubtaskId.set(o.id, { output: o.output, status: o.status });
  }

  // 4. Initial dirty/clean classification
  const subtaskByPath = new Map<string, typeof fileSubtasks[0]>();
  for (const st of fileSubtasks) {
    subtaskByPath.set(st.file_path!, st);

    const brainNode = nodeByPath.get(st.file_path!);
    const existingOutput = outputBySubtaskId.get(st.id);

    if (!brainNode || !brainNode.content_hash) {
      // New file — no brain node or no hash → dirty
      result.dirtySubtaskIds.add(st.id);
      result.dirtyFilePaths.add(st.file_path!);
      result.dirtyReasons.set(st.file_path!, "new_file");
      result.stats.newFiles++;
      continue;
    }

    const isCompleted = ["generated", "validated", "published"].includes(brainNode.status);
    const hasOutput = existingOutput?.status === "completed" && existingOutput.output;

    if (isCompleted && hasOutput) {
      // Compute hash of current description to detect spec changes
      const descHash = simpleHash(st.description + (st.file_type || ""));
      if (brainNode.content_hash === descHash || brainNode.content_hash === String(existingOutput.output!.length)) {
        // Hash matches — clean
        result.cleanFilePaths.add(st.file_path!);
        continue;
      }
    }

    // Hash mismatch or not completed → dirty
    result.dirtySubtaskIds.add(st.id);
    result.dirtyFilePaths.add(st.file_path!);
    result.dirtyReasons.set(st.file_path!, "hash_mismatch");
    result.stats.hashMismatch++;
  }

  // 5. Cascade: mark dependents of dirty nodes as dirty too
  const dirtyNodeIds = new Set<string>();
  for (const fp of result.dirtyFilePaths) {
    const nodeId = pathToNodeId.get(fp);
    if (nodeId) dirtyNodeIds.add(nodeId);
  }

  // BFS propagation
  const queue = [...dirtyNodeIds];
  const visited = new Set<string>(queue);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const dependents = dependentsMap.get(currentId);
    if (!dependents) continue;

    for (const depId of dependents) {
      if (visited.has(depId)) continue;
      visited.add(depId);

      const depPath = nodeIdToPath.get(depId);
      if (!depPath) continue;

      // Only cascade if the file was clean
      if (result.cleanFilePaths.has(depPath)) {
        result.cleanFilePaths.delete(depPath);
        result.dirtyFilePaths.add(depPath);
        result.dirtyReasons.set(depPath, `cascade_from:${nodeIdToPath.get(currentId) || currentId}`);
        result.stats.cascadeDirty++;

        const st = subtaskByPath.get(depPath);
        if (st) result.dirtySubtaskIds.add(st.id);

        queue.push(depId);
      }
    }
  }

  // 6. Compute final stats
  result.stats.cleanFiles = result.cleanFilePaths.size;
  result.stats.dirtyFiles = result.dirtyFilePaths.size;
  result.stats.savingsPercent = result.stats.totalFiles > 0
    ? Math.round((result.stats.cleanFiles / result.stats.totalFiles) * 100)
    : 0;

  return result;
}

/**
 * Compute a simple hash for content comparison.
 * Uses a fast string hash (DJB2 variant).
 */
export function simpleHash(content: string): string {
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash + content.charCodeAt(i)) & 0xffffffff;
  }
  return `djb2:${(hash >>> 0).toString(36)}`;
}
