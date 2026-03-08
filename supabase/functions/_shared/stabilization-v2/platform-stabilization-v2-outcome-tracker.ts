/**
 * Platform Stabilization v2 Outcome Tracker — Sprint 46
 * Tracks stabilization outcomes in multi-layer scenarios.
 * Pure functions. No DB access.
 */

export interface StabilizationV2Outcome {
  id: string;
  outcome_status: "helpful" | "neutral" | "harmful" | "inconclusive";
  before_metrics: Record<string, number>;
  after_metrics: Record<string, number>;
}

export interface OutcomeAnalysis {
  total_outcomes: number;
  helpful_count: number;
  harmful_count: number;
  instability_reduction_rate: number;
  strategy_churn_reduction: number;
  recovery_velocity: number;
}

export function analyzeOutcomes(outcomes: StabilizationV2Outcome[]): OutcomeAnalysis {
  if (outcomes.length === 0) {
    return { total_outcomes: 0, helpful_count: 0, harmful_count: 0, instability_reduction_rate: 0, strategy_churn_reduction: 0, recovery_velocity: 0 };
  }

  const helpful = outcomes.filter((o) => o.outcome_status === "helpful").length;
  const harmful = outcomes.filter((o) => o.outcome_status === "harmful").length;

  // Compute average metric deltas
  let instabilityReduction = 0;
  let churnReduction = 0;
  let velocitySum = 0;
  let metricCount = 0;

  for (const o of outcomes) {
    if (o.before_metrics && o.after_metrics) {
      const beforeInst = o.before_metrics.instability_score ?? 0;
      const afterInst = o.after_metrics.instability_score ?? 0;
      if (beforeInst > 0) instabilityReduction += (beforeInst - afterInst) / beforeInst;

      const beforeChurn = o.before_metrics.strategy_churn ?? 0;
      const afterChurn = o.after_metrics.strategy_churn ?? 0;
      if (beforeChurn > 0) churnReduction += (beforeChurn - afterChurn) / beforeChurn;

      velocitySum += o.after_metrics.recovery_velocity ?? 0;
      metricCount++;
    }
  }

  return {
    total_outcomes: outcomes.length,
    helpful_count: helpful,
    harmful_count: harmful,
    instability_reduction_rate: metricCount > 0 ? Math.round((instabilityReduction / metricCount) * 100) / 100 : 0,
    strategy_churn_reduction: metricCount > 0 ? Math.round((churnReduction / metricCount) * 100) / 100 : 0,
    recovery_velocity: metricCount > 0 ? Math.round((velocitySum / metricCount) * 100) / 100 : 0,
  };
}
