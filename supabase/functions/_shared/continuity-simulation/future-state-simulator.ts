/**
 * Future State Simulator — Sprint 110
 * Simulates continuity outcomes and survivability posture.
 */

export interface SimulationInput {
  scenario_severity: number;
  subject_resilience: number;
  identity_strength: number;
}

export interface SimulationResult {
  viability_score: number;
  continuity_stress_score: number;
  identity_preservation_score: number;
  survivability_score: number;
  future_state_type: string;
  simulation_summary: string;
}

export function simulateFutureState(input: SimulationInput): SimulationResult {
  const { scenario_severity, subject_resilience, identity_strength } = input;

  const viability = Math.max(0, Math.min(1, subject_resilience * (1 - scenario_severity * 0.6)));
  const stress = Math.max(0, Math.min(1, scenario_severity * 0.8 + (1 - subject_resilience) * 0.2));
  const identity = Math.max(0, Math.min(1, identity_strength * (1 - scenario_severity * 0.4)));
  const survivability = (viability * 0.35 + (1 - stress) * 0.25 + identity * 0.4);

  let future_state_type: string;
  if (survivability >= 0.8) future_state_type = "stable";
  else if (survivability >= 0.65) future_state_type = "strained";
  else if (survivability >= 0.5) future_state_type = "degraded";
  else if (survivability >= 0.35) future_state_type = "fragmented";
  else if (survivability >= 0.2) future_state_type = "adaptive_recovery";
  else future_state_type = "collapsed";

  const summaries: Record<string, string> = {
    stable: "The subject maintains structural integrity and mission continuity under this scenario.",
    strained: "The subject survives but faces sustained pressure on core functions.",
    degraded: "Operational capacity is significantly reduced; identity partially preserved.",
    fragmented: "Institutional coherence is lost; isolated functions may persist.",
    adaptive_recovery: "Near-collapse with potential for partial recovery through adaptation.",
    collapsed: "Irreversible breakdown of institutional capacity and identity.",
  };

  return {
    viability_score: Math.round(viability * 1000) / 1000,
    continuity_stress_score: Math.round(stress * 1000) / 1000,
    identity_preservation_score: Math.round(identity * 1000) / 1000,
    survivability_score: Math.round(survivability * 1000) / 1000,
    future_state_type,
    simulation_summary: summaries[future_state_type] || "Unknown future state.",
  };
}
