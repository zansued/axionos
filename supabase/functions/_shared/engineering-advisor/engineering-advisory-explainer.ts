// Engineering Advisory Explainer — Sprint 35
// Generates explainability payloads for recommendations.

import { AdvisoryRecommendation } from "./engineering-advisory-recommendation-engine.ts";

export interface AdvisoryExplanation {
  recommendation_type: string;
  what_triggered: string[];
  contributing_layers: string[];
  recurring_patterns: string[];
  why_now: string;
  likely_tradeoffs: string[];
  review_before_implementation: string[];
}

export function explainRecommendation(rec: AdvisoryRecommendation): AdvisoryExplanation {
  const layers = new Set<string>();
  const triggers: string[] = [...rec.rationale_codes];

  // Infer contributing layers from rationale codes
  const layerMap: Record<string, string> = {
    bottleneck_detected: "platform_intelligence",
    low_health_index: "platform_intelligence",
    harmful_calibration_outcomes: "platform_calibration",
    portfolio_conflicts: "strategy_portfolio",
    degrading_strategies: "strategy_portfolio",
    rollback_dominant: "strategy_evolution",
    critical_stability_signals: "platform_stabilization",
    oscillation_detected: "platform_stabilization",
    tenant_drift: "tenant_tuning",
    spillover_effects: "cross_stage_learning",
    high_false_positive_rate: "predictive_error",
    policy_churn: "execution_governance",
    high_repair_burden: "operational",
  };

  for (const code of rec.rationale_codes) {
    if (layerMap[code]) layers.add(layerMap[code]);
  }

  const tradeoffs: string[] = [];
  if (rec.safety_class === "high_risk_review") {
    tradeoffs.push("high_risk_change_may_require_staged_rollout");
  }
  if (rec.confidence_score < 0.7) {
    tradeoffs.push("moderate_confidence_may_need_additional_evidence");
  }
  tradeoffs.push("implementation_may_temporarily_reduce_experimentation_velocity");

  const reviewItems: string[] = [];
  if (rec.review_requirements) {
    for (const [key, val] of Object.entries(rec.review_requirements)) {
      if (val) reviewItems.push(key);
    }
  }
  if (reviewItems.length === 0) reviewItems.push("general_engineering_review");

  return {
    recommendation_type: rec.recommendation_type,
    what_triggered: triggers,
    contributing_layers: Array.from(layers),
    recurring_patterns: rec.rationale_codes,
    why_now: `${triggers.length} signal(s) detected with ${rec.confidence_score} confidence`,
    likely_tradeoffs: tradeoffs,
    review_before_implementation: reviewItems,
  };
}
