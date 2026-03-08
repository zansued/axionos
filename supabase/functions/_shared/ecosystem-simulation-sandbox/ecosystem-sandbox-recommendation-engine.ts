/**
 * Ecosystem Sandbox Recommendation Engine — Sprint 59
 * Produces advisory-first recommendations for sandbox scenarios.
 */

export type SandboxRecommendation = 'simulate_more' | 'delay' | 'restrict' | 'reject_path' | 'future_pilot_candidate';

export interface RecommendationInput {
  activation_readiness_score: number;
  policy_conflict_score: number;
  trust_failure_score: number;
  blast_radius_score: number;
  rollback_viability_score: number;
}

export interface RecommendationResult {
  recommendation: SandboxRecommendation;
  recommendation_quality_score: number;
  rationale: string[];
}

export function generateRecommendation(input: RecommendationInput): RecommendationResult {
  const rationale: string[] = [];

  if (input.policy_conflict_score > 0.7 || input.trust_failure_score > 0.7) {
    rationale.push('critical_safety_concerns');
    return { recommendation: 'reject_path', recommendation_quality_score: 0.9, rationale };
  }

  if (input.blast_radius_score > 0.6 && input.rollback_viability_score < 0.4) {
    rationale.push('unrecoverable_blast_radius');
    return { recommendation: 'restrict', recommendation_quality_score: 0.8, rationale };
  }

  if (input.activation_readiness_score >= 0.7) {
    rationale.push('meets_pilot_candidacy_threshold');
    return { recommendation: 'future_pilot_candidate', recommendation_quality_score: 0.85, rationale };
  }

  if (input.activation_readiness_score >= 0.4) {
    rationale.push('needs_more_simulation_evidence');
    return { recommendation: 'simulate_more', recommendation_quality_score: 0.7, rationale };
  }

  rationale.push('insufficient_readiness');
  return { recommendation: 'delay', recommendation_quality_score: 0.75, rationale };
}
