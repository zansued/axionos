// Execution Policy Portfolio Evaluator — Sprint 28
// Evaluates execution policies across context classes, computing composite scores.

export interface PolicyOutcomeRecord {
  execution_policy_profile_id: string;
  context_class: string;
  outcome_status: string; // helpful | neutral | harmful | inconclusive
  outcome_metrics: Record<string, number> | null;
  applied_mode: string;
}

export interface PortfolioScores {
  usefulness_score: number;
  risk_score: number;
  cost_efficiency_score: number;
  quality_gain_score: number;
  speed_gain_score: number;
  stability_score: number;
  portfolio_rank: number;
}

export interface PolicyEvaluation {
  policy_id: string;
  context_class: string;
  scores: PortfolioScores;
  sample_size: number;
  helpful_rate: number;
  harmful_rate: number;
  neutral_rate: number;
}

/**
 * Evaluate a single policy across its outcomes for a given context class.
 */
export function evaluatePolicyForContext(
  policyId: string,
  contextClass: string,
  outcomes: PolicyOutcomeRecord[],
): PolicyEvaluation {
  const relevant = outcomes.filter(
    (o) => o.execution_policy_profile_id === policyId && o.context_class === contextClass
  );

  const total = relevant.length;
  if (total === 0) {
    return {
      policy_id: policyId,
      context_class: contextClass,
      scores: { usefulness_score: 0, risk_score: 0, cost_efficiency_score: 0, quality_gain_score: 0, speed_gain_score: 0, stability_score: 0, portfolio_rank: 0 },
      sample_size: 0,
      helpful_rate: 0,
      harmful_rate: 0,
      neutral_rate: 0,
    };
  }

  const helpful = relevant.filter((o) => o.outcome_status === "helpful").length;
  const harmful = relevant.filter((o) => o.outcome_status === "harmful").length;
  const neutral = relevant.filter((o) => o.outcome_status === "neutral").length;

  const helpfulRate = helpful / total;
  const harmfulRate = harmful / total;
  const neutralRate = neutral / total;

  // Usefulness: high helpful rate, low harmful rate
  const usefulness_score = Math.max(0, Math.min(1, helpfulRate - harmfulRate * 2));

  // Risk: based on harmful outcomes
  const risk_score = Math.min(1, harmfulRate * 2);

  // Extract average metrics
  const metricsAgg = aggregateMetrics(relevant);

  // Cost efficiency: lower cost_per_execution is better
  const cost_efficiency_score = metricsAgg.avg_cost != null
    ? Math.max(0, Math.min(1, 1 - metricsAgg.avg_cost))
    : 0.5;

  // Quality: based on success_rate metric if available
  const quality_gain_score = metricsAgg.avg_success_rate != null
    ? Math.max(0, Math.min(1, metricsAgg.avg_success_rate))
    : helpfulRate;

  // Speed: based on avg_duration metric if available (lower is better)
  const speed_gain_score = metricsAgg.avg_duration != null
    ? Math.max(0, Math.min(1, 1 - Math.min(1, metricsAgg.avg_duration / 60)))
    : 0.5;

  // Stability: consistency of outcomes (low variance = high stability)
  const stability_score = computeStabilityScore(relevant);

  // Composite rank (weighted)
  const portfolio_rank = computeCompositeRank({
    usefulness_score,
    risk_score,
    cost_efficiency_score,
    quality_gain_score,
    speed_gain_score,
    stability_score,
  });

  return {
    policy_id: policyId,
    context_class: contextClass,
    scores: { usefulness_score, risk_score, cost_efficiency_score, quality_gain_score, speed_gain_score, stability_score, portfolio_rank },
    sample_size: total,
    helpful_rate: helpfulRate,
    harmful_rate: harmfulRate,
    neutral_rate: neutralRate,
  };
}

/**
 * Evaluate all policies across all context classes.
 */
export function evaluatePortfolio(
  policyIds: string[],
  outcomes: PolicyOutcomeRecord[],
): PolicyEvaluation[] {
  const contextClasses = [...new Set(outcomes.map((o) => o.context_class))];
  const evaluations: PolicyEvaluation[] = [];

  for (const policyId of policyIds) {
    for (const contextClass of contextClasses) {
      const evaluation = evaluatePolicyForContext(policyId, contextClass, outcomes);
      if (evaluation.sample_size > 0) {
        evaluations.push(evaluation);
      }
    }
  }

  return evaluations;
}

function aggregateMetrics(outcomes: PolicyOutcomeRecord[]): {
  avg_cost: number | null;
  avg_success_rate: number | null;
  avg_duration: number | null;
} {
  let costSum = 0, costCount = 0;
  let successSum = 0, successCount = 0;
  let durationSum = 0, durationCount = 0;

  for (const o of outcomes) {
    const m = o.outcome_metrics;
    if (!m) continue;
    if (typeof m.cost_per_execution === "number") { costSum += m.cost_per_execution; costCount++; }
    if (typeof m.success_rate === "number") { successSum += m.success_rate; successCount++; }
    if (typeof m.duration === "number") { durationSum += m.duration; durationCount++; }
  }

  return {
    avg_cost: costCount > 0 ? costSum / costCount : null,
    avg_success_rate: successCount > 0 ? successSum / successCount : null,
    avg_duration: durationCount > 0 ? durationSum / durationCount : null,
  };
}

function computeStabilityScore(outcomes: PolicyOutcomeRecord[]): number {
  if (outcomes.length < 3) return 0.5; // insufficient data

  // Measure consistency: what percentage of outcomes match the majority
  const counts: Record<string, number> = {};
  for (const o of outcomes) {
    counts[o.outcome_status] = (counts[o.outcome_status] || 0) + 1;
  }
  const maxCount = Math.max(...Object.values(counts));
  return maxCount / outcomes.length;
}

export function computeCompositeRank(scores: Omit<PortfolioScores, "portfolio_rank">): number {
  const weights = {
    usefulness: 0.30,
    quality: 0.20,
    cost: 0.15,
    speed: 0.10,
    stability: 0.15,
    risk_penalty: 0.10,
  };

  return Math.max(0, Math.min(1,
    scores.usefulness_score * weights.usefulness +
    scores.quality_gain_score * weights.quality +
    scores.cost_efficiency_score * weights.cost +
    scores.speed_gain_score * weights.speed +
    scores.stability_score * weights.stability -
    scores.risk_score * weights.risk_penalty
  ));
}
