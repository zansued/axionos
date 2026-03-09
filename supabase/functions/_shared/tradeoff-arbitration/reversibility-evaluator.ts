/**
 * reversibility-evaluator.ts
 * Identifies whether a tradeoff can be reversed or compensated later.
 */
import type { GainSacrificeAnalysis } from "./gain-sacrifice-analyzer.ts";

export interface ReversibilityAssessment {
  subject_id: string;
  reversibility_score: number; // 0-1, 1 = fully reversible
  reversibility_label: string; // "fully_reversible" | "partially_reversible" | "difficult_to_reverse" | "irreversible"
  irreversible_sacrifices: string[];
  compensation_paths: string[];
  advisory: string;
}

const HARD_TO_REVERSE = new Set(["sovereignty", "legitimacy", "mission", "compliance"]);
const EASY_TO_REVERSE = new Set(["cost", "speed", "ux"]);

export function evaluateReversibility(analysis: GainSacrificeAnalysis): ReversibilityAssessment {
  const irreversibleSacrifices: string[] = [];
  const compensationPaths: string[] = [];

  let reversibilityPoints = 0;
  let totalSacrifices = analysis.sacrifices.length || 1;

  for (const sac of analysis.sacrifices) {
    if (HARD_TO_REVERSE.has(sac.dimension_code)) {
      if (sac.impact_label === "severe_sacrifice") {
        irreversibleSacrifices.push(sac.dimension_name);
      } else {
        reversibilityPoints += 0.3;
        compensationPaths.push(`Invest in ${sac.dimension_name} recovery within next cycle`);
      }
    } else if (EASY_TO_REVERSE.has(sac.dimension_code)) {
      reversibilityPoints += 1;
      compensationPaths.push(`${sac.dimension_name} can be restored with resource reallocation`);
    } else {
      reversibilityPoints += 0.6;
      compensationPaths.push(`${sac.dimension_name} partially recoverable with targeted intervention`);
    }
  }

  const score = analysis.sacrifices.length === 0
    ? 1
    : Math.min(1, reversibilityPoints / totalSacrifices);

  let label = "fully_reversible";
  if (score < 0.3) label = "irreversible";
  else if (score < 0.5) label = "difficult_to_reverse";
  else if (score < 0.8) label = "partially_reversible";

  let advisory = "All sacrifices in this tradeoff are reversible.";
  if (label === "irreversible") {
    advisory = `CRITICAL: Sacrifices to ${irreversibleSacrifices.join(", ")} are effectively irreversible. This tradeoff requires explicit institutional approval.`;
  } else if (label === "difficult_to_reverse") {
    advisory = `WARNING: Reversing this tradeoff would be costly. ${irreversibleSacrifices.length > 0 ? `${irreversibleSacrifices.join(", ")} may not recover.` : ""}`;
  } else if (label === "partially_reversible") {
    advisory = "Most sacrifices can be compensated with targeted investment.";
  }

  return {
    subject_id: analysis.subject_id,
    reversibility_score: round(score),
    reversibility_label: label,
    irreversible_sacrifices: irreversibleSacrifices,
    compensation_paths: compensationPaths,
    advisory,
  };
}

function round(v: number): number {
  return Math.round(v * 10000) / 10000;
}
