/**
 * Capability Exposure Governance Recommendation Engine — Sprint 57
 * Produces advisory-first recommendations for review.
 */

export interface GovernanceRecommendationInput {
  capability_name: string;
  exposure_governance_score: number;
  exposure_class: string;
  restriction_severity: string;
  gates_failed: string[];
  bounded_risk_score: number;
}

export type GovernanceRecommendationType = 'recommend_future_candidate' | 'recommend_restrict' | 'recommend_delay' | 'recommend_reject' | 'recommend_sandbox_only';

export interface GovernanceRecommendation {
  capability_name: string;
  recommendation_type: GovernanceRecommendationType;
  priority_score: number;
  rationale: string[];
  suggested_actions: string[];
}

export function generateGovernanceRecommendations(inputs: GovernanceRecommendationInput[]): GovernanceRecommendation[] {
  return inputs.map(input => {
    const rationale: string[] = [];
    const actions: string[] = [];

    if (input.exposure_class === 'never_expose' || input.restriction_severity === 'hard') {
      rationale.push('hard_restriction_or_never_expose');
      return { capability_name: input.capability_name, recommendation_type: 'recommend_restrict' as GovernanceRecommendationType, priority_score: 0, rationale, suggested_actions: ['maintain_restriction'] };
    }

    if (input.bounded_risk_score > 0.7 || input.gates_failed.length > 2) {
      rationale.push('high_risk_or_multiple_gate_failures');
      actions.push('address_gate_failures', 'reduce_risk_exposure');
      return { capability_name: input.capability_name, recommendation_type: 'recommend_reject' as GovernanceRecommendationType, priority_score: 0.1, rationale, suggested_actions: actions };
    }

    if (input.exposure_governance_score < 0.4 || input.gates_failed.length > 1) {
      rationale.push('low_governance_score_or_gate_gaps');
      actions.push('improve_governance_posture');
      return { capability_name: input.capability_name, recommendation_type: 'recommend_delay' as GovernanceRecommendationType, priority_score: 0.3, rationale, suggested_actions: actions };
    }

    if (input.exposure_class === 'sandbox_only' || input.exposure_governance_score < 0.7) {
      rationale.push('sandbox_level_readiness');
      actions.push('prepare_sandbox_environment', 'complete_remaining_gates');
      return { capability_name: input.capability_name, recommendation_type: 'recommend_sandbox_only' as GovernanceRecommendationType, priority_score: input.exposure_governance_score, rationale, suggested_actions: actions };
    }

    rationale.push('governance_thresholds_met');
    actions.push('document_exposure_plan', 'schedule_governance_review');
    return {
      capability_name: input.capability_name,
      recommendation_type: 'recommend_future_candidate' as GovernanceRecommendationType,
      priority_score: Math.round(input.exposure_governance_score * 10000) / 10000,
      rationale,
      suggested_actions: actions,
    };
  }).sort((a, b) => b.priority_score - a.priority_score);
}
