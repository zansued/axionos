/**
 * Promotion Readiness Evaluator — Sprint 50
 * Scores whether a local pattern is safe to promote to a broader scope.
 * Pure functions. No DB access.
 */

export interface PromotionInput {
  local_performance_score: number;
  local_adoption_ratio: number;
  cross_tenant_compatibility: number;
  stability_track_record: number;
  rollback_complexity: number;
  maintenance_cost_ratio: number;
  confidence: number;
}

export interface PromotionResult {
  promotion_readiness_score: number;
  rollout_safety_score: number;
  rationale_codes: string[];
  blockers: string[];
}

export function evaluatePromotionReadiness(input: PromotionInput): PromotionResult {
  const rationale: string[] = [];
  const blockers: string[] = [];

  const performance = clamp(input.local_performance_score, 0, 1);
  const adoption = clamp(input.local_adoption_ratio, 0, 1);
  const compat = clamp(input.cross_tenant_compatibility, 0, 1);
  const stability = clamp(input.stability_track_record, 0, 1);
  const rollbackRisk = clamp(input.rollback_complexity, 0, 1);

  if (performance > 0.7) rationale.push("strong_local_performance");
  if (performance < 0.4) blockers.push("weak_local_performance");
  if (adoption < 0.15) blockers.push("low_adoption");
  if (compat < 0.5) blockers.push("low_cross_tenant_compatibility");
  if (stability < 0.5) blockers.push("unstable_track_record");
  if (rollbackRisk > 0.7) blockers.push("high_rollback_complexity");
  if (input.maintenance_cost_ratio > 0.6) rationale.push("high_maintenance_cost_justifies_promotion");

  const readiness = clamp(
    performance * 0.2 + adoption * 0.15 + compat * 0.25 + stability * 0.2 + (1 - rollbackRisk) * 0.1 + input.confidence * 0.1,
    0, 1
  );

  const rolloutSafety = clamp(
    compat * 0.3 + stability * 0.3 + (1 - rollbackRisk) * 0.4,
    0, 1
  );

  return {
    promotion_readiness_score: round(readiness),
    rollout_safety_score: round(rolloutSafety),
    rationale_codes: rationale,
    blockers,
  };
}

function clamp(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)); }
function round(v: number): number { return Math.round(v * 10000) / 10000; }
