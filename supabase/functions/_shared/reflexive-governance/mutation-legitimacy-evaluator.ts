/**
 * Mutation Legitimacy Evaluator — Sprint 112
 * Scores whether a mutation is structurally legitimate.
 */

export interface MutationLegitimacyInput {
  mutation_type: string;
  blast_radius_score: number;
  coupling_expansion_score: number;
  rollback_viability_score: number;
  drift_risk_score: number;
  forbidden_family_flag: boolean;
  topology_change_flag: boolean;
  has_evolution_proposal: boolean;
  evolution_proposal_approved: boolean;
  evidence_count: number;
  mission_alignment_score: number;
}

export interface MutationLegitimacyResult {
  score: number;         // 0-100
  level: string;         // legitimate, conditional, suspect, illegitimate
  classification: string; // safe_mutation, bounded_risk, excessive_risk, forbidden
  warnings: string[];
  recommendation: string;
}

export function evaluateMutationLegitimacy(input: MutationLegitimacyInput): MutationLegitimacyResult {
  const warnings: string[] = [];

  if (input.forbidden_family_flag) {
    return {
      score: 0,
      level: "illegitimate",
      classification: "forbidden",
      warnings: ["Mutation touches a forbidden family. Cannot proceed without extraordinary human override."],
      recommendation: "BLOCKED — forbidden mutation family detected. Escalate to system governance authority.",
    };
  }

  let score = 50; // Start neutral

  // Blast radius penalty
  if (input.blast_radius_score > 70) { score -= 20; warnings.push("Critical blast radius"); }
  else if (input.blast_radius_score > 40) { score -= 10; }
  else score += 5;

  // Coupling penalty
  if (input.coupling_expansion_score > 60) { score -= 15; warnings.push("Dangerous coupling expansion"); }
  else if (input.coupling_expansion_score > 30) { score -= 8; }
  else score += 5;

  // Rollback bonus/penalty
  if (input.rollback_viability_score >= 70) score += 15;
  else if (input.rollback_viability_score >= 40) score += 5;
  else { score -= 10; warnings.push("Low rollback viability"); }

  // Drift risk penalty
  if (input.drift_risk_score > 60) { score -= 10; warnings.push("High drift risk"); }

  // Evolution proposal chain
  if (input.has_evolution_proposal && input.evolution_proposal_approved) score += 15;
  else if (input.has_evolution_proposal) score += 5;
  else { score -= 10; warnings.push("No linked evolution proposal"); }

  // Evidence
  if (input.evidence_count >= 3) score += 10;
  else if (input.evidence_count >= 1) score += 5;

  // Topology
  if (input.topology_change_flag) { score -= 10; warnings.push("Topology change detected"); }

  score = Math.max(0, Math.min(100, score));

  const level = score >= 70 ? "legitimate" : score >= 45 ? "conditional" : score >= 25 ? "suspect" : "illegitimate";
  const classification = score >= 70 ? "safe_mutation" : score >= 45 ? "bounded_risk" : score >= 25 ? "excessive_risk" : "forbidden";

  const recommendation = level === "legitimate"
    ? "Mutation is structurally legitimate. Proceed with standard governance approval."
    : level === "conditional"
    ? "Mutation has conditional legitimacy. Requires additional mitigation or scope reduction."
    : level === "suspect"
    ? "Mutation legitimacy is suspect. Consider decomposition or rejection."
    : "Mutation is not structurally legitimate. Block or reject.";

  return { score, level, classification, warnings, recommendation };
}
