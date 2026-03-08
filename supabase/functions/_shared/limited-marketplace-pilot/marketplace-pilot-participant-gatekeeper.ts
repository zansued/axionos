/**
 * Marketplace Pilot Participant Gatekeeper — Sprint 60
 * Enforces participant eligibility based on trust/admission posture.
 */

export interface ParticipantGateInput {
  participant_name: string;
  trust_tier: string;
  identity_confidence_score: number;
  admission_readiness_score: number;
  evidence_completeness_score: number;
  risk_score: number;
}

export interface ParticipantGateResult {
  participant_name: string;
  eligible: boolean;
  pilot_participant_eligibility_score: number;
  rationale: string[];
  restrictions: string[];
}

const ELIGIBLE_TIERS = ['sandbox_eligible', 'controlled_future_candidate', 'provisional'];

export function evaluateParticipantEligibility(input: ParticipantGateInput): ParticipantGateResult {
  const rationale: string[] = [];
  const restrictions: string[] = [];

  if (!ELIGIBLE_TIERS.includes(input.trust_tier)) {
    rationale.push(`trust_tier_${input.trust_tier}_not_eligible`);
    return { participant_name: input.participant_name, eligible: false, pilot_participant_eligibility_score: 0, rationale, restrictions: ['trust_tier_blocked'] };
  }

  let score = input.identity_confidence_score * 0.3 + input.admission_readiness_score * 0.3 + input.evidence_completeness_score * 0.2 + (1 - input.risk_score) * 0.2;

  if (input.identity_confidence_score < 0.4) { score *= 0.3; rationale.push('weak_identity'); restrictions.push('identity_block'); }
  if (input.risk_score > 0.7) { score *= 0.5; rationale.push('high_risk'); restrictions.push('risk_restriction'); }

  const eligible = score >= 0.5 && restrictions.length === 0;
  if (eligible) rationale.push('meets_pilot_eligibility');

  return {
    participant_name: input.participant_name,
    eligible,
    pilot_participant_eligibility_score: Math.round(Math.min(1, score) * 10000) / 10000,
    rationale,
    restrictions,
  };
}
