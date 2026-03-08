/**
 * Canon Integrity Explainer — Sprint 64
 * Returns structured explanations for canon conformance, drift, and remediation.
 */

export function explainCanonIntegrity() {
  return {
    explanation: 'Canon Integrity & Drift Governance verifies whether the platform remains faithful to its canonical architecture, documentation, governance principles, and mutation boundaries. All remediation is advisory-first.',
    integrity_domains: ['documentation', 'architecture', 'governance', 'pipeline', 'ecosystem', 'principles'],
    review_states: ['aligned', 'monitor', 'investigate_drift', 'review_boundary', 'needs_canon_review', 'align_docs'],
    core_principles: [
      'advisory-first', 'governance-before-autonomy', 'rollback-everywhere',
      'bounded-adaptation', 'human-approval-for-structural-change',
      'tenant-isolation', 'no-autonomous-architecture-mutation',
    ],
    metrics: [
      'conformance_score', 'drift_score', 'inconsistency_score',
      'principle_alignment_score', 'mutation_boundary_integrity_score',
      'cross_doc_consistency_score', 'architecture_canon_alignment_score',
      'governance_canon_alignment_score', 'operational_conformance_score',
      'integrity_risk_score', 'remediation_priority_score',
      'canon_review_quality_score', 'canon_outcome_accuracy_score',
      'bounded_alignment_readiness_score',
    ],
    safety_constraints: [
      'Advisory-first — no autonomous canon rewrite',
      'No direct architecture/governance/billing mutation',
      'Mandatory human review for consequential alignment actions',
      'Tenant isolation via RLS',
    ],
  };
}
