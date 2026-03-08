/**
 * Change Dependency Graph Builder — Sprint 45
 * Builds dependency graph for architecture change sequencing.
 * Pure functions. No DB access.
 */

import type { NormalizedChangeOpportunity } from "./change-opportunity-normalizer.ts";

export interface DependencyGraphNode {
  signal_id: string;
  change_type: string;
  scope: string;
  depends_on: string[];
  blocks: string[];
}

export interface DependencyGraphResult {
  nodes: DependencyGraphNode[];
  blocked_nodes: string[];
  cycle_flags: string[];
  parallelizable_groups: string[][];
  recommended_order: string[];
}

export function buildDependencyGraph(opportunities: NormalizedChangeOpportunity[]): DependencyGraphResult {
  if (opportunities.length === 0) {
    return { nodes: [], blocked_nodes: [], cycle_flags: [], parallelizable_groups: [], recommended_order: [] };
  }

  const idSet = new Set(opportunities.map((o) => o.signal_id));

  // Build nodes
  const nodes: DependencyGraphNode[] = opportunities.map((o) => ({
    signal_id: o.signal_id,
    change_type: o.normalized_change_type,
    scope: o.affected_scope,
    depends_on: o.dependency_refs.filter((d) => idSet.has(d)),
    blocks: [],
  }));

  // Compute reverse edges
  for (const node of nodes) {
    for (const dep of node.depends_on) {
      const depNode = nodes.find((n) => n.signal_id === dep);
      if (depNode) depNode.blocks.push(node.signal_id);
    }
  }

  // Detect cycles (simple DFS)
  const cycleFlags: string[] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(id: string): boolean {
    if (inStack.has(id)) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    inStack.add(id);
    const node = nodes.find((n) => n.signal_id === id);
    if (node) {
      for (const dep of node.depends_on) {
        if (dfs(dep)) {
          cycleFlags.push(`Cycle detected involving ${id} and ${dep}`);
          return true;
        }
      }
    }
    inStack.delete(id);
    return false;
  }

  for (const node of nodes) dfs(node.signal_id);

  // Blocked nodes = those with unresolved deps outside the set
  const blocked = opportunities
    .filter((o) => o.dependency_refs.some((d) => !idSet.has(d)))
    .map((o) => o.signal_id);

  // Topological sort for recommended order
  const order: string[] = [];
  const sortVisited = new Set<string>();

  function topoSort(id: string) {
    if (sortVisited.has(id)) return;
    sortVisited.add(id);
    const node = nodes.find((n) => n.signal_id === id);
    if (node) {
      for (const dep of node.depends_on) topoSort(dep);
    }
    order.push(id);
  }

  for (const node of nodes) topoSort(node.signal_id);

  // Parallelizable = nodes with no deps on each other
  const noDeps = nodes.filter((n) => n.depends_on.length === 0).map((n) => n.signal_id);
  const parallelizable: string[][] = noDeps.length > 1 ? [noDeps] : [];

  return {
    nodes,
    blocked_nodes: blocked,
    cycle_flags: cycleFlags,
    parallelizable_groups: parallelizable,
    recommended_order: order,
  };
}
