// Template & Starter Effectiveness Analyzer
// Evaluates which onboarding paths, templates, and starters improve success.

export interface TemplateEffectiveness {
  template_effectiveness_score: number;
  starter_effectiveness_score: number;
  false_fit_penalty_score: number;
  recommendation_effectiveness_score: number;
  rationale: string;
}

export function analyzeTemplateEffectiveness(
  templateUsed: boolean,
  starterUsed: boolean,
  milestoneCompletion: number,
  deploySucceeded: boolean,
  frictionScore: number,
): TemplateEffectiveness {
  // Templates that lead to higher completion and deploy are effective
  const baseEffectiveness = milestoneCompletion * 0.5 + (deploySucceeded ? 0.3 : 0) - frictionScore * 0.2;

  const templateScore = templateUsed ? Math.max(0, Math.min(1, baseEffectiveness)) : 0;
  const starterScore = starterUsed ? Math.max(0, Math.min(1, baseEffectiveness * 0.9)) : 0;

  // False fit: template used but poor outcome
  const falseFit = templateUsed && milestoneCompletion < 0.3
    ? Math.min(1, (1 - milestoneCompletion) * 0.5 + frictionScore * 0.3)
    : 0;

  const recommendationEff = Math.max(0, Math.min(1,
    (templateScore + starterScore) / 2 - falseFit * 0.3
  ));

  return {
    template_effectiveness_score: Number(templateScore.toFixed(3)),
    starter_effectiveness_score: Number(starterScore.toFixed(3)),
    false_fit_penalty_score: Number(falseFit.toFixed(3)),
    recommendation_effectiveness_score: Number(recommendationEff.toFixed(3)),
    rationale: falseFit > 0.3
      ? "Template was used but outcomes were poor — possible false fit."
      : templateScore >= 0.6
      ? "Template/starter choice contributed positively to journey completion."
      : "No strong signal on template effectiveness yet.",
  };
}
