/**
 * Capability Registry Visibility Engine — Sprint 61
 * Determines bounded capability visibility/discoverability.
 */

export interface VisibilityInput {
  exposure_class: string;
  trust_tier: string;
  lifecycle_state: string;
  governance_score: number;
  pilot_scope_type: string;
}

export interface VisibilityResult {
  visibility_level: string;
  discoverability_score: number;
  visibility_control_score: number;
  rationale: string[];
}

export function evaluateVisibility(input: VisibilityInput): VisibilityResult {
  const rationale: string[] = [];

  if (input.lifecycle_state === 'hidden' || input.exposure_class === 'never_expose') {
    return { visibility_level: 'hidden', discoverability_score: 0, visibility_control_score: 1, rationale: ['hidden_lifecycle'] };
  }

  if (input.lifecycle_state === 'restricted') {
    return { visibility_level: 'restricted', discoverability_score: 0.1, visibility_control_score: 0.9, rationale: ['restricted_lifecycle'] };
  }

  let disc = input.governance_score * 0.4;
  if (input.trust_tier !== 'unknown') disc += 0.2;
  if (input.pilot_scope_type !== 'none') disc += 0.2;
  if (input.lifecycle_state === 'registered') disc += 0.2;

  const control = 1 - disc * 0.5;

  let level = 'pilot_only';
  if (disc >= 0.7) level = 'discoverable';
  else if (disc < 0.3) level = 'hidden';

  return {
    visibility_level: level,
    discoverability_score: Math.round(Math.min(1, disc) * 10000) / 10000,
    visibility_control_score: Math.round(Math.min(1, control) * 10000) / 10000,
    rationale,
  };
}
