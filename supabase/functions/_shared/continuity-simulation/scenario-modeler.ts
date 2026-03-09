/**
 * Scenario Modeler — Sprint 110
 * Models scenario inputs, disruption pathways, and stress factors.
 */

export interface Scenario {
  id: string;
  scenario_code: string;
  scenario_name: string;
  scenario_type: string;
  stress_factors: Array<{ factor: string; intensity: number }>;
}

export interface DisruptionPathway {
  phase: string;
  description: string;
  cumulative_stress: number;
}

export function modelDisruptionPathway(scenario: Scenario): DisruptionPathway[] {
  const factors = Array.isArray(scenario.stress_factors) ? scenario.stress_factors : [];
  const totalIntensity = factors.reduce((s, f) => s + (f.intensity || 0.5), 0);
  const avg = factors.length > 0 ? totalIntensity / factors.length : 0.3;

  return [
    { phase: "initial_shock", description: `${scenario.scenario_type} disruption onset`, cumulative_stress: avg * 0.4 },
    { phase: "cascade", description: "Secondary effects propagate across dependencies", cumulative_stress: avg * 0.7 },
    { phase: "structural_impact", description: "Core institutional functions under pressure", cumulative_stress: avg * 0.9 },
    { phase: "resolution_or_collapse", description: "System adapts, degrades, or fragments", cumulative_stress: avg },
  ];
}

export function computeScenarioSeverity(scenario: Scenario): number {
  const factors = Array.isArray(scenario.stress_factors) ? scenario.stress_factors : [];
  if (factors.length === 0) return 0.3;
  const total = factors.reduce((s, f) => s + (f.intensity || 0.5), 0);
  return Math.min(1, total / factors.length);
}
