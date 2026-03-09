/**
 * Identity Preservation Assessor — Sprint 110
 * Evaluates whether the subject survives without losing institutional identity.
 */

export interface IdentityAssessment {
  identity_preservation_score: number;
  identity_risk_level: string;
  risk_factors: string[];
  assessment_summary: string;
}

export function assessIdentityPreservation(
  scenario_severity: number,
  subject_type: string,
  mission_alignment: number
): IdentityAssessment {
  const base = mission_alignment * (1 - scenario_severity * 0.5);
  const score = Math.max(0, Math.min(1, base));

  const risk_factors: string[] = [];
  if (scenario_severity > 0.7) risk_factors.push("high_disruption_intensity");
  if (mission_alignment < 0.5) risk_factors.push("weak_mission_foundation");
  if (subject_type === "service" || subject_type === "portfolio") risk_factors.push("operational_dependency");
  if (score < 0.4) risk_factors.push("identity_fragmentation_risk");

  let identity_risk_level: string;
  if (score >= 0.75) identity_risk_level = "low";
  else if (score >= 0.5) identity_risk_level = "moderate";
  else if (score >= 0.3) identity_risk_level = "high";
  else identity_risk_level = "critical";

  const summaries: Record<string, string> = {
    low: "Institutional identity is well-preserved under this scenario.",
    moderate: "Some identity strain; core principles remain but may weaken.",
    high: "Significant identity erosion risk; mission continuity threatened.",
    critical: "Identity preservation is critically compromised; institutional purpose at risk.",
  };

  return {
    identity_preservation_score: Math.round(score * 1000) / 1000,
    identity_risk_level,
    risk_factors,
    assessment_summary: summaries[identity_risk_level],
  };
}
