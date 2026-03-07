// Cross-Stage Policy Evaluator — AxionOS Sprint 26
// Compares baseline vs policy-applied outcomes and classifies policy effectiveness.

export interface PolicyOutcomeMetrics {
  pipeline_success_rate: number;
  downstream_repair_rate: number;
  retry_propagation: number;
  validation_failure_rate: number;
  cost_impact_usd: number;
  time_to_resolution_ms: number;
}

export interface PolicyEvaluation {
  outcome: "helpful" | "neutral" | "harmful" | "inconclusive";
  spillover_detected: boolean;
  metrics_delta: Record<string, number>;
  explanation: string;
}

const HELPFUL_THRESHOLD = 0.05;
const HARMFUL_THRESHOLD = -0.05;
const MIN_SAMPLES_FOR_CONCLUSION = 5;

/**
 * Evaluate cross-stage policy effectiveness by comparing baseline to policy metrics.
 */
export function evaluatePolicy(
  baseline: PolicyOutcomeMetrics,
  withPolicy: PolicyOutcomeMetrics,
  sampleCount: number,
): PolicyEvaluation {
  if (sampleCount < MIN_SAMPLES_FOR_CONCLUSION) {
    return {
      outcome: "inconclusive",
      spillover_detected: false,
      metrics_delta: computeDelta(baseline, withPolicy),
      explanation: `Insufficient samples (${sampleCount}/${MIN_SAMPLES_FOR_CONCLUSION}) for conclusion`,
    };
  }

  const delta = computeDelta(baseline, withPolicy);

  // Check spillover: improvement in target but degradation elsewhere
  const successImproved = delta.pipeline_success_rate > HELPFUL_THRESHOLD;
  const repairWorsened = delta.downstream_repair_rate > HELPFUL_THRESHOLD;
  const costWorsened = delta.cost_impact_usd > 0;
  const spillover = successImproved && (repairWorsened || costWorsened);

  // Determine outcome
  const netBenefit =
    delta.pipeline_success_rate * 2 -
    delta.downstream_repair_rate -
    delta.retry_propagation -
    delta.validation_failure_rate;

  let outcome: PolicyEvaluation["outcome"];
  if (netBenefit > HELPFUL_THRESHOLD) {
    outcome = "helpful";
  } else if (netBenefit < HARMFUL_THRESHOLD) {
    outcome = "harmful";
  } else {
    outcome = "neutral";
  }

  return {
    outcome,
    spillover_detected: spillover,
    metrics_delta: delta,
    explanation: buildExplanation(outcome, delta, spillover),
  };
}

function computeDelta(
  baseline: PolicyOutcomeMetrics,
  withPolicy: PolicyOutcomeMetrics,
): Record<string, number> {
  return {
    pipeline_success_rate: withPolicy.pipeline_success_rate - baseline.pipeline_success_rate,
    downstream_repair_rate: withPolicy.downstream_repair_rate - baseline.downstream_repair_rate,
    retry_propagation: withPolicy.retry_propagation - baseline.retry_propagation,
    validation_failure_rate: withPolicy.validation_failure_rate - baseline.validation_failure_rate,
    cost_impact_usd: withPolicy.cost_impact_usd - baseline.cost_impact_usd,
    time_to_resolution_ms: withPolicy.time_to_resolution_ms - baseline.time_to_resolution_ms,
  };
}

function buildExplanation(
  outcome: string,
  delta: Record<string, number>,
  spillover: boolean,
): string {
  const parts: string[] = [];
  if (outcome === "helpful") parts.push("Policy improved pipeline outcomes");
  else if (outcome === "harmful") parts.push("Policy degraded pipeline outcomes");
  else parts.push("Policy had negligible net impact");

  if (delta.pipeline_success_rate > 0) parts.push(`success rate +${(delta.pipeline_success_rate * 100).toFixed(1)}%`);
  if (delta.downstream_repair_rate < 0) parts.push(`repair rate ${(delta.downstream_repair_rate * 100).toFixed(1)}%`);
  if (spillover) parts.push("WARNING: spillover effects detected");

  return parts.join(". ");
}

/**
 * Recommend status transition based on evaluation.
 */
export function recommendStatusTransition(
  currentStatus: string,
  evaluation: PolicyEvaluation,
): string | null {
  if (evaluation.outcome === "harmful") {
    if (currentStatus === "active") return "watch";
    if (currentStatus === "watch") return "deprecated";
  }
  if (evaluation.outcome === "helpful" && !evaluation.spillover_detected) {
    if (currentStatus === "draft") return "active";
  }
  if (evaluation.spillover_detected && currentStatus === "active") {
    return "watch";
  }
  return null;
}

/**
 * Detect false positive: policy applied but no real impact.
 */
export function isFalsePositive(evaluation: PolicyEvaluation): boolean {
  if (evaluation.outcome !== "neutral") return false;
  const d = evaluation.metrics_delta;
  return Math.abs(d.pipeline_success_rate || 0) < 0.01 &&
    Math.abs(d.downstream_repair_rate || 0) < 0.01;
}
