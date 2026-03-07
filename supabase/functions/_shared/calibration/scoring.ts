/**
 * Advisory Calibration Scoring — Sprint 20
 *
 * Deterministic, rule-based scoring for calibration signals.
 * All outputs are bounded [0,1], explainable, and evidence-backed.
 *
 * SAFETY: Pure functions. No DB access. No side effects.
 */

import type { CalibrationScoringInput, CalibrationScoringOutput } from "./types.ts";

/**
 * Compute calibration signal strength, confidence, and overcorrection risk.
 */
export function computeCalibrationScore(input: CalibrationScoringInput): CalibrationScoringOutput {
  const { sample_size, acceptance_rate, implementation_rate, positive_outcome_rate, avg_quality_score, avg_usefulness_score, recurrence_count = 0, trend_direction = "stable" } = input;

  // Signal strength: weighted composite of deviation from ideal (0.7 acceptance, 0.5 impl, 0.5 outcome)
  const acceptanceDev = Math.abs(acceptance_rate - 0.7);
  const implDev = Math.abs(implementation_rate - 0.5);
  const outcomeDev = Math.abs(positive_outcome_rate - 0.5);
  const qualityDev = Math.abs(avg_quality_score - 0.7);

  let strength = (acceptanceDev * 0.3 + implDev * 0.25 + outcomeDev * 0.25 + qualityDev * 0.2);
  strength = Math.min(1, Math.max(0, strength * 2)); // scale to [0,1]

  // Boost strength for recurring issues
  if (recurrence_count > 3) strength = Math.min(1, strength * 1.2);
  if (trend_direction === "declining") strength = Math.min(1, strength * 1.15);

  // Confidence based on sample size
  let confidence = 0;
  if (sample_size >= 50) confidence = 0.9;
  else if (sample_size >= 20) confidence = 0.7;
  else if (sample_size >= 10) confidence = 0.5;
  else if (sample_size >= 5) confidence = 0.3;
  else confidence = 0.15;

  // Trend consistency boosts confidence
  if (trend_direction !== "stable") confidence = Math.min(1, confidence * 1.1);

  // Risk of overcorrection: high when sample is small or signal is extreme
  let risk = 0;
  if (sample_size < 10) risk = 0.7;
  else if (sample_size < 20) risk = 0.4;
  else risk = 0.15;

  if (strength > 0.8) risk = Math.min(1, risk + 0.2);

  return {
    signal_strength: Math.round(strength * 1000) / 1000,
    confidence_score: Math.round(confidence * 1000) / 1000,
    risk_of_overcorrection: Math.round(risk * 1000) / 1000,
  };
}

/**
 * Determine if an agent is underperforming based on metrics.
 */
export function isUnderperforming(acceptanceRate: number, implRate: number, avgQuality: number): boolean {
  return acceptanceRate < 0.3 || (implRate < 0.2 && acceptanceRate < 0.5) || avgQuality < 0.3;
}

/**
 * Determine if an agent is high-value based on metrics.
 */
export function isHighValue(acceptanceRate: number, implRate: number, positiveOutcomeRate: number): boolean {
  return acceptanceRate > 0.7 && implRate > 0.5 && positiveOutcomeRate > 0.5;
}

/**
 * Determine if historical context is overweighted.
 * If memory-enriched acceptance rate is significantly LOWER than non-memory, context may be hurting.
 */
export function isContextOverweighted(memoryRate: number, nonMemoryRate: number, sampleSize: number): boolean {
  return sampleSize >= 5 && memoryRate < nonMemoryRate - 0.15;
}

/**
 * Determine if historical context is underused.
 * If memory-enriched acceptance is significantly HIGHER, context is helpful but underused.
 */
export function isContextUnderused(memoryRate: number, nonMemoryRate: number, memoryTotal: number, overallTotal: number): boolean {
  return memoryRate > nonMemoryRate + 0.1 && memoryTotal < overallTotal * 0.3;
}

/**
 * Determine redundancy guard strictness.
 */
export function isRedundancyTooStrict(novelButUsefulCount: number, totalNovel: number): boolean {
  return totalNovel > 3 && (novelButUsefulCount / totalNovel) > 0.5;
}

export function isRedundancyTooWeak(redundantPassthroughCount: number, totalRecommendations: number): boolean {
  return totalRecommendations > 5 && (redundantPassthroughCount / totalRecommendations) > 0.3;
}
