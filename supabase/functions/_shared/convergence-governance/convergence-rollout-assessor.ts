/**
 * Convergence Rollout Assessor — Sprint 50
 * Evaluates rollout readiness, blast radius, rollback viability, and dependency coupling.
 * Pure functions. No DB access.
 */

export interface RolloutInput {
  affected_entity_count: number;
  dependency_depth: number;
  rollback_complexity: number;
  cross_tenant_scope: boolean;
  staged_rollout_possible: boolean;
  confidence: number;
}

export interface RolloutAssessment {
  rollout_safety_score: number;
  rollback_viability_score: number;
  blast_radius_score: number;
  dependency_coupling_score: number;
  staged_rollout_envelope: { phases: number; recommended_cadence: string };
  rationale_codes: string[];
}

export function assessConvergenceRollout(input: RolloutInput): RolloutAssessment {
  const rationale: string[] = [];

  const blastRadius = clamp(input.affected_entity_count / 20, 0, 1);
  const depCoupling = clamp(input.dependency_depth / 10, 0, 1);
  const rollbackViability = clamp(1 - input.rollback_complexity, 0, 1);

  const rolloutSafety = round(clamp(
    (1 - blastRadius) * 0.3 + (1 - depCoupling) * 0.2 + rollbackViability * 0.25 +
    (input.staged_rollout_possible ? 0.15 : 0) + input.confidence * 0.1,
    0, 1
  ));

  if (blastRadius > 0.5) rationale.push("large_blast_radius");
  if (depCoupling > 0.5) rationale.push("deep_dependency_coupling");
  if (rollbackViability < 0.4) rationale.push("low_rollback_viability");
  if (input.cross_tenant_scope) rationale.push("cross_tenant_scope");

  const phases = input.staged_rollout_possible
    ? (blastRadius > 0.5 ? 4 : blastRadius > 0.3 ? 3 : 2)
    : 1;

  return {
    rollout_safety_score: rolloutSafety,
    rollback_viability_score: round(rollbackViability),
    blast_radius_score: round(blastRadius),
    dependency_coupling_score: round(depCoupling),
    staged_rollout_envelope: {
      phases,
      recommended_cadence: phases > 2 ? "weekly" : "immediate",
    },
    rationale_codes: rationale,
  };
}

function clamp(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)); }
function round(v: number): number { return Math.round(v * 10000) / 10000; }
