/**
 * Mutation Reversibility Engine — Sprint 112
 * Evaluates whether rollback is realistic, not decorative theater.
 */

export interface MutationReversibilityInput {
  changes_schema: boolean;
  changes_enums: boolean;
  changes_rls: boolean;
  changes_topology: boolean;
  changes_governance: boolean;
  changes_contracts: boolean;
  data_migration_required: boolean;
  affected_live_data_volume: string;  // none, low, medium, high
  has_explicit_rollback_plan: boolean;
  rollback_plan_tested: boolean;
  estimated_rollback_time_minutes: number;
  rollback_data_loss_risk: boolean;
}

export interface MutationReversibilityResult {
  viability_score: number;    // 0-100
  posture: string;            // realistic, partial, theatrical, impossible
  barriers: string[];
  checks: Array<{ check: string; passed: boolean; reason: string }>;
  recommendation: string;
}

export function evaluateMutationReversibility(input: MutationReversibilityInput): MutationReversibilityResult {
  const checks: Array<{ check: string; passed: boolean; reason: string }> = [];
  let score = 100;
  const barriers: string[] = [];

  // Schema reversibility
  if (input.changes_schema) {
    const p = !input.data_migration_required;
    checks.push({ check: "schema_reversibility", passed: p, reason: p ? "Schema change is additive" : "Data migration complicates rollback" });
    if (!p) { score -= 15; barriers.push("Data migration required"); }
  }

  if (input.changes_enums) {
    checks.push({ check: "enum_reversibility", passed: false, reason: "Enum changes are hard to reverse in PostgreSQL" });
    score -= 12; barriers.push("Enum changes");
  }

  if (input.changes_topology) {
    checks.push({ check: "topology_reversibility", passed: false, reason: "Pipeline topology changes affect execution flow globally" });
    score -= 25; barriers.push("Topology change");
  }

  if (input.changes_governance) {
    checks.push({ check: "governance_reversibility", passed: false, reason: "Governance rule changes affect trust boundaries" });
    score -= 20; barriers.push("Governance rule change");
  }

  if (input.changes_contracts) {
    checks.push({ check: "contract_reversibility", passed: false, reason: "Execution contracts define agent behavior" });
    score -= 20; barriers.push("Contract change");
  }

  // Rollback plan quality
  if (!input.has_explicit_rollback_plan) {
    checks.push({ check: "rollback_plan_exists", passed: false, reason: "No explicit rollback plan" });
    score -= 15; barriers.push("No rollback plan");
  } else {
    checks.push({ check: "rollback_plan_exists", passed: true, reason: "Rollback plan documented" });
    if (!input.rollback_plan_tested) {
      checks.push({ check: "rollback_plan_tested", passed: false, reason: "Rollback plan not tested" });
      score -= 8; barriers.push("Untested rollback plan");
    }
  }

  if (input.rollback_data_loss_risk) {
    checks.push({ check: "data_loss_risk", passed: false, reason: "Rollback may cause data loss" });
    score -= 15; barriers.push("Data loss risk on rollback");
  }

  if (input.estimated_rollback_time_minutes > 60) {
    checks.push({ check: "rollback_time", passed: false, reason: `Estimated ${input.estimated_rollback_time_minutes}min rollback time` });
    score -= 10; barriers.push("Long rollback time");
  }

  score = Math.max(score, 0);

  const posture = score >= 70 ? "realistic" : score >= 45 ? "partial" : score >= 20 ? "theatrical" : "impossible";
  const recommendation = posture === "realistic"
    ? "Rollback is feasible. Standard deployment safety applies."
    : posture === "partial"
    ? "Partial rollback possible. Document manual recovery steps and test rollback before deployment."
    : posture === "theatrical"
    ? "Rollback plan exists but is not credible. This is rollback theater. Requires redesign or extraordinary approval."
    : "Mutation is effectively irreversible. Requires maximum governance scrutiny and staged rollout with canary.";

  return { viability_score: score, posture, barriers, checks, recommendation };
}
