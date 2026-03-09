/**
 * tradeoff-explainer.ts
 * Explains the anatomy of a tradeoff in human-readable form.
 */
import type { GainSacrificeAnalysis } from "./gain-sacrifice-analyzer.ts";
import type { CompromiseRiskAssessment } from "./compromise-risk-assessor.ts";
import type { ReversibilityAssessment } from "./reversibility-evaluator.ts";
import type { TradeoffRecommendation } from "./tradeoff-arbitration-engine.ts";

export interface TradeoffExplanation {
  subject_id: string;
  subject_title: string;
  net_posture: string;
  risk_level: string;
  reversibility_label: string;
  gains_summary: string;
  sacrifices_summary: string;
  institutional_advisory: string;
  recommendation_count: number;
}

export function explainTradeoff(
  analysis: GainSacrificeAnalysis,
  risk: CompromiseRiskAssessment,
  reversibility: ReversibilityAssessment,
  recommendations: TradeoffRecommendation[],
): TradeoffExplanation {
  const gainNames = analysis.gains.map((g) => g.dimension_name);
  const sacNames = analysis.sacrifices.map((s) => s.dimension_name);

  const gainsSummary = gainNames.length > 0
    ? `Gains: ${gainNames.join(", ")}. Dominant gain: ${analysis.dominant_gain}.`
    : "No significant gains identified.";

  const sacrificesSummary = sacNames.length > 0
    ? `Sacrifices: ${sacNames.join(", ")}. Dominant sacrifice: ${analysis.dominant_sacrifice}.`
    : "No significant sacrifices detected.";

  let advisory = "";
  if (risk.risk_level === "unacceptable") {
    advisory = `⚠️ UNACCEPTABLE TRADEOFF. ${risk.advisory} ${reversibility.advisory}`;
  } else if (risk.risk_level === "high") {
    advisory = `🔴 HIGH RISK. ${risk.advisory} Reversibility: ${reversibility.reversibility_label}.`;
  } else if (risk.risk_level === "elevated") {
    advisory = `🟡 ELEVATED. ${risk.advisory} Reversibility: ${reversibility.reversibility_label}.`;
  } else {
    advisory = `🟢 ACCEPTABLE. ${risk.advisory} Reversibility: ${reversibility.reversibility_label}.`;
  }

  return {
    subject_id: analysis.subject_id,
    subject_title: analysis.subject_title,
    net_posture: analysis.net_posture,
    risk_level: risk.risk_level,
    reversibility_label: reversibility.reversibility_label,
    gains_summary: gainsSummary,
    sacrifices_summary: sacrificesSummary,
    institutional_advisory: advisory,
    recommendation_count: recommendations.length,
  };
}
