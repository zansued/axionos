/**
 * Mission Correction Engine — Sprint 109
 * Proposes correction paths and recalibration moves.
 */

import type { AlignmentPosture } from "./alignment-vs-erosion-engine.ts";

export interface CorrectionInput {
  subject_id: string;
  posture: AlignmentPosture;
  alignment_score: number;
  drift_risk_score: number;
  erosion_score: number;
  domain: string;
}

export interface CorrectionRecommendation {
  subject_id: string;
  recommendation_type: string;
  recommendation_summary: string;
  correction_priority: string;
  rationale: string;
}

export function generateCorrections(inputs: CorrectionInput[]): CorrectionRecommendation[] {
  const recs: CorrectionRecommendation[] = [];

  for (const input of inputs) {
    if (input.posture === "mission_aligned" || input.posture === "healthy_adaptation") continue;

    const rec: CorrectionRecommendation = {
      subject_id: input.subject_id,
      recommendation_type: "realign",
      recommendation_summary: "",
      correction_priority: "medium",
      rationale: "",
    };

    switch (input.posture) {
      case "normative_compromise":
        rec.recommendation_type = "urgent_realignment";
        rec.correction_priority = "critical";
        rec.recommendation_summary = `Urgent mission realignment required for subject in domain "${input.domain}". Normative principles are being actively compromised.`;
        rec.rationale = `Erosion score ${input.erosion_score} exceeds critical threshold. The institution risks losing its normative foundation.`;
        break;
      case "active_erosion":
        rec.recommendation_type = "structural_correction";
        rec.correction_priority = "high";
        rec.recommendation_summary = `Structural correction needed. Active erosion combined with drift is degrading mission integrity in "${input.domain}".`;
        rec.rationale = `Combined drift (${input.drift_risk_score}) and erosion (${input.erosion_score}) indicate systematic mission degradation.`;
        break;
      case "significant_drift":
        rec.recommendation_type = "course_correction";
        rec.correction_priority = "high";
        rec.recommendation_summary = `Course correction recommended. Significant drift from mission direction detected in "${input.domain}".`;
        rec.rationale = `Alignment score ${input.alignment_score} is below threshold while drift risk is at ${input.drift_risk_score}.`;
        break;
      case "mild_drift":
        rec.recommendation_type = "monitoring_escalation";
        rec.correction_priority = "medium";
        rec.recommendation_summary = `Increased monitoring recommended for "${input.domain}". Early drift signals warrant closer observation.`;
        rec.rationale = `Mild drift detected. Not yet critical, but pattern could accelerate without attention.`;
        break;
    }

    recs.push(rec);
  }

  return recs.sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.correction_priority] ?? 9) - (order[b.correction_priority] ?? 9);
  });
}
