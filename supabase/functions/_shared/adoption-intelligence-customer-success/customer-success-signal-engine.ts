// Customer Success Signal Engine
// Computes meaningful customer success signals beyond vanity metrics.

export interface SuccessSignalResult {
  success_signal_score: number;
  adoption_score: number;
  journey_completion_rate: number;
  role_based_adoption_quality_score: number;
  product_value_realization_score: number;
  signal_label: string;
  signal_rationale: string;
}

export function computeSuccessSignals(
  milestoneCompletion: number,
  deploySucceeded: boolean,
  hasReturnUsage: boolean,
  frictionScore: number,
  dropoffRisk: number,
): SuccessSignalResult {
  const deployBonus = deploySucceeded ? 0.25 : 0;
  const returnBonus = hasReturnUsage ? 0.15 : 0;
  const frictionPenalty = frictionScore * 0.2;
  const dropoffPenalty = dropoffRisk * 0.15;

  const adoption = Math.max(0, Math.min(1,
    milestoneCompletion * 0.4 + deployBonus + returnBonus - frictionPenalty - dropoffPenalty
  ));

  const successSignal = Math.max(0, Math.min(1,
    adoption * 0.5 + milestoneCompletion * 0.3 + (deploySucceeded ? 0.2 : 0)
  ));

  const journeyCompletion = milestoneCompletion;
  const roleQuality = adoption; // simplified — role-aware in full impl
  const valueRealization = Math.max(0, Math.min(1,
    (deploySucceeded ? 0.4 : 0) + milestoneCompletion * 0.3 + (hasReturnUsage ? 0.3 : 0)
  ));

  const label = successSignal >= 0.7 ? "Strong Success"
    : successSignal >= 0.4 ? "Partial Success"
    : "At Risk";

  return {
    success_signal_score: Number(successSignal.toFixed(3)),
    adoption_score: Number(adoption.toFixed(3)),
    journey_completion_rate: Number(journeyCompletion.toFixed(3)),
    role_based_adoption_quality_score: Number(roleQuality.toFixed(3)),
    product_value_realization_score: Number(valueRealization.toFixed(3)),
    signal_label: label,
    signal_rationale: label === "Strong Success"
      ? "User has progressed well through the journey with successful delivery."
      : label === "Partial Success"
      ? "Some milestones reached but gaps remain in completion or delivery."
      : "Significant friction or incomplete journey. Intervention recommended.",
  };
}
