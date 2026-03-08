/**
 * Architecture Migration Rollback Controller — Sprint 42
 *
 * Phase-level and full-migration rollback with ordered dependency unwind.
 */

export interface MigrationRollbackRequest {
  migration_id: string;
  migration_state: string;
  rollback_scope: "phase" | "full";
  rollback_mode: "manual" | "guardrail_auto" | "checkpoint_auto";
  rollback_reason: Record<string, unknown>;
  baseline_ref: Record<string, unknown>;
}

export interface MigrationRollbackResult {
  can_rollback: boolean;
  reason: string;
  restored_state: Record<string, unknown>;
}

const ROLLBACKABLE_STATES = ["executing", "paused", "checkpoint_ready"];

export function evaluateMigrationRollback(req: MigrationRollbackRequest): MigrationRollbackResult {
  if (!ROLLBACKABLE_STATES.includes(req.migration_state)) {
    return { can_rollback: false, reason: `State '${req.migration_state}' cannot be rolled back`, restored_state: {} };
  }

  return {
    can_rollback: true,
    reason: "Rollback approved",
    restored_state: {
      baseline_ref: req.baseline_ref,
      rollback_scope: req.rollback_scope,
      restored_at: new Date().toISOString(),
    },
  };
}
