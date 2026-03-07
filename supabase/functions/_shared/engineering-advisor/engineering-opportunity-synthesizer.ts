// Engineering Opportunity Synthesizer — Sprint 35
// Identifies high-value engineering opportunities from advisory signals.

import { AdvisorySignal } from "./engineering-advisory-signal-aggregator.ts";

export interface EngineeringOpportunity {
  opportunity_type: string;
  affected_scope: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence_score: number;
  rationale_codes: string[];
  evidence_refs: Record<string, unknown>;
  expected_engineering_benefit: string;
}

const OPPORTUNITY_PATTERNS: Array<{
  match: (signals: AdvisorySignal[]) => AdvisorySignal[];
  type: string;
  benefit: string;
  minSignals: number;
}> = [
  {
    match: (s) => s.filter(x => x.signal_type === "bottleneck_detected"),
    type: "repeated_pipeline_bottleneck",
    benefit: "reduce_pipeline_latency_and_failure_rate",
    minSignals: 1,
  },
  {
    match: (s) => s.filter(x => x.signal_type === "degrading_strategies" || x.signal_type === "rollback_dominant"),
    type: "strategy_family_underperformance",
    benefit: "improve_strategy_family_design",
    minSignals: 1,
  },
  {
    match: (s) => s.filter(x => x.signal_type === "portfolio_conflicts"),
    type: "chronic_policy_conflict",
    benefit: "reduce_policy_conflict_overhead",
    minSignals: 1,
  },
  {
    match: (s) => s.filter(x => x.signal_type === "tenant_drift"),
    type: "missing_governance_defaults",
    benefit: "stabilize_tenant_tuning_with_better_defaults",
    minSignals: 1,
  },
  {
    match: (s) => s.filter(x => x.signal_type === "harmful_calibration_outcomes"),
    type: "calibration_sensitivity_imbalance",
    benefit: "reduce_calibration_noise",
    minSignals: 1,
  },
  {
    match: (s) => s.filter(x => x.signal_type === "critical_stability_signals" || x.signal_type === "oscillation_detected"),
    type: "recurring_instability",
    benefit: "establish_stable_operating_conditions",
    minSignals: 1,
  },
  {
    match: (s) => s.filter(x => x.signal_type === "high_repair_burden"),
    type: "structural_repair_debt",
    benefit: "reduce_repair_cost_and_latency",
    minSignals: 1,
  },
  {
    match: (s) => s.filter(x => x.signal_type === "high_false_positive_rate"),
    type: "prediction_accuracy_gap",
    benefit: "improve_predictive_precision",
    minSignals: 1,
  },
  {
    match: (s) => s.filter(x => x.signal_type === "spillover_effects"),
    type: "cross_stage_interference",
    benefit: "reduce_downstream_failure_propagation",
    minSignals: 1,
  },
];

export function synthesizeOpportunities(signals: AdvisorySignal[]): EngineeringOpportunity[] {
  if (!signals || signals.length === 0) return [];

  const opportunities: EngineeringOpportunity[] = [];

  for (const pattern of OPPORTUNITY_PATTERNS) {
    const matched = pattern.match(signals);
    if (matched.length < pattern.minSignals) continue;

    const maxSeverity = matched.reduce((max, s) => {
      const order = { low: 0, medium: 1, high: 2, critical: 3 };
      return order[s.severity] > order[max] ? s.severity : max;
    }, "low" as "low" | "medium" | "high" | "critical");

    const avgConfidence = matched.reduce((sum, s) => sum + s.confidence, 0) / matched.length;

    const evidenceRefs: Record<string, unknown> = {};
    for (const m of matched) {
      Object.assign(evidenceRefs, m.evidence_refs);
    }

    opportunities.push({
      opportunity_type: pattern.type,
      affected_scope: matched[0].affected_scope,
      severity: maxSeverity,
      confidence_score: Math.round(avgConfidence * 100) / 100,
      rationale_codes: matched.map(m => m.signal_type),
      evidence_refs: evidenceRefs,
      expected_engineering_benefit: pattern.benefit,
    });
  }

  return opportunities;
}
