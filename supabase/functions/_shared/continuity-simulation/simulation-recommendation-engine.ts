/**
 * Simulation Recommendation Engine — Sprint 110
 * Proposes mitigation or adaptation strategies per scenario.
 */

export interface SimulationRecommendation {
  recommendation_type: string;
  recommendation_summary: string;
  mitigation_priority: string;
  rationale: string;
}

export function generateRecommendations(
  survivability: number,
  identity_score: number,
  stress_score: number,
  scenario_type: string
): SimulationRecommendation[] {
  const recs: SimulationRecommendation[] = [];

  if (survivability < 0.4) {
    recs.push({
      recommendation_type: "contingency_activation",
      recommendation_summary: "Activate contingency plans; survivability is critically low",
      mitigation_priority: "critical",
      rationale: `Survivability score (${(survivability * 100).toFixed(0)}%) indicates high probability of institutional breakdown under ${scenario_type}.`,
    });
  }

  if (identity_score < 0.5) {
    recs.push({
      recommendation_type: "identity_reinforcement",
      recommendation_summary: "Strengthen mission anchors and institutional identity safeguards",
      mitigation_priority: identity_score < 0.3 ? "critical" : "high",
      rationale: `Identity preservation (${(identity_score * 100).toFixed(0)}%) is below acceptable threshold; institutional purpose risks erosion.`,
    });
  }

  if (stress_score > 0.7) {
    recs.push({
      recommendation_type: "stress_redistribution",
      recommendation_summary: "Redistribute institutional load to reduce concentrated stress",
      mitigation_priority: "high",
      rationale: `Continuity stress (${(stress_score * 100).toFixed(0)}%) exceeds safe operating range.`,
    });
  }

  if (survivability >= 0.4 && survivability < 0.65) {
    recs.push({
      recommendation_type: "adaptive_preparation",
      recommendation_summary: "Prepare adaptation pathways for controlled transition",
      mitigation_priority: "medium",
      rationale: "The institution can survive but needs proactive adaptation to avoid degradation.",
    });
  }

  if (survivability >= 0.65) {
    recs.push({
      recommendation_type: "resilience_maintenance",
      recommendation_summary: "Maintain current resilience posture; monitor for emerging stress",
      mitigation_priority: "low",
      rationale: "Current posture is adequate but should be monitored for scenario escalation.",
    });
  }

  return recs;
}
