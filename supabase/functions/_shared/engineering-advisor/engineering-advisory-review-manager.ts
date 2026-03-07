// Engineering Advisory Review Manager — Sprint 35
// Manages review lifecycle for recommendations.

export interface AdvisoryReview {
  recommendation_id: string;
  reviewer_ref: Record<string, unknown> | null;
  review_status: "reviewed" | "accepted" | "rejected" | "implemented" | "dismissed";
  review_notes: string | null;
  review_reason_codes: string[] | null;
  linked_changes: Record<string, unknown> | null;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  open: ["reviewed", "rejected", "dismissed"],
  reviewed: ["accepted", "rejected", "dismissed"],
  accepted: ["implemented", "dismissed"],
  rejected: [],
  implemented: [],
  dismissed: [],
};

export function validateReviewTransition(currentStatus: string, newStatus: string): { valid: boolean; reason: string } {
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed) return { valid: false, reason: `unknown_current_status_${currentStatus}` };
  if (!allowed.includes(newStatus)) return { valid: false, reason: `transition_${currentStatus}_to_${newStatus}_not_allowed` };
  return { valid: true, reason: "valid_transition" };
}

export function buildReview(params: {
  recommendation_id: string;
  review_status: AdvisoryReview["review_status"];
  review_notes?: string;
  review_reason_codes?: string[];
  reviewer_ref?: Record<string, unknown>;
  linked_changes?: Record<string, unknown>;
}): AdvisoryReview {
  return {
    recommendation_id: params.recommendation_id,
    reviewer_ref: params.reviewer_ref || null,
    review_status: params.review_status,
    review_notes: params.review_notes || null,
    review_reason_codes: params.review_reason_codes || null,
    linked_changes: params.linked_changes || null,
  };
}

/**
 * Check if a recommendation is stale (created more than N days ago and still open).
 */
export function isStale(createdAt: string, staleDays: number = 14): boolean {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  return (now - created) > staleDays * 24 * 3600 * 1000;
}
