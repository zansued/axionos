/**
 * Mutation Coupling Analyzer — Sprint 112
 * Detects coupling expansion and structural sprawl.
 */

export interface CouplingInput {
  new_dependencies: Array<{ source: string; target: string; type: string }>;
  existing_dependency_count: number;
  cross_layer_dependencies: number;
  circular_risk_pairs: Array<[string, string]>;
  shared_state_components: string[];
}

export interface CouplingResult {
  expansion_score: number;   // 0-100
  level: string;             // minimal, moderate, concerning, dangerous
  new_coupling_count: number;
  circular_risks: number;
  warnings: string[];
  recommendation: string;
}

export function analyzeCoupling(input: CouplingInput): CouplingResult {
  let score = 0;
  const warnings: string[] = [];

  const newCount = input.new_dependencies.length;
  score += Math.min(newCount * 8, 32);
  if (newCount > 3) warnings.push(`${newCount} new dependencies introduced`);

  score += Math.min(input.cross_layer_dependencies * 12, 24);
  if (input.cross_layer_dependencies > 1) warnings.push(`${input.cross_layer_dependencies} cross-layer dependencies`);

  const circularCount = input.circular_risk_pairs.length;
  score += Math.min(circularCount * 15, 30);
  if (circularCount > 0) warnings.push(`${circularCount} circular dependency risks detected`);

  score += Math.min(input.shared_state_components.length * 7, 14);
  if (input.shared_state_components.length > 1) warnings.push(`${input.shared_state_components.length} shared-state components affected`);

  score = Math.min(score, 100);

  const level = score >= 70 ? "dangerous" : score >= 45 ? "concerning" : score >= 20 ? "moderate" : "minimal";
  const recommendation = level === "dangerous"
    ? "Coupling expansion is dangerous. Refactor to reduce dependencies before proceeding."
    : level === "concerning"
    ? "Coupling increase is concerning. Review dependency direction and consider interfaces."
    : "Coupling expansion is acceptable.";

  return { expansion_score: score, level, new_coupling_count: newCount, circular_risks: circularCount, warnings, recommendation };
}
