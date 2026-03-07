/**
 * Platform Calibration Rollback Engine — Sprint 31
 *
 * Restores previous parameter values when calibration proves harmful.
 * Pure functions. No DB access.
 */

export interface RollbackInput {
  application_id: string;
  parameter_key: string;
  previous_value: { value: number };
  rollback_reason: Record<string, unknown>;
  rollback_mode: "manual" | "bounded_auto";
}

export interface RollbackRecord {
  application_id: string;
  parameter_key: string;
  restored_value: { value: number };
  rollback_reason: Record<string, unknown>;
  rollback_mode: "manual" | "bounded_auto";
}

export function buildRollback(input: RollbackInput): RollbackRecord {
  return {
    application_id: input.application_id,
    parameter_key: input.parameter_key,
    restored_value: input.previous_value,
    rollback_reason: input.rollback_reason,
    rollback_mode: input.rollback_mode,
  };
}

export function shouldAutoRollback(
  outcomeStatus: string,
  rollbackGuard: { auto_rollback_enabled?: boolean },
): boolean {
  return outcomeStatus === "harmful" && rollbackGuard.auto_rollback_enabled === true;
}
