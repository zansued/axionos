// Repair Policy Updater — AxionOS Sprint 23
// Bounded, reversible policy adjustments based on repair outcomes.

export interface PolicyUpdateInput {
  profile_id: string;
  current_preferred: string;
  current_fallback: string | null;
  current_confidence: number;
  current_support: number;
  current_failures: number;
  outcome: "resolved" | "failed" | "escalated";
  strategy_used: string;
  retry_count: number;
  cost_usd: number;
  duration_ms: number;
}

export interface PolicyAdjustment {
  adjustment_type: "promote_strategy" | "demote_strategy" | "fallback_change" | "watch_flag" | "deprecate_policy";
  adjustment_reason: Record<string, unknown>;
  previous_state: Record<string, unknown>;
  new_state: Record<string, unknown>;
  bounded_delta: Record<string, unknown>;
}

// Bounds
const MAX_CONFIDENCE = 0.95;
const MIN_CONFIDENCE = 0.05;
const SUCCESS_BOOST = 0.03;
const FAILURE_PENALTY = 0.05;
const DEPRECATE_FAILURE_THRESHOLD = 10;
const WATCH_FAILURE_RATIO = 0.5;

/**
 * Compute bounded policy adjustment from an outcome.
 * Returns null if no adjustment needed.
 */
export function computePolicyAdjustment(input: PolicyUpdateInput): PolicyAdjustment | null {
  const prev = {
    confidence: input.current_confidence,
    preferred_strategy: input.current_preferred,
    fallback_strategy: input.current_fallback,
    support_count: input.current_support,
    failure_count: input.current_failures,
  };

  const newSupport = input.outcome === "resolved" ? input.current_support + 1 : input.current_support;
  const newFailures = input.outcome === "failed" ? input.current_failures + 1 : input.current_failures;

  // Deprecate if too many failures
  if (newFailures >= DEPRECATE_FAILURE_THRESHOLD && newSupport < newFailures) {
    return {
      adjustment_type: "deprecate_policy",
      adjustment_reason: { reason: "excessive_failures", failures: newFailures, support: newSupport },
      previous_state: prev,
      new_state: { ...prev, status: "deprecated", failure_count: newFailures },
      bounded_delta: { confidence_delta: 0, status_change: "deprecated" },
    };
  }

  // Watch if failure ratio is high
  const total = newSupport + newFailures;
  if (total >= 5 && newFailures / total >= WATCH_FAILURE_RATIO) {
    const newConf = Math.max(input.current_confidence - FAILURE_PENALTY, MIN_CONFIDENCE);
    return {
      adjustment_type: "watch_flag",
      adjustment_reason: { reason: "high_failure_ratio", ratio: newFailures / total },
      previous_state: prev,
      new_state: { ...prev, status: "watch", confidence: newConf, failure_count: newFailures, support_count: newSupport },
      bounded_delta: { confidence_delta: newConf - input.current_confidence },
    };
  }

  // Success boost
  if (input.outcome === "resolved") {
    const newConf = Math.min(input.current_confidence + SUCCESS_BOOST, MAX_CONFIDENCE);
    if (newConf === input.current_confidence) return null; // no change
    return {
      adjustment_type: "promote_strategy",
      adjustment_reason: { reason: "successful_resolution", strategy: input.strategy_used },
      previous_state: prev,
      new_state: { ...prev, confidence: newConf, support_count: newSupport },
      bounded_delta: { confidence_delta: SUCCESS_BOOST },
    };
  }

  // Failure penalty
  if (input.outcome === "failed") {
    const newConf = Math.max(input.current_confidence - FAILURE_PENALTY, MIN_CONFIDENCE);
    return {
      adjustment_type: "demote_strategy",
      adjustment_reason: { reason: "failed_resolution", strategy: input.strategy_used, retry_count: input.retry_count },
      previous_state: prev,
      new_state: { ...prev, confidence: newConf, failure_count: newFailures },
      bounded_delta: { confidence_delta: -(FAILURE_PENALTY) },
    };
  }

  return null;
}

/**
 * Safety guard: ensure adjustment doesn't contain forbidden mutations.
 */
export function isAdjustmentBounded(adj: PolicyAdjustment): boolean {
  const forbidden = ["mutate_pipeline", "mutate_governance", "mutate_billing", "auto_promote_agent", "delete_history"];
  const keys = Object.keys(adj.new_state);
  return !keys.some((k) => forbidden.includes(k));
}
