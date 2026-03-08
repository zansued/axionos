/**
 * Profile Outcome Validator
 * Compares expected vs realized results after profile adoption.
 */

export interface OutcomeData {
  expected_stability_gain: number;
  realized_stability_gain: number;
  expected_cost_efficiency_gain: number;
  realized_cost_efficiency_gain: number;
  expected_speed_gain: number;
  realized_speed_gain: number;
  expected_fragmentation_reduction: number;
  realized_fragmentation_reduction: number;
}

export interface OutcomeValidation {
  effectivenessScore: number;
  stabilityDelta: number;
  costDelta: number;
  speedDelta: number;
  fragmentationDelta: number;
  outcomeStatus: string;
  explanation: string;
}

export function validateOutcome(data: OutcomeData): OutcomeValidation {
  const stabilityDelta = data.realized_stability_gain - data.expected_stability_gain;
  const costDelta = data.realized_cost_efficiency_gain - data.expected_cost_efficiency_gain;
  const speedDelta = data.realized_speed_gain - data.expected_speed_gain;
  const fragmentationDelta = data.realized_fragmentation_reduction - data.expected_fragmentation_reduction;

  const avgRealized = (
    data.realized_stability_gain +
    data.realized_cost_efficiency_gain +
    data.realized_speed_gain +
    data.realized_fragmentation_reduction
  ) / 4;

  const avgExpected = (
    data.expected_stability_gain +
    data.expected_cost_efficiency_gain +
    data.expected_speed_gain +
    data.expected_fragmentation_reduction
  ) / 4;

  const effectivenessScore = avgExpected > 0
    ? Math.round(Math.min(avgRealized / avgExpected, 1.5) * 100) / 100
    : avgRealized > 0 ? 1 : 0;

  let outcomeStatus: string;
  if (effectivenessScore >= 0.8) outcomeStatus = 'helpful';
  else if (effectivenessScore >= 0.5) outcomeStatus = 'neutral';
  else if (effectivenessScore >= 0.2) outcomeStatus = 'inconclusive';
  else outcomeStatus = 'harmful';

  const explanation = `Profile effectiveness: ${(effectivenessScore * 100).toFixed(0)}%. ` +
    `Stability Δ: ${(stabilityDelta * 100).toFixed(0)}%, Cost Δ: ${(costDelta * 100).toFixed(0)}%, ` +
    `Speed Δ: ${(speedDelta * 100).toFixed(0)}%, Fragmentation Δ: ${(fragmentationDelta * 100).toFixed(0)}%`;

  return {
    effectivenessScore,
    stabilityDelta: Math.round(stabilityDelta * 100) / 100,
    costDelta: Math.round(costDelta * 100) / 100,
    speedDelta: Math.round(speedDelta * 100) / 100,
    fragmentationDelta: Math.round(fragmentationDelta * 100) / 100,
    outcomeStatus,
    explanation,
  };
}
