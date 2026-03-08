/**
 * Bounded Remediation Recommender — Sprint 63
 * Produces advisory-first remediation recommendations.
 */

export interface RemediationInput {
  variance_score: number;
  drift_score: number;
  fragility_score: number;
  institutional_risk_score: number;
}

export interface RemediationResult {
  remediation_priority_score: number;
  recommendation_status: string;
  bounded_remediation_readiness_score: number;
  rationale: string[];
}

export function recommendRemediation(input: RemediationInput): RemediationResult {
  const rationale: string[] = [];
  const priority = input.variance_score * 0.3 + input.drift_score * 0.3 + input.fragility_score * 0.2 + input.institutional_risk_score * 0.2;

  if (input.institutional_risk_score > 0.7) rationale.push('high_institutional_risk');
  if (input.drift_score > 0.5) rationale.push('significant_drift');

  const status = priority >= 0.6 ? 'remediation_candidate' : priority >= 0.4 ? 'needs_review' : priority >= 0.2 ? 'monitor' : 'stable';
  const readiness = priority >= 0.4 ? Math.min(1, priority * 0.8) : 0;

  return {
    remediation_priority_score: Math.round(Math.min(1, priority) * 10000) / 10000,
    recommendation_status: status,
    bounded_remediation_readiness_score: Math.round(readiness * 10000) / 10000,
    rationale,
  };
}
