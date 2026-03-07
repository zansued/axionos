/**
 * Prompt Promotion Rules — Sprint 21
 *
 * Deterministic, rule-based promotion and rollback evaluation.
 * No automatic mutation — generates candidates for human review.
 */

import type { AggregatedMetrics, VariantComparison } from "./prompt-variant-metrics.ts";

export interface PromotionConfig {
  /** Minimum executions before a variant is eligible for promotion */
  minExecutions: number;
  /** Minimum success rate improvement (absolute) over control */
  minSuccessRateImprovement: number;
  /** Maximum allowed cost regression (ratio, e.g. 1.2 = 20% more expensive) */
  maxCostRegressionRatio: number;
  /** Maximum allowed repair rate regression (absolute) */
  maxRepairRateRegression: number;
  /** Minimum confidence level */
  minConfidence: number;
  /** Minimum promotion score */
  minPromotionScore: number;
}

export const DEFAULT_PROMOTION_CONFIG: PromotionConfig = {
  minExecutions: 20,
  minSuccessRateImprovement: 0.03,
  maxCostRegressionRatio: 1.25,
  maxRepairRateRegression: 0.05,
  minConfidence: 0.5,
  minPromotionScore: 0.6,
};

export interface PromotionCandidate {
  variantId: string;
  stageKey: string;
  decision: "promote" | "not_ready" | "regression";
  reasons: string[];
  metrics: AggregatedMetrics;
  comparison: VariantComparison | null;
}

export interface RollbackCandidate {
  variantId: string;
  stageKey: string;
  reasons: string[];
  severity: "warning" | "critical";
}

/**
 * Evaluate whether an experiment variant is ready for promotion.
 */
export function evaluatePromotionCandidate(
  experiment: AggregatedMetrics,
  control: AggregatedMetrics | null,
  comparison: VariantComparison | null,
  stageKey: string,
  config: PromotionConfig = DEFAULT_PROMOTION_CONFIG,
): PromotionCandidate {
  const reasons: string[] = [];
  let decision: PromotionCandidate["decision"] = "promote";

  // Check minimum executions
  if (experiment.executions < config.minExecutions) {
    reasons.push(`insufficient_executions: ${experiment.executions} < ${config.minExecutions}`);
    decision = "not_ready";
  }

  // Check confidence
  if (experiment.confidence_level !== null && experiment.confidence_level < config.minConfidence) {
    reasons.push(`low_confidence: ${experiment.confidence_level} < ${config.minConfidence}`);
    decision = "not_ready";
  }

  // Check promotion score
  if (experiment.promotion_score !== null && experiment.promotion_score < config.minPromotionScore) {
    reasons.push(`low_promotion_score: ${experiment.promotion_score} < ${config.minPromotionScore}`);
    if (decision !== "regression") decision = "not_ready";
  }

  // Compare against control if available
  if (control && comparison) {
    // Success rate improvement
    if (
      comparison.successRateDelta !== null &&
      comparison.successRateDelta < config.minSuccessRateImprovement
    ) {
      reasons.push(
        `insufficient_success_improvement: delta=${comparison.successRateDelta} < ${config.minSuccessRateImprovement}`,
      );
      if (comparison.successRateDelta < 0) {
        decision = "regression";
        reasons.push("success_rate_regression");
      } else if (decision !== "regression") {
        decision = "not_ready";
      }
    }

    // Cost regression check
    if (
      comparison.costDelta !== null &&
      control.avg_cost_usd !== null &&
      control.avg_cost_usd > 0 &&
      experiment.avg_cost_usd !== null
    ) {
      const costRatio = experiment.avg_cost_usd / control.avg_cost_usd;
      if (costRatio > config.maxCostRegressionRatio) {
        reasons.push(`cost_regression: ratio=${costRatio.toFixed(2)} > ${config.maxCostRegressionRatio}`);
        decision = "regression";
      }
    }

    // Repair rate regression
    if (
      comparison.repairRateDelta !== null &&
      comparison.repairRateDelta > config.maxRepairRateRegression
    ) {
      reasons.push(
        `repair_rate_regression: delta=${comparison.repairRateDelta} > ${config.maxRepairRateRegression}`,
      );
      decision = "regression";
    }
  }

  if (reasons.length === 0) {
    reasons.push("all_criteria_met");
  }

  return {
    variantId: experiment.prompt_variant_id,
    stageKey,
    decision,
    reasons,
    metrics: experiment,
    comparison,
  };
}

/**
 * Check if a currently active variant should be considered for rollback.
 */
export function evaluateRollback(
  metrics: AggregatedMetrics,
  stageKey: string,
): RollbackCandidate | null {
  const reasons: string[] = [];
  let severity: RollbackCandidate["severity"] = "warning";

  if (metrics.executions < 5) return null; // Too few to evaluate

  // Failure spike: success rate below 50%
  if (metrics.success_rate !== null && metrics.success_rate < 0.5) {
    reasons.push(`failure_spike: success_rate=${metrics.success_rate}`);
    severity = "critical";
  }

  // High repair rate
  if (metrics.repair_rate !== null && metrics.repair_rate > 0.3) {
    reasons.push(`high_repair_rate: ${metrics.repair_rate}`);
    if (metrics.repair_rate > 0.5) severity = "critical";
  }

  // Quality drop
  if (metrics.avg_quality_score !== null && metrics.avg_quality_score < 30) {
    reasons.push(`quality_drop: avg_quality=${metrics.avg_quality_score}`);
    severity = "critical";
  }

  // Cost spike (over $0.20 average)
  if (metrics.avg_cost_usd !== null && metrics.avg_cost_usd > 0.2) {
    reasons.push(`cost_spike: avg_cost=$${metrics.avg_cost_usd}`);
  }

  if (reasons.length === 0) return null;

  return {
    variantId: metrics.prompt_variant_id,
    stageKey,
    reasons,
    severity,
  };
}
