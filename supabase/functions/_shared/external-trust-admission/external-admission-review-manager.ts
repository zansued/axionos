/**
 * External Admission Review Manager — Sprint 58
 * Manages governance states for admission cases.
 */

export type AdmissionReviewStatus =
  | 'pending'
  | 'under_review'
  | 'restricted'
  | 'delayed'
  | 'rejected'
  | 'sandbox_eligible_future'
  | 'controlled_future_candidate'
  | 'archived';

const VALID_TRANSITIONS: Record<AdmissionReviewStatus, AdmissionReviewStatus[]> = {
  pending: ['under_review', 'restricted', 'delayed', 'rejected'],
  under_review: ['restricted', 'delayed', 'rejected', 'sandbox_eligible_future', 'controlled_future_candidate'],
  restricted: ['under_review', 'archived'],
  delayed: ['under_review', 'rejected', 'archived'],
  rejected: ['archived'],
  sandbox_eligible_future: ['under_review', 'controlled_future_candidate', 'archived'],
  controlled_future_candidate: ['under_review', 'archived'],
  archived: [],
};

export function canTransitionAdmission(current: AdmissionReviewStatus, target: AdmissionReviewStatus): boolean {
  return (VALID_TRANSITIONS[current] || []).includes(target);
}

export function validateAdmissionTransition(current: string, target: string): { valid: boolean; reason: string } {
  const allowed = VALID_TRANSITIONS[current as AdmissionReviewStatus];
  if (!allowed) return { valid: false, reason: `unknown_status_${current}` };
  if (!allowed.includes(target as AdmissionReviewStatus)) return { valid: false, reason: `transition_${current}_to_${target}_not_allowed` };
  return { valid: true, reason: 'valid_transition' };
}
