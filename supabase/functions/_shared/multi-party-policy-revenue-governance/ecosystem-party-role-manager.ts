/**
 * Ecosystem Party Role Manager — Sprint 62
 * Manages bounded participant roles and role metadata.
 */

export interface PartyRoleInput {
  role_name: string;
  role_type: string;
  restriction_level: string;
  trust_tier_requirement: string;
}

export interface PartyRoleResult {
  role_name: string;
  role_eligibility_score: number;
  recommended_status: string;
  rationale: string[];
}

export function evaluatePartyRole(input: PartyRoleInput): PartyRoleResult {
  const rationale: string[] = [];
  let score = 0.5;

  if (input.trust_tier_requirement === 'unknown') { score -= 0.2; rationale.push('unknown_trust_tier'); }
  if (input.restriction_level === 'hard') { score -= 0.3; rationale.push('hard_restriction'); }
  if (input.role_type === 'external') { score -= 0.1; rationale.push('external_role'); }
  if (input.trust_tier_requirement === 'trusted') { score += 0.3; rationale.push('trusted_tier'); }

  const status = score >= 0.5 ? 'active' : score >= 0.3 ? 'restricted' : 'suspended';

  return {
    role_name: input.role_name,
    role_eligibility_score: Math.round(Math.max(0, Math.min(1, score)) * 10000) / 10000,
    recommended_status: status,
    rationale,
  };
}
