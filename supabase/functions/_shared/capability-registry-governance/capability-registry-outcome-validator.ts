/**
 * Capability Registry Outcome Validator — Sprint 61
 * Tracks whether registry decisions improved governance, clarity, and ecosystem safety.
 */

export interface OutcomeInput {
  expected_governance_improvement: number;
  realized_governance_improvement: number;
  expected_visibility_change: string;
  realized_visibility_change: string;
}

export interface OutcomeResult {
  registry_outcome_accuracy_score: number;
  bounded_registry_integrity_score: number;
  outcome_status: string;
  rationale: string[];
}

export function validateOutcome(input: OutcomeInput): OutcomeResult {
  const rationale: string[] = [];
  const accuracy = 1 - Math.abs(input.expected_governance_improvement - input.realized_governance_improvement);
  const integrity = input.expected_visibility_change === input.realized_visibility_change ? 1 : 0.5;

  if (accuracy < 0.5) rationale.push('low_outcome_accuracy');
  if (integrity < 0.8) rationale.push('visibility_mismatch');

  const status = accuracy >= 0.7 && integrity >= 0.8 ? 'helpful' : accuracy >= 0.4 ? 'neutral' : 'harmful';

  return {
    registry_outcome_accuracy_score: Math.round(accuracy * 10000) / 10000,
    bounded_registry_integrity_score: Math.round(integrity * 10000) / 10000,
    outcome_status: status,
    rationale,
  };
}
