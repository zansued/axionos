/**
 * Succession Readiness Scorer
 * Calculates role/domain readiness for succession and transition.
 */
export interface ReadinessInput {
  backupExists: boolean;
  successionPlanExists: boolean;
  successionPlanActive: boolean;
  handoffMaturityScore: number;
  knowledgeConcentrationScore: number;
  criticalityLevel: string;
}

export interface ReadinessResult {
  score: number;
  level: string;
  summary: string;
}

export function scoreSuccessionReadiness(input: ReadinessInput): ReadinessResult {
  let score = 0;
  if (input.backupExists) score += 25;
  if (input.successionPlanExists) score += 15;
  if (input.successionPlanActive) score += 15;
  score += Math.round(input.handoffMaturityScore * 25);
  score += Math.round((1 - input.knowledgeConcentrationScore) * 20);
  const level = score >= 70 ? "ready" : score >= 40 ? "partial" : "fragile";
  return { score: Math.min(100, score), level, summary: `Succession readiness: ${level} (${Math.min(100, score)}/100).` };
}
