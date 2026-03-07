// Platform Stabilization Outcome Tracker — Sprint 34
// Tracks before/after impact of stabilization actions.

export interface StabilizationOutcome {
  stabilization_action_id: string;
  scope_ref: Record<string, unknown> | null;
  outcome_status: "helpful" | "neutral" | "harmful" | "inconclusive";
  before_metrics: Record<string, number>;
  after_metrics: Record<string, number>;
  evidence_refs: Record<string, unknown>;
}

/**
 * Compare before/after metrics and determine outcome status.
 */
export function evaluateOutcome(
  before: Record<string, number>,
  after: Record<string, number>,
): "helpful" | "neutral" | "harmful" | "inconclusive" {
  const keys = Object.keys(before);
  if (keys.length === 0) return "inconclusive";

  let improved = 0;
  let degraded = 0;

  for (const key of keys) {
    const b = before[key] ?? 0;
    const a = after[key] ?? 0;

    // Higher is better for stability/health metrics
    const isStabilityMetric = key.includes("stability") || key.includes("health") || key.includes("efficiency") || key.includes("success");
    // Lower is better for burden/volatility/churn metrics
    const isBurdenMetric = key.includes("churn") || key.includes("volatility") || key.includes("burden") || key.includes("oscillation") || key.includes("conflict");

    if (isStabilityMetric) {
      if (a > b + 0.02) improved++;
      else if (a < b - 0.02) degraded++;
    } else if (isBurdenMetric) {
      if (a < b - 0.02) improved++;
      else if (a > b + 0.02) degraded++;
    }
  }

  if (improved > 0 && degraded === 0) return "helpful";
  if (degraded > improved) return "harmful";
  if (improved === 0 && degraded === 0) return "neutral";
  return "inconclusive";
}

/**
 * Build a stabilization outcome record.
 */
export function buildOutcome(
  actionId: string,
  before: Record<string, number>,
  after: Record<string, number>,
  scopeRef?: Record<string, unknown>,
): StabilizationOutcome {
  return {
    stabilization_action_id: actionId,
    scope_ref: scopeRef || null,
    outcome_status: evaluateOutcome(before, after),
    before_metrics: before,
    after_metrics: after,
    evidence_refs: { evaluated_at: new Date().toISOString() },
  };
}
