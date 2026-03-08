/**
 * Bounded Completion Recommender — Sprint 65
 * Produces advisory-first recommendations for operating completion.
 */

export interface CompletionRecommendationInput {
  round_enough_score: number;
  certification_readiness_score: number;
  residual_risk_score: number;
  open_surface_score: number;
  gap_count: number;
}

export type RecommendationType = 'certify_baseline' | 'review_gap' | 'accept_residual_risk' | 'postpone_completion_claim' | 'needs_more_evidence';

export interface CompletionRecommendation {
  recommendation: RecommendationType;
  confidence: number;
  rationale: string[];
}

export function recommendCompletionAction(input: CompletionRecommendationInput): CompletionRecommendation {
  const rationale: string[] = [];

  if (input.certification_readiness_score >= 0.7 && input.residual_risk_score < 0.3) {
    rationale.push('high_readiness_low_risk');
    return { recommendation: 'certify_baseline', confidence: input.certification_readiness_score, rationale };
  }

  if (input.residual_risk_score > 0.5) {
    rationale.push('high_residual_risk_requires_review');
    return { recommendation: 'review_gap', confidence: 0.7, rationale };
  }

  if (input.round_enough_score >= 0.6 && input.residual_risk_score >= 0.2 && input.residual_risk_score <= 0.5) {
    rationale.push('round_enough_with_moderate_risk');
    return { recommendation: 'accept_residual_risk', confidence: 0.6, rationale };
  }

  if (input.gap_count > 5 && input.open_surface_score > 0.4) {
    rationale.push('too_many_gaps_and_open_surfaces');
    return { recommendation: 'needs_more_evidence', confidence: 0.5, rationale };
  }

  rationale.push('insufficient_completion_posture');
  return { recommendation: 'postpone_completion_claim', confidence: 0.5, rationale };
}
