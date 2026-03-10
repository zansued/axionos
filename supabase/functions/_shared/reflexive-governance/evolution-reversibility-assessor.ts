/**
 * Evolution Reversibility Assessor — Sprint 111
 * Assesses how reversible a proposed change is.
 */

export interface ReversibilityInput {
  changes_schema: boolean;
  changes_enums: boolean;
  changes_rls_policies: boolean;
  changes_governance_rules: boolean;
  changes_pipeline_topology: boolean;
  has_data_migration: boolean;
  has_rollback_plan: boolean;
  affected_live_data: boolean;
}

export interface ReversibilityResult {
  posture: "fully_reversible" | "partially_reversible" | "irreversible";
  score: number;       // 0-100 (higher = more reversible)
  barriers: string[];
  recommendation: string;
}

export function assessReversibility(input: ReversibilityInput): ReversibilityResult {
  let score = 100;
  const barriers: string[] = [];

  if (input.changes_pipeline_topology) { score -= 30; barriers.push("Pipeline topology changes are hard to reverse"); }
  if (input.changes_governance_rules) { score -= 25; barriers.push("Governance rule changes affect trust boundaries"); }
  if (input.has_data_migration && input.affected_live_data) { score -= 25; barriers.push("Data migration on live data is partially irreversible"); }
  if (input.changes_enums) { score -= 15; barriers.push("Enum changes require migration coordination"); }
  if (input.changes_schema) { score -= 10; barriers.push("Schema changes need forward-compatible migration"); }
  if (input.changes_rls_policies) { score -= 10; barriers.push("RLS policy changes affect access control"); }
  if (!input.has_rollback_plan) { score -= 15; barriers.push("No rollback plan defined"); }

  score = Math.max(score, 0);

  const posture = score >= 70 ? "fully_reversible" : score >= 40 ? "partially_reversible" : "irreversible";
  const recommendation = posture === "fully_reversible"
    ? "Change is safely reversible. Standard rollback applies."
    : posture === "partially_reversible"
    ? "Partial rollback possible. Document manual recovery steps."
    : "Change is effectively irreversible. Requires maximum governance scrutiny and staged rollout.";

  return { posture, score, barriers, recommendation };
}
