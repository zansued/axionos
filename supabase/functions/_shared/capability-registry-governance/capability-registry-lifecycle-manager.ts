/**
 * Capability Registry Lifecycle Manager — Sprint 61
 * Manages lifecycle states: proposed, registered, pilot_only, restricted, deprecated, hidden, future_candidate, archived.
 */

export interface LifecycleInput {
  current_state: string;
  governance_score: number;
  registry_health_score: number;
  visibility_level: string;
  version_validity_score: number;
}

export interface LifecycleResult {
  recommended_state: string;
  lifecycle_stability_score: number;
  rationale: string[];
}

export function evaluateLifecycle(input: LifecycleInput): LifecycleResult {
  const rationale: string[] = [];

  if (input.governance_score < 0.2) {
    rationale.push('governance_critically_low');
    return { recommended_state: 'hidden', lifecycle_stability_score: 0.2, rationale };
  }

  if (input.version_validity_score < 0.3) {
    rationale.push('version_deprecated');
    return { recommended_state: 'deprecated', lifecycle_stability_score: 0.3, rationale };
  }

  if (input.registry_health_score >= 0.7 && input.governance_score >= 0.6) {
    rationale.push('healthy_registry_entry');
    return { recommended_state: 'registered', lifecycle_stability_score: 0.9, rationale };
  }

  if (input.governance_score >= 0.4) {
    rationale.push('pilot_eligible');
    return { recommended_state: 'pilot_only', lifecycle_stability_score: 0.6, rationale };
  }

  rationale.push('insufficient_readiness');
  return { recommended_state: 'proposed', lifecycle_stability_score: 0.4, rationale };
}
