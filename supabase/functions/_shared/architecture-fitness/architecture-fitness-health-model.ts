/**
 * Architecture Fitness Health Model — Sprint 44
 */

export interface FitnessHealthInput {
  boundary_fitness: number;
  isolation_fitness: number;
  observability_fitness: number;
  change_density_resilience: number;
  migration_readiness: number;
  adaptation_stability: number;
  dimension_count: number;
  critical_dimensions: number;
  degrading_dimensions: number;
}

export interface FitnessHealth {
  architecture_fitness_index: number;
  boundary_discipline_index: number;
  isolation_integrity_index: number;
  observability_fitness_index: number;
  change_density_resilience_index: number;
  migration_readiness_fitness_index: number;
  adaptation_stability_fitness_index: number;
  overall_health: "healthy" | "moderate" | "stressed" | "critical";
}

export function computeFitnessHealth(input: FitnessHealthInput): FitnessHealth {
  const overall = (
    input.boundary_fitness * 0.2 +
    input.isolation_fitness * 0.2 +
    input.observability_fitness * 0.15 +
    input.change_density_resilience * 0.15 +
    input.migration_readiness * 0.15 +
    input.adaptation_stability * 0.15
  );

  let health: "healthy" | "moderate" | "stressed" | "critical" = "healthy";
  if (input.critical_dimensions > 0 || overall < 0.3) health = "critical";
  else if (input.degrading_dimensions > 2 || overall < 0.5) health = "stressed";
  else if (overall < 0.7) health = "moderate";

  const r = (n: number) => Math.round(n * 10000) / 10000;
  return {
    architecture_fitness_index: r(overall),
    boundary_discipline_index: r(input.boundary_fitness),
    isolation_integrity_index: r(input.isolation_fitness),
    observability_fitness_index: r(input.observability_fitness),
    change_density_resilience_index: r(input.change_density_resilience),
    migration_readiness_fitness_index: r(input.migration_readiness),
    adaptation_stability_fitness_index: r(input.adaptation_stability),
    overall_health: health,
  };
}
