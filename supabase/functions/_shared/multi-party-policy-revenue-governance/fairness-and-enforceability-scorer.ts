/**
 * Fairness and Enforceability Scorer — Sprint 62
 * Scores fairness, enforceability, and boundedness of multi-party rules.
 */

export interface FairnessInput {
  rights_balance: number;
  obligation_balance: number;
  restriction_symmetry: number;
  policy_coverage: number;
}

export interface FairnessResult {
  fairness_score: number;
  enforceability_score: number;
  rationale: string[];
}

export function scoreFairnessAndEnforceability(input: FairnessInput): FairnessResult {
  const rationale: string[] = [];
  const fairness = input.rights_balance * 0.4 + input.obligation_balance * 0.3 + input.restriction_symmetry * 0.3;
  const enforceability = input.policy_coverage * 0.6 + input.restriction_symmetry * 0.4;

  if (fairness < 0.4) rationale.push('unfair_balance');
  if (enforceability < 0.4) rationale.push('weak_enforceability');

  return {
    fairness_score: Math.round(Math.min(1, fairness) * 10000) / 10000,
    enforceability_score: Math.round(Math.min(1, enforceability) * 10000) / 10000,
    rationale,
  };
}
