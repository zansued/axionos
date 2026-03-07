// Platform Stabilization Action Engine — Sprint 34
// Turns drift/oscillation signals into stabilization proposals and bounded actions.

import { StabilizationProposal } from "./platform-stability-guard.ts";

export interface StabilizationAction {
  action_type: string;
  scope_ref: Record<string, unknown> | null;
  target_entities: string[];
  trigger_signals: string[];
  bounded_delta: Record<string, unknown>;
  expected_impact: Record<string, unknown> | null;
  rollback_guard: Record<string, unknown>;
  action_mode: "advisory" | "manual_apply" | "bounded_auto";
  status: "open" | "reviewed" | "applied" | "expired" | "rolled_back" | "rejected";
}

/**
 * Build a stabilization action record from a proposal.
 */
export function buildStabilizationAction(proposal: StabilizationProposal): StabilizationAction {
  return {
    action_type: proposal.action_type,
    scope_ref: { scope: proposal.target_scope },
    target_entities: proposal.target_entities,
    trigger_signals: proposal.trigger_signals,
    bounded_delta: proposal.bounded_delta,
    expected_impact: { expected_outcome: proposal.expected_outcome, expiry_hours: proposal.expiry_hours },
    rollback_guard: proposal.rollback_guard,
    action_mode: proposal.action_mode,
    status: "open",
  };
}

/**
 * Build multiple actions from proposals.
 */
export function buildStabilizationActions(proposals: StabilizationProposal[]): StabilizationAction[] {
  return proposals.map(buildStabilizationAction);
}
