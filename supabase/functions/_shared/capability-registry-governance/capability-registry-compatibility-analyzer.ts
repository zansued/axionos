/**
 * Capability Registry Compatibility Analyzer — Sprint 61
 * Evaluates compatibility, dependency, and sequencing rules.
 */

export interface CompatibilityInput {
  compatibility_score: number;
  dependency_sensitivity_score: number;
  sequencing_constraint: string;
  conflict_count: number;
}

export interface CompatibilityResult {
  overall_compatibility_score: number;
  dependency_risk: string;
  conflicts_detected: boolean;
  rationale: string[];
}

export function analyzeCompatibility(input: CompatibilityInput): CompatibilityResult {
  const rationale: string[] = [];
  let score = input.compatibility_score * 0.6 + (1 - input.dependency_sensitivity_score) * 0.4;

  if (input.conflict_count > 0) { score *= 0.7; rationale.push(`${input.conflict_count}_conflicts_detected`); }
  if (input.dependency_sensitivity_score > 0.7) { rationale.push('high_dependency_sensitivity'); }
  if (input.sequencing_constraint !== 'none') { rationale.push(`sequencing_${input.sequencing_constraint}`); }

  const risk = input.dependency_sensitivity_score > 0.7 ? 'high' : input.dependency_sensitivity_score > 0.4 ? 'moderate' : 'low';

  return {
    overall_compatibility_score: Math.round(Math.min(1, score) * 10000) / 10000,
    dependency_risk: risk,
    conflicts_detected: input.conflict_count > 0,
    rationale,
  };
}
