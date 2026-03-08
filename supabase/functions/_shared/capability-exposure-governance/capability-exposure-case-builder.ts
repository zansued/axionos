/**
 * Capability Exposure Case Builder — Sprint 57
 * Transforms readiness outputs into formal exposure governance cases.
 */

export interface ReadinessInput {
  capability_name: string;
  capability_domain: string;
  capability_type: string;
  ecosystem_readiness_score: number;
  safety_prerequisite_score: number;
  policy_readiness_score: number;
  trust_requirement_score: number;
  auditability_score: number;
  internal_criticality_score: number;
  dependency_sensitivity_score: number;
  externalization_risk_score: number;
}

export interface GovernanceCaseOutput {
  capability_name: string;
  capability_domain: string;
  capability_type: string;
  exposure_case_type: string;
  current_readiness_score: number;
  safety_gate_score: number;
  trust_gate_score: number;
  policy_gate_score: number;
  auditability_score: number;
  dependency_sensitivity_score: number;
  criticality_score: number;
  exposure_governance_score: number;
  recommended_restriction_level: string;
  recommended_review_status: string;
  rationale: string[];
}

export function buildGovernanceCases(inputs: ReadinessInput[]): GovernanceCaseOutput[] {
  return inputs.map(input => {
    const rationale: string[] = [];

    // Compute governance score
    const governanceScore = 
      input.ecosystem_readiness_score * 0.2 +
      input.safety_prerequisite_score * 0.25 +
      input.policy_readiness_score * 0.2 +
      input.trust_requirement_score * 0.15 +
      input.auditability_score * 0.1 +
      (1 - input.internal_criticality_score) * 0.05 +
      (1 - input.dependency_sensitivity_score) * 0.05;

    // Determine restriction level
    let restrictionLevel: string;
    let reviewStatus: string;

    if (input.internal_criticality_score > 0.9) {
      restrictionLevel = 'never_expose';
      reviewStatus = 'restricted';
      rationale.push('critical_system_never_expose');
    } else if (input.dependency_sensitivity_score > 0.85 || input.externalization_risk_score > 0.8) {
      restrictionLevel = 'internal_only';
      reviewStatus = 'restricted';
      rationale.push('high_dependency_or_risk');
    } else if (governanceScore < 0.4) {
      restrictionLevel = 'restricted';
      reviewStatus = 'delayed';
      rationale.push('insufficient_governance_readiness');
    } else if (governanceScore < 0.7) {
      restrictionLevel = 'sandbox_only';
      reviewStatus = 'under_review';
      rationale.push('partial_readiness_sandbox_candidate');
    } else {
      restrictionLevel = 'controlled_future_candidate';
      reviewStatus = 'approved_for_future';
      rationale.push('meets_governance_thresholds');
    }

    return {
      capability_name: input.capability_name,
      capability_domain: input.capability_domain,
      capability_type: input.capability_type,
      exposure_case_type: 'governance_assessment',
      current_readiness_score: input.ecosystem_readiness_score,
      safety_gate_score: input.safety_prerequisite_score,
      trust_gate_score: input.trust_requirement_score,
      policy_gate_score: input.policy_readiness_score,
      auditability_score: input.auditability_score,
      dependency_sensitivity_score: input.dependency_sensitivity_score,
      criticality_score: input.internal_criticality_score,
      exposure_governance_score: Math.round(governanceScore * 10000) / 10000,
      recommended_restriction_level: restrictionLevel,
      recommended_review_status: reviewStatus,
      rationale,
    };
  });
}
