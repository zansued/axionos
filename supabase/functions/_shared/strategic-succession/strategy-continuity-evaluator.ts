/**
 * Strategy Continuity Evaluator
 * Measures whether long-horizon strategic continuity is likely to survive transition.
 */
export interface StrategyContinuityInput {
  readinessScore: number;
  concentrationRiskScore: number;
  handoffViabilityScore: number;
  memoryPreservationScore: number;
  authorityIntegrityScore: number;
}

export interface StrategyContinuityResult {
  score: number;
  level: string;
  summary: string;
}

export function evaluateStrategyContinuity(input: StrategyContinuityInput): StrategyContinuityResult {
  const score = Math.round(
    input.readinessScore * 0.25 +
    (100 - input.concentrationRiskScore) * 0.2 +
    input.handoffViabilityScore * 0.2 +
    input.memoryPreservationScore * 0.2 +
    input.authorityIntegrityScore * 0.15
  );
  const level = score >= 70 ? "resilient" : score >= 45 ? "fragile" : "at_risk";
  return { score: Math.min(100, Math.max(0, score)), level, summary: `Strategy continuity: ${level} (${score}/100).` };
}
