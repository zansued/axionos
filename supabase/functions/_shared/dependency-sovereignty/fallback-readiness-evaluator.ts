/**
 * Fallback Readiness Evaluator
 * Evaluates whether fallback actually exists and is usable.
 */
export interface FallbackInput {
  fallbackExists: boolean;
  fallbackSummary: string;
  exitPathExists: boolean;
  exitFeasibilityScore: number;
}

export interface FallbackReadiness {
  readinessScore: number;
  status: string;
  explanation: string;
}

export function evaluateFallbackReadiness(input: FallbackInput): FallbackReadiness {
  if (!input.fallbackExists) {
    return { readinessScore: 0, status: "none", explanation: "No fallback declared." };
  }
  let score = 30; // base for having a fallback
  if (input.fallbackSummary.length > 20) score += 15;
  if (input.exitPathExists) score += 25;
  score += Math.round(input.exitFeasibilityScore * 30);
  const status = score >= 70 ? "ready" : score >= 40 ? "partial" : "weak";
  return { readinessScore: Math.min(100, score), status, explanation: `Fallback readiness: ${status} (${Math.min(100, score)}/100).` };
}
