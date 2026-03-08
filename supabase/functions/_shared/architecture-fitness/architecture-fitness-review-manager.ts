/**
 * Architecture Fitness Review Manager — Sprint 44
 */

export type FitnessReviewStatus = "reviewed" | "accepted" | "rejected" | "dismissed" | "archived";
export type FitnessRecStatus = "open" | "reviewed" | "accepted" | "rejected" | "dismissed";

const VALID_REC_TRANSITIONS: Record<FitnessRecStatus, FitnessRecStatus[]> = {
  open: ["reviewed", "dismissed"],
  reviewed: ["accepted", "rejected", "dismissed"],
  accepted: [],
  rejected: [],
  dismissed: [],
};

export function canTransitionRecommendation(current: FitnessRecStatus, target: FitnessRecStatus): boolean {
  return (VALID_REC_TRANSITIONS[current] || []).includes(target);
}

const VALID_REVIEW_TRANSITIONS: Record<FitnessReviewStatus, FitnessReviewStatus[]> = {
  reviewed: ["accepted", "rejected", "dismissed"],
  accepted: ["archived"],
  rejected: ["archived"],
  dismissed: ["archived"],
  archived: [],
};

export function canTransitionReview(current: FitnessReviewStatus, target: FitnessReviewStatus): boolean {
  return (VALID_REVIEW_TRANSITIONS[current] || []).includes(target);
}
