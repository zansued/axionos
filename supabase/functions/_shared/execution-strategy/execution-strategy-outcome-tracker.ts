/**
 * Execution Strategy Outcome Tracker (Sprint 32)
 * Compares baseline vs variant outcomes across declared metrics.
 */

export interface OutcomeComparison {
  metric: string;
  baseline_value: number;
  variant_value: number;
  improvement_pct: number;
  direction: "better" | "worse" | "neutral";
}

export interface ExperimentReport {
  experiment_id: string;
  variant_id: string;
  total_baseline: number;
  total_variant: number;
  comparisons: OutcomeComparison[];
  overall_verdict: "helpful" | "neutral" | "harmful" | "inconclusive";
  confidence: number;
  recommendation: "promote" | "rollback" | "continue" | "inconclusive";
}

const METRIC_DIRECTION: Record<string, "lower_is_better" | "higher_is_better"> = {
  retry_count: "lower_is_better",
  repair_burden: "lower_is_better",
  success_rate: "higher_is_better",
  validation_failure_rate: "lower_is_better",
  human_review_burden: "lower_is_better",
  execution_cost: "lower_is_better",
  time_to_resolution: "lower_is_better",
  deploy_success_rate: "higher_is_better",
  predictive_warning_usefulness: "higher_is_better",
};

export function compareOutcomes(
  baselineOutcomes: { outcome_metrics: Record<string, number> }[],
  variantOutcomes: { outcome_metrics: Record<string, number> }[],
  experimentId: string,
  variantId: string,
  evaluationMetrics: string[] = Object.keys(METRIC_DIRECTION)
): ExperimentReport {
  const comparisons: OutcomeComparison[] = [];

  for (const metric of evaluationMetrics) {
    const bVals = baselineOutcomes.map(o => o.outcome_metrics?.[metric]).filter(v => v !== undefined && v !== null) as number[];
    const vVals = variantOutcomes.map(o => o.outcome_metrics?.[metric]).filter(v => v !== undefined && v !== null) as number[];

    if (bVals.length === 0 || vVals.length === 0) continue;

    const bAvg = bVals.reduce((s, v) => s + v, 0) / bVals.length;
    const vAvg = vVals.reduce((s, v) => s + v, 0) / vVals.length;

    const dir = METRIC_DIRECTION[metric] || "lower_is_better";
    const diff = vAvg - bAvg;
    const improvPct = bAvg !== 0 ? (diff / Math.abs(bAvg)) * 100 : 0;

    let direction: "better" | "worse" | "neutral";
    if (Math.abs(improvPct) < 2) direction = "neutral";
    else if (dir === "lower_is_better") direction = diff < 0 ? "better" : "worse";
    else direction = diff > 0 ? "better" : "worse";

    comparisons.push({ metric, baseline_value: Number(bAvg.toFixed(4)), variant_value: Number(vAvg.toFixed(4)), improvement_pct: Number(improvPct.toFixed(2)), direction });
  }

  const better = comparisons.filter(c => c.direction === "better").length;
  const worse = comparisons.filter(c => c.direction === "worse").length;
  const total = comparisons.length;

  let overall_verdict: ExperimentReport["overall_verdict"];
  let recommendation: ExperimentReport["recommendation"];

  const minSample = 10;
  const sampleSize = Math.min(baselineOutcomes.length, variantOutcomes.length);

  if (sampleSize < minSample) {
    overall_verdict = "inconclusive";
    recommendation = sampleSize < 5 ? "continue" : "inconclusive";
  } else if (worse > better * 2) {
    overall_verdict = "harmful";
    recommendation = "rollback";
  } else if (better > worse * 2 && better >= total * 0.5) {
    overall_verdict = "helpful";
    recommendation = "promote";
  } else if (better > worse) {
    overall_verdict = "neutral";
    recommendation = "continue";
  } else {
    overall_verdict = "neutral";
    recommendation = "inconclusive";
  }

  const confidence = Math.min(0.95, sampleSize / 50);

  return {
    experiment_id: experimentId,
    variant_id: variantId,
    total_baseline: baselineOutcomes.length,
    total_variant: variantOutcomes.length,
    comparisons,
    overall_verdict,
    confidence: Number(confidence.toFixed(3)),
    recommendation,
  };
}
