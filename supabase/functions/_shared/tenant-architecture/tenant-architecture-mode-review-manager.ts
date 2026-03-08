/**
 * Tenant Architecture Mode Review Manager — Sprint 47
 */

export type ModeReviewStatus = "reviewed" | "accepted" | "rejected" | "deprecated" | "dismissed" | "archived";

const VALID_TRANSITIONS: Record<ModeReviewStatus, ModeReviewStatus[]> = {
  reviewed: ["accepted", "rejected", "dismissed"],
  accepted: ["deprecated", "archived"],
  rejected: ["archived"],
  deprecated: ["archived"],
  dismissed: ["archived"],
  archived: [],
};

export function canTransitionModeReview(current: ModeReviewStatus, target: ModeReviewStatus): boolean {
  return (VALID_TRANSITIONS[current] || []).includes(target);
}

export function validateModeReviewTransition(current: string, target: string): { valid: boolean; reason: string } {
  const allowed = VALID_TRANSITIONS[current as ModeReviewStatus];
  if (!allowed) return { valid: false, reason: `unknown_status_${current}` };
  if (!allowed.includes(target as ModeReviewStatus)) return { valid: false, reason: `transition_${current}_to_${target}_not_allowed` };
  return { valid: true, reason: "valid_transition" };
}
