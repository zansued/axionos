/**
 * Convergence Review Manager — Sprint 50
 * Manages governance lifecycle: pending → under_review → approved → rejected → deferred → rolled_out → validated
 * Pure functions. No DB access.
 */

export type ReviewStatus = "pending" | "under_review" | "approved" | "rejected" | "deferred";
export type DecisionStatus = "pending" | "approved" | "rejected" | "deferred" | "rolled_back";

const VALID_TRANSITIONS: Record<ReviewStatus, ReviewStatus[]> = {
  pending: ["under_review", "deferred"],
  under_review: ["approved", "rejected", "deferred"],
  approved: ["deferred"],
  rejected: ["under_review"],
  deferred: ["under_review", "pending"],
};

export function validateReviewTransition(current: ReviewStatus, next: ReviewStatus): { valid: boolean; reason: string } {
  const allowed = VALID_TRANSITIONS[current] || [];
  if (allowed.includes(next)) return { valid: true, reason: `Transition ${current} → ${next} is valid.` };
  return { valid: false, reason: `Transition ${current} → ${next} is not allowed. Valid: ${allowed.join(", ")}` };
}

export function computeGovernancePriority(params: {
  convergence_expected_value: number;
  confidence_score: number;
  fragmentation_risk: number;
  rollback_complexity: number;
}): number {
  const { convergence_expected_value, confidence_score, fragmentation_risk, rollback_complexity } = params;
  const raw = convergence_expected_value * 0.3 + confidence_score * 0.25 + fragmentation_risk * 0.25 + (1 - rollback_complexity) * 0.2;
  return Math.round(Math.max(0, Math.min(1, raw)) * 10000) / 10000;
}
