/**
 * Platform Stabilization v2 Rollback Controller — Sprint 46
 * Rolls back harmful envelopes, releases temporary freezes.
 * Pure functions. No DB access.
 */

export type RollbackScope = "partial" | "full" | "release";
export type RollbackMode = "manual" | "bounded_auto";

export interface RollbackDecision {
  should_rollback: boolean;
  scope: RollbackScope;
  mode: RollbackMode;
  reason: string;
}

export function evaluateRollbackNeed(
  envelopeStatus: string,
  outcomeStatus: string | null,
  overconstrainedDuration: number, // cycles
  harmfulCount: number
): RollbackDecision {
  if (outcomeStatus === "harmful" && harmfulCount >= 2) {
    return { should_rollback: true, scope: "full", mode: "bounded_auto", reason: "Repeated harmful outcomes detected" };
  }

  if (overconstrainedDuration > 5 && envelopeStatus === "active") {
    return { should_rollback: true, scope: "release", mode: "manual", reason: "Envelope active too long without improvement — release recommended" };
  }

  if (outcomeStatus === "harmful") {
    return { should_rollback: true, scope: "partial", mode: "manual", reason: "Single harmful outcome — partial rollback suggested" };
  }

  return { should_rollback: false, scope: "partial", mode: "manual", reason: "No rollback needed" };
}
