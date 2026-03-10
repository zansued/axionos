/**
 * Mutation Drift Risk Scorer — Sprint 112
 * Scores the risk of architectural drift from a proposed mutation.
 */

export interface DriftRiskInput {
  mutation_type: string;
  blast_radius_score: number;
  coupling_expansion_score: number;
  affected_layers: string[];
  introduces_new_pattern: boolean;
  deviates_from_canon: boolean;
  has_precedent_in_system: boolean;
  complexity_delta: number;  // estimated lines/files added
}

export interface DriftRiskResult {
  score: number;        // 0-100
  level: string;        // negligible, low, moderate, high, critical
  drift_factors: string[];
  recommendation: string;
}

export function scoreDriftRisk(input: DriftRiskInput): DriftRiskResult {
  let score = 0;
  const factors: string[] = [];

  // Blast radius contribution
  score += input.blast_radius_score * 0.25;

  // Coupling contribution
  score += input.coupling_expansion_score * 0.2;

  // Layer spread
  if (input.affected_layers.length > 3) { score += 20; factors.push("Crosses multiple architectural layers"); }
  else if (input.affected_layers.length > 1) { score += 10; factors.push("Multi-layer impact"); }

  // Pattern novelty
  if (input.introduces_new_pattern) { score += 15; factors.push("Introduces new architectural pattern"); }
  if (input.deviates_from_canon) { score += 20; factors.push("Deviates from canonical patterns"); }
  if (!input.has_precedent_in_system) { score += 10; factors.push("No system precedent"); }

  // Complexity
  if (input.complexity_delta > 500) { score += 10; factors.push("Large complexity increase"); }
  else if (input.complexity_delta > 200) { score += 5; }

  // Mutation type weight
  if (input.mutation_type === "architecture_level") score += 10;
  else if (input.mutation_type === "boundary_level") score += 7;

  score = Math.min(Math.round(score), 100);

  const level = score >= 80 ? "critical" : score >= 60 ? "high" : score >= 40 ? "moderate" : score >= 20 ? "low" : "negligible";
  const recommendation = score >= 60
    ? "High drift risk. Require architectural review and canon alignment check before proceeding."
    : score >= 40
    ? "Moderate drift risk. Verify alignment with existing patterns."
    : "Drift risk is acceptable.";

  return { score, level, drift_factors: factors, recommendation };
}
