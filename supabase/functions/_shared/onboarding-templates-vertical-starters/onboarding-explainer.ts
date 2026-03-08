// Sprint 69 — Onboarding Explainer
// Returns structured explanations for template choice, starter-path recommendation, assumptions, and onboarding posture.

export interface OnboardingExplanation {
  section: string;
  summary: string;
  details: string[];
  confidence: number;
}

export function explainTemplateChoice(params: {
  templateName: string;
  fitScore: number;
  assumptions: string[];
  matchedKeywords: string[];
}): OnboardingExplanation {
  return {
    section: "template_choice",
    summary: `Template "${params.templateName}" selected with fit score ${(params.fitScore * 100).toFixed(0)}%.`,
    details: [
      `Matched keywords: ${params.matchedKeywords.length > 0 ? params.matchedKeywords.join(", ") : "none"}`,
      `Assumptions introduced: ${params.assumptions.join("; ")}`,
      params.fitScore >= 0.6 ? "Strong fit — template aligns well with the idea." : "Partial fit — review assumptions before committing.",
    ],
    confidence: params.fitScore,
  };
}

export function explainVerticalRecommendation(params: {
  verticalName: string;
  fitScore: number;
  includedTemplates: string[];
  assumptionVisibilityScore: number;
}): OnboardingExplanation {
  return {
    section: "vertical_recommendation",
    summary: `Vertical "${params.verticalName}" recommended with fit score ${(params.fitScore * 100).toFixed(0)}%.`,
    details: [
      `Included templates: ${params.includedTemplates.join(", ")}`,
      `Assumption visibility: ${(params.assumptionVisibilityScore * 100).toFixed(0)}%`,
    ],
    confidence: params.fitScore,
  };
}

export function explainOnboardingPosture(params: {
  frictionScore: number;
  abandonmentRisk: number;
  completionRate: number;
}): OnboardingExplanation {
  return {
    section: "onboarding_posture",
    summary: `Onboarding posture: friction ${(params.frictionScore * 100).toFixed(0)}%, abandonment risk ${(params.abandonmentRisk * 100).toFixed(0)}%.`,
    details: [
      `Completion rate: ${(params.completionRate * 100).toFixed(0)}%`,
      params.frictionScore > 0.5 ? "High friction — consider simplifying steps." : "Friction within acceptable range.",
      params.abandonmentRisk > 0.5 ? "High abandonment risk — review entry clarity." : "Abandonment risk is manageable.",
    ],
    confidence: 1 - params.frictionScore,
  };
}
