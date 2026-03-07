/**
 * Prompt Rollback Engine — Sprint 22
 *
 * Executes bounded rollback of promoted variants.
 * Only modifies prompt control assignment — nothing else.
 * All rollback actions are auditable and reversible.
 */

export interface RollbackDecision {
  shouldRollback: boolean;
  rollbackMode: "manual" | "bounded_auto";
  reason: string[];
  severity: "warning" | "critical";
}

export interface RollbackAction {
  rolledBackVariantId: string;
  restoredControlVariantId: string;
  rollbackReason: Record<string, unknown>;
  rollbackMode: "manual" | "bounded_auto";
}

/**
 * Evaluate whether a rollback should be triggered based on health status.
 * bounded_auto rollback only triggers for rollback_required status AND
 * when the feature flag is explicitly enabled.
 */
export function evaluateRollbackDecision(
  healthStatus: string,
  regressionFlags: string[],
  boundedAutoEnabled: boolean = false,
): RollbackDecision {
  if (healthStatus === "rollback_required") {
    return {
      shouldRollback: boundedAutoEnabled, // Only auto-rollback if feature-flagged
      rollbackMode: boundedAutoEnabled ? "bounded_auto" : "manual",
      reason: regressionFlags,
      severity: "critical",
    };
  }

  if (healthStatus === "rollback_recommended") {
    return {
      shouldRollback: false, // Never auto-rollback on recommendation
      rollbackMode: "manual",
      reason: regressionFlags,
      severity: "warning",
    };
  }

  return {
    shouldRollback: false,
    rollbackMode: "manual",
    reason: [],
    severity: "warning",
  };
}

/**
 * Build the rollback action record for persistence.
 */
export function buildRollbackAction(
  rolledBackVariantId: string,
  restoredControlVariantId: string,
  regressionFlags: string[],
  rollbackMode: "manual" | "bounded_auto",
): RollbackAction {
  return {
    rolledBackVariantId,
    restoredControlVariantId,
    rollbackReason: {
      flags: regressionFlags,
      timestamp: new Date().toISOString(),
      mode: rollbackMode,
    },
    rollbackMode,
  };
}

/**
 * Safety guard: verify that a rollback action only modifies prompt control assignment.
 * Returns true if the action is safe (bounded).
 */
export function isRollbackBounded(action: RollbackAction): boolean {
  // A rollback is bounded if it only involves variant IDs and reasons
  // No pipeline, governance, billing, or routing fields
  return (
    typeof action.rolledBackVariantId === "string" &&
    typeof action.restoredControlVariantId === "string" &&
    action.rolledBackVariantId !== action.restoredControlVariantId &&
    (action.rollbackMode === "manual" || action.rollbackMode === "bounded_auto")
  );
}
