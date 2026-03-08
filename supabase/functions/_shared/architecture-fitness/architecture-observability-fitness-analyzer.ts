/**
 * Architecture Observability Fitness Analyzer — Sprint 44
 */

export interface ObservabilityInput {
  layer_id: string;
  layer_name: string;
  telemetry_coverage: number;
  explainability_density: number;
  blind_spot_count: number;
  critical_path_coverage: number;
}

export interface ObservabilityFitnessResult {
  observability_fitness_score: number;
  blind_spot_flags: string[];
  explainability_coverage_score: number;
  affected_layers: string[];
}

export function analyzeObservabilityFitness(inputs: ObservabilityInput[]): ObservabilityFitnessResult {
  if (!inputs.length) {
    return { observability_fitness_score: 1, blind_spot_flags: [], explainability_coverage_score: 1, affected_layers: [] };
  }

  const scores = inputs.map(i => (i.telemetry_coverage * 0.4 + i.explainability_density * 0.3 + i.critical_path_coverage * 0.3));
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const explainAvg = inputs.reduce((s, i) => s + i.explainability_density, 0) / inputs.length;

  const flags: string[] = [];
  const affected: string[] = [];
  for (const i of inputs) {
    if (i.blind_spot_count > 0) { flags.push(`blind_spot_${i.layer_id}`); affected.push(i.layer_name); }
    if (i.telemetry_coverage < 0.5) affected.push(i.layer_name);
  }

  return { observability_fitness_score: Math.round(avg * 10000) / 10000, blind_spot_flags: flags, explainability_coverage_score: Math.round(explainAvg * 10000) / 10000, affected_layers: [...new Set(affected)] };
}
