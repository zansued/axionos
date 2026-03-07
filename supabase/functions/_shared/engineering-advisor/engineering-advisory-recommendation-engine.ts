// Engineering Advisory Recommendation Engine — Sprint 35
// Generates structured engineering recommendations from opportunities.

import { EngineeringOpportunity } from "./engineering-opportunity-synthesizer.ts";

export interface AdvisoryRecommendation {
  recommendation_type: string;
  target_scope: string;
  target_entities: string[];
  rationale_codes: string[];
  evidence_refs: Record<string, unknown>;
  expected_impact: Record<string, unknown>;
  priority_score: number;
  confidence_score: number;
  safety_class: "low_risk_review" | "medium_risk_review" | "high_risk_review";
  review_requirements: Record<string, unknown>;
  status: "open";
}

const RECOMMENDATION_MAP: Record<string, {
  type: string;
  safety: "low_risk_review" | "medium_risk_review" | "high_risk_review";
  review: Record<string, unknown>;
}> = {
  repeated_pipeline_bottleneck: {
    type: "review_pipeline_bottleneck_zone",
    safety: "medium_risk_review",
    review: { requires_architecture_review: true },
  },
  strategy_family_underperformance: {
    type: "freeze_and_redesign_strategy_family",
    safety: "high_risk_review",
    review: { requires_strategy_review: true, requires_portfolio_review: true },
  },
  chronic_policy_conflict: {
    type: "tighten_policy_conflict_resolution",
    safety: "medium_risk_review",
    review: { requires_policy_review: true },
  },
  missing_governance_defaults: {
    type: "refactor_tenant_tuning_defaults",
    safety: "medium_risk_review",
    review: { requires_governance_review: true },
  },
  calibration_sensitivity_imbalance: {
    type: "add_stabilization_thresholds",
    safety: "low_risk_review",
    review: { requires_calibration_review: true },
  },
  recurring_instability: {
    type: "introduce_explicit_stabilization_controls",
    safety: "high_risk_review",
    review: { requires_stability_review: true, requires_architecture_review: true },
  },
  structural_repair_debt: {
    type: "reduce_repair_burden",
    safety: "medium_risk_review",
    review: { requires_repair_analysis: true },
  },
  prediction_accuracy_gap: {
    type: "recalibrate_predictive_thresholds",
    safety: "low_risk_review",
    review: { requires_prediction_review: true },
  },
  cross_stage_interference: {
    type: "add_cross_stage_guards",
    safety: "medium_risk_review",
    review: { requires_cross_stage_review: true },
  },
};

export function generateRecommendations(opportunities: EngineeringOpportunity[]): AdvisoryRecommendation[] {
  if (!opportunities || opportunities.length === 0) return [];

  return opportunities.map(opp => {
    const mapped = RECOMMENDATION_MAP[opp.opportunity_type] || {
      type: `review_${opp.opportunity_type}`,
      safety: "low_risk_review" as const,
      review: {},
    };

    const severityBoost = { low: 0, medium: 0.1, high: 0.2, critical: 0.3 }[opp.severity];
    const priorityScore = Math.round(Math.min(1, opp.confidence_score * 0.6 + severityBoost + 0.1) * 100) / 100;

    return {
      recommendation_type: mapped.type,
      target_scope: opp.affected_scope,
      target_entities: [opp.affected_scope],
      rationale_codes: opp.rationale_codes,
      evidence_refs: opp.evidence_refs,
      expected_impact: { benefit: opp.expected_engineering_benefit, severity: opp.severity },
      priority_score: priorityScore,
      confidence_score: opp.confidence_score,
      safety_class: mapped.safety,
      review_requirements: mapped.review,
      status: "open" as const,
    };
  });
}
