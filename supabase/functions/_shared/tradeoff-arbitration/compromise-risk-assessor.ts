/**
 * compromise-risk-assessor.ts
 * Scores whether a compromise is acceptable, risky, or institutionally corrosive.
 */
import type { GainSacrificeAnalysis } from "./gain-sacrifice-analyzer.ts";

export interface CompromiseRiskAssessment {
  subject_id: string;
  compromise_risk_score: number; // 0-1, 1 = extremely risky
  legitimacy_tension_score: number; // 0-1
  risk_level: string; // "acceptable" | "elevated" | "high" | "unacceptable"
  corrosion_domains: string[];
  risk_factors: string[];
  advisory: string;
}

const HIGH_VALUE_DIMENSIONS = new Set(["mission", "sovereignty", "legitimacy", "continuity", "compliance"]);

export function assessCompromiseRisk(analysis: GainSacrificeAnalysis): CompromiseRiskAssessment {
  const riskFactors: string[] = [];
  const corrosionDomains: string[] = [];

  // Check if high-value dimensions are sacrificed
  let highValueSacrificeCount = 0;
  let severeSacrificeCount = 0;
  let legitimacyTension = 0;

  for (const sac of analysis.sacrifices) {
    if (HIGH_VALUE_DIMENSIONS.has(sac.dimension_code)) {
      highValueSacrificeCount++;
      corrosionDomains.push(sac.dimension_code);
      riskFactors.push(`${sac.dimension_name} is being sacrificed (${sac.impact_label})`);
    }
    if (sac.impact_label === "severe_sacrifice") {
      severeSacrificeCount++;
    }
    if (sac.dimension_code === "legitimacy") {
      legitimacyTension = Math.abs(sac.impact_score);
    }
  }

  // Hidden sacrifice: gains look good but critical dimensions erode
  if (analysis.net_posture === "hidden_sacrifice") {
    riskFactors.push("Hidden sacrifice detected: visible gains mask institutional erosion");
  }

  // Calculate composite risk
  let riskScore = 0;
  riskScore += highValueSacrificeCount * 0.2;
  riskScore += severeSacrificeCount * 0.15;
  riskScore += (analysis.sacrifices.length > analysis.gains.length) ? 0.1 : 0;
  if (analysis.net_posture === "net_sacrifice") riskScore += 0.15;
  if (analysis.net_posture === "hidden_sacrifice") riskScore += 0.2;
  riskScore = Math.min(1, riskScore);

  let riskLevel = "acceptable";
  if (riskScore >= 0.7) riskLevel = "unacceptable";
  else if (riskScore >= 0.5) riskLevel = "high";
  else if (riskScore >= 0.3) riskLevel = "elevated";

  let advisory = "Tradeoff posture is within acceptable institutional bounds.";
  if (riskLevel === "unacceptable") {
    advisory = `UNACCEPTABLE: This tradeoff severely compromises ${corrosionDomains.join(", ")}. Recommend rejection or restructuring.`;
  } else if (riskLevel === "high") {
    advisory = `HIGH RISK: Institutional values at risk in ${corrosionDomains.join(", ")}. Requires explicit approval and mitigation plan.`;
  } else if (riskLevel === "elevated") {
    advisory = `ELEVATED: Some institutional tension detected. Monitor ${corrosionDomains.join(", ")} closely.`;
  }

  return {
    subject_id: analysis.subject_id,
    compromise_risk_score: round(riskScore),
    legitimacy_tension_score: round(legitimacyTension),
    risk_level: riskLevel,
    corrosion_domains: corrosionDomains,
    risk_factors: riskFactors,
    advisory,
  };
}

function round(v: number): number {
  return Math.round(v * 10000) / 10000;
}
