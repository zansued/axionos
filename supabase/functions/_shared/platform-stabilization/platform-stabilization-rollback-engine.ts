// Platform Stabilization Rollback Engine — Sprint 34
// Restores previous state when stabilization actions cause harm.

export interface StabilizationRollback {
  stabilization_action_id: string;
  restored_state: Record<string, unknown>;
  rollback_reason: Record<string, unknown>;
  rollback_mode: "manual" | "bounded_auto";
}

/**
 * Build a rollback record for a stabilization action.
 */
export function buildStabilizationRollback(params: {
  stabilization_action_id: string;
  restored_state: Record<string, unknown>;
  rollback_reason: Record<string, unknown>;
  rollback_mode?: "manual" | "bounded_auto";
}): StabilizationRollback {
  return {
    stabilization_action_id: params.stabilization_action_id,
    restored_state: params.restored_state,
    rollback_reason: params.rollback_reason,
    rollback_mode: params.rollback_mode || "manual",
  };
}

/**
 * Determine if a stabilization should be rolled back based on outcome.
 */
export function shouldRollback(outcomeStatus: string, actionMode: string): { recommend: boolean; reason: string } {
  if (outcomeStatus === "harmful") {
    return { recommend: true, reason: "harmful_outcome_detected" };
  }
  if (outcomeStatus === "inconclusive" && actionMode === "bounded_auto") {
    return { recommend: true, reason: "inconclusive_bounded_auto_should_revert" };
  }
  return { recommend: false, reason: "no_rollback_needed" };
}
