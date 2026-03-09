/**
 * tradeoff-arbitration-engine.ts
 * Generates arbitration suggestions with explicit tradeoff language.
 */
import type { GainSacrificeAnalysis } from "./gain-sacrifice-analyzer.ts";
import type { CompromiseRiskAssessment } from "./compromise-risk-assessor.ts";
import type { ReversibilityAssessment } from "./reversibility-evaluator.ts";

export interface TradeoffRecommendation {
  subject_id: string;
  recommendation_type: string;
  recommendation_summary: string;
  preserved_values: string[];
  sacrificed_values: string[];
  rationale: string;
}

export function generateArbitrationRecommendations(
  analysis: GainSacrificeAnalysis,
  risk: CompromiseRiskAssessment,
  reversibility: ReversibilityAssessment,
): TradeoffRecommendation[] {
  const recs: TradeoffRecommendation[] = [];
  const preserved = analysis.gains.map((g) => g.dimension_name);
  const sacrificed = analysis.sacrifices.map((s) => s.dimension_name);

  // Unacceptable → reject or restructure
  if (risk.risk_level === "unacceptable") {
    recs.push({
      subject_id: analysis.subject_id,
      recommendation_type: "reject_or_restructure",
      recommendation_summary: `Reject or restructure "${analysis.subject_title}": institutional compromise is unacceptable.`,
      preserved_values: preserved,
      sacrificed_values: sacrificed,
      rationale: `${risk.advisory} Corrosion domains: ${risk.corrosion_domains.join(", ")}.`,
    });
  }

  // High risk + irreversible → require approval
  if (risk.risk_level === "high" && reversibility.reversibility_label === "irreversible") {
    recs.push({
      subject_id: analysis.subject_id,
      recommendation_type: "require_explicit_approval",
      recommendation_summary: `Require explicit institutional approval for "${analysis.subject_title}": high risk with irreversible sacrifice.`,
      preserved_values: preserved,
      sacrificed_values: sacrificed,
      rationale: `${risk.advisory} ${reversibility.advisory}`,
    });
  }

  // Elevated risk → monitor and compensate
  if (risk.risk_level === "elevated") {
    recs.push({
      subject_id: analysis.subject_id,
      recommendation_type: "monitor_and_compensate",
      recommendation_summary: `Monitor "${analysis.subject_title}" and plan compensation for ${sacrificed.join(", ")}.`,
      preserved_values: preserved,
      sacrificed_values: sacrificed,
      rationale: `Elevated institutional tension. ${reversibility.compensation_paths.slice(0, 2).join(". ")}.`,
    });
  }

  // Hidden sacrifice → make visible
  if (analysis.net_posture === "hidden_sacrifice") {
    recs.push({
      subject_id: analysis.subject_id,
      recommendation_type: "surface_hidden_sacrifice",
      recommendation_summary: `Hidden sacrifice detected in "${analysis.subject_title}": ${sacrificed.join(", ")} are being silently eroded.`,
      preserved_values: preserved,
      sacrificed_values: sacrificed,
      rationale: "Visible gains mask institutional erosion. Make sacrifice explicit before proceeding.",
    });
  }

  // Net positive but with sacrifices → accept with awareness
  if (analysis.net_posture === "net_positive" && analysis.sacrifices.length > 0) {
    recs.push({
      subject_id: analysis.subject_id,
      recommendation_type: "accept_with_awareness",
      recommendation_summary: `Accept "${analysis.subject_title}" with explicit awareness of ${sacrificed.join(", ")} tradeoff.`,
      preserved_values: preserved,
      sacrificed_values: sacrificed,
      rationale: `Net positive tradeoff. Dominant gain: ${analysis.dominant_gain}. Dominant sacrifice: ${analysis.dominant_sacrifice}.`,
    });
  }

  // No sacrifices → safe to proceed
  if (analysis.sacrifices.length === 0) {
    recs.push({
      subject_id: analysis.subject_id,
      recommendation_type: "safe_to_proceed",
      recommendation_summary: `"${analysis.subject_title}" shows no significant sacrifices. Safe to proceed.`,
      preserved_values: preserved,
      sacrificed_values: [],
      rationale: "No institutional dimensions are materially compromised.",
    });
  }

  return recs;
}
