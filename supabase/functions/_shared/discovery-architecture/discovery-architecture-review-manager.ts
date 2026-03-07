/**
 * Discovery Architecture Review Manager — Sprint 37
 * Manages review lifecycle for architecture recommendations.
 * Pure functions. No DB access.
 */

export type ReviewStatus = "reviewed" | "accepted" | "rejected" | "implemented" | "dismissed";
export type RecommendationStatus = "open" | "reviewed" | "accepted" | "rejected" | "implemented" | "dismissed";

export interface ReviewRequest {
  recommendation_id: string;
  current_status: RecommendationStatus;
  target_status: ReviewStatus;
  review_notes?: string;
  review_reason_codes?: string[];
  linked_changes?: Record<string, any>;
}

export interface ReviewResult {
  allowed: boolean;
  recommendation_id: string;
  new_recommendation_status: RecommendationStatus;
  review_status: ReviewStatus;
  rejection_reason?: string;
}

const VALID_TRANSITIONS: Record<RecommendationStatus, ReviewStatus[]> = {
  open: ["reviewed", "dismissed"],
  reviewed: ["accepted", "rejected", "dismissed"],
  accepted: ["implemented", "dismissed"],
  rejected: [],
  implemented: [],
  dismissed: [],
};

export function validateReviewTransition(req: ReviewRequest): ReviewResult {
  const validTargets = VALID_TRANSITIONS[req.current_status] || [];

  if (!validTargets.includes(req.target_status)) {
    return {
      allowed: false,
      recommendation_id: req.recommendation_id,
      new_recommendation_status: req.current_status,
      review_status: req.target_status,
      rejection_reason: `Cannot transition from "${req.current_status}" to "${req.target_status}". Valid: ${validTargets.join(", ") || "none"}`,
    };
  }

  return {
    allowed: true,
    recommendation_id: req.recommendation_id,
    new_recommendation_status: req.target_status as RecommendationStatus,
    review_status: req.target_status,
  };
}
