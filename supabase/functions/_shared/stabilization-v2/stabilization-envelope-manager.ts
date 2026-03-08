/**
 * Stabilization Envelope Manager — Sprint 46
 * Manages bounded envelopes that constrain adaptive behavior in unstable scopes.
 * Pure functions. No DB access.
 */

export interface StabilizationEnvelope {
  id: string;
  envelope_key: string;
  envelope_name: string;
  target_scope: string;
  stabilization_controls: Record<string, any>;
  activation_mode: "advisory" | "manual_apply" | "bounded_auto";
  status: string;
}

export type EnvelopeStatus = "draft" | "active" | "watch" | "expired" | "deprecated";

const VALID_TRANSITIONS: Record<string, EnvelopeStatus[]> = {
  draft: ["active", "deprecated"],
  active: ["watch", "expired", "deprecated"],
  watch: ["active", "expired", "deprecated"],
  expired: ["deprecated"],
  deprecated: [],
};

export interface EnvelopeTransitionResult {
  valid: boolean;
  from: string;
  to: string;
  reason: string | null;
}

export function validateEnvelopeTransition(from: string, to: EnvelopeStatus): EnvelopeTransitionResult {
  const allowed = VALID_TRANSITIONS[from] || [];
  const valid = allowed.includes(to);
  return { valid, from, to, reason: valid ? null : `Transition from "${from}" to "${to}" not allowed` };
}

export function getValidEnvelopeTransitions(current: string): EnvelopeStatus[] {
  return VALID_TRANSITIONS[current] || [];
}

export function isOverconstrained(envelopes: StabilizationEnvelope[]): { overconstrained: boolean; count: number; scopes: string[] } {
  const activeEnvelopes = envelopes.filter((e) => e.status === "active");
  const scopes = [...new Set(activeEnvelopes.map((e) => e.target_scope))];
  return { overconstrained: activeEnvelopes.length > 5 || scopes.length > 3, count: activeEnvelopes.length, scopes };
}
