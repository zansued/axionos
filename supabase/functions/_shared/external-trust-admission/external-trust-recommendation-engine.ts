/**
 * External Trust Recommendation Engine — Sprint 58
 * Produces advisory-first admission recommendations for human review.
 */

export interface AdmissionRecommendationInput {
  actor_id: string;
  external_actor_name: string;
  admission_readiness_score: number;
  identity_confidence_score: number;
  evidence_completeness_score: number;
  auditability_score: number;
  policy_alignment_score: number;
  risk_score: number;
  trust_drift_score: number;
}

export interface AdmissionRecommendation {
  actor_id: string;
  external_actor_name: string;
  recommendation: string;
  admission_review_priority_score: number;
  admission_recommendation_quality_score: number;
  never_admit_confidence_score: number;
  rationale: string[];
  required_actions: string[];
}

export function generateAdmissionRecommendation(input: AdmissionRecommendationInput): AdmissionRecommendation {
  const rationale: string[] = [];
  const actions: string[] = [];

  // Never-admit confidence
  let neverAdmitConfidence = 0;
  if (input.identity_confidence_score < 0.15) { neverAdmitConfidence += 0.4; rationale.push('identity_extremely_low'); }
  if (input.auditability_score < 0.15) { neverAdmitConfidence += 0.3; rationale.push('auditability_extremely_low'); }
  if (input.risk_score > 0.9) { neverAdmitConfidence += 0.3; rationale.push('risk_extremely_high'); }
  neverAdmitConfidence = Math.min(1, neverAdmitConfidence);

  if (neverAdmitConfidence > 0.7) {
    return {
      actor_id: input.actor_id,
      external_actor_name: input.external_actor_name,
      recommendation: 'recommend_reject',
      admission_review_priority_score: 0,
      admission_recommendation_quality_score: neverAdmitConfidence,
      never_admit_confidence_score: Math.round(neverAdmitConfidence * 10000) / 10000,
      rationale,
      required_actions: [],
    };
  }

  let recommendation = 'recommend_delay';
  let priority = input.admission_readiness_score;

  if (input.admission_readiness_score < 0.3) {
    recommendation = 'recommend_restrict';
    actions.push('improve_identity_evidence', 'improve_auditability');
  } else if (input.admission_readiness_score < 0.5) {
    recommendation = 'recommend_delay';
    actions.push('address_policy_gaps', 'strengthen_evidence');
  } else if (input.admission_readiness_score < 0.7) {
    recommendation = 'recommend_future_sandbox_candidate';
    actions.push('schedule_review', 'prepare_sandbox_scope');
  } else {
    recommendation = 'recommend_controlled_future_candidate';
    actions.push('document_constraints', 'prepare_bounded_scope');
  }

  if (input.trust_drift_score > 0.3) {
    priority *= 0.8;
    rationale.push('trust_drift_detected');
  }

  return {
    actor_id: input.actor_id,
    external_actor_name: input.external_actor_name,
    recommendation,
    admission_review_priority_score: Math.round(priority * 10000) / 10000,
    admission_recommendation_quality_score: Math.round(Math.min(1, input.admission_readiness_score + 0.1) * 10000) / 10000,
    never_admit_confidence_score: Math.round(neverAdmitConfidence * 10000) / 10000,
    rationale,
    required_actions: actions,
  };
}
