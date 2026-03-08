/**
 * External Trust & Admission Explainer — Sprint 58
 * Returns structured explanations for trust tiers, admission posture, restrictions, and recommendations.
 */

export function explainTrustAdmission() {
  return {
    explanation: 'External Trust & Admission is advisory-first and governance-driven. No live external participation is activated in Sprint 58. All trust tier assignments, admission cases, and recommendations require human review.',
    trust_tiers: [
      { key: 'never_admit', description: 'Actor must not be admitted under any circumstances' },
      { key: 'unknown', description: 'Insufficient information for classification' },
      { key: 'restricted_candidate', description: 'Some signals present but insufficient for admission' },
      { key: 'provisional', description: 'Moderate confidence; may be considered for sandbox eligibility' },
      { key: 'sandbox_eligible', description: 'Good confidence; eligible for future sandbox participation' },
      { key: 'controlled_future_candidate', description: 'High confidence; candidate for future controlled participation' },
    ],
    admission_review_states: [
      'pending', 'under_review', 'restricted', 'delayed', 'rejected',
      'sandbox_eligible_future', 'controlled_future_candidate', 'archived',
    ],
    metrics: [
      'admission_readiness_score', 'trust_tier_confidence_score', 'identity_confidence_score',
      'evidence_completeness_score', 'auditability_score', 'policy_alignment_score',
      'risk_score', 'restriction_level_score', 'admission_review_priority_score',
      'trust_drift_score', 'admission_recommendation_quality_score',
      'admission_outcome_accuracy_score', 'bounded_participation_viability_score',
      'never_admit_confidence_score',
    ],
    safety_constraints: [
      'No marketplace activation',
      'No live external capability access',
      'No autonomous partner enablement',
      'No autonomous trust establishment',
      'All outputs are advisory-first',
      'Human review required for all admission decisions',
      'Tenant isolation enforced via RLS',
    ],
  };
}
