/**
 * Prompt Health Guard — Sprint 22
 *
 * Evaluates post-promotion health of prompt variants.
 * Deterministic, rule-based health classification.
 * Never mutates anything beyond generating health status.
 */

import type { AggregatedMetrics } from "./prompt-variant-metrics.ts";

export type HealthStatus = "healthy" | "watch" | "rollback_recommended" | "rollback_required";

export interface HealthConfig {
  /** Max allowed success_rate regression (absolute) */
  maxSuccessRateRegression: number;
  /** Max allowed repair_rate increase (absolute) */
  maxRepairRateIncrease: number;
  /** Max allowed cost increase ratio (e.g. 1.3 = 30% more) */
  maxCostIncreaseRatio: number;
  /** Max allowed quality drop (absolute) */
  maxQualityDrop: number;
  /** Hard failure threshold: success_rate below this = rollback_required */
  hardFailureThreshold: number;
  /** Catastrophic cost ratio: above this = rollback_required */
  catastrophicCostRatio: number;
  /** Minimum confidence for healthy status */
  minConfidence: number;
  /** Minimum executions for any evaluation */
  minExecutions: number;
}

export const DEFAULT_HEALTH_CONFIG: HealthConfig = {
  maxSuccessRateRegression: 0.05,
  maxRepairRateIncrease: 0.08,
  maxCostIncreaseRatio: 1.30,
  maxQualityDrop: 10,
  hardFailureThreshold: 0.40,
  catastrophicCostRatio: 2.0,
  minConfidence: 0.3,
  minExecutions: 5,
};

export interface HealthCheckResult {
  health_status: HealthStatus;
  regression_flags: string[];
  metrics_snapshot: {
    executions: number;
    success_rate: number | null;
    repair_rate: number | null;
    avg_cost_usd: number | null;
    avg_quality_score: number | null;
  };
}

/**
 * Evaluate health of a promoted variant against its baseline (previous control).
 */
export function evaluatePromotionHealth(
  current: AggregatedMetrics,
  baseline: AggregatedMetrics | null,
  config: HealthConfig = DEFAULT_HEALTH_CONFIG,
): HealthCheckResult {
  const flags: string[] = [];
  let status: string = "healthy";

  const snapshot = {
    executions: current.executions,
    success_rate: current.success_rate,
    repair_rate: current.repair_rate,
    avg_cost_usd: current.avg_cost_usd,
    avg_quality_score: current.avg_quality_score,
  };

  // Too few executions to evaluate meaningfully
  if (current.executions < config.minExecutions) {
    return {
      health_status: "watch",
      regression_flags: ["insufficient_executions"],
      metrics_snapshot: snapshot,
    };
  }

  // === ROLLBACK REQUIRED checks (hard failures) ===

  // Hard failure: success_rate catastrophically low
  if (current.success_rate !== null && current.success_rate < config.hardFailureThreshold) {
    flags.push(`hard_failure: success_rate=${current.success_rate} < ${config.hardFailureThreshold}`);
    status = "rollback_required";
  }

  // Catastrophic cost explosion
  if (baseline && baseline.avg_cost_usd !== null && baseline.avg_cost_usd > 0 && current.avg_cost_usd !== null) {
    const costRatio = current.avg_cost_usd / baseline.avg_cost_usd;
    if (costRatio > config.catastrophicCostRatio) {
      flags.push(`catastrophic_cost: ratio=${costRatio.toFixed(2)} > ${config.catastrophicCostRatio}`);
      status = "rollback_required";
    }
  }

  // === ROLLBACK RECOMMENDED checks ===
  if (baseline && status !== "rollback_required") {
    // Success rate regression
    if (baseline.success_rate !== null && current.success_rate !== null) {
      const delta = baseline.success_rate - current.success_rate;
      if (delta > config.maxSuccessRateRegression) {
        flags.push(`success_rate_regression: delta=${delta.toFixed(4)} > ${config.maxSuccessRateRegression}`);
        if (status !== "rollback_required") status = "rollback_recommended";
      }
    }

    // Repair rate increase
    if (baseline.repair_rate !== null && current.repair_rate !== null) {
      const delta = current.repair_rate - baseline.repair_rate;
      if (delta > config.maxRepairRateIncrease) {
        flags.push(`repair_rate_increase: delta=${delta.toFixed(4)} > ${config.maxRepairRateIncrease}`);
        if (status !== "rollback_required") status = "rollback_recommended";
      }
    }

    // Cost increase
    if (baseline.avg_cost_usd !== null && baseline.avg_cost_usd > 0 && current.avg_cost_usd !== null) {
      const costRatio = current.avg_cost_usd / baseline.avg_cost_usd;
      if (costRatio > config.maxCostIncreaseRatio) {
        flags.push(`cost_increase: ratio=${costRatio.toFixed(2)} > ${config.maxCostIncreaseRatio}`);
        if (status !== "rollback_required") status = "rollback_recommended";
      }
    }

    // Quality drop
    if (baseline.avg_quality_score !== null && current.avg_quality_score !== null) {
      const delta = baseline.avg_quality_score - current.avg_quality_score;
      if (delta > config.maxQualityDrop) {
        flags.push(`quality_drop: delta=${delta.toFixed(2)} > ${config.maxQualityDrop}`);
        if (status !== "rollback_required") status = "rollback_recommended";
      }
    }
  }

  // === WATCH checks ===
  if (status === "healthy") {
    // Low confidence
    if (current.confidence_level !== null && current.confidence_level < config.minConfidence) {
      flags.push(`low_confidence: ${current.confidence_level} < ${config.minConfidence}`);
      status = "watch";
    }

    // Low sample size (but above minimum)
    if (current.executions < 15) {
      flags.push(`low_sample_size: ${current.executions}`);
      if (status === "healthy") status = "watch";
    }
  }

  if (flags.length === 0) {
    flags.push("all_checks_passed");
  }

  return {
    health_status: status as HealthStatus,
    regression_flags: flags,
    metrics_snapshot: snapshot,
  };
}
