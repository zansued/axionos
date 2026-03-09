/**
 * deferred-risk-evaluator.ts
 * Identifies when current optimization generates future institutional debt.
 */

import type { MultiHorizonEvaluation } from "./multi-horizon-scorer.ts";

export interface DeferredRiskAssessment {
  subject_id: string;
  subject_title: string;
  risk_band: "low" | "moderate" | "high" | "critical";
  deferred_to_horizons: string[];
  composite_deferred_risk: number;
  explanation: string;
  institutional_debt_indicators: string[];
}

export function assessDeferredRisk(evaluation: MultiHorizonEvaluation): DeferredRiskAssessment {
  const { subject, scores } = evaluation;

  const deferredScores = scores
    .filter((s) => s.deferred_risk_score > 0.1)
    .sort((a, b) => b.deferred_risk_score - a.deferred_risk_score);

  const compositeRisk = deferredScores.reduce((acc, s) => acc + s.deferred_risk_score, 0) / Math.max(scores.length, 1);

  const indicators: string[] = [];
  if (evaluation.overall_posture === "short_biased") indicators.push("Short-term bias detected — long-horizon investment may be neglected.");
  if (evaluation.overall_posture === "long_unsupported") indicators.push("Long-term strategy lacks operational support.");
  if (evaluation.overall_posture === "mission_eroding") indicators.push("Mission continuity actively threatened by current activity.");

  for (const s of deferredScores) {
    if (s.deferred_risk_score > 0.5) {
      indicators.push(`High deferred risk to ${s.horizon_type}: ${(s.deferred_risk_score * 100).toFixed(0)}%.`);
    }
  }

  const band = compositeRisk > 0.6 ? "critical" : compositeRisk > 0.4 ? "high" : compositeRisk > 0.2 ? "moderate" : "low";

  const explanation = band === "low"
    ? `"${subject.title}" distributes risk healthily across horizons.`
    : `"${subject.title}" defers ${(compositeRisk * 100).toFixed(0)}% weighted risk to future horizons (${deferredScores.map((s) => s.horizon_type).join(", ")}). This creates institutional debt that compounds over time.`;

  return {
    subject_id: subject.id,
    subject_title: subject.title,
    risk_band: band,
    deferred_to_horizons: deferredScores.map((s) => s.horizon_type),
    composite_deferred_risk: compositeRisk,
    explanation,
    institutional_debt_indicators: indicators,
  };
}
