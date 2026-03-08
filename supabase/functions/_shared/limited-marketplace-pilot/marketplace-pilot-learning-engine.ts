/**
 * Marketplace Pilot Learning Engine — Sprint 60
 * Extracts useful pilot learnings, success/failure signals, and bounded expansion indicators.
 */

export interface PilotLearning {
  pilot_learning_score: number;
  pilot_value_signal_score: number;
  pilot_expansion_caution_score: number;
  learnings: string[];
  recommendation: string;
}

export function extractPilotLearnings(
  interactionCount: number,
  avgPolicyCompliance: number,
  avgTrustStability: number,
  violationRate: number,
  outcomeAccuracy: number
): PilotLearning {
  const learnings: string[] = [];

  const valueSignal = avgPolicyCompliance * 0.3 + avgTrustStability * 0.3 + (1 - violationRate) * 0.2 + outcomeAccuracy * 0.2;
  const learningScore = interactionCount > 0 ? Math.min(1, valueSignal + 0.1) : 0;

  let expansionCaution = 0;
  if (violationRate > 0.1) { expansionCaution += 0.3; learnings.push('violations_detected_caution_expansion'); }
  if (avgTrustStability < 0.6) { expansionCaution += 0.2; learnings.push('trust_stability_below_threshold'); }
  if (avgPolicyCompliance < 0.7) { expansionCaution += 0.2; learnings.push('policy_compliance_below_threshold'); }
  if (interactionCount < 10) { expansionCaution += 0.1; learnings.push('insufficient_interaction_volume'); }

  expansionCaution = Math.min(1, expansionCaution);

  let recommendation = 'recommend_continue_pilot';
  if (expansionCaution > 0.6) recommendation = 'recommend_restrict_scope';
  else if (expansionCaution > 0.4) recommendation = 'recommend_delay_expansion';
  else if (valueSignal > 0.7 && expansionCaution < 0.2) recommendation = 'recommend_future_activation_candidate';

  if (violationRate > 0.3) recommendation = 'recommend_rollback';

  return {
    pilot_learning_score: Math.round(learningScore * 10000) / 10000,
    pilot_value_signal_score: Math.round(valueSignal * 10000) / 10000,
    pilot_expansion_caution_score: Math.round(expansionCaution * 10000) / 10000,
    learnings,
    recommendation,
  };
}
