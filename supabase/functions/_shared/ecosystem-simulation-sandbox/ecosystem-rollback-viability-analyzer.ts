/**
 * Ecosystem Rollback Viability Analyzer — Sprint 59
 * Evaluates rollback feasibility if simulated participation fails or misbehaves.
 */

export interface RollbackInput {
  rollback_feasibility: number;
  isolation_boundary_strength: number;
  blast_radius_score: number;
  dependency_count: number;
}

export interface RollbackResult {
  rollback_viability_score: number;
  viable: boolean;
  strategies: string[];
  risk_factors: string[];
}

export function analyzeRollbackViability(input: RollbackInput): RollbackResult {
  const strategies: string[] = [];
  const factors: string[] = [];

  if (input.rollback_feasibility > 0.7) strategies.push('instant_rollback');
  else if (input.rollback_feasibility > 0.4) strategies.push('staged_rollback');
  else strategies.push('manual_rollback_only');

  if (input.isolation_boundary_strength > 0.7) strategies.push('boundary_isolation');
  if (input.blast_radius_score > 0.6) factors.push('large_blast_radius_complicates_rollback');
  if (input.dependency_count > 5) factors.push('high_dependency_count');

  const score = input.rollback_feasibility * 0.5 + input.isolation_boundary_strength * 0.3 + (1 - input.blast_radius_score) * 0.2;

  return {
    rollback_viability_score: Math.round(Math.min(1, score) * 10000) / 10000,
    viable: score >= 0.5,
    strategies,
    risk_factors: factors,
  };
}
