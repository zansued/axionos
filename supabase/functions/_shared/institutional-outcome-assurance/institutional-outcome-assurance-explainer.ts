/**
 * Institutional Outcome Assurance Explainer — Sprint 63
 * Returns structured explanations for assurance posture.
 */

export function explainInstitutionalOutcomeAssurance() {
  return {
    explanation: 'Institutional Outcome Assurance verifies whether the platform consistently produces intended outcomes across pipeline, architecture, product, governance, and ecosystem layers. All remediation is advisory-first.',
    outcome_domains: ['pipeline', 'architecture', 'product', 'governance', 'ecosystem', 'commercial'],
    review_states: ['stable', 'monitor', 'needs_review', 'high_variance', 'remediation_candidate'],
    metrics: [
      'expected_outcome_score', 'realized_outcome_score', 'outcome_variance_score',
      'assurance_confidence_score', 'evidence_density_score', 'stability_score',
      'drift_score', 'institutional_risk_score', 'remediation_priority_score',
      'fragility_score', 'cross_layer_assurance_score', 'assurance_review_quality_score',
      'assurance_outcome_accuracy_score', 'bounded_remediation_readiness_score',
    ],
    safety_constraints: [
      'Advisory-first — no autonomous structural remediation',
      'No direct architecture/governance/billing mutation',
      'Mandatory human review for consequential remediation',
      'Tenant isolation via RLS',
    ],
  };
}
