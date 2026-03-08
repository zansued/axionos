/**
 * Ecosystem Activation Readiness Scorer — Sprint 59
 * Scores whether a scenario is remotely eligible for future activation consideration.
 */

export interface ActivationReadinessInput {
  simulation_readiness_score: number;
  sandbox_safety_score: number;
  policy_conflict_score: number;
  trust_failure_score: number;
  blast_radius_score: number;
  rollback_viability_score: number;
}

export interface ActivationReadinessResult {
  activation_readiness_signal: string;
  activation_readiness_score: number;
  false_positive_activation_risk_score: number;
  rationale: string[];
}

export function scoreActivationReadiness(input: ActivationReadinessInput): ActivationReadinessResult {
  const rationale: string[] = [];

  let score = input.simulation_readiness_score * 0.2 + input.sandbox_safety_score * 0.2 + (1 - input.policy_conflict_score) * 0.2 + (1 - input.trust_failure_score) * 0.15 + (1 - input.blast_radius_score) * 0.1 + input.rollback_viability_score * 0.15;

  if (input.policy_conflict_score > 0.5) { score *= 0.3; rationale.push('high_policy_conflict_blocks_activation'); }
  if (input.trust_failure_score > 0.5) { score *= 0.5; rationale.push('trust_failure_reduces_readiness'); }
  if (input.rollback_viability_score < 0.4) { score *= 0.5; rationale.push('low_rollback_viability'); }

  const fpRisk = input.policy_conflict_score * 0.3 + input.trust_failure_score * 0.3 + input.blast_radius_score * 0.2 + (1 - input.sandbox_safety_score) * 0.2;

  let signal = 'not_ready';
  if (score >= 0.7 && fpRisk < 0.3) signal = 'future_pilot_candidate';
  else if (score >= 0.5) signal = 'simulate_more';
  else if (score >= 0.3) signal = 'delay';

  return {
    activation_readiness_signal: signal,
    activation_readiness_score: Math.round(Math.min(1, score) * 10000) / 10000,
    false_positive_activation_risk_score: Math.round(Math.min(1, fpRisk) * 10000) / 10000,
    rationale,
  };
}
