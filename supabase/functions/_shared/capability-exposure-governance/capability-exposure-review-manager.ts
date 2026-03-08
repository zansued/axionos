/**
 * Capability Exposure Review Manager — Sprint 57
 * Manages governance states: proposed, under_review, approved_for_future, delayed, rejected, restricted.
 */

export interface ReviewInput {
  capability_name: string;
  exposure_governance_score: number;
  safety_gate_score: number;
  trust_gate_score: number;
  policy_gate_score: number;
  restriction_severity: string;
  restriction_type: string;
}

export interface ReviewRecommendation {
  capability_name: string;
  recommended_review_status: 'proposed' | 'under_review' | 'approved_for_future' | 'delayed' | 'rejected' | 'restricted';
  governance_review_priority_score: number;
  review_rationale: string[];
  required_actions: string[];
}

export function generateReviewRecommendations(inputs: ReviewInput[]): ReviewRecommendation[] {
  return inputs.map(input => {
    const rationale: string[] = [];
    const actions: string[] = [];

    if (input.restriction_type === 'never_expose') {
      rationale.push('hard_never_expose_restriction');
      return { capability_name: input.capability_name, recommended_review_status: 'restricted' as const, governance_review_priority_score: 0, review_rationale: rationale, required_actions: [] };
    }

    if (input.restriction_severity === 'hard') {
      rationale.push('hard_restriction_active');
      return { capability_name: input.capability_name, recommended_review_status: 'restricted' as const, governance_review_priority_score: 0.1, review_rationale: rationale, required_actions: ['address_hard_restrictions'] };
    }

    if (input.exposure_governance_score < 0.3) {
      rationale.push('very_low_governance_score');
      actions.push('improve_safety_prerequisites', 'improve_policy_coverage');
      return { capability_name: input.capability_name, recommended_review_status: 'rejected' as const, governance_review_priority_score: 0.15, review_rationale: rationale, required_actions: actions };
    }

    if (input.exposure_governance_score < 0.5) {
      rationale.push('below_threshold_governance');
      actions.push('address_gate_gaps');
      return { capability_name: input.capability_name, recommended_review_status: 'delayed' as const, governance_review_priority_score: 0.3, review_rationale: rationale, required_actions: actions };
    }

    if (input.exposure_governance_score < 0.7) {
      rationale.push('partial_governance_readiness');
      actions.push('complete_policy_gates', 'schedule_review');
      return { capability_name: input.capability_name, recommended_review_status: 'under_review' as const, governance_review_priority_score: input.exposure_governance_score, review_rationale: rationale, required_actions: actions };
    }

    rationale.push('meets_governance_thresholds');
    actions.push('document_exposure_constraints', 'prepare_sandbox_validation');
    return {
      capability_name: input.capability_name,
      recommended_review_status: 'approved_for_future' as const,
      governance_review_priority_score: Math.round(input.exposure_governance_score * 10000) / 10000,
      review_rationale: rationale,
      required_actions: actions,
    };
  }).sort((a, b) => b.governance_review_priority_score - a.governance_review_priority_score);
}
