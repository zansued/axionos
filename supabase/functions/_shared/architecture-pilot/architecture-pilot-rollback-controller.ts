/**
 * Architecture Pilot Rollback Controller — Sprint 41
 *
 * Handles instant rollback of pilots, restoring baseline behavior.
 */

export interface PilotRollbackRequest {
  pilot_id: string;
  pilot_status: string;
  rollback_mode: "manual" | "guardrail_auto";
  rollback_reason: Record<string, unknown>;
  baseline_ref: Record<string, unknown>;
}

export interface PilotRollbackResult {
  can_rollback: boolean;
  reason: string;
  restored_state: Record<string, unknown>;
  rollback_lineage: Record<string, unknown>;
}

export function evaluateRollback(req: PilotRollbackRequest): PilotRollbackResult {
  const rollbackableStatuses = ["active", "paused"];

  if (!rollbackableStatuses.includes(req.pilot_status)) {
    return {
      can_rollback: false,
      reason: `Pilot status '${req.pilot_status}' cannot be rolled back`,
      restored_state: {},
      rollback_lineage: {},
    };
  }

  return {
    can_rollback: true,
    reason: "Rollback approved",
    restored_state: {
      baseline_ref: req.baseline_ref,
      restored_at: new Date().toISOString(),
    },
    rollback_lineage: {
      pilot_id: req.pilot_id,
      rollback_mode: req.rollback_mode,
      rollback_reason: req.rollback_reason,
      rolled_back_at: new Date().toISOString(),
    },
  };
}
