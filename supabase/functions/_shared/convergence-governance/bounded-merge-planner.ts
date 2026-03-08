/**
 * Bounded Merge Planner — Sprint 50
 * Prepares reversible merge plans for compatible architecture modes or strategy variants.
 * Pure functions. No DB access.
 */

export interface MergeInput {
  source_entities: Array<{ key: string; type: string; performance: number }>;
  target_entity: { key: string; type: string };
  merge_safety_score: number;
  rollback_complexity: number;
  tenant_fit_loss: number;
  confidence: number;
}

export interface MergePlan {
  merge_type: "absorb" | "create_shared" | "collapse";
  source_keys: string[];
  target_key: string;
  bounded_merge_score: number;
  rollback_plan: { strategy: string; estimated_effort: string };
  blast_radius: { affected_entities: number; risk_level: string };
  rationale_codes: string[];
}

export function planBoundedMerge(input: MergeInput): MergePlan {
  const rationale: string[] = [];
  const sourceCount = input.source_entities.length;
  const avgPerf = sourceCount > 0
    ? input.source_entities.reduce((s, e) => s + e.performance, 0) / sourceCount
    : 0;

  let mergeType: "absorb" | "create_shared" | "collapse" = "absorb";
  if (sourceCount > 2) mergeType = "collapse";
  else if (sourceCount === 1 && avgPerf > 0.7) mergeType = "absorb";
  else mergeType = "create_shared";

  if (input.merge_safety_score > 0.7) rationale.push("high_merge_safety");
  if (input.tenant_fit_loss > 0.3) rationale.push("moderate_tenant_fit_loss");
  if (input.rollback_complexity > 0.5) rationale.push("complex_rollback");

  const mergeScore = round(clamp(
    input.merge_safety_score * 0.35 + (1 - input.rollback_complexity) * 0.25 +
    (1 - input.tenant_fit_loss) * 0.25 + input.confidence * 0.15,
    0, 1
  ));

  const riskLevel = input.rollback_complexity > 0.6 ? "high" : input.rollback_complexity > 0.3 ? "moderate" : "low";

  return {
    merge_type: mergeType,
    source_keys: input.source_entities.map(e => e.key),
    target_key: input.target_entity.key,
    bounded_merge_score: mergeScore,
    rollback_plan: {
      strategy: input.rollback_complexity > 0.5 ? "staged_rollback" : "instant_rollback",
      estimated_effort: input.rollback_complexity > 0.5 ? "high" : "low",
    },
    blast_radius: { affected_entities: sourceCount + 1, risk_level: riskLevel },
    rationale_codes: rationale,
  };
}

function clamp(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)); }
function round(v: number): number { return Math.round(v * 10000) / 10000; }
