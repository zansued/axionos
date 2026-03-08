// Economic Explainer — Sprint 48
// Produces structured, human-readable explanations for economic scores and recommendations.

export interface EconomicExplanation {
  summary: string;
  sections: EconomicExplanationSection[];
  safety_notes: string[];
  assumptions: string[];
  limitations: string[];
}

export interface EconomicExplanationSection {
  title: string;
  content: string;
  metrics: Record<string, number | string>;
}

export function explainAssessment(params: {
  changeType: string;
  projectedChangeCost: number;
  projectedReliabilityGain: number;
  projectedStabilityGain: number;
  rollbackCost: number;
  tradeoffScore: number;
  confidenceScore: number;
  roi30d: number;
  roi90d: number;
  rationale: string[];
  riskFlags: string[];
}): EconomicExplanation {
  const {
    changeType, projectedChangeCost, projectedReliabilityGain,
    projectedStabilityGain, rollbackCost, tradeoffScore,
    confidenceScore, roi30d, roi90d, rationale, riskFlags,
  } = params;

  const sections: EconomicExplanationSection[] = [];

  // Cost section
  sections.push({
    title: "Projected Cost Impact",
    content: `Implementation cost estimated at $${projectedChangeCost.toFixed(4)}. Rollback exposure at $${rollbackCost.toFixed(4)}.`,
    metrics: {
      implementation_cost: projectedChangeCost,
      rollback_cost: rollbackCost,
      change_type: changeType,
    },
  });

  // Gains section
  sections.push({
    title: "Projected Gains",
    content: `Reliability gain: ${(projectedReliabilityGain * 100).toFixed(1)}%. Stability gain: ${(projectedStabilityGain * 100).toFixed(1)}%.`,
    metrics: {
      reliability_gain_pct: Math.round(projectedReliabilityGain * 100),
      stability_gain_pct: Math.round(projectedStabilityGain * 100),
    },
  });

  // ROI section
  sections.push({
    title: "Return on Investment",
    content: `30-day ROI: ${(roi30d * 100).toFixed(1)}%. 90-day ROI: ${(roi90d * 100).toFixed(1)}%.`,
    metrics: { roi_30d_pct: Math.round(roi30d * 100), roi_90d_pct: Math.round(roi90d * 100) },
  });

  // Tradeoff section
  sections.push({
    title: "Tradeoff Score",
    content: `Overall tradeoff score: ${(tradeoffScore * 100).toFixed(0)}/100. Confidence: ${(confidenceScore * 100).toFixed(0)}%.`,
    metrics: { tradeoff_score: tradeoffScore, confidence: confidenceScore },
  });

  const safetyNotes = [
    "This assessment is advisory-only and requires human review before action.",
    "Projected values are estimates based on bounded heuristics, not guarantees.",
    "No architecture, governance, billing, or enforcement mutation is performed.",
  ];

  if (riskFlags.length > 0) {
    safetyNotes.push(`Risk flags detected: ${riskFlags.join(", ")}.`);
  }

  const assumptions = [
    "Cost projections based on historical execution data within current billing period.",
    "Reliability and stability gains are bounded estimates from simulation outputs.",
    "Rollback cost assumes single-phase rollback unless otherwise specified.",
  ];

  const limitations = [
    "Projections do not account for external market or infrastructure cost changes.",
    "Tenant-specific cost isolation depends on accurate organization_id scoping.",
    "Confidence scores are conservative and may understate certainty.",
  ];

  const summary = `Economic assessment for ${changeType} change: $${projectedChangeCost.toFixed(4)} cost, ` +
    `${(tradeoffScore * 100).toFixed(0)}/100 tradeoff score, ` +
    `${(confidenceScore * 100).toFixed(0)}% confidence. ` +
    (riskFlags.length > 0 ? `${riskFlags.length} risk flag(s) detected.` : "No risk flags.");

  return { summary, sections, safety_notes: safetyNotes, assumptions, limitations };
}
