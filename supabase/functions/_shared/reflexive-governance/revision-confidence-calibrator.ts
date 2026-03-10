/**
 * Revision Confidence Calibrator — Sprint 113
 * Calibrates confidence in reflective validation results.
 */

export interface ConfidenceInput {
  metrics_available: number;
  comparison_quality: number;
  displacement_count: number;
  regression_count: number;
}

export function calibrateRevisionConfidence(input: ConfidenceInput): number {
  let confidence = 0.5;

  // More metrics = higher confidence
  if (input.metrics_available >= 5) confidence += 0.2;
  else if (input.metrics_available >= 2) confidence += 0.1;
  else confidence -= 0.2;

  // Good comparison quality boosts confidence
  confidence += (input.comparison_quality - 0.5) * 0.3;

  // Displacement and regression signals reduce confidence in "clean" assessment
  if (input.displacement_count > 0) confidence -= 0.1;
  if (input.regression_count > 0) confidence -= 0.1;

  return Math.round(Math.max(0, Math.min(1, confidence)) * 10000) / 10000;
}
