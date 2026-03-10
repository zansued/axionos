/**
 * Self-Revision Outcome Comparator — Sprint 113
 * Compares intended vs realized outcomes for a self-revision.
 */

export interface ComparisonInput {
  intended: string;
  observed: string;
  before_metrics: Record<string, number>;
  after_metrics: Record<string, number>;
}

export interface OutcomeComparison {
  local_improvement_score: number;
  dimension_deltas: Array<{ dimension: string; before: number; after: number; delta: number; improved: boolean }>;
  intent_match_assessment: string;
  rationale: string[];
}

export function compareOutcomes(input: ComparisonInput): OutcomeComparison {
  const rationale: string[] = [];
  const dims: OutcomeComparison["dimension_deltas"] = [];
  let totalDelta = 0;
  let count = 0;

  const allKeys = new Set([...Object.keys(input.before_metrics), ...Object.keys(input.after_metrics)]);

  for (const key of allKeys) {
    const before = input.before_metrics[key] ?? 0;
    const after = input.after_metrics[key] ?? 0;
    const delta = after - before;

    const isNegativeMetric = key.includes("error") || key.includes("failure") ||
      key.includes("timeout") || key.includes("churn") || key.includes("burden");
    const improved = isNegativeMetric ? delta < -0.01 : delta > 0.01;
    const normalizedDelta = isNegativeMetric ? -delta : delta;

    dims.push({ dimension: key, before, after, delta, improved });
    totalDelta += normalizedDelta;
    count++;
  }

  const avgImprovement = count > 0 ? totalDelta / count : 0;
  const clamped = Math.max(-1, Math.min(1, avgImprovement));

  let intentMatch = "unknown";
  if (input.observed && input.intended) {
    if (clamped > 0.05) {
      intentMatch = "aligned";
      rationale.push("observed_outcome_aligns_with_intent");
    } else if (clamped < -0.05) {
      intentMatch = "contradicted";
      rationale.push("observed_outcome_contradicts_intent");
    } else {
      intentMatch = "ambiguous";
      rationale.push("outcome_ambiguous");
    }
  } else {
    rationale.push("insufficient_outcome_data");
  }

  return {
    local_improvement_score: Math.round(clamped * 10000) / 10000,
    dimension_deltas: dims,
    intent_match_assessment: intentMatch,
    rationale,
  };
}
