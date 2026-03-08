/**
 * Capability Registry Review Engine — Sprint 61
 * Produces advisory-first review recommendations for registry actions.
 */

export interface ReviewInput {
  lifecycle_state: string;
  governance_score: number;
  policy_binding_score: number;
  visibility_level: string;
  compatibility_score: number;
}

export interface ReviewResult {
  governance_review_priority_score: number;
  recommendation_status: string;
  required_actions: string[];
  rationale: string[];
}

export function generateReviewRecommendation(input: ReviewInput): ReviewResult {
  const actions: string[] = [];
  const rationale: string[] = [];

  let priority = (1 - input.governance_score) * 0.3 + (1 - input.policy_binding_score) * 0.3 + (1 - input.compatibility_score) * 0.2;

  if (input.policy_binding_score < 0.3) { actions.push('attach_policy_sets'); rationale.push('missing_policy_bindings'); priority += 0.2; }
  if (input.governance_score < 0.4) { actions.push('improve_governance_coverage'); rationale.push('low_governance'); }
  if (input.lifecycle_state === 'deprecated') { actions.push('evaluate_retirement'); rationale.push('deprecated_entry'); }

  let status = 'no_action';
  if (priority >= 0.7) status = 'urgent_review';
  else if (priority >= 0.4) status = 'review_recommended';

  return {
    governance_review_priority_score: Math.round(Math.min(1, priority) * 10000) / 10000,
    recommendation_status: status,
    required_actions: actions,
    rationale,
  };
}
