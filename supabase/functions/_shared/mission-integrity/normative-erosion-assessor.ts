/**
 * Normative Erosion Assessor — Sprint 109
 * Measures when mission principles are being traded away for efficiency or convenience.
 */

export interface ErosionInput {
  alignment_score: number;
  erosion_score: number;
  adaptation_score: number;
  protected_commitments: string[];
  subject_summary: string;
}

export interface ErosionAssessment {
  overall_erosion_risk: number;
  commitments_at_risk: string[];
  erosion_type: "none" | "gradual" | "accelerating" | "acute";
  explanation: string;
}

export function assessNormativeErosion(input: ErosionInput): ErosionAssessment {
  const { erosion_score, alignment_score, adaptation_score, protected_commitments, subject_summary } = input;

  // Simulate commitment-level risk (in production, this would use semantic analysis)
  const commitments_at_risk = protected_commitments.filter((_, i) =>
    erosion_score > 0.3 + (i * 0.1)
  );

  let erosion_type: ErosionAssessment["erosion_type"] = "none";
  if (erosion_score >= 0.7) erosion_type = "acute";
  else if (erosion_score >= 0.4 && adaptation_score < 0.4) erosion_type = "accelerating";
  else if (erosion_score >= 0.2) erosion_type = "gradual";

  const explanations: string[] = [];
  if (erosion_type === "acute") {
    explanations.push("Mission principles are under acute erosion. Operational outputs are actively contradicting normative direction.");
  } else if (erosion_type === "accelerating") {
    explanations.push("Erosion is accelerating. Adaptation capacity is low while normative damage increases.");
  } else if (erosion_type === "gradual") {
    explanations.push("Gradual erosion detected. The system is slowly trading mission commitments for operational convenience.");
  } else {
    explanations.push("No significant normative erosion detected. Mission principles remain intact.");
  }

  if (commitments_at_risk.length > 0) {
    explanations.push(`${commitments_at_risk.length} protected commitment(s) are at risk.`);
  }

  return {
    overall_erosion_risk: Math.round(erosion_score * 10000) / 10000,
    commitments_at_risk,
    erosion_type,
    explanation: explanations.join(" "),
  };
}
