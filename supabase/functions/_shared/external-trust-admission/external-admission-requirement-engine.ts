/**
 * External Admission Requirement Engine — Sprint 58
 * Evaluates whether required evidence and policy prerequisites are satisfied.
 */

export interface RequirementCheck {
  requirement_name: string;
  requirement_type: string;
  is_met: boolean;
  gap_description: string | null;
  severity: string;
}

export interface RequirementEvaluation {
  total_requirements: number;
  met_count: number;
  unmet_count: number;
  critical_unmet: number;
  evidence_completeness_score: number;
  requirements: RequirementCheck[];
}

const STANDARD_REQUIREMENTS: Omit<RequirementCheck, 'is_met' | 'gap_description'>[] = [
  { requirement_name: 'identity_verification', requirement_type: 'identity', severity: 'critical' },
  { requirement_name: 'organizational_audit_trail', requirement_type: 'auditability', severity: 'critical' },
  { requirement_name: 'policy_compliance_declaration', requirement_type: 'policy', severity: 'standard' },
  { requirement_name: 'data_handling_agreement', requirement_type: 'policy', severity: 'critical' },
  { requirement_name: 'security_posture_evidence', requirement_type: 'evidence', severity: 'standard' },
  { requirement_name: 'integration_scope_documentation', requirement_type: 'evidence', severity: 'standard' },
];

export function evaluateRequirements(
  identityScore: number,
  auditabilityScore: number,
  policyScore: number,
  evidenceScore: number
): RequirementEvaluation {
  const checks: RequirementCheck[] = STANDARD_REQUIREMENTS.map((req) => {
    let met = false;
    let gap: string | null = null;

    switch (req.requirement_type) {
      case 'identity':
        met = identityScore >= 0.5;
        if (!met) gap = `identity_confidence_${(identityScore * 100).toFixed(0)}_below_50`;
        break;
      case 'auditability':
        met = auditabilityScore >= 0.5;
        if (!met) gap = `auditability_${(auditabilityScore * 100).toFixed(0)}_below_50`;
        break;
      case 'policy':
        met = policyScore >= 0.4;
        if (!met) gap = `policy_alignment_${(policyScore * 100).toFixed(0)}_below_40`;
        break;
      case 'evidence':
        met = evidenceScore >= 0.4;
        if (!met) gap = `evidence_completeness_${(evidenceScore * 100).toFixed(0)}_below_40`;
        break;
    }

    return { ...req, is_met: met, gap_description: gap };
  });

  const met = checks.filter((c) => c.is_met).length;
  const unmet = checks.filter((c) => !c.is_met).length;
  const criticalUnmet = checks.filter((c) => !c.is_met && c.severity === 'critical').length;

  return {
    total_requirements: checks.length,
    met_count: met,
    unmet_count: unmet,
    critical_unmet: criticalUnmet,
    evidence_completeness_score: checks.length > 0 ? Math.round((met / checks.length) * 10000) / 10000 : 0,
    requirements: checks,
  };
}
