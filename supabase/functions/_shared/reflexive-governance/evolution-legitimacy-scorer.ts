/**
 * Evolution Legitimacy Scorer — Sprint 111
 * Scores whether a proposed evolution is legitimate, healthy, or an overreaction.
 */

export interface LegitimacyInput {
  proposal_type: string;
  target_layer: string;
  complexity_cost: number;
  reversibility_posture: string;
  boundedness_posture: string;
  kernel_touch_risk: number;
  evidence_count: number;
  recurrence_signals: number;
  has_precedent: boolean;
  mission_alignment_score: number;
}

export interface LegitimacyResult {
  score: number;         // 0-100
  level: string;         // high, medium, low, illegitimate
  classification: string; // healthy_evolution, cautious_improvement, overreaction, complexity_inflation, duplication_risk
  reasoning: string;
  warnings: string[];
}

export function scoreLegitimacy(input: LegitimacyInput): LegitimacyResult {
  let score = 0;
  const warnings: string[] = [];

  // Evidence basis (0-30)
  if (input.evidence_count >= 5) score += 30;
  else if (input.evidence_count >= 3) score += 20;
  else if (input.evidence_count >= 1) score += 10;
  else { warnings.push("No evidence provided"); }

  // Recurrence justification (0-20)
  if (input.recurrence_signals >= 5) score += 20;
  else if (input.recurrence_signals >= 2) score += 10;
  else if (input.recurrence_signals === 0) warnings.push("No recurrence signals — may be premature");

  // Boundedness (0-15)
  if (input.boundedness_posture === "strictly_bounded") score += 15;
  else if (input.boundedness_posture === "loosely_bounded") score += 8;
  else { score += 0; warnings.push("Unbounded scope is a governance risk"); }

  // Reversibility (0-15)
  if (input.reversibility_posture === "fully_reversible") score += 15;
  else if (input.reversibility_posture === "partially_reversible") score += 8;
  else { score += 0; warnings.push("Irreversible changes require maximum scrutiny"); }

  // Complexity proportionality (0-10)
  if (input.complexity_cost <= 30) score += 10;
  else if (input.complexity_cost <= 60) score += 5;
  else warnings.push("High complexity cost — verify proportionality");

  // Mission alignment (0-10)
  if (input.mission_alignment_score >= 0.7) score += 10;
  else if (input.mission_alignment_score >= 0.4) score += 5;

  // Kernel risk penalty
  if (input.kernel_touch_risk > 60) {
    score = Math.max(score - 15, 0);
    warnings.push("High kernel touch risk — extra governance required");
  }

  // Classification
  let classification: string;
  if (score >= 75) classification = "healthy_evolution";
  else if (score >= 55) classification = "cautious_improvement";
  else if (score >= 35) classification = "overreaction";
  else if (input.has_precedent && input.evidence_count < 2) classification = "duplication_risk";
  else classification = "complexity_inflation";

  const level = score >= 70 ? "high" : score >= 45 ? "medium" : score >= 25 ? "low" : "illegitimate";

  return {
    score,
    level,
    classification,
    reasoning: `Legitimacy ${level} (${score}/100). Classification: ${classification}. ${warnings.length} warnings.`,
    warnings,
  };
}
