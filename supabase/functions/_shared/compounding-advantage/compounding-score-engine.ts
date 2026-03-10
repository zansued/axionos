/**
 * Compounding Score Engine — Sprint 122
 * Computes composite compounding advantage scores from multiple signal dimensions.
 */

export interface CompoundingInput {
  reuse_count: number;
  total_executions: number;
  failure_recovery_rate: number;
  doctrine_stability: number;
  autonomy_level: number;
  max_autonomy: number;
  canon_coverage: number;
  unique_patterns_count: number;
  total_patterns_count: number;
}

export interface CompoundingScore {
  compounding: number;
  uniqueness: number;
  reuse_density: number;
  failure_resilience: number;
  doctrine_stability: number;
  autonomy_maturity: number;
}

export function computeCompoundingScore(input: CompoundingInput): CompoundingScore {
  const execMin = Math.max(input.total_executions, 1);
  const patMin = Math.max(input.total_patterns_count, 1);

  const reuse_density = Math.min(1, input.reuse_count / execMin);
  const uniqueness = input.unique_patterns_count / patMin;
  const failure_resilience = input.failure_recovery_rate;
  const doctrine_stability = input.doctrine_stability;
  const autonomy_maturity = input.max_autonomy > 0 ? input.autonomy_level / input.max_autonomy : 0;

  const compounding =
    reuse_density * 0.2 +
    uniqueness * 0.2 +
    failure_resilience * 0.2 +
    doctrine_stability * 0.2 +
    autonomy_maturity * 0.1 +
    input.canon_coverage * 0.1;

  return {
    compounding: Math.round(compounding * 1000) / 1000,
    uniqueness: Math.round(uniqueness * 1000) / 1000,
    reuse_density: Math.round(reuse_density * 1000) / 1000,
    failure_resilience: Math.round(failure_resilience * 1000) / 1000,
    doctrine_stability: Math.round(doctrine_stability * 1000) / 1000,
    autonomy_maturity: Math.round(autonomy_maturity * 1000) / 1000,
  };
}
