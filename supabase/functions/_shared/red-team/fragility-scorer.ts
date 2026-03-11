/**
 * fragility-scorer.ts
 * Computes composite fragility scores from simulation results.
 */

export interface FragilityInput {
  resisted_count: number;
  failed_count: number;
  fragile_count: number;
  breach_detected: boolean;
  scenario_severity: string;
}

export interface FragilityResult {
  score: number;
  label: string;
  breakdown: Record<string, number>;
}

const SEVERITY_MULTIPLIERS: Record<string, number> = {
  critical: 2.0,
  high: 1.5,
  medium: 1.0,
  low: 0.5,
};

export function computeFragilityScore(input: FragilityInput): FragilityResult {
  const multiplier = SEVERITY_MULTIPLIERS[input.scenario_severity] ?? 1.0;
  const total = input.resisted_count + input.failed_count + input.fragile_count;
  if (total === 0) {
    return { score: 0, label: "no_data", breakdown: {} };
  }

  const failureRatio = input.failed_count / total;
  const fragilityRatio = input.fragile_count / total;
  const breachPenalty = input.breach_detected ? 30 : 0;

  const rawScore = (failureRatio * 50 + fragilityRatio * 30 + breachPenalty) * multiplier;
  const score = Math.min(100, Math.round(rawScore));

  let label = "resilient";
  if (score >= 75) label = "critical";
  else if (score >= 50) label = "fragile";
  else if (score >= 25) label = "moderate";

  return {
    score,
    label,
    breakdown: {
      failure_contribution: Math.round(failureRatio * 50 * multiplier),
      fragility_contribution: Math.round(fragilityRatio * 30 * multiplier),
      breach_penalty: breachPenalty,
    },
  };
}
