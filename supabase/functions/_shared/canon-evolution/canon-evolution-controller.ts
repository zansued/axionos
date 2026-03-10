/**
 * Canon Evolution Controller — Sprint 118
 * Governs lifecycle transitions for canon evolution proposals.
 */

export type EvolutionProposalStatus = "draft" | "open" | "under_trial" | "approved" | "rejected" | "deferred";

const ALLOWED_TRANSITIONS: Record<EvolutionProposalStatus, EvolutionProposalStatus[]> = {
  draft: ["open"],
  open: ["under_trial", "approved", "rejected", "deferred"],
  under_trial: ["approved", "rejected", "deferred"],
  approved: [],
  rejected: [],
  deferred: ["open"],
};

export interface EvolutionTransitionResult {
  allowed: boolean;
  from: string;
  to: string;
  reason: string;
}

export function validateEvolutionTransition(from: EvolutionProposalStatus, to: EvolutionProposalStatus): EvolutionTransitionResult {
  const allowed = ALLOWED_TRANSITIONS[from]?.includes(to) || false;
  return {
    allowed,
    from,
    to,
    reason: allowed
      ? `Transition from '${from}' to '${to}' is valid`
      : `Transition from '${from}' to '${to}' is not allowed. Valid: ${ALLOWED_TRANSITIONS[from]?.join(", ") || "none"}`,
  };
}

export function getAvailableEvolutionTransitions(current: EvolutionProposalStatus): EvolutionProposalStatus[] {
  return ALLOWED_TRANSITIONS[current] || [];
}
