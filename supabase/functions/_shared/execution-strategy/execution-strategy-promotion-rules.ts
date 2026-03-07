/**
 * Execution Strategy Promotion Rules (Sprint 32)
 * Determines if a variant can be promoted based on experiment results.
 */

export interface PromotionDecision {
  can_promote: boolean;
  reasons: string[];
  required_confidence: number;
  actual_confidence: number;
}

export interface PromotionInput {
  verdict: "helpful" | "neutral" | "harmful" | "inconclusive";
  confidence: number;
  sample_size: number;
  scope_breadth: "narrow" | "medium" | "broad";
  family_status: string;
  comparisons: { direction: string; metric: string }[];
}

const SCOPE_CONFIDENCE_REQUIREMENTS: Record<string, number> = {
  narrow: 0.4,
  medium: 0.55,
  broad: 0.7,
};

const MIN_SAMPLE_FOR_PROMOTION = 15;

export function evaluatePromotion(input: PromotionInput): PromotionDecision {
  const reasons: string[] = [];
  const requiredConfidence = SCOPE_CONFIDENCE_REQUIREMENTS[input.scope_breadth] || 0.55;

  // Frozen families cannot accept new variants
  if (input.family_status === "frozen") {
    return { can_promote: false, reasons: ["Family is frozen"], required_confidence: requiredConfidence, actual_confidence: input.confidence };
  }

  if (input.family_status === "deprecated") {
    return { can_promote: false, reasons: ["Family is deprecated"], required_confidence: requiredConfidence, actual_confidence: input.confidence };
  }

  // Must be helpful
  if (input.verdict !== "helpful") {
    reasons.push(`Verdict is ${input.verdict}, not helpful`);
  }

  // Must meet confidence threshold
  if (input.confidence < requiredConfidence) {
    reasons.push(`Confidence ${input.confidence} below required ${requiredConfidence} for ${input.scope_breadth} scope`);
  }

  // Must have sufficient sample
  if (input.sample_size < MIN_SAMPLE_FOR_PROMOTION) {
    reasons.push(`Sample size ${input.sample_size} below minimum ${MIN_SAMPLE_FOR_PROMOTION}`);
  }

  // Check for any harmful metrics
  const worseMetrics = input.comparisons.filter(c => c.direction === "worse");
  if (worseMetrics.length > 0) {
    reasons.push(`${worseMetrics.length} metrics show degradation: ${worseMetrics.map(m => m.metric).join(", ")}`);
  }

  return {
    can_promote: reasons.length === 0,
    reasons,
    required_confidence: requiredConfidence,
    actual_confidence: input.confidence,
  };
}
