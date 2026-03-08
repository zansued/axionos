/**
 * Architecture Migration Sequence Rehearsal — Sprint 40
 * Rehearses activation order, dependency sequencing, and migration steps.
 * Pure functions. No DB access.
 */

export interface MigrationStep {
  step_id: string;
  entity: string;
  layer: string;
  depends_on: string[];
  activation_order: number;
}

export interface SequenceRehearsalInput {
  dependency_graph: Array<{ entity: string; layer: string; risk_level: string; depends_on: string[] }>;
  blast_radius: Record<string, any>;
  rollback_blueprint: Record<string, any>;
  target_scope: string;
}

export interface SequenceRehearsalResult {
  staged_sequence: MigrationStep[];
  blocked_steps: Array<{ step_id: string; entity: string; reason: string }>;
  sequencing_confidence: number;
  risk_flags: string[];
  hidden_coupling: Array<{ entity_a: string; entity_b: string; coupling_type: string }>;
  rationale_codes: string[];
}

export function rehearseMigrationSequence(input: SequenceRehearsalInput): SequenceRehearsalResult {
  const graph = input.dependency_graph || [];
  const entitySet = new Set(graph.map((n) => n.entity));
  const steps: MigrationStep[] = [];
  const blocked: Array<{ step_id: string; entity: string; reason: string }> = [];
  const riskFlags: string[] = [];
  const couplings: Array<{ entity_a: string; entity_b: string; coupling_type: string }> = [];
  const rationale: string[] = [];

  // Topological sort for activation order
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const node of graph) {
    inDegree.set(node.entity, 0);
    adj.set(node.entity, []);
  }
  for (const node of graph) {
    for (const dep of node.depends_on) {
      if (entitySet.has(dep)) {
        adj.get(dep)?.push(node.entity);
        inDegree.set(node.entity, (inDegree.get(node.entity) || 0) + 1);
      }
    }
  }

  const queue: string[] = [];
  for (const [entity, deg] of inDegree) {
    if (deg === 0) queue.push(entity);
  }

  let order = 0;
  const visited = new Set<string>();
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    const node = graph.find((n) => n.entity === current);
    steps.push({
      step_id: `ms-${++order}`,
      entity: current,
      layer: node?.layer || "unknown",
      depends_on: node?.depends_on || [],
      activation_order: order,
    });
    for (const next of adj.get(current) || []) {
      inDegree.set(next, (inDegree.get(next) || 0) - 1);
      if ((inDegree.get(next) || 0) <= 0) queue.push(next);
    }
  }

  // Detect circular / unresolvable
  for (const node of graph) {
    if (!visited.has(node.entity)) {
      blocked.push({ step_id: `blk-${node.entity}`, entity: node.entity, reason: "Circular or unresolvable dependency" });
      riskFlags.push(`Circular dependency detected: ${node.entity}`);
    }
  }

  // Hidden coupling detection
  for (let i = 0; i < graph.length; i++) {
    for (let j = i + 1; j < graph.length; j++) {
      const a = graph[i], b = graph[j];
      if (a.layer === b.layer && a.depends_on.some((d) => b.depends_on.includes(d))) {
        couplings.push({ entity_a: a.entity, entity_b: b.entity, coupling_type: "shared_dependency" });
      }
    }
  }

  // Forbidden entity checks
  const forbidden = ["billing", "governance_rules", "plan_enforcement", "hard_safety"];
  for (const step of steps) {
    for (const fp of forbidden) {
      if (step.entity.toLowerCase().includes(fp)) {
        blocked.push({ step_id: step.step_id, entity: step.entity, reason: `Touches forbidden domain: ${fp}` });
      }
    }
  }

  // Confidence
  let confidence = 0.85;
  if (blocked.length > 0) confidence -= 0.3;
  if (couplings.length > 2) confidence -= 0.1;
  if (graph.length > 10) confidence -= 0.1;
  confidence = Math.max(0.1, Math.min(1, confidence));

  if (blocked.length > 0) rationale.push("blocked_steps_detected");
  if (couplings.length > 0) rationale.push("hidden_coupling_detected");
  if (graph.length === 0) rationale.push("empty_dependency_graph");
  if (confidence >= 0.7) rationale.push("high_sequencing_confidence");

  return {
    staged_sequence: steps,
    blocked_steps: blocked,
    sequencing_confidence: Math.round(confidence * 100) / 100,
    risk_flags: riskFlags,
    hidden_coupling: couplings,
    rationale_codes: rationale,
  };
}
