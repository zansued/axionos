/**
 * Ecosystem Simulation Engine — Sprint 59
 * Executes bounded simulation logic for mock capability exposure and actor participation.
 */

export interface SimulationInput {
  scenario_confidence: number;
  policy_conflict_score: number;
  trust_failure_score: number;
  blast_radius_score: number;
  rollback_viability_score: number;
}

export interface SimulationResult {
  containment_quality_score: number;
  simulation_outcome_accuracy_score: number;
  overall_viability: string;
  risk_factors: string[];
}

export function executeSimulation(input: SimulationInput): SimulationResult {
  const factors: string[] = [];

  if (input.policy_conflict_score > 0.5) factors.push('high_policy_conflict');
  if (input.trust_failure_score > 0.5) factors.push('high_trust_failure');
  if (input.blast_radius_score > 0.6) factors.push('large_blast_radius');
  if (input.rollback_viability_score < 0.4) factors.push('low_rollback_viability');

  const containment = Math.max(0, 1 - input.blast_radius_score * 0.4 - input.policy_conflict_score * 0.3 - (1 - input.rollback_viability_score) * 0.3);
  const accuracy = input.scenario_confidence * 0.5 + containment * 0.5;

  let viability = 'not_viable';
  if (factors.length === 0 && containment > 0.6) viability = 'viable';
  else if (factors.length <= 1 && containment > 0.4) viability = 'conditional';

  return {
    containment_quality_score: Math.round(containment * 10000) / 10000,
    simulation_outcome_accuracy_score: Math.round(accuracy * 10000) / 10000,
    overall_viability: viability,
    risk_factors: factors,
  };
}
