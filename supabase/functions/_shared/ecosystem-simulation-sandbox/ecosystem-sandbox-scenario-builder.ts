/**
 * Ecosystem Sandbox Scenario Builder — Sprint 59
 * Builds sandbox scenarios from readiness, exposure governance, and trust/admission outputs.
 */

export interface ScenarioInput {
  capability_name: string;
  capability_domain: string;
  exposure_class: string;
  simulated_actor_type: string;
  simulated_trust_tier: string;
  readiness_score: number;
  governance_score: number;
  trust_gate_score: number;
  safety_gate_score: number;
}

export interface ScenarioOutput {
  capability_name: string;
  scenario_type: string;
  simulation_readiness_score: number;
  sandbox_safety_score: number;
  activation_readiness_signal: string;
  rationale: string[];
}

export function buildScenario(input: ScenarioInput): ScenarioOutput {
  const rationale: string[] = [];
  let readiness = input.readiness_score * 0.25 + input.governance_score * 0.25 + input.trust_gate_score * 0.25 + input.safety_gate_score * 0.25;

  if (input.safety_gate_score < 0.4) { readiness *= 0.3; rationale.push('safety_gate_insufficient'); }
  if (input.trust_gate_score < 0.4) { readiness *= 0.5; rationale.push('trust_gate_insufficient'); }
  if (input.exposure_class === 'never_expose') { readiness = 0; rationale.push('never_expose_class'); }

  const safety = Math.min(1, input.safety_gate_score * 0.4 + input.governance_score * 0.3 + (1 - (input.simulated_trust_tier === 'unknown' ? 0.8 : 0)) * 0.3);

  let signal = 'not_ready';
  if (readiness >= 0.7 && safety >= 0.6) signal = 'simulation_ready';
  else if (readiness >= 0.4) signal = 'conditional';

  return {
    capability_name: input.capability_name,
    scenario_type: 'capability_exposure',
    simulation_readiness_score: Math.round(readiness * 10000) / 10000,
    sandbox_safety_score: Math.round(safety * 10000) / 10000,
    activation_readiness_signal: signal,
    rationale,
  };
}
