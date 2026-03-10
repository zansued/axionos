/**
 * Net Effectiveness Scorer — Sprint 113
 * Computes whether a revision produced net system improvement or merely redistributed burden.
 */

export interface EffectivenessInput {
  local_improvement: number;
  displacement_risk: number;
  regression_probability: number;
}

export interface EffectivenessResult {
  net_score: number;
  local_improvement: number;
  displacement_penalty: number;
  regression_penalty: number;
  assessment: "net_positive" | "net_neutral" | "net_negative" | "inconclusive";
  rationale: string[];
}

export function scoreNetEffectiveness(input: EffectivenessInput): EffectivenessResult {
  const rationale: string[] = [];

  const displacementPenalty = input.displacement_risk * 0.6;
  const regressionPenalty = input.regression_probability * 0.4;
  const net = input.local_improvement - displacementPenalty - regressionPenalty;
  const rounded = Math.round(Math.max(-1, Math.min(1, net)) * 10000) / 10000;

  if (input.local_improvement > 0.1) rationale.push("local_improvement_present");
  if (displacementPenalty > 0.1) rationale.push("displacement_penalty_significant");
  if (regressionPenalty > 0.1) rationale.push("regression_penalty_significant");

  let assessment: EffectivenessResult["assessment"];
  if (rounded > 0.05) {
    assessment = "net_positive";
    rationale.push("revision_produced_net_improvement");
  } else if (rounded < -0.05) {
    assessment = "net_negative";
    rationale.push("revision_produced_net_degradation");
  } else if (Math.abs(rounded) <= 0.05 && input.local_improvement > 0) {
    assessment = "net_neutral";
    rationale.push("improvement_offset_by_side_effects");
  } else {
    assessment = "inconclusive";
    rationale.push("insufficient_signal_for_assessment");
  }

  return {
    net_score: rounded,
    local_improvement: Math.round(input.local_improvement * 10000) / 10000,
    displacement_penalty: Math.round(displacementPenalty * 10000) / 10000,
    regression_penalty: Math.round(regressionPenalty * 10000) / 10000,
    assessment,
    rationale,
  };
}
