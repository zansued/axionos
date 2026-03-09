/**
 * horizon-explainer.ts
 * Explains where alignment is strong, weak, conflicted, or deferred.
 */

import type { MultiHorizonEvaluation } from "./multi-horizon-scorer.ts";
import type { DeferredRiskAssessment } from "./deferred-risk-evaluator.ts";
import type { TemporalConflict } from "./temporal-tension-detector.ts";
import type { HorizonRecommendation } from "./horizon-recommendation-engine.ts";

export interface HorizonExplanation {
  subject_id: string;
  subject_title: string;
  overall_posture: string;
  composite_alignment: number;
  composite_tension: number;
  horizon_breakdown: Array<{
    horizon_type: string;
    alignment: number;
    tension: number;
    deferred_risk: number;
    support_level: string;
    narrative: string;
  }>;
  deferred_risk_summary: string;
  conflict_summary: string;
  recommendation_count: number;
  institutional_health_narrative: string;
}

export function explainHorizonPosture(
  evaluation: MultiHorizonEvaluation,
  risk: DeferredRiskAssessment,
  conflicts: TemporalConflict[],
  recommendations: HorizonRecommendation[],
): HorizonExplanation {
  const horizonBreakdown = evaluation.scores.map((s) => ({
    horizon_type: s.horizon_type,
    alignment: s.alignment_score,
    tension: s.tension_score,
    deferred_risk: s.deferred_risk_score,
    support_level: s.support_level,
    narrative: buildHorizonNarrative(s.horizon_type, s.alignment_score, s.tension_score, s.support_level),
  }));

  const postureNarratives: Record<string, string> = {
    balanced: `"${evaluation.subject.title}" maintains healthy multi-horizon alignment. No single horizon dominates at the expense of others.`,
    short_biased: `"${evaluation.subject.title}" is over-optimized for immediate results. Medium and long-term coherence may degrade without rebalancing.`,
    long_unsupported: `"${evaluation.subject.title}" has long-term strategic intent but lacks operational support. The vision is correct but unfunded.`,
    mission_eroding: `"${evaluation.subject.title}" is actively undermining mission continuity. Current activity may be efficient but is directionally harmful.`,
    conflicted: `"${evaluation.subject.title}" generates tension across multiple horizons. Explicit tradeoff arbitration is needed.`,
  };

  return {
    subject_id: evaluation.subject.id,
    subject_title: evaluation.subject.title,
    overall_posture: evaluation.overall_posture,
    composite_alignment: evaluation.composite_alignment,
    composite_tension: evaluation.composite_tension,
    horizon_breakdown: horizonBreakdown,
    deferred_risk_summary: risk.explanation,
    conflict_summary: conflicts.length === 0
      ? "No active temporal conflicts detected."
      : `${conflicts.length} temporal conflict(s): ${conflicts.map((c) => c.conflict_type).join(", ")}.`,
    recommendation_count: recommendations.length,
    institutional_health_narrative: postureNarratives[evaluation.overall_posture] ?? "Posture unknown.",
  };
}

function buildHorizonNarrative(
  horizonType: string,
  alignment: number,
  tension: number,
  supportLevel: string,
): string {
  const labels: Record<string, string> = {
    short_term: "Short-term",
    medium_term: "Medium-term",
    long_term: "Long-term",
    mission_continuity: "Mission continuity",
  };
  const label = labels[horizonType] ?? horizonType;

  if (supportLevel === "strong") return `${label}: Strong alignment (${(alignment * 100).toFixed(0)}%) with manageable tension.`;
  if (supportLevel === "moderate") return `${label}: Moderate support (${(alignment * 100).toFixed(0)}%) — acceptable but should be monitored.`;
  if (supportLevel === "weak") return `${label}: Weak alignment (${(alignment * 100).toFixed(0)}%) with ${(tension * 100).toFixed(0)}% tension. Needs attention.`;
  return `${label}: Unsupported — this horizon receives no meaningful contribution and may be harmed.`;
}
