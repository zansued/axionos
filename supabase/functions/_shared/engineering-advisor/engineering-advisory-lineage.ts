// Engineering Advisory Lineage — Sprint 35
// Preserves full lineage for every recommendation.

export interface AdvisoryLineage {
  recommendation_id: string;
  source_signals: string[];
  source_modules: string[];
  evidence_refs: Record<string, unknown>;
  reasoning_chain: string[];
  review_outcomes: string[];
  implementation_refs: Record<string, unknown> | null;
  dismissal_rationale: string | null;
}

export function buildLineage(params: {
  recommendation_id: string;
  rationale_codes: string[];
  evidence_refs: Record<string, unknown>;
  recommendation_type: string;
  contributing_layers?: string[];
  review_status?: string;
  review_notes?: string;
  linked_changes?: Record<string, unknown>;
}): AdvisoryLineage {
  const modules: string[] = [];
  const layerModuleMap: Record<string, string> = {
    platform_intelligence: "platform-behavior-aggregator",
    platform_calibration: "platform-calibration-signal-interpreter",
    strategy_portfolio: "strategy-portfolio-analyzer",
    strategy_evolution: "execution-strategy-variants",
    platform_stabilization: "platform-drift-detector",
    cross_stage_learning: "cross-stage-policy-synthesizer",
    tenant_tuning: "tenant-policy-drift-detector",
    predictive_error: "predictive-risk-engine",
    execution_governance: "execution-policy-portfolio-evaluator",
    operational: "initiative-observability",
  };

  for (const layer of (params.contributing_layers || [])) {
    if (layerModuleMap[layer]) modules.push(layerModuleMap[layer]);
  }

  const reasoning: string[] = [
    `signals_detected: ${params.rationale_codes.join(", ")}`,
    `recommendation_generated: ${params.recommendation_type}`,
  ];

  const reviewOutcomes: string[] = [];
  if (params.review_status) {
    reviewOutcomes.push(params.review_status);
    if (params.review_notes) reasoning.push(`review_note: ${params.review_notes}`);
  }

  return {
    recommendation_id: params.recommendation_id,
    source_signals: params.rationale_codes,
    source_modules: modules,
    evidence_refs: params.evidence_refs,
    reasoning_chain: reasoning,
    review_outcomes: reviewOutcomes,
    implementation_refs: params.linked_changes || null,
    dismissal_rationale: params.review_status === "dismissed" ? (params.review_notes || "dismissed_without_notes") : null,
  };
}
