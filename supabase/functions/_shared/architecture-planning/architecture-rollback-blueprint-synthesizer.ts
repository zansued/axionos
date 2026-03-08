/**
 * Architecture Rollback Blueprint Synthesizer — Sprint 39
 * Defines rollback requirements for architecture change plans.
 * Pure functions. No DB access.
 */

export interface RollbackBlueprintInput {
  proposal_type: string;
  target_scope: string;
  affected_layers: string[];
  dependency_graph: Array<{ entity: string; layer: string; depends_on: string[] }>;
  tenant_impact: boolean;
  blast_radius_size: "small" | "medium" | "large" | "critical";
}

export interface RollbackStep {
  step_id: string;
  entity: string;
  action: string;
  order: number;
  safe_stop_condition: string;
}

export interface RollbackBlueprint {
  steps: RollbackStep[];
  rollback_order: string[];
  safe_stop_conditions: string[];
  tenant_rollback_constraints: string[];
  observability_rollback_checks: string[];
  estimated_rollback_complexity: "simple" | "moderate" | "complex" | "critical";
  rollback_confidence: number;
}

export function synthesizeRollbackBlueprint(input: RollbackBlueprintInput): RollbackBlueprint {
  const steps: RollbackStep[] = [];
  let stepId = 0;

  // Reverse dependency order for rollback (most dependent first)
  const entities = input.dependency_graph.map((n) => n.entity);
  const dependencyCounts = new Map<string, number>();
  for (const node of input.dependency_graph) {
    dependencyCounts.set(node.entity, (dependencyCounts.get(node.entity) || 0));
    for (const dep of node.depends_on) {
      dependencyCounts.set(dep, (dependencyCounts.get(dep) || 0) + 1);
    }
  }

  // Sort: most depended-upon entities rolled back last
  const rollbackOrder = [...entities].sort((a, b) => {
    return (dependencyCounts.get(a) || 0) - (dependencyCounts.get(b) || 0);
  });

  for (const entity of rollbackOrder) {
    steps.push({
      step_id: `rb-${++stepId}`,
      entity,
      action: `Restore ${entity} to pre-change state`,
      order: stepId,
      safe_stop_condition: `Verify ${entity} operational after rollback`,
    });
  }

  // Safe stop conditions
  const safeStops: string[] = [
    "All rolled-back components pass health checks",
    "No new errors introduced by rollback",
    "Tenant isolation verified post-rollback",
  ];
  if (input.affected_layers.includes("execution")) {
    safeStops.push("Pipeline execution latency within baseline tolerance");
  }
  if (input.affected_layers.includes("observability")) {
    safeStops.push("Observability coverage restored to pre-change levels");
  }

  // Tenant constraints
  const tenantConstraints: string[] = [];
  if (input.tenant_impact) {
    tenantConstraints.push("Rollback must preserve tenant data isolation");
    tenantConstraints.push("Workspace-specific changes must be rolled back per-workspace");
    tenantConstraints.push("No cross-tenant side effects during rollback");
  }

  // Observability checks
  const obsChecks: string[] = [
    "Verify audit trail records rollback event",
    "Confirm telemetry metrics restored",
  ];
  if (input.affected_layers.includes("observability")) {
    obsChecks.push("Validate observability flow continuity post-rollback");
  }

  // Complexity
  let complexity: RollbackBlueprint["estimated_rollback_complexity"] = "simple";
  if (input.blast_radius_size === "critical" || steps.length > 8) complexity = "critical";
  else if (input.blast_radius_size === "large" || steps.length > 5) complexity = "complex";
  else if (steps.length > 2) complexity = "moderate";

  // Confidence
  let confidence = 0.8;
  if (input.blast_radius_size === "critical") confidence -= 0.3;
  else if (input.blast_radius_size === "large") confidence -= 0.15;
  if (input.tenant_impact) confidence -= 0.1;
  if (input.affected_layers.length > 3) confidence -= 0.1;
  confidence = Math.max(0.1, Math.min(1, confidence));

  return {
    steps,
    rollback_order: rollbackOrder,
    safe_stop_conditions: safeStops,
    tenant_rollback_constraints: tenantConstraints,
    observability_rollback_checks: obsChecks,
    estimated_rollback_complexity: complexity,
    rollback_confidence: Math.round(confidence * 100) / 100,
  };
}
