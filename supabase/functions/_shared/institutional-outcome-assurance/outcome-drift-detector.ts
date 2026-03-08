/**
 * Outcome Drift Detector — Sprint 63
 * Detects recurring variance, instability, and institutional drift signals.
 */

export interface DriftInput {
  variance_scores: number[];
  recurrence_count: number;
  stability_score: number;
}

export interface DriftResult {
  drift_score: number;
  institutional_risk_score: number;
  drift_detected: boolean;
  rationale: string[];
}

export function detectDrift(input: DriftInput): DriftResult {
  const rationale: string[] = [];
  const avgVariance = input.variance_scores.length > 0
    ? input.variance_scores.reduce((a, b) => a + b, 0) / input.variance_scores.length
    : 0;

  let drift = avgVariance * 0.5 + (1 - input.stability_score) * 0.3;
  if (input.recurrence_count > 3) { drift += 0.2; rationale.push('recurring_variance'); }

  const risk = drift * 0.6 + (1 - input.stability_score) * 0.4;

  return {
    drift_score: Math.round(Math.min(1, drift) * 10000) / 10000,
    institutional_risk_score: Math.round(Math.min(1, risk) * 10000) / 10000,
    drift_detected: drift > 0.3,
    rationale,
  };
}
