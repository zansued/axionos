/**
 * Change Agenda Review Manager — Sprint 45
 * Manages review lifecycle for orchestrated agendas.
 * Pure functions. No DB access.
 */

export type AgendaReviewStatus = "reviewed" | "accepted" | "rejected" | "archived";

const VALID_TRANSITIONS: Record<string, AgendaReviewStatus[]> = {
  draft: ["reviewed"],
  reviewed: ["accepted", "rejected", "archived"],
  accepted: ["archived"],
  rejected: ["archived"],
  archived: [],
};

export interface AgendaReviewTransition {
  from_status: string;
  to_status: AgendaReviewStatus;
  valid: boolean;
  reason: string | null;
}

export function validateReviewTransition(fromStatus: string, toStatus: AgendaReviewStatus): AgendaReviewTransition {
  const allowed = VALID_TRANSITIONS[fromStatus] || [];
  const valid = allowed.includes(toStatus);
  return {
    from_status: fromStatus,
    to_status: toStatus,
    valid,
    reason: valid ? null : `Transition from "${fromStatus}" to "${toStatus}" is not allowed`,
  };
}

export function getValidTransitions(currentStatus: string): AgendaReviewStatus[] {
  return VALID_TRANSITIONS[currentStatus] || [];
}
