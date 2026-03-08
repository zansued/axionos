/**
 * Ecosystem Policy Foundation Builder — Sprint 56
 * Drafts the policy foundation needed for governed future exposure.
 */

export interface PolicyFoundationInput {
  policy_name: string;
  policy_domain: string;
  policy_scope: string;
  governance_alignment_score: number;
  isolation_alignment_score: number;
  audit_alignment_score: number;
  existing_policy_coverage: number;
}

export interface PolicyFoundationResult {
  policy_name: string;
  policy_domain: string;
  policy_readiness_score: number;
  gaps: string[];
  coverage_assessment: string;
  recommendation: 'ready' | 'partially_ready' | 'not_ready';
}

export function buildPolicyFoundation(inputs: PolicyFoundationInput[]): PolicyFoundationResult[] {
  return inputs.map(input => {
    const gaps: string[] = [];

    if (input.governance_alignment_score < 0.5) gaps.push('governance_misalignment');
    if (input.isolation_alignment_score < 0.5) gaps.push('isolation_gap');
    if (input.audit_alignment_score < 0.5) gaps.push('audit_gap');
    if (input.existing_policy_coverage < 0.3) gaps.push('low_existing_coverage');

    const score = (input.governance_alignment_score * 0.3 + input.isolation_alignment_score * 0.3 + input.audit_alignment_score * 0.2 + input.existing_policy_coverage * 0.2);

    let recommendation: PolicyFoundationResult['recommendation'];
    if (score >= 0.7 && gaps.length === 0) recommendation = 'ready';
    else if (score >= 0.4) recommendation = 'partially_ready';
    else recommendation = 'not_ready';

    const coverage = input.existing_policy_coverage >= 0.7 ? 'comprehensive' : input.existing_policy_coverage >= 0.4 ? 'partial' : 'minimal';

    return {
      policy_name: input.policy_name,
      policy_domain: input.policy_domain,
      policy_readiness_score: Math.round(score * 10000) / 10000,
      gaps,
      coverage_assessment: coverage,
      recommendation,
    };
  });
}
