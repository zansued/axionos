/**
 * Canon Source Trust Evaluator — Sprint 139
 * Evaluates and classifies source trustworthiness for canon intake.
 */

export interface TrustEvaluationInput {
  source_type: string;
  total_candidates: number;
  promoted_count: number;
  rejected_count: number;
  conflict_count: number;
  age_days: number;
  has_review: boolean;
}

export interface TrustEvaluationResult {
  trust_tier: string;
  trust_score: number;
  allowed_ingestion_scope: string;
  review_posture: string;
  promotable: boolean;
  rationale: string[];
}

const TYPE_TRUST_BASE: Record<string, number> = {
  official_framework_docs: 75,
  technical_reference: 65,
  methodology_reference: 60,
  internal_postmortem: 55,
  internal_runtime_learning: 50,
  external_documentation: 40,
};

export function evaluateSourceTrust(input: TrustEvaluationInput): TrustEvaluationResult {
  const rationale: string[] = [];
  let score = TYPE_TRUST_BASE[input.source_type] || 20;

  // Promotion rate bonus
  if (input.total_candidates > 0) {
    const promotionRate = input.promoted_count / input.total_candidates;
    score += Math.round(promotionRate * 20);
    if (promotionRate > 0.5) rationale.push("high_promotion_rate");

    const rejectionRate = input.rejected_count / input.total_candidates;
    score -= Math.round(rejectionRate * 15);
    if (rejectionRate > 0.5) rationale.push("high_rejection_rate");
  }

  // Conflict penalty
  if (input.conflict_count > 3) {
    score -= 10;
    rationale.push("frequent_conflicts");
  }

  // Staleness penalty
  if (input.age_days > 365) {
    score -= 5;
    rationale.push("stale_source");
  }

  // No review penalty
  if (!input.has_review) {
    score -= 10;
    rationale.push("unreviewed");
  }

  score = Math.max(0, Math.min(100, score));

  // Determine tier
  let tier: string;
  let scope: string;
  let posture: string;
  let promotable: boolean;

  if (score >= 75) {
    tier = "trusted";
    scope = "promotable";
    posture = "light_review";
    promotable = true;
    rationale.push("trusted_tier");
  } else if (score >= 55) {
    tier = "verified";
    scope = "candidate_with_review";
    posture = "standard_review";
    promotable = true;
    rationale.push("verified_tier");
  } else if (score >= 35) {
    tier = "provisional";
    scope = "candidate_only";
    posture = "manual_review";
    promotable = false;
    rationale.push("provisional_tier");
  } else {
    tier = "unknown";
    scope = "candidate_only";
    posture = "strict_review";
    promotable = false;
    rationale.push("unknown_tier");
  }

  return {
    trust_tier: tier,
    trust_score: score,
    allowed_ingestion_scope: scope,
    review_posture: posture,
    promotable,
    rationale,
  };
}
