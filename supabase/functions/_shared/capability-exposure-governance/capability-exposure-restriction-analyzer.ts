/**
 * Capability Exposure Restriction Analyzer — Sprint 57
 * Identifies hard restrictions, dependency constraints, and internal-only boundaries.
 */

export interface RestrictionInput {
  capability_name: string;
  criticality_score: number;
  dependency_sensitivity_score: number;
  auditability_score: number;
  has_external_dependencies: boolean;
  has_sensitive_data_access: boolean;
  has_governance_coverage: boolean;
}

export interface RestrictionResult {
  capability_name: string;
  restriction_type: 'internal_only' | 'never_expose' | 'partner_limited' | 'sandbox_only' | 'controlled_future_candidate';
  restriction_severity: 'hard' | 'soft' | 'advisory';
  restriction_severity_score: number;
  dependency_constraints: string[];
  policy_limitations: string[];
  rationale: string;
}

export function analyzeRestrictions(inputs: RestrictionInput[]): RestrictionResult[] {
  return inputs.map(input => {
    const depConstraints: string[] = [];
    const policyLimitations: string[] = [];

    if (input.has_external_dependencies) depConstraints.push('external_dependency_present');
    if (input.has_sensitive_data_access) depConstraints.push('sensitive_data_access');
    if (!input.has_governance_coverage) policyLimitations.push('missing_governance_coverage');
    if (input.auditability_score < 0.5) policyLimitations.push('insufficient_auditability');

    let type: RestrictionResult['restriction_type'];
    let severity: RestrictionResult['restriction_severity'];
    let rationale: string;

    if (input.criticality_score > 0.9) {
      type = 'never_expose'; severity = 'hard';
      rationale = 'Core system capability — hard restriction against any exposure.';
    } else if (input.dependency_sensitivity_score > 0.85 || input.has_sensitive_data_access) {
      type = 'internal_only'; severity = 'hard';
      rationale = 'High dependency sensitivity or sensitive data access — internal only.';
    } else if (input.auditability_score < 0.4 || !input.has_governance_coverage) {
      type = 'partner_limited'; severity = 'soft';
      rationale = 'Insufficient auditability or governance — limited exposure scope.';
    } else if (input.criticality_score > 0.5) {
      type = 'sandbox_only'; severity = 'advisory';
      rationale = 'Elevated criticality — sandbox exposure only until further governance review.';
    } else {
      type = 'controlled_future_candidate'; severity = 'advisory';
      rationale = 'Meets basic restriction thresholds — future candidate under governance.';
    }

    const severityScore = severity === 'hard' ? 1.0 : severity === 'soft' ? 0.6 : 0.3;

    return {
      capability_name: input.capability_name,
      restriction_type: type,
      restriction_severity: severity,
      restriction_severity_score: severityScore,
      dependency_constraints: depConstraints,
      policy_limitations: policyLimitations,
      rationale,
    };
  });
}
