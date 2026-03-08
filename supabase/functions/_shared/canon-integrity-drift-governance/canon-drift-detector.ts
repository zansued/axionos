/**
 * Canon Drift Detector — Sprint 64
 * Detects recurring divergence, drift accumulation, and systemic canon erosion.
 */

export interface CanonDriftInput {
  inconsistency_scores: number[];
  recurrence_count: number;
  conformance_score: number;
}

export interface CanonDriftResult {
  drift_score: number;
  integrity_risk_score: number;
  drift_detected: boolean;
  rationale: string[];
}

export function detectCanonDrift(input: CanonDriftInput): CanonDriftResult {
  const rationale: string[] = [];
  const avgInconsistency = input.inconsistency_scores.length > 0
    ? input.inconsistency_scores.reduce((a, b) => a + b, 0) / input.inconsistency_scores.length
    : 0;

  let drift = avgInconsistency * 0.5 + (1 - input.conformance_score) * 0.3;
  if (input.recurrence_count > 3) { drift += 0.2; rationale.push('recurring_drift'); }

  const risk = drift * 0.7 + (1 - input.conformance_score) * 0.3;

  return {
    drift_score: Math.round(Math.min(1, drift) * 10000) / 10000,
    integrity_risk_score: Math.round(Math.min(1, risk) * 10000) / 10000,
    drift_detected: drift > 0.3,
    rationale,
  };
}
