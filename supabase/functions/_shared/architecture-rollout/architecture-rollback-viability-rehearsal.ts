/**
 * Architecture Rollback Viability Rehearsal — Sprint 40
 * Rehearses rollback viability for planned changes.
 * Pure functions. No DB access.
 */

export interface RollbackViabilityInput {
  rollback_blueprint: Record<string, any>;
  dependency_graph: Array<{ entity: string; layer: string; depends_on: string[] }>;
  tenant_impact: boolean;
  blast_radius_size: string;
  affected_layers: string[];
}

export interface RollbackViabilityResult {
  viability_score: number;
  viability_status: "viable" | "partial" | "risky" | "not_viable";
  ordered_rollback_preview: Array<{ step: number; entity: string; action: string }>;
  unwind_risks: string[];
  stop_conditions: string[];
  incomplete_rollback_risks: string[];
  tenant_constraints: string[];
}

export function rehearseRollbackViability(input: RollbackViabilityInput): RollbackViabilityResult {
  const steps = (input.rollback_blueprint?.steps as any[]) || [];
  const rollbackOrder = (input.rollback_blueprint?.rollback_order as string[]) || [];
  const unwindRisks: string[] = [];
  const incompleteRisks: string[] = [];
  const tenantConstraints: string[] = [];

  // Ordered rollback preview
  const preview = steps.map((s: any, i: number) => ({
    step: i + 1,
    entity: s.entity || `step-${i + 1}`,
    action: s.action || "Restore to pre-change state",
  }));

  // Viability scoring
  let score = 0.8;

  if (steps.length === 0) {
    score = 0.1;
    incompleteRisks.push("No rollback steps defined — manual rollback required");
  }

  // Check dependency unwind
  const entitySet = new Set(input.dependency_graph.map((n) => n.entity));
  for (const node of input.dependency_graph) {
    for (const dep of node.depends_on) {
      if (!entitySet.has(dep)) {
        unwindRisks.push(`External dependency ${dep} may not be rollback-safe`);
        score -= 0.05;
      }
    }
  }

  // Blast radius impact
  if (input.blast_radius_size === "critical") {
    score -= 0.25;
    unwindRisks.push("Critical blast radius makes complete rollback uncertain");
  } else if (input.blast_radius_size === "large") {
    score -= 0.1;
    unwindRisks.push("Large blast radius increases rollback risk");
  }

  // Tenant constraints
  if (input.tenant_impact) {
    tenantConstraints.push("Rollback must preserve tenant data isolation");
    tenantConstraints.push("Per-workspace rollback sequencing required");
    tenantConstraints.push("No cross-tenant side effects during rollback");
    score -= 0.1;
  }

  // Layer coverage
  if (input.affected_layers.length > 3) {
    score -= 0.1;
    incompleteRisks.push("Many affected layers increase incomplete rollback risk");
  }

  // Stop conditions
  const stopConditions = [
    "All rolled-back components pass health checks",
    "No new errors introduced by rollback",
  ];
  if (input.tenant_impact) stopConditions.push("Tenant isolation verified post-rollback");
  if (input.affected_layers.includes("execution")) stopConditions.push("Pipeline latency within baseline");
  if (input.affected_layers.includes("observability")) stopConditions.push("Observability coverage restored");

  score = Math.max(0.05, Math.min(1, score));

  let status: RollbackViabilityResult["viability_status"] = "viable";
  if (score < 0.3) status = "not_viable";
  else if (score < 0.5) status = "risky";
  else if (score < 0.7) status = "partial";

  return {
    viability_score: Math.round(score * 100) / 100,
    viability_status: status,
    ordered_rollback_preview: preview,
    unwind_risks: unwindRisks,
    stop_conditions: stopConditions,
    incomplete_rollback_risks: incompleteRisks,
    tenant_constraints: tenantConstraints,
  };
}
