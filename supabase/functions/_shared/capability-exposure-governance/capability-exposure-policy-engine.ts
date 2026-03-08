/**
 * Capability Exposure Policy Engine — Sprint 57
 * Evaluates which policy sets must govern each exposure class.
 */

export interface PolicyEvaluationInput {
  capability_name: string;
  exposure_class: string;
  existing_policy_coverage: number;
  governance_alignment_score: number;
  isolation_alignment_score: number;
  audit_alignment_score: number;
}

export interface PolicyEvaluationResult {
  capability_name: string;
  exposure_class: string;
  policy_gate_score: number;
  required_policies: string[];
  missing_policies: string[];
  policy_readiness: 'ready' | 'partially_ready' | 'not_ready';
}

const CLASS_POLICY_REQUIREMENTS: Record<string, string[]> = {
  never_expose: ['internal_isolation_policy'],
  internal_only: ['internal_isolation_policy', 'dependency_guard_policy'],
  partner_limited: ['partner_access_policy', 'audit_trail_policy', 'data_isolation_policy', 'dependency_guard_policy'],
  sandbox_only: ['sandbox_boundary_policy', 'audit_trail_policy', 'rollback_policy', 'data_isolation_policy'],
  controlled_future_candidate: ['full_exposure_governance_policy', 'audit_trail_policy', 'trust_verification_policy', 'rollback_policy', 'data_isolation_policy', 'rate_limiting_policy'],
};

export function evaluateExposurePolicies(inputs: PolicyEvaluationInput[]): PolicyEvaluationResult[] {
  return inputs.map(input => {
    const required = CLASS_POLICY_REQUIREMENTS[input.exposure_class] || ['internal_isolation_policy'];
    const coveredCount = Math.floor(input.existing_policy_coverage * required.length);
    const missing = required.slice(coveredCount);

    const score = (input.governance_alignment_score * 0.35 + input.isolation_alignment_score * 0.3 + input.audit_alignment_score * 0.2 + input.existing_policy_coverage * 0.15);

    let readiness: PolicyEvaluationResult['policy_readiness'];
    if (score >= 0.7 && missing.length === 0) readiness = 'ready';
    else if (score >= 0.4) readiness = 'partially_ready';
    else readiness = 'not_ready';

    return {
      capability_name: input.capability_name,
      exposure_class: input.exposure_class,
      policy_gate_score: Math.round(score * 10000) / 10000,
      required_policies: required,
      missing_policies: missing,
      policy_readiness: readiness,
    };
  });
}
