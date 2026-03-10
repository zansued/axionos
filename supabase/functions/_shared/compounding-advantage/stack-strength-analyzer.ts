/**
 * Stack Strength Analyzer — Sprint 122
 * Evaluates strength per stack layer based on accumulated evidence.
 */

export interface StackLayerInput {
  layer: string;
  success_rate: number;
  reuse_count: number;
  failure_count: number;
  total_executions: number;
  canon_coverage: number;
}

export interface StackStrength {
  layer: string;
  strength_score: number;
  maturity_level: number;
  assessment: string;
}

export function analyzeStackStrength(input: StackLayerInput): StackStrength {
  const execMin = Math.max(input.total_executions, 1);
  const failRate = input.failure_count / execMin;
  const reuseRate = Math.min(1, input.reuse_count / execMin);

  const strength = input.success_rate * 0.35 + (1 - failRate) * 0.25 + reuseRate * 0.2 + input.canon_coverage * 0.2;
  const maturity = strength >= 0.85 ? 4 : strength >= 0.65 ? 3 : strength >= 0.45 ? 2 : strength >= 0.25 ? 1 : 0;

  const labels = ["Nascent", "Developing", "Established", "Strong", "Elite"];

  return {
    layer: input.layer,
    strength_score: Math.round(strength * 1000) / 1000,
    maturity_level: maturity,
    assessment: `${labels[maturity]} — ${(strength * 100).toFixed(0)}% strength across success, resilience, reuse, and canon coverage.`,
  };
}
