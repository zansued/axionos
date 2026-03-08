/**
 * Multi-Party Policy Frame Builder — Sprint 62
 * Builds policy frames for interactions between ecosystem parties.
 */

export interface PolicyFrameInput {
  party_role_a: string;
  party_role_b: string;
  interaction_type: string;
  policy_alignment_score: number;
  fairness_score: number;
  enforceability_score: number;
}

export interface PolicyFrameResult {
  multi_party_governance_score: number;
  recommended_status: string;
  rationale: string[];
}

export function buildPolicyFrame(input: PolicyFrameInput): PolicyFrameResult {
  const rationale: string[] = [];
  let score = input.policy_alignment_score * 0.4 + input.fairness_score * 0.3 + input.enforceability_score * 0.3;

  if (input.enforceability_score < 0.3) { score *= 0.5; rationale.push('weak_enforceability'); }
  if (input.fairness_score < 0.3) { score *= 0.6; rationale.push('unfair_arrangement'); }
  if (input.policy_alignment_score < 0.3) { rationale.push('low_policy_alignment'); }

  const status = score >= 0.6 ? 'active' : score >= 0.4 ? 'under_review' : 'draft';

  return {
    multi_party_governance_score: Math.round(Math.min(1, score) * 10000) / 10000,
    recommended_status: status,
    rationale,
  };
}
