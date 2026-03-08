/**
 * Marketplace Pilot Capability Selector — Sprint 60
 * Selects only governance-approved capabilities eligible for pilot.
 */

export interface CapabilityEligibilityInput {
  capability_name: string;
  exposure_class: string;
  readiness_score: number;
  governance_score: number;
  trust_gate_score: number;
  safety_gate_score: number;
  sandbox_outcome_score: number;
}

export interface CapabilityEligibilityResult {
  capability_name: string;
  eligible: boolean;
  pilot_capability_eligibility_score: number;
  rationale: string[];
  restrictions: string[];
}

const ELIGIBLE_EXPOSURE_CLASSES = ['candidate', 'controlled_future_candidate', 'sandbox_eligible'];

export function evaluateCapabilityEligibility(input: CapabilityEligibilityInput): CapabilityEligibilityResult {
  const rationale: string[] = [];
  const restrictions: string[] = [];

  if (!ELIGIBLE_EXPOSURE_CLASSES.includes(input.exposure_class)) {
    rationale.push(`exposure_class_${input.exposure_class}_not_eligible`);
    return { capability_name: input.capability_name, eligible: false, pilot_capability_eligibility_score: 0, rationale, restrictions: ['exposure_class_blocked'] };
  }

  let score = input.readiness_score * 0.2 + input.governance_score * 0.2 + input.trust_gate_score * 0.2 + input.safety_gate_score * 0.2 + input.sandbox_outcome_score * 0.2;

  if (input.safety_gate_score < 0.4) { score *= 0.3; rationale.push('safety_gate_insufficient'); restrictions.push('safety_block'); }
  if (input.trust_gate_score < 0.4) { score *= 0.5; rationale.push('trust_gate_insufficient'); restrictions.push('trust_restriction'); }
  if (input.sandbox_outcome_score < 0.3) { score *= 0.5; rationale.push('sandbox_outcome_weak'); restrictions.push('sandbox_not_validated'); }

  const eligible = score >= 0.5 && restrictions.length === 0;
  if (eligible) rationale.push('meets_pilot_eligibility');

  return {
    capability_name: input.capability_name,
    eligible,
    pilot_capability_eligibility_score: Math.round(Math.min(1, score) * 10000) / 10000,
    rationale,
    restrictions,
  };
}
