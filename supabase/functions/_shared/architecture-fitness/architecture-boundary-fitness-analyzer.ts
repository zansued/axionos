/**
 * Architecture Boundary Fitness Analyzer — Sprint 44
 */

export interface BoundaryInput {
  boundary_id: string;
  boundary_name: string;
  cross_layer_leakage_count: number;
  coupling_score: number;
  workaround_count: number;
  responsibility_clarity: number;
}

export interface BoundaryFitnessResult {
  boundary_fitness_score: number;
  ambiguity_flags: string[];
  coupling_risk: "low" | "moderate" | "high" | "critical";
  affected_boundaries: string[];
  mitigation_suggestions: string[];
}

export function analyzeBoundaryFitness(boundaries: BoundaryInput[]): BoundaryFitnessResult {
  if (!boundaries.length) {
    return { boundary_fitness_score: 1, ambiguity_flags: [], coupling_risk: "low", affected_boundaries: [], mitigation_suggestions: ["No boundaries to analyze"] };
  }

  const scores = boundaries.map(b => {
    const leakPenalty = Math.min(b.cross_layer_leakage_count * 0.1, 0.4);
    const workaroundPenalty = Math.min(b.workaround_count * 0.05, 0.2);
    return Math.max(0, b.responsibility_clarity * (1 - b.coupling_score) - leakPenalty - workaroundPenalty);
  });

  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const flags: string[] = [];
  const affected: string[] = [];
  const suggestions: string[] = [];

  for (const b of boundaries) {
    if (b.cross_layer_leakage_count > 3) { flags.push(`leakage_${b.boundary_id}`); affected.push(b.boundary_name); }
    if (b.coupling_score > 0.7) { flags.push(`coupling_${b.boundary_id}`); affected.push(b.boundary_name); }
    if (b.workaround_count > 2) suggestions.push(`Consolidate workarounds in ${b.boundary_name}`);
    if (b.responsibility_clarity < 0.5) suggestions.push(`Clarify responsibility for ${b.boundary_name}`);
  }

  let risk: "low" | "moderate" | "high" | "critical" = "low";
  if (avgScore < 0.3) risk = "critical";
  else if (avgScore < 0.5) risk = "high";
  else if (avgScore < 0.7) risk = "moderate";

  return { boundary_fitness_score: Math.round(avgScore * 10000) / 10000, ambiguity_flags: flags, coupling_risk: risk, affected_boundaries: [...new Set(affected)], mitigation_suggestions: suggestions };
}
