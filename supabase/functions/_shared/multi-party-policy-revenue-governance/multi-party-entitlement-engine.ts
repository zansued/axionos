/**
 * Multi-Party Entitlement Engine — Sprint 62
 * Evaluates rights, obligations, limits, and restriction inheritance across roles.
 */

export interface EntitlementInput {
  obligation_level: string;
  restriction_level: string;
  access_limit_score: number;
  rights_count: number;
  obligations_count: number;
}

export interface EntitlementResult {
  entitlement_integrity_score: number;
  restriction_level_score: number;
  unsafe_combinations: string[];
  rationale: string[];
}

export function evaluateEntitlements(input: EntitlementInput): EntitlementResult {
  const rationale: string[] = [];
  const unsafe: string[] = [];

  let integrity = 0.5 + input.access_limit_score * 0.3;
  let restriction = input.restriction_level === 'hard' ? 0.9 : input.restriction_level === 'elevated' ? 0.6 : 0.3;

  if (input.rights_count > 0 && input.obligations_count === 0) { unsafe.push('rights_without_obligations'); integrity *= 0.5; }
  if (input.obligation_level === 'none') { rationale.push('no_obligations_defined'); integrity *= 0.7; }

  return {
    entitlement_integrity_score: Math.round(Math.min(1, integrity) * 10000) / 10000,
    restriction_level_score: Math.round(restriction * 10000) / 10000,
    unsafe_combinations: unsafe,
    rationale,
  };
}
