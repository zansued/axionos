/**
 * External Admission Case Builder — Sprint 58
 * Creates formal admission review cases from actor records.
 */

export interface AdmissionCaseInput {
  actor_id: string;
  external_actor_name: string;
  identity_confidence_score: number;
  evidence_completeness_score: number;
  auditability_score: number;
  policy_alignment_score: number;
  risk_score: number;
}

export interface AdmissionCase {
  actor_id: string;
  admission_readiness_score: number;
  evidence_completeness_score: number;
  auditability_score: number;
  policy_alignment_score: number;
  risk_score: number;
  restriction_level: string;
  recommendation_status: string;
  rationale: string[];
}

export function buildAdmissionCase(input: AdmissionCaseInput): AdmissionCase {
  const rationale: string[] = [];

  const readiness =
    input.identity_confidence_score * 0.2 +
    input.evidence_completeness_score * 0.2 +
    input.auditability_score * 0.2 +
    input.policy_alignment_score * 0.2 +
    (1 - input.risk_score) * 0.2;

  let restriction = 'restricted';
  let recommendation = 'recommend_delay';

  if (readiness < 0.2) {
    restriction = 'never_admit';
    recommendation = 'recommend_reject';
    rationale.push('very_low_readiness');
  } else if (readiness < 0.4) {
    restriction = 'restricted';
    recommendation = 'recommend_restrict';
    rationale.push('low_readiness');
  } else if (readiness < 0.6) {
    restriction = 'restricted';
    recommendation = 'recommend_delay';
    rationale.push('moderate_readiness');
  } else if (readiness < 0.75) {
    restriction = 'provisional';
    recommendation = 'recommend_future_sandbox_candidate';
    rationale.push('good_readiness');
  } else {
    restriction = 'sandbox_eligible';
    recommendation = 'recommend_controlled_future_candidate';
    rationale.push('high_readiness');
  }

  return {
    actor_id: input.actor_id,
    admission_readiness_score: Math.round(readiness * 10000) / 10000,
    evidence_completeness_score: input.evidence_completeness_score,
    auditability_score: input.auditability_score,
    policy_alignment_score: input.policy_alignment_score,
    risk_score: input.risk_score,
    restriction_level: restriction,
    recommendation_status: recommendation,
    rationale,
  };
}
