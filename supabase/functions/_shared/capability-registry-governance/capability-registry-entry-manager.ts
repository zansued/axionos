/**
 * Capability Registry Entry Manager — Sprint 61
 * Manages canonical registry entries and lifecycle transitions.
 */

export type LifecycleState = 'proposed' | 'registered' | 'pilot_only' | 'restricted' | 'deprecated' | 'hidden' | 'future_candidate' | 'archived';

export interface RegistryEntryInput {
  capability_name: string;
  capability_domain: string;
  capability_type: string;
  exposure_class: string;
  governance_score: number;
  restriction_level: string;
}

export interface RegistryEntryResult {
  capability_name: string;
  recommended_lifecycle_state: LifecycleState;
  registry_health_score: number;
  lifecycle_stability_score: number;
  rationale: string[];
}

export function evaluateRegistryEntry(input: RegistryEntryInput): RegistryEntryResult {
  const rationale: string[] = [];
  let health = input.governance_score;

  if (input.exposure_class === 'never_expose') {
    rationale.push('never_expose_class');
    return { capability_name: input.capability_name, recommended_lifecycle_state: 'hidden', registry_health_score: 0, lifecycle_stability_score: 1, rationale };
  }

  if (input.restriction_level === 'hard') {
    rationale.push('hard_restriction');
    return { capability_name: input.capability_name, recommended_lifecycle_state: 'restricted', registry_health_score: 0.1, lifecycle_stability_score: 0.9, rationale };
  }

  if (input.governance_score < 0.3) {
    rationale.push('low_governance_score');
    return { capability_name: input.capability_name, recommended_lifecycle_state: 'proposed', registry_health_score: health, lifecycle_stability_score: 0.3, rationale };
  }

  if (input.governance_score < 0.6) {
    rationale.push('moderate_governance');
    return { capability_name: input.capability_name, recommended_lifecycle_state: 'pilot_only', registry_health_score: health, lifecycle_stability_score: 0.6, rationale };
  }

  rationale.push('meets_registry_thresholds');
  return {
    capability_name: input.capability_name,
    recommended_lifecycle_state: 'registered',
    registry_health_score: Math.round(health * 10000) / 10000,
    lifecycle_stability_score: 0.85,
    rationale,
  };
}
