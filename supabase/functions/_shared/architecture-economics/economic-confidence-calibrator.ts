// Economic Confidence Calibrator — Sprint 48
// Computes bounded confidence levels based on historical variance and evidence density.

export interface EconomicConfidence {
  confidence_score: number;
  confidence_band: string;
  contributing_factors: string[];
  discount_applied: number;
}

export function calibrateConfidence(params: {
  evidenceDensity: number; // count of evidence sources
  historicalVariance: number; // 0-1, lower = more predictable
  signalAgreement: number; // 0-1, how much signals agree
  dataRecency: number; // 0-1, 1 = very recent data
  changeComplexity: number; // 0-1, 1 = very complex
}): EconomicConfidence {
  const { evidenceDensity, historicalVariance, signalAgreement, dataRecency, changeComplexity } = params;
  const factors: string[] = [];

  let score = 0.3; // base

  // Evidence density: +0.05 per source, max +0.25
  const evidenceBonus = Math.min(0.25, evidenceDensity * 0.05);
  score += evidenceBonus;
  if (evidenceDensity >= 3) factors.push("strong_evidence_base");
  if (evidenceDensity < 2) factors.push("weak_evidence_base");

  // Historical variance penalty
  const variancePenalty = historicalVariance * 0.2;
  score -= variancePenalty;
  if (historicalVariance > 0.6) factors.push("high_historical_variance");

  // Signal agreement boost
  score += signalAgreement * 0.15;
  if (signalAgreement > 0.8) factors.push("strong_signal_agreement");

  // Data recency
  score += dataRecency * 0.1;
  if (dataRecency < 0.3) factors.push("stale_data_warning");

  // Complexity discount
  const complexityDiscount = changeComplexity * 0.15;
  score -= complexityDiscount;
  if (changeComplexity > 0.7) factors.push("high_complexity_discount");

  score = Math.max(0.05, Math.min(0.95, score));
  const rounded = Math.round(score * 100) / 100;

  const band = rounded >= 0.7 ? "high" : rounded >= 0.4 ? "moderate" : "low";

  return {
    confidence_score: rounded,
    confidence_band: band,
    contributing_factors: factors,
    discount_applied: Math.round(complexityDiscount * 100) / 100,
  };
}
