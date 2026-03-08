/**
 * Completion Review Manager — Sprint 65
 * Manages review states for completion validation, residual-risk acceptance, and baseline certification.
 */

export type CompletionReviewStatus =
  | 'incomplete'
  | 'progressing'
  | 'round_enough_candidate'
  | 'needs_review'
  | 'certified_baseline'
  | 'residual_risk_accepted';

export interface ReviewTransitionInput {
  current_status: CompletionReviewStatus;
  requested_status: CompletionReviewStatus;
  round_enough_score: number;
  residual_risk_score: number;
}

export interface ReviewTransitionResult {
  allowed: boolean;
  new_status: CompletionReviewStatus;
  rationale: string[];
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  incomplete: ['progressing'],
  progressing: ['round_enough_candidate', 'needs_review', 'incomplete'],
  round_enough_candidate: ['certified_baseline', 'needs_review', 'residual_risk_accepted', 'progressing'],
  needs_review: ['progressing', 'round_enough_candidate', 'incomplete'],
  certified_baseline: ['needs_review'],
  residual_risk_accepted: ['certified_baseline', 'needs_review'],
};

export function evaluateReviewTransition(input: ReviewTransitionInput): ReviewTransitionResult {
  const rationale: string[] = [];
  const allowed = VALID_TRANSITIONS[input.current_status]?.includes(input.requested_status) ?? false;

  if (!allowed) {
    rationale.push(`transition_${input.current_status}_to_${input.requested_status}_not_allowed`);
    return { allowed: false, new_status: input.current_status, rationale };
  }

  if (input.requested_status === 'certified_baseline' && input.round_enough_score < 0.6) {
    rationale.push('round_enough_score_too_low_for_certification');
    return { allowed: false, new_status: input.current_status, rationale };
  }

  rationale.push(`transition_allowed`);
  return { allowed: true, new_status: input.requested_status, rationale };
}
