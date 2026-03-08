/**
 * Architecture Fitness Scoring Engine — Sprint 44
 */

export interface FitnessDimensionInput {
  dimension_key: string;
  signals: Array<{ value: number; weight: number; recurrence: number }>;
  warning_threshold: number;
  critical_threshold: number;
}

export interface FitnessScore {
  dimension_key: string;
  dimension_score: number;
  degradation_status: "healthy" | "watch" | "degrading" | "critical";
  confidence_score: number;
  rationale_codes: string[];
}

export function scoreDimension(input: FitnessDimensionInput): FitnessScore {
  if (!input.signals.length) {
    return { dimension_key: input.dimension_key, dimension_score: 1, degradation_status: "healthy", confidence_score: 0.1, rationale_codes: ["no_signals"] };
  }

  const totalWeight = input.signals.reduce((s, sig) => s + sig.weight, 0);
  const weightedSum = input.signals.reduce((s, sig) => s + sig.value * sig.weight, 0);
  const score = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const confidence = Math.min(1, input.signals.length / 5);

  const rationale: string[] = [];
  let status: "healthy" | "watch" | "degrading" | "critical" = "healthy";

  if (score <= input.critical_threshold) {
    status = "critical";
    rationale.push("score_below_critical_threshold");
  } else if (score <= input.warning_threshold) {
    status = "degrading";
    rationale.push("score_below_warning_threshold");
  } else if (score <= input.warning_threshold + 0.1) {
    status = "watch";
    rationale.push("score_near_warning_threshold");
  }

  const highRecurrence = input.signals.some(s => s.recurrence > 3);
  if (highRecurrence) rationale.push("high_signal_recurrence");
  if (rationale.length === 0) rationale.push("within_acceptable_range");

  return { dimension_key: input.dimension_key, dimension_score: round(score), degradation_status: status, confidence_score: round(confidence), rationale_codes: rationale };
}

export function scoreAllDimensions(inputs: FitnessDimensionInput[]): FitnessScore[] {
  return inputs.map(scoreDimension).sort((a, b) => a.dimension_score - b.dimension_score);
}

function round(n: number, d = 4): number {
  return Math.round(n * Math.pow(10, d)) / Math.pow(10, d);
}
