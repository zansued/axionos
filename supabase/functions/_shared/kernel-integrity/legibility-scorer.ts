/**
 * Legibility Scorer — Sprint 114
 * Evaluates how readable, understandable, and navigable the architecture remains.
 */

export interface LegibilityInput {
  documented_modules: number;
  total_modules: number;
  clear_naming_ratio: number; // 0-1
  dependency_clarity_score: number; // 0-1
  operator_comprehension_score: number; // 0-1, from surveys/reviews
  surface_count: number;
  max_nesting_depth: number;
}

export interface LegibilityResult {
  legibility_score: number;
  rationale: string[];
}

export function scoreLegibility(input: LegibilityInput): LegibilityResult {
  const rationale: string[] = [];

  const docRatio = input.total_modules > 0 ? input.documented_modules / input.total_modules : 1;
  let score = docRatio * 0.25
    + input.clear_naming_ratio * 0.2
    + input.dependency_clarity_score * 0.2
    + input.operator_comprehension_score * 0.25;

  // Surface sprawl penalty
  if (input.surface_count > 20) {
    const penalty = Math.min(0.15, (input.surface_count - 20) * 0.01);
    score -= penalty;
    rationale.push(`surface_sprawl_${input.surface_count}`);
  }

  // Nesting depth penalty
  if (input.max_nesting_depth > 5) {
    const penalty = Math.min(0.1, (input.max_nesting_depth - 5) * 0.02);
    score -= penalty;
    rationale.push(`deep_nesting_${input.max_nesting_depth}`);
  }

  if (docRatio < 0.7) rationale.push("low_documentation_coverage");
  if (input.operator_comprehension_score < 0.5) rationale.push("poor_operator_comprehension");

  return {
    legibility_score: Math.round(Math.max(0, Math.min(1, score)) * 10000) / 10000,
    rationale,
  };
}
