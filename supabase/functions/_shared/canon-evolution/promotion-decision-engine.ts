/**
 * Promotion Decision Engine — Sprint 118
 * Evaluates whether a candidate should be promoted to canon.
 */

export interface PromotionInput {
  candidate_reliability_score: number;
  novelty_score: number;
  conflict_count: number;
  review_verdicts: string[];
  trial_outcome?: string;
  trial_success_metrics?: Record<string, number>;
}

export interface PromotionDecision {
  recommendation: "promote" | "reject" | "defer" | "sandbox";
  confidence: number;
  reasons: string[];
}

export function evaluatePromotion(input: PromotionInput): PromotionDecision {
  const reasons: string[] = [];
  let score = 0;

  // Source reliability
  if (input.candidate_reliability_score >= 70) { score += 25; reasons.push("High source reliability"); }
  else if (input.candidate_reliability_score >= 40) { score += 10; reasons.push("Moderate source reliability"); }
  else { score -= 10; reasons.push("Low source reliability"); }

  // Conflicts
  if (input.conflict_count === 0) { score += 20; reasons.push("No canon conflicts"); }
  else if (input.conflict_count <= 2) { score += 5; reasons.push(`${input.conflict_count} minor conflicts`); }
  else { score -= 15; reasons.push(`${input.conflict_count} conflicts detected`); }

  // Reviews
  const approvals = input.review_verdicts.filter(v => v === "approve").length;
  const rejections = input.review_verdicts.filter(v => v === "reject").length;
  if (approvals > rejections && approvals >= 2) { score += 25; reasons.push("Positive review consensus"); }
  else if (rejections > approvals) { score -= 20; reasons.push("Negative review consensus"); }
  else { reasons.push("Inconclusive reviews"); }

  // Trial
  if (input.trial_outcome === "success") { score += 20; reasons.push("Trial succeeded"); }
  else if (input.trial_outcome === "failure") { score -= 25; reasons.push("Trial failed"); }

  const confidence = Math.max(0, Math.min(100, 50 + score)) / 100;

  let recommendation: PromotionDecision["recommendation"];
  if (score >= 40) recommendation = "promote";
  else if (score >= 10) recommendation = "sandbox";
  else if (score >= -10) recommendation = "defer";
  else recommendation = "reject";

  return { recommendation, confidence, reasons };
}
