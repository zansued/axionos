/**
 * Canon Remediation Recommender — Sprint 64
 * Produces advisory-first recommendations for canon alignment.
 */

export interface CanonRemediationInput {
  drift_score: number;
  inconsistency_score: number;
  integrity_risk_score: number;
  principle_alignment_score: number;
}

export interface CanonRemediationResult {
  remediation_priority_score: number;
  recommendation_status: string;
  bounded_alignment_readiness_score: number;
  rationale: string[];
}

export function recommendCanonRemediation(input: CanonRemediationInput): CanonRemediationResult {
  const rationale: string[] = [];
  const priority = input.drift_score * 0.3 + input.inconsistency_score * 0.3 + input.integrity_risk_score * 0.2 + (1 - input.principle_alignment_score) * 0.2;

  if (input.integrity_risk_score > 0.7) rationale.push('high_integrity_risk');
  if (input.principle_alignment_score < 0.4) rationale.push('principle_misalignment');

  let status: string;
  if (priority >= 0.6) status = 'needs_canon_review';
  else if (priority >= 0.45) status = 'investigate_drift';
  else if (priority >= 0.3) status = 'review_boundary';
  else if (priority >= 0.15) status = 'monitor';
  else status = 'aligned';

  const readiness = priority >= 0.3 ? Math.min(1, priority * 0.8) : 0;

  return {
    remediation_priority_score: Math.round(Math.min(1, priority) * 10000) / 10000,
    recommendation_status: status,
    bounded_alignment_readiness_score: Math.round(readiness * 10000) / 10000,
    rationale,
  };
}
