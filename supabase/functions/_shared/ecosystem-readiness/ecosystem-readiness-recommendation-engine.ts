/**
 * Ecosystem Readiness Recommendation Engine — Sprint 56
 * Produces advisory-first readiness recommendations for human review.
 */

export interface ReadinessRecommendationInput {
  capability_name: string;
  ecosystem_readiness_score: number;
  safety_prerequisite_score: number;
  policy_readiness_score: number;
  trust_requirement_score: number;
  risk_class: string;
  unmet_prerequisite_count: number;
}

export interface ReadinessRecommendation {
  capability_name: string;
  recommendation_type: 'recommend_prepare' | 'recommend_delay' | 'recommend_never_expose' | 'recommend_reassess_later';
  priority_score: number;
  rationale: string[];
  suggested_actions: string[];
}

export function generateReadinessRecommendations(inputs: ReadinessRecommendationInput[]): ReadinessRecommendation[] {
  return inputs.map(input => {
    const rationale: string[] = [];
    const actions: string[] = [];

    // Never expose
    if (input.risk_class === 'critical') {
      rationale.push('critical_risk_class_prohibits_exposure');
      return { capability_name: input.capability_name, recommendation_type: 'recommend_never_expose' as const, priority_score: 0, rationale, suggested_actions: ['maintain_internal_only_classification'] };
    }

    // Delay
    if (input.unmet_prerequisite_count > 2 || input.safety_prerequisite_score < 0.3) {
      rationale.push('too_many_unmet_prerequisites');
      actions.push('address_safety_prerequisites_first');
      actions.push('improve_governance_coverage');
      return { capability_name: input.capability_name, recommendation_type: 'recommend_delay' as const, priority_score: 0.2, rationale, suggested_actions: actions };
    }

    // Reassess later
    if (input.ecosystem_readiness_score < 0.5 || input.trust_requirement_score < 0.4) {
      rationale.push('readiness_below_threshold');
      if (input.trust_requirement_score < 0.4) { rationale.push('trust_model_insufficient'); actions.push('develop_trust_model'); }
      if (input.policy_readiness_score < 0.5) actions.push('strengthen_policy_foundation');
      return { capability_name: input.capability_name, recommendation_type: 'recommend_reassess_later' as const, priority_score: 0.4, rationale, suggested_actions: actions };
    }

    // Prepare
    rationale.push('meets_readiness_thresholds');
    if (input.ecosystem_readiness_score < 0.8) actions.push('continue_improving_readiness_score');
    actions.push('document_exposure_constraints');
    actions.push('prepare_sandbox_validation');

    const priority = input.ecosystem_readiness_score * 0.4 + input.safety_prerequisite_score * 0.3 + input.policy_readiness_score * 0.15 + input.trust_requirement_score * 0.15;

    return {
      capability_name: input.capability_name,
      recommendation_type: 'recommend_prepare' as const,
      priority_score: Math.round(priority * 10000) / 10000,
      rationale,
      suggested_actions: actions,
    };
  }).sort((a, b) => b.priority_score - a.priority_score);
}
