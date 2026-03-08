/**
 * Architecture Pilot Review Manager — Sprint 41
 *
 * Manages the pilot review lifecycle.
 */

export type PilotReviewStatus = "eligible" | "approved" | "paused" | "completed" | "rolled_back" | "rejected" | "archived";

const VALID_TRANSITIONS: Record<string, PilotReviewStatus[]> = {
  draft: ["eligible"],
  eligible: ["approved", "rejected"],
  approved: ["paused", "completed", "rolled_back", "rejected"],
  active: ["paused", "completed", "rolled_back"],
  paused: ["approved", "completed", "rolled_back", "rejected"],
  completed: ["archived"],
  rolled_back: ["archived"],
  rejected: ["archived"],
};

export function canTransition(currentStatus: string, targetStatus: PilotReviewStatus): boolean {
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(targetStatus);
}

export function getValidTransitions(currentStatus: string): PilotReviewStatus[] {
  return VALID_TRANSITIONS[currentStatus] || [];
}
