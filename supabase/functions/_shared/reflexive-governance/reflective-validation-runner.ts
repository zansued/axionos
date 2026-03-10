/**
 * Reflective Validation Runner — Sprint 113
 * Orchestrates reflective validation for a self-revision event.
 */

import { compareOutcomes, type OutcomeComparison } from "./self-revision-outcome-comparator.ts";
import { detectDisplacement, type DisplacementSignal } from "./problem-displacement-detector.ts";
import { analyzeRegressionLinks, type RegressionLink } from "./regression-link-analyzer.ts";
import { scoreNetEffectiveness, type EffectivenessResult } from "./net-effectiveness-scorer.ts";
import { calibrateRevisionConfidence } from "./revision-confidence-calibrator.ts";

export interface ValidationInput {
  revision_event_id: string;
  intended_outcome: string;
  observed_outcome: string;
  affected_surfaces: string[];
  before_metrics: Record<string, number>;
  after_metrics: Record<string, number>;
  related_incident_ids?: string[];
}

export interface ValidationResult {
  revision_event_id: string;
  outcome_comparison: OutcomeComparison;
  displacement_signals: DisplacementSignal[];
  regression_links: RegressionLink[];
  effectiveness: EffectivenessResult;
  confidence_score: number;
  rationale: string[];
  verdict: "improved" | "neutral" | "displaced" | "regressed" | "inconclusive";
}

export function runReflectiveValidation(input: ValidationInput): ValidationResult {
  const rationale: string[] = [];

  const comparison = compareOutcomes({
    intended: input.intended_outcome,
    observed: input.observed_outcome,
    before_metrics: input.before_metrics,
    after_metrics: input.after_metrics,
  });

  const displacements = detectDisplacement({
    affected_surfaces: input.affected_surfaces,
    before_metrics: input.before_metrics,
    after_metrics: input.after_metrics,
  });

  const regressions = analyzeRegressionLinks({
    comparison,
    displacement_signals: displacements,
    related_incident_ids: input.related_incident_ids || [],
  });

  const effectiveness = scoreNetEffectiveness({
    local_improvement: comparison.local_improvement_score,
    displacement_risk: displacements.length > 0
      ? displacements.reduce((s, d) => s + d.severity, 0) / displacements.length
      : 0,
    regression_probability: regressions.length > 0
      ? regressions.reduce((s, r) => s + r.confidence, 0) / regressions.length
      : 0,
  });

  const confidence = calibrateRevisionConfidence({
    metrics_available: Object.keys(input.before_metrics).length,
    comparison_quality: comparison.local_improvement_score > 0 ? 0.7 : 0.4,
    displacement_count: displacements.length,
    regression_count: regressions.length,
  });

  if (comparison.local_improvement_score > 0.1) rationale.push("local_improvement_detected");
  if (displacements.length > 0) rationale.push("displacement_signals_found");
  if (regressions.length > 0) rationale.push("regression_links_detected");
  if (effectiveness.net_score < 0) rationale.push("net_negative_effectiveness");

  let verdict: ValidationResult["verdict"];
  if (effectiveness.net_score > 0.1 && displacements.length === 0 && regressions.length === 0) {
    verdict = "improved";
  } else if (displacements.length > 0 && effectiveness.net_score <= 0) {
    verdict = "displaced";
  } else if (regressions.length > 0) {
    verdict = "regressed";
  } else if (Math.abs(effectiveness.net_score) < 0.05) {
    verdict = "neutral";
  } else {
    verdict = "inconclusive";
  }

  return {
    revision_event_id: input.revision_event_id,
    outcome_comparison: comparison,
    displacement_signals: displacements,
    regression_links: regressions,
    effectiveness,
    confidence_score: confidence,
    rationale,
    verdict,
  };
}
