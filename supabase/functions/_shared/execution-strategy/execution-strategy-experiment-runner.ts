/**
 * Execution Strategy Experiment Runner (Sprint 32)
 * Manages bounded experiments comparing variant vs baseline.
 */

export interface ExperimentConfig {
  experiment_id: string;
  variant_id: string;
  family_id: string;
  baseline_definition: Record<string, any>;
  variant_definition: Record<string, any>;
  experiment_cap: { max_executions: number; max_hours?: number };
  assignment_mode: string;
}

export interface ExperimentAssignment {
  experiment_id: string;
  applied_mode: "baseline" | "variant";
  strategy_definition: Record<string, any>;
}

export interface ExperimentStatus {
  total_assignments: number;
  baseline_count: number;
  variant_count: number;
  cap_reached: boolean;
  can_continue: boolean;
}

/**
 * Assign execution to baseline or variant.
 * Uses simple alternation for fairness.
 */
export function assignExecution(
  config: ExperimentConfig,
  currentStatus: ExperimentStatus,
  executionIndex: number
): ExperimentAssignment {
  if (currentStatus.cap_reached || !currentStatus.can_continue) {
    return {
      experiment_id: config.experiment_id,
      applied_mode: "baseline",
      strategy_definition: config.baseline_definition,
    };
  }

  // Alternate: even=baseline, odd=variant
  const isVariant = executionIndex % 2 === 1;

  return {
    experiment_id: config.experiment_id,
    applied_mode: isVariant ? "variant" : "baseline",
    strategy_definition: isVariant ? config.variant_definition : config.baseline_definition,
  };
}

/**
 * Compute experiment status from outcomes.
 */
export function computeExperimentStatus(
  outcomes: { applied_mode: string; outcome_status: string }[],
  cap: { max_executions: number }
): ExperimentStatus {
  const baseline_count = outcomes.filter(o => o.applied_mode === "baseline").length;
  const variant_count = outcomes.filter(o => o.applied_mode === "variant").length;
  const total = outcomes.length;
  const cap_reached = total >= cap.max_executions;

  // Auto-stop if variant is consistently harmful
  const variantOutcomes = outcomes.filter(o => o.applied_mode === "variant");
  const harmfulVariant = variantOutcomes.filter(o => o.outcome_status === "harmful").length;
  const harmfulRate = variantOutcomes.length > 5 ? harmfulVariant / variantOutcomes.length : 0;
  const can_continue = !cap_reached && harmfulRate < 0.3;

  return { total_assignments: total, baseline_count, variant_count, cap_reached, can_continue };
}
