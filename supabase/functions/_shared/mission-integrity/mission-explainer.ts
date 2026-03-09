/**
 * Mission Explainer — Sprint 109
 * Explains why the system remains aligned or where drift is occurring.
 */

import type { DriftPattern } from "./drift-pattern-detector.ts";

export interface MissionExplanation {
  overall_posture: string;
  health_summary: string;
  drift_summary: string;
  erosion_summary: string;
  correction_summary: string;
  key_insights: string[];
}

export function explainMissionIntegrity(params: {
  mission_health_score: number;
  drift_density_score: number;
  correction_readiness_score: number;
  total_subjects: number;
  total_evaluations: number;
  total_drift_events: number;
  unresolved_drift: number;
  total_recommendations: number;
  drift_patterns: DriftPattern[];
}): MissionExplanation {
  const insights: string[] = [];

  // Overall posture
  let posture = "healthy";
  if (params.mission_health_score < 0.4) posture = "critical";
  else if (params.mission_health_score < 0.6) posture = "stressed";
  else if (params.mission_health_score < 0.8) posture = "adequate";

  // Health summary
  const healthSummary = posture === "healthy"
    ? "Mission integrity is strong. The institution's core purpose and identity principles are well-supported by current operations."
    : posture === "adequate"
    ? "Mission integrity is adequate but has areas that need attention. Some operational activity may not fully support mission direction."
    : posture === "stressed"
    ? "Mission integrity is under stress. Multiple signals suggest the institution's purpose is being diluted by operational drift."
    : "Mission integrity is in critical condition. Urgent intervention is needed to prevent normative collapse.";

  // Drift summary
  const recurrentPatterns = params.drift_patterns.filter(p => p.is_recurrent);
  const driftSummary = params.total_drift_events === 0
    ? "No drift events recorded. This may indicate strong alignment or insufficient evaluation coverage."
    : `${params.total_drift_events} drift event(s) detected, ${params.unresolved_drift} unresolved. ${recurrentPatterns.length} recurrent pattern(s) identified.`;

  if (recurrentPatterns.length > 0) {
    insights.push(`Recurrent drift in: ${recurrentPatterns.map(p => p.drift_type).join(", ")}`);
  }

  if (params.unresolved_drift > 3) {
    insights.push("High number of unresolved drift events suggests systemic correction gaps.");
  }

  // Erosion summary
  const erosionSummary = params.drift_density_score > 0.5
    ? "Drift density is high — erosion risk is elevated across multiple domains."
    : params.drift_density_score > 0.2
    ? "Moderate drift density. Some domains show erosion risk that warrants monitoring."
    : "Drift density is low. Mission principles appear protected.";

  // Correction summary
  const correctionSummary = params.total_recommendations === 0
    ? "No correction recommendations pending."
    : `${params.total_recommendations} correction recommendation(s) active. Correction readiness: ${Math.round(params.correction_readiness_score * 100)}%.`;

  if (params.correction_readiness_score < 0.4 && params.total_recommendations > 0) {
    insights.push("Correction readiness is low despite active recommendations — capacity to realign may be insufficient.");
  }

  return {
    overall_posture: posture,
    health_summary: healthSummary,
    drift_summary: driftSummary,
    erosion_summary: erosionSummary,
    correction_summary: correctionSummary,
    key_insights: insights,
  };
}
