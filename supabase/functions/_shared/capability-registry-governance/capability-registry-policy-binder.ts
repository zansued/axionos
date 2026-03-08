/**
 * Capability Registry Policy Binder — Sprint 61
 * Binds registry entries to policy sets and inherited restrictions.
 */

export interface PolicyBindingInput {
  policy_sets: string[];
  restriction_inherited: string;
  governance_score: number;
}

export interface PolicyBindingResult {
  policy_binding_score: number;
  coverage_gaps: string[];
  rationale: string[];
}

export function evaluatePolicyBinding(input: PolicyBindingInput): PolicyBindingResult {
  const gaps: string[] = [];
  const rationale: string[] = [];

  let score = Math.min(1, input.policy_sets.length * 0.25);
  if (input.restriction_inherited === 'hard') { score += 0.2; rationale.push('hard_restriction_inherited'); }
  if (input.policy_sets.length === 0) { gaps.push('no_policy_sets_attached'); score = 0; }
  if (input.governance_score < 0.4) { gaps.push('low_governance_coverage'); }

  return {
    policy_binding_score: Math.round(Math.min(1, score) * 10000) / 10000,
    coverage_gaps: gaps,
    rationale,
  };
}
