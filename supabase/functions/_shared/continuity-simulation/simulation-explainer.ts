/**
 * Simulation Explainer — Sprint 110
 * Explains why a scenario is survivable, strained, degraded, or catastrophic.
 */

export interface SimulationExplanation {
  posture: string;
  posture_label: string;
  explanation: string;
  key_observations: string[];
}

export function explainSimulation(
  survivability: number,
  identity_score: number,
  stress_score: number,
  viability: number,
  scenario_type: string,
  subject_title: string
): SimulationExplanation {
  let posture: string;
  let posture_label: string;

  if (survivability >= 0.8) { posture = "resilient"; posture_label = "Resilient"; }
  else if (survivability >= 0.65) { posture = "strained_but_viable"; posture_label = "Strained but Viable"; }
  else if (survivability >= 0.5) { posture = "degraded"; posture_label = "Degraded"; }
  else if (survivability >= 0.35) { posture = "fragile"; posture_label = "Fragile"; }
  else { posture = "critical"; posture_label = "Critical"; }

  const obs: string[] = [];
  if (viability >= 0.7) obs.push("Operational viability remains adequate under this scenario.");
  else if (viability < 0.4) obs.push("Operational viability is severely compromised.");
  
  if (identity_score >= 0.7) obs.push("Institutional identity is well-preserved.");
  else if (identity_score < 0.4) obs.push("Institutional identity faces significant erosion risk.");
  
  if (stress_score > 0.7) obs.push("Continuity stress exceeds sustainable levels.");
  else if (stress_score < 0.3) obs.push("Stress levels are within manageable range.");

  obs.push(`Scenario type "${scenario_type}" affects "${subject_title}" with survivability at ${(survivability * 100).toFixed(0)}%.`);

  const explanations: Record<string, string> = {
    resilient: `"${subject_title}" demonstrates strong resilience against ${scenario_type}. Institutional functions and identity remain intact.`,
    strained_but_viable: `"${subject_title}" can endure ${scenario_type} but faces sustained pressure. Proactive adaptation is recommended.`,
    degraded: `"${subject_title}" experiences significant degradation under ${scenario_type}. Core functions are partially compromised.`,
    fragile: `"${subject_title}" is fragile under ${scenario_type}. Without intervention, institutional coherence may be lost.`,
    critical: `"${subject_title}" faces potential collapse under ${scenario_type}. Immediate contingency activation is advised.`,
  };

  return {
    posture,
    posture_label,
    explanation: explanations[posture] || "Unknown simulation posture.",
    key_observations: obs,
  };
}
