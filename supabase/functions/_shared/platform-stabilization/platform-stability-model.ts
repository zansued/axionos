// Platform Stability Scoring Model — Sprint 34
// Aggregates system-wide stabilization quality metrics.

export interface StabilityScores {
  platform_stability_index: number;
  adaptation_volatility_index: number;
  portfolio_churn_index: number;
  oscillation_index: number;
  recovery_efficiency_index: number;
  stabilization_precision_index: number;
}

export interface StabilityModelInput {
  healthy_signals: number;
  watch_signals: number;
  unstable_signals: number;
  critical_signals: number;
  total_signals: number;
  
  policy_transitions: number;
  strategy_transitions: number;
  calibration_proposals: number;
  total_adaptive_events: number;
  
  oscillation_count: number;
  oscillation_entities: number;
  
  helpful_outcomes: number;
  harmful_outcomes: number;
  total_outcomes: number;
  
  successful_rollbacks: number;
  total_rollbacks: number;
  
  stabilization_applied: number;
  stabilization_helpful: number;
}

/**
 * Compute platform stability scores from aggregated data.
 */
export function computeStabilityScores(input: StabilityModelInput): StabilityScores {
  const totalSig = Math.max(input.total_signals, 1);
  
  // Platform stability: fraction of healthy signals
  const platform_stability_index = Math.round(
    ((input.healthy_signals + input.watch_signals * 0.5) / totalSig) * 100
  ) / 100;

  // Adaptation volatility: rate of adaptive changes relative to total events
  const totalAdaptive = Math.max(input.total_adaptive_events, 1);
  const rawVolatility = (input.policy_transitions + input.strategy_transitions + input.calibration_proposals) / totalAdaptive;
  const adaptation_volatility_index = Math.round(Math.min(1, rawVolatility) * 100) / 100;

  // Portfolio churn: strategy transitions as fraction of total
  const portfolio_churn_index = Math.round(
    Math.min(1, input.strategy_transitions / Math.max(totalAdaptive, 1)) * 100
  ) / 100;

  // Oscillation: oscillating entities as fraction of total entities involved
  const oscillation_index = Math.round(
    Math.min(1, input.oscillation_count / Math.max(totalSig, 1)) * 100
  ) / 100;

  // Recovery efficiency: helpful outcomes / total outcomes
  const totalOutcomes = Math.max(input.total_outcomes, 1);
  const recovery_efficiency_index = Math.round(
    (input.helpful_outcomes / totalOutcomes) * 100
  ) / 100;

  // Stabilization precision: helpful stabilizations / total applied
  const totalApplied = Math.max(input.stabilization_applied, 1);
  const stabilization_precision_index = Math.round(
    (input.stabilization_helpful / totalApplied) * 100
  ) / 100;

  return {
    platform_stability_index,
    adaptation_volatility_index,
    portfolio_churn_index,
    oscillation_index,
    recovery_efficiency_index,
    stabilization_precision_index,
  };
}
