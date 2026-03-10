/**
 * Canon Confidence Scorer — Sprint 115
 * Calculates confidence from validation evidence, recurrence, adoption, and review quality.
 */

export interface ConfidenceInput {
  validation_success_count: number;
  validation_failure_count: number;
  adoption_count: number;
  recurrence_count: number;
  review_score_avg: number; // 0-1
  review_count: number;
  age_days: number;
  source_quality: number; // 0-1
}

export interface ConfidenceResult {
  confidence_score: number;
  confidence_band: "very_low" | "low" | "moderate" | "high" | "very_high";
  factors: Array<{ factor: string; contribution: number }>;
}

export function scoreCanonConfidence(input: ConfidenceInput): ConfidenceResult {
  const factors: ConfidenceResult["factors"] = [];

  // Validation success ratio
  const totalValidations = input.validation_success_count + input.validation_failure_count;
  const validationRatio = totalValidations > 0 ? input.validation_success_count / totalValidations : 0;
  const validationContrib = validationRatio * 0.25;
  factors.push({ factor: "validation_success", contribution: validationContrib });

  // Adoption
  const adoptionContrib = Math.min(0.2, input.adoption_count * 0.02);
  factors.push({ factor: "adoption", contribution: adoptionContrib });

  // Recurrence
  const recurrenceContrib = Math.min(0.15, input.recurrence_count * 0.03);
  factors.push({ factor: "recurrence", contribution: recurrenceContrib });

  // Review quality
  const reviewContrib = input.review_count > 0 ? input.review_score_avg * 0.2 : 0;
  factors.push({ factor: "review_quality", contribution: reviewContrib });

  // Source quality
  const sourceContrib = input.source_quality * 0.1;
  factors.push({ factor: "source_quality", contribution: sourceContrib });

  // Age maturity (peaks around 90 days, decays after 365)
  const ageFactor = input.age_days < 7 ? 0.02 : input.age_days < 90 ? 0.1 : input.age_days < 365 ? 0.08 : 0.04;
  factors.push({ factor: "maturity", contribution: ageFactor });

  const score = Math.min(1, factors.reduce((s, f) => s + f.contribution, 0));

  let band: ConfidenceResult["confidence_band"] = "very_low";
  if (score > 0.8) band = "very_high";
  else if (score > 0.6) band = "high";
  else if (score > 0.4) band = "moderate";
  else if (score > 0.2) band = "low";

  return {
    confidence_score: Math.round(score * 10000) / 10000,
    confidence_band: band,
    factors,
  };
}
