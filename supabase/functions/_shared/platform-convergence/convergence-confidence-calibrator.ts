/**
 * Convergence Confidence Calibrator — Sprint 49
 * Computes bounded confidence based on evidence quality,
 * historical similarity, and outcome variance.
 * Pure functions. No DB access.
 */

export interface ConfidenceInput {
  evidence_density: number;       // number of supporting signals
  historical_outcome_count: number;
  historical_hit_rate: number;    // 0-1
  signal_agreement: number;       // 0-1, how much signals agree
  data_recency_days: number;
  convergence_complexity: number; // 0-1
}

export interface ConfidenceResult {
  confidence_score: number;
  contributing_factors: string[];
  penalties: string[];
}

export function calibrateConvergenceConfidence(input: ConfidenceInput): ConfidenceResult {
  const factors: string[] = [];
  const penalties: string[] = [];

  // Evidence density (0-1 mapped from count)
  const evidenceScore = Math.min(1, input.evidence_density / 10);
  if (evidenceScore > 0.6) factors.push("strong_evidence_density");
  if (evidenceScore < 0.2) penalties.push("weak_evidence");

  // Historical accuracy
  const historyScore = input.historical_outcome_count > 3
    ? input.historical_hit_rate
    : 0.5;
  if (input.historical_outcome_count < 3) penalties.push("insufficient_history");
  if (historyScore > 0.7) factors.push("strong_historical_accuracy");

  // Signal agreement
  if (input.signal_agreement > 0.7) factors.push("high_signal_agreement");
  if (input.signal_agreement < 0.3) penalties.push("low_signal_agreement");

  // Data recency penalty
  const recencyPenalty = input.data_recency_days > 30
    ? Math.min(0.3, (input.data_recency_days - 30) * 0.005)
    : 0;
  if (recencyPenalty > 0.1) penalties.push("stale_data");

  // Complexity penalty
  const complexityPenalty = input.convergence_complexity * 0.2;
  if (input.convergence_complexity > 0.7) penalties.push("high_complexity");

  const raw = evidenceScore * 0.25 + historyScore * 0.3 + input.signal_agreement * 0.25 + (1 - recencyPenalty) * 0.1 + (1 - complexityPenalty) * 0.1;
  const confidence = Math.round(Math.max(0.1, Math.min(0.95, raw)) * 100) / 100;

  return { confidence_score: confidence, contributing_factors: factors, penalties };
}
