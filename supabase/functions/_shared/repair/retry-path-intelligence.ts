// Retry Path Intelligence — AxionOS Sprint 23
// Reduces unproductive retry loops through contextual strategy switching.

export type RetryAction =
  | "retry_same_strategy"
  | "retry_modified_prompt"
  | "switch_strategy"
  | "escalate_to_prevention"
  | "escalate_to_human";

export interface RetryContext {
  retry_count: number;
  last_outcome: "pending" | "resolved" | "failed" | "escalated";
  same_strategy_failures: number;
  has_alternative_strategy: boolean;
  has_prevention_candidate: boolean;
  error_is_novel: boolean;
}

/**
 * Determine the next retry action based on context.
 * Deterministic, pure function.
 */
export function computeRetryAction(ctx: RetryContext): RetryAction {
  // First attempt — always try as-is
  if (ctx.retry_count === 0) return "retry_same_strategy";

  // If last outcome was resolved, no retry needed (shouldn't reach here)
  if (ctx.last_outcome === "resolved") return "retry_same_strategy";

  // After 1 failure with same strategy, try modified prompt
  if (ctx.same_strategy_failures === 1) return "retry_modified_prompt";

  // After 2+ failures with same strategy, switch if possible
  if (ctx.same_strategy_failures >= 2 && ctx.has_alternative_strategy) return "switch_strategy";

  // After 3+ total retries, consider prevention escalation
  if (ctx.retry_count >= 3 && ctx.has_prevention_candidate) return "escalate_to_prevention";

  // After 4+ retries or novel error with no alternatives
  if (ctx.retry_count >= 4 || (ctx.error_is_novel && ctx.same_strategy_failures >= 2)) return "escalate_to_human";

  // Default: switch strategy if available, else escalate
  return ctx.has_alternative_strategy ? "switch_strategy" : "escalate_to_human";
}

/**
 * Detect if a retry loop is unproductive (same error repeating).
 */
export function isRetryLoopUnproductive(recentOutcomes: string[]): boolean {
  if (recentOutcomes.length < 3) return false;
  const last3 = recentOutcomes.slice(-3);
  return last3.every((o) => o === "failed");
}

/**
 * Compute retry budget remaining.
 */
export function retryBudgetRemaining(maxRetries: number, currentRetry: number): number {
  return Math.max(0, maxRetries - currentRetry);
}
