/**
 * Decision Legitimacy Scorer
 * Scores authority legitimacy based on constitutional basis and contextual alignment.
 */

export interface LegitimacyInput {
  authorityLevel: string;
  hasConstitutionalBasis: boolean;
  isDelegated: boolean;
  delegationActive: boolean;
  isTemporary: boolean;
  isEmergency: boolean;
  reviewRequired: boolean;
  overlapRisk: boolean;
}

export interface LegitimacyScore {
  score: number;       // 0–100
  level: string;       // high, medium, low, contested
  explanation: string;
}

export function scoreLegitimacy(input: LegitimacyInput): LegitimacyScore {
  let score = 0;

  if (input.authorityLevel === "prohibited") {
    return { score: 0, level: "denied", explanation: "Authority is explicitly prohibited." };
  }

  if (input.hasConstitutionalBasis) score += 40;
  if (input.authorityLevel === "formal") score += 30;
  else if (input.authorityLevel === "delegated" && input.delegationActive) score += 25;
  else if (input.authorityLevel === "temporary") score += 15;
  else if (input.authorityLevel === "emergency") score += 20;
  else if (input.authorityLevel === "advisory") score += 5;

  if (!input.overlapRisk) score += 15;
  if (!input.reviewRequired) score += 10;

  if (input.overlapRisk) {
    return { score: Math.min(score, 50), level: "contested", explanation: "Authority is contested due to overlapping claims." };
  }

  const level = score >= 70 ? "high" : score >= 40 ? "medium" : "low";
  return { score, level, explanation: `Legitimacy ${level} (${score}/100) based on constitutional basis and authority type.` };
}
