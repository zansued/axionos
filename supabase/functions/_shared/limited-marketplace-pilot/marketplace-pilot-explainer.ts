/**
 * Marketplace Pilot Explainer — Sprint 60
 * Returns structured explanations for pilot eligibility, violations, learning signals, and outcome posture.
 */

export function explainMarketplacePilot() {
  return {
    explanation: 'Limited Marketplace Pilot is a bounded, governed pilot-only environment. No general marketplace activation occurs. All participation requires prior readiness, governance, trust, and sandbox prerequisites. Pilot scope is bounded by explicit limits and human-reviewed.',
    pilot_statuses: ['draft', 'approved', 'active', 'paused', 'completed', 'rolled_back', 'archived'],
    capability_statuses: ['proposed', 'eligible', 'approved', 'active', 'restricted', 'rolled_back', 'archived'],
    participant_statuses: ['proposed', 'eligible', 'approved', 'active', 'restricted', 'suspended', 'rolled_back', 'archived'],
    metrics: [
      'pilot_activation_readiness_score', 'pilot_participant_eligibility_score', 'pilot_capability_eligibility_score',
      'policy_compliance_score', 'trust_stability_score', 'pilot_value_signal_score', 'pilot_risk_score',
      'rollback_trigger_score', 'pilot_learning_score', 'pilot_scope_integrity_score',
      'participant_violation_rate', 'capability_violation_rate', 'bounded_marketplace_health_score',
      'pilot_outcome_accuracy_score', 'pilot_expansion_caution_score',
    ],
    safety_constraints: [
      'Bounded pilot-only — no general marketplace',
      'No unrestricted external participation',
      'No autonomous participant approval',
      'No autonomous capability expansion',
      'Rollback paths required before activation',
      'Human review required for scope changes',
      'Tenant isolation enforced via RLS',
    ],
  };
}
