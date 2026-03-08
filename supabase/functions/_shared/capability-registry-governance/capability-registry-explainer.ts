/**
 * Capability Registry Explainer — Sprint 61
 * Returns structured explanations for registry governance.
 */

export function explainCapabilityRegistry() {
  return {
    explanation: 'Capability Registry Governance manages the lifecycle, visibility, versioning, policy binding, and compatibility of capabilities within the bounded ecosystem. Registry presence does not imply broad availability.',
    lifecycle_states: ['proposed', 'registered', 'pilot_only', 'restricted', 'deprecated', 'hidden', 'future_candidate', 'archived'],
    registry_statuses: ['proposed', 'active', 'under_review', 'suspended', 'archived'],
    version_statuses: ['draft', 'valid', 'deprecated', 'restricted', 'retired'],
    visibility_levels: ['hidden', 'restricted', 'pilot_only', 'discoverable'],
    metrics: [
      'registry_governance_score', 'capability_registry_health_score', 'version_validity_score',
      'version_deprecation_pressure_score', 'visibility_control_score', 'discoverability_score',
      'policy_binding_score', 'compatibility_score', 'dependency_sensitivity_score',
      'restriction_level_score', 'lifecycle_stability_score', 'governance_review_priority_score',
      'registry_outcome_accuracy_score', 'bounded_registry_integrity_score',
    ],
    safety_constraints: [
      'Registry-bounded — no general marketplace opening',
      'No autonomous capability publication',
      'No autonomous visibility expansion',
      'Governance-first — all changes require review',
      'Tenant isolation enforced via RLS',
    ],
  };
}
