/**
 * Platform Calibration Outcome Tracker — Sprint 31
 *
 * Compares before/after calibration performance.
 * Pure functions. No DB access.
 */

export interface OutcomeMetrics {
  false_positive_rate_before: number;
  false_positive_rate_after: number;
  false_negative_rate_before: number;
  false_negative_rate_after: number;
  recommendation_precision_before: number;
  recommendation_precision_after: number;
  queue_pressure_before: number;
  queue_pressure_after: number;
  sample_size: number;
}

export type OutcomeStatus = "helpful" | "neutral" | "harmful" | "inconclusive";

export interface OutcomeAssessment {
  status: OutcomeStatus;
  improvement_score: number;
  reason_codes: string[];
  should_rollback: boolean;
}

const MIN_SAMPLE = 5;
const HARMFUL_THRESHOLD = -0.1;
const HELPFUL_THRESHOLD = 0.05;

export function assessOutcome(metrics: OutcomeMetrics): OutcomeAssessment {
  const reasons: string[] = [];

  if (metrics.sample_size < MIN_SAMPLE) {
    return {
      status: "inconclusive",
      improvement_score: 0,
      reason_codes: ["insufficient_sample_size"],
      should_rollback: false,
    };
  }

  // Compute improvement scores for each dimension
  const fpImprovement = metrics.false_positive_rate_before - metrics.false_positive_rate_after;
  const fnImprovement = metrics.false_negative_rate_before - metrics.false_negative_rate_after;
  const precisionImprovement = metrics.recommendation_precision_after - metrics.recommendation_precision_before;
  const queueImprovement = metrics.queue_pressure_before - metrics.queue_pressure_after;

  // Weighted composite
  const composite = fpImprovement * 0.3 + fnImprovement * 0.3 + precisionImprovement * 0.2 + queueImprovement * 0.2;
  const rounded = Math.round(composite * 1000) / 1000;

  if (fpImprovement > 0.05) reasons.push("false_positive_rate_improved");
  if (fpImprovement < -0.05) reasons.push("false_positive_rate_worsened");
  if (fnImprovement > 0.05) reasons.push("false_negative_rate_improved");
  if (fnImprovement < -0.05) reasons.push("false_negative_rate_worsened");
  if (precisionImprovement > 0.05) reasons.push("precision_improved");
  if (queueImprovement > 5) reasons.push("queue_pressure_reduced");

  let status: OutcomeStatus;
  let shouldRollback = false;

  if (rounded > HELPFUL_THRESHOLD) {
    status = "helpful";
  } else if (rounded < HARMFUL_THRESHOLD) {
    status = "harmful";
    shouldRollback = true;
    reasons.push("calibration_harmful");
  } else {
    status = "neutral";
  }

  return {
    status,
    improvement_score: rounded,
    reason_codes: reasons.length > 0 ? reasons : ["no_significant_change"],
    should_rollback: shouldRollback,
  };
}
