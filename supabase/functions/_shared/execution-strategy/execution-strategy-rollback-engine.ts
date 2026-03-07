/**
 * Execution Strategy Rollback Engine (Sprint 32)
 * Handles safe rollback of harmful strategy variants.
 */

export interface RollbackDecision {
  should_rollback: boolean;
  reasons: string[];
  urgency: "immediate" | "scheduled" | "none";
}

export interface RollbackInput {
  verdict: "helpful" | "neutral" | "harmful" | "inconclusive";
  harmful_rate: number;
  sample_size: number;
  experiment_status: string;
  variant_status: string;
  rollback_guard: { max_degradation_pct?: number; auto_rollback_on_harmful?: boolean };
}

export function evaluateRollback(input: RollbackInput): RollbackDecision {
  const reasons: string[] = [];

  // Already rolled back
  if (input.variant_status === "rolled_back" || input.experiment_status === "rolled_back") {
    return { should_rollback: false, reasons: ["Already rolled back"], urgency: "none" };
  }

  // Harmful verdict with auto-rollback enabled
  if (input.verdict === "harmful" && input.rollback_guard?.auto_rollback_on_harmful) {
    reasons.push("Harmful verdict with auto-rollback enabled");
    return { should_rollback: true, reasons, urgency: "immediate" };
  }

  // High harmful rate even if overall inconclusive
  if (input.harmful_rate > 0.3 && input.sample_size >= 5) {
    reasons.push(`Harmful rate ${(input.harmful_rate * 100).toFixed(0)}% exceeds 30% threshold`);
    return { should_rollback: true, reasons, urgency: input.harmful_rate > 0.5 ? "immediate" : "scheduled" };
  }

  // Degradation exceeds guard
  const maxDeg = input.rollback_guard?.max_degradation_pct ?? 10;
  if (input.harmful_rate > maxDeg / 100 && input.sample_size >= 10) {
    reasons.push(`Harmful rate exceeds max degradation guard (${maxDeg}%)`);
    return { should_rollback: true, reasons, urgency: "scheduled" };
  }

  return { should_rollback: false, reasons: [], urgency: "none" };
}
