/**
 * Platform Calibration Runner — Sprint 31
 *
 * Applies calibration proposals. Pure application logic.
 */

import type { CalibrationProposal } from "./platform-calibration-proposal-engine.ts";

export interface CalibrationApplication {
  proposal_id: string;
  parameter_key: string;
  scope_ref: Record<string, unknown> | null;
  previous_value: { value: number };
  applied_value: { value: number };
  applied_mode: "manual" | "bounded_auto";
  rollback_guard: Record<string, unknown>;
  outcome_status: "pending";
}

export function buildApplication(
  proposalId: string,
  proposal: CalibrationProposal,
  applyMode: "manual" | "bounded_auto",
): CalibrationApplication {
  return {
    proposal_id: proposalId,
    parameter_key: proposal.parameter_key,
    scope_ref: proposal.scope_ref,
    previous_value: proposal.current_value,
    applied_value: proposal.proposed_value,
    applied_mode: applyMode,
    rollback_guard: proposal.rollback_guard,
    outcome_status: "pending",
  };
}

export function computeParameterUpdate(
  proposal: CalibrationProposal,
): { parameter_key: string; new_value: { value: number } } {
  return {
    parameter_key: proposal.parameter_key,
    new_value: proposal.proposed_value,
  };
}
