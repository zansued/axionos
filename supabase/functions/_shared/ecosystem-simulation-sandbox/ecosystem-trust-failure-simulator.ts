/**
 * Ecosystem Trust Failure Simulator — Sprint 59
 * Simulates trust degradation, weak admission assumptions, and boundary failures.
 */

export interface TrustFailureInput {
  identity_confidence_score: number;
  evidence_completeness_score: number;
  trust_tier: string;
  admission_readiness_score: number;
}

export interface TrustFailureResult {
  trust_failure_score: number;
  failure_modes: string[];
}

export function simulateTrustFailures(input: TrustFailureInput): TrustFailureResult {
  const modes: string[] = [];
  let score = 0;

  if (input.identity_confidence_score < 0.4) { score += 0.35; modes.push('weak_identity'); }
  if (input.evidence_completeness_score < 0.4) { score += 0.25; modes.push('incomplete_evidence'); }
  if (input.trust_tier === 'unknown') { score += 0.2; modes.push('unknown_trust_tier'); }
  if (input.admission_readiness_score < 0.4) { score += 0.2; modes.push('low_admission_readiness'); }

  return {
    trust_failure_score: Math.round(Math.min(1, score) * 10000) / 10000,
    failure_modes: modes,
  };
}
