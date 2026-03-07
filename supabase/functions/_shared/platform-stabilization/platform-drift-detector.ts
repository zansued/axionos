// Platform Drift Detector — Sprint 34
// Detects meaningful systemic drift across adaptive layers.

export interface DriftInput {
  policy_lifecycle_churn: number;       // rate of policy status changes
  strategy_lifecycle_churn: number;     // rate of strategy status changes
  calibration_proposal_volatility: number; // proposals created/rejected ratio
  harmful_outcome_rate: number;         // fraction of harmful outcomes
  recommendation_queue_size: number;    // pending recommendations
  tenant_tuning_divergence: number;     // 0-1 how far tenants diverge from global
  retry_burden_shift: number;           // change in retry rate
  health_index_volatility: number;      // stddev of health index over time
  portfolio_conflict_rate: number;      // conflicts per portfolio
  context_performance_variance: number; // variance in context-class performance
}

export interface DriftSignal {
  drift_type: string;
  affected_scope: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence_score: number;
  rationale_codes: string[];
  evidence_refs: Record<string, number>;
  expected_stabilization_target: string;
}

const DRIFT_THRESHOLDS = {
  policy_lifecycle_churn: { warning: 0.3, critical: 0.6 },
  strategy_lifecycle_churn: { warning: 0.3, critical: 0.6 },
  calibration_proposal_volatility: { warning: 0.4, critical: 0.7 },
  harmful_outcome_rate: { warning: 0.15, critical: 0.3 },
  recommendation_queue_size: { warning: 20, critical: 50 },
  tenant_tuning_divergence: { warning: 0.4, critical: 0.7 },
  retry_burden_shift: { warning: 0.2, critical: 0.5 },
  health_index_volatility: { warning: 0.15, critical: 0.35 },
  portfolio_conflict_rate: { warning: 0.2, critical: 0.5 },
  context_performance_variance: { warning: 0.25, critical: 0.5 },
};

function classifySeverity(value: number, warning: number, critical: number): "low" | "medium" | "high" | "critical" {
  if (value >= critical) return "critical";
  if (value >= warning) return "high";
  if (value >= warning * 0.6) return "medium";
  return "low";
}

export function detectDrift(input: DriftInput): DriftSignal[] {
  const signals: DriftSignal[] = [];

  const checks: Array<{
    key: keyof DriftInput;
    type: string;
    scope: string;
    target: string;
  }> = [
    { key: "policy_lifecycle_churn", type: "policy_churn", scope: "execution_policies", target: "reduce_policy_transitions" },
    { key: "strategy_lifecycle_churn", type: "strategy_churn", scope: "strategy_families", target: "stabilize_strategy_lifecycle" },
    { key: "calibration_proposal_volatility", type: "calibration_volatility", scope: "calibration_engine", target: "reduce_proposal_frequency" },
    { key: "harmful_outcome_rate", type: "harmful_outcomes", scope: "global", target: "reduce_harmful_rate" },
    { key: "tenant_tuning_divergence", type: "tenant_divergence", scope: "tenant_tuning", target: "rebalance_tenant_tuning" },
    { key: "retry_burden_shift", type: "retry_burden", scope: "pipeline_execution", target: "stabilize_retry_rate" },
    { key: "health_index_volatility", type: "health_volatility", scope: "platform_health", target: "stabilize_health_index" },
    { key: "portfolio_conflict_rate", type: "portfolio_conflicts", scope: "strategy_portfolio", target: "resolve_portfolio_conflicts" },
    { key: "context_performance_variance", type: "context_variance", scope: "context_classes", target: "normalize_context_performance" },
  ];

  for (const check of checks) {
    const value = input[check.key];
    const thresholds = DRIFT_THRESHOLDS[check.key];
    const severity = classifySeverity(value, thresholds.warning, thresholds.critical);
    if (severity === "low") continue;

    const confidence = Math.min(1, 0.5 + value * 0.5);

    signals.push({
      drift_type: check.type,
      affected_scope: check.scope,
      severity,
      confidence_score: Math.round(confidence * 100) / 100,
      rationale_codes: [`${check.type}_detected`, `severity_${severity}`],
      evidence_refs: { [check.key]: value },
      expected_stabilization_target: check.target,
    });
  }

  // Recommendation overload
  if (input.recommendation_queue_size >= DRIFT_THRESHOLDS.recommendation_queue_size.warning) {
    const severity = input.recommendation_queue_size >= DRIFT_THRESHOLDS.recommendation_queue_size.critical ? "critical" : "high";
    signals.push({
      drift_type: "recommendation_overload",
      affected_scope: "recommendation_engine",
      severity,
      confidence_score: 0.85,
      rationale_codes: ["recommendation_overload_detected", `severity_${severity}`],
      evidence_refs: { recommendation_queue_size: input.recommendation_queue_size },
      expected_stabilization_target: "suppress_low_value_recommendations",
    });
  }

  return signals;
}
