/**
 * Meta-Recommendation Scoring — Sprint 13
 *
 * Rule-based scoring model for Meta-Agent recommendations.
 * No opaque ML. All formulas are explicit and documented.
 *
 * Scoring dimensions:
 * - confidence_score (0-1): How certain the evidence supports the recommendation
 * - impact_score (0-1): Expected magnitude of improvement if adopted
 * - priority_score (0-1): Combined urgency ranking
 *
 * Formula:
 *   confidence = clamp(evidence_count_factor * recurrence_factor * data_quality_factor)
 *   impact = clamp(cost_weight * cost_factor + reliability_weight * reliability_factor + efficiency_weight * efficiency_factor)
 *   priority = confidence * 0.4 + impact * 0.4 + urgency * 0.2
 */

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}

export interface ScoringInputs {
  /** Number of distinct evidence items supporting the recommendation */
  evidence_count: number;
  /** How many times the issue has been observed */
  recurrence_count: number;
  /** Total observations in the dataset (for normalization) */
  total_observations: number;
  /** Estimated cost savings per month (USD) if adopted, 0 if unknown */
  cost_savings_estimate: number;
  /** Current failure rate of the target component (0-1) */
  failure_rate: number;
  /** Estimated time savings per execution (seconds), 0 if unknown */
  time_savings_estimate: number;
  /** Average execution time for the component (seconds), for normalization */
  avg_execution_time: number;
  /** Is the issue getting worse over time? */
  trend_worsening: boolean;
  /** Number of organizations/workspaces affected (for cross-org patterns) */
  breadth: number;
}

export interface ScoringResult {
  confidence_score: number;
  impact_score: number;
  priority_score: number;
}

export function scoreRecommendation(inputs: ScoringInputs): ScoringResult {
  // --- Confidence ---
  // evidence_count_factor: more evidence = higher confidence, diminishing returns
  // Formula: min(1, ln(evidence_count + 1) / ln(10)) — reaches 1.0 at ~9 items
  const evidence_factor = Math.min(1, Math.log(inputs.evidence_count + 1) / Math.log(10));

  // recurrence_factor: recurrence relative to total, sigmoid-like
  const recurrence_ratio = inputs.total_observations > 0
    ? inputs.recurrence_count / inputs.total_observations
    : 0;
  const recurrence_factor = clamp(recurrence_ratio * 3); // 33%+ recurrence → max

  // data_quality: at least 5 observations gives full quality
  const data_quality_factor = clamp(inputs.total_observations / 5);

  const confidence_score = clamp(
    evidence_factor * 0.4 + recurrence_factor * 0.35 + data_quality_factor * 0.25
  );

  // --- Impact ---
  const COST_WEIGHT = 0.35;
  const RELIABILITY_WEIGHT = 0.4;
  const EFFICIENCY_WEIGHT = 0.25;

  // Cost factor: savings relative to a $50/mo baseline
  const cost_factor = clamp(inputs.cost_savings_estimate / 50);

  // Reliability factor: directly the failure rate (higher failure → higher impact)
  const reliability_factor = clamp(inputs.failure_rate);

  // Efficiency factor: time savings relative to average execution time
  const efficiency_factor = inputs.avg_execution_time > 0
    ? clamp(inputs.time_savings_estimate / inputs.avg_execution_time)
    : 0;

  const impact_score = clamp(
    COST_WEIGHT * cost_factor +
    RELIABILITY_WEIGHT * reliability_factor +
    EFFICIENCY_WEIGHT * efficiency_factor
  );

  // --- Priority ---
  const urgency = (inputs.trend_worsening ? 0.8 : 0.2) * clamp(inputs.breadth / 3);

  const priority_score = clamp(
    confidence_score * 0.4 + impact_score * 0.4 + urgency * 0.2
  );

  return {
    confidence_score: Math.round(confidence_score * 1000) / 1000,
    impact_score: Math.round(impact_score * 1000) / 1000,
    priority_score: Math.round(priority_score * 1000) / 1000,
  };
}

/**
 * Generate a deduplication signature for a recommendation.
 * Same signature within a time window = duplicate.
 */
export function generateSignature(
  meta_agent_type: string,
  recommendation_type: string,
  target_component: string,
  key_evidence_hash: string
): string {
  return `${meta_agent_type}::${recommendation_type}::${target_component}::${key_evidence_hash}`;
}
