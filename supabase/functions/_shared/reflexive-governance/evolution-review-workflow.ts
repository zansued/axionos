/**
 * Evolution Review Workflow — Sprint 111
 * Manages the review lifecycle for evolution proposals.
 */

import type { ProposalStatus } from "./evolution-proposal-builder.ts";

const VALID_TRANSITIONS: Record<ProposalStatus, ProposalStatus[]> = {
  draft: ["submitted", "archived"],
  submitted: ["under_review", "rejected", "archived"],
  under_review: ["approved", "rejected", "deferred", "archived"],
  approved: ["archived"],
  rejected: ["archived"],
  deferred: ["submitted", "archived"],
  archived: [],
};

export interface ReviewTransitionInput {
  current_status: ProposalStatus;
  target_status: ProposalStatus;
  reviewer_id?: string;
  notes?: string;
}

export interface ReviewTransitionResult {
  allowed: boolean;
  rejection_reason: string | null;
  new_status: ProposalStatus;
}

export function validateProposalTransition(input: ReviewTransitionInput): ReviewTransitionResult {
  const allowed = VALID_TRANSITIONS[input.current_status];
  if (!allowed) {
    return { allowed: false, rejection_reason: `Unknown status: ${input.current_status}`, new_status: input.current_status };
  }
  if (!allowed.includes(input.target_status)) {
    return { allowed: false, rejection_reason: `Transition from '${input.current_status}' to '${input.target_status}' not allowed`, new_status: input.current_status };
  }
  if ((input.target_status === "approved" || input.target_status === "rejected") && !input.reviewer_id) {
    return { allowed: false, rejection_reason: "Reviewer ID required for approval/rejection", new_status: input.current_status };
  }
  return { allowed: true, rejection_reason: null, new_status: input.target_status };
}

export function getAvailableTransitions(status: ProposalStatus): ProposalStatus[] {
  return VALID_TRANSITIONS[status] || [];
}
