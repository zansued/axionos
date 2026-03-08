/**
 * Convergence Outcome Validator — Sprint 50
 * Compares expected vs realized effects after approved convergence actions.
 * Pure functions. No DB access.
 */

export interface OutcomeInput {
  expected_simplification: number;
  realized_simplification: number;
  expected_fragmentation_reduction: number;
  realized_fragmentation_reduction: number;
  expected_economic_gain: number;
  realized_economic_gain: number;
  expected_stability_gain: number;
  realized_stability_gain: number;
}

export interface OutcomeValidation {
  outcome_accuracy_score: number;
  outcome_status: "helpful" | "neutral" | "harmful" | "inconclusive";
  dimension_deltas: Array<{ dimension: string; expected: number; realized: number; delta: number }>;
  rationale_codes: string[];
}

export function validateConvergenceOutcome(input: OutcomeInput): OutcomeValidation {
  const dims = [
    { dimension: "simplification", expected: input.expected_simplification, realized: input.realized_simplification },
    { dimension: "fragmentation_reduction", expected: input.expected_fragmentation_reduction, realized: input.realized_fragmentation_reduction },
    { dimension: "economic_gain", expected: input.expected_economic_gain, realized: input.realized_economic_gain },
    { dimension: "stability_gain", expected: input.expected_stability_gain, realized: input.realized_stability_gain },
  ];

  const deltas = dims.map(d => ({ ...d, delta: round(d.realized - d.expected) }));
  const avgAccuracy = dims.length > 0
    ? dims.reduce((s, d) => s + (d.expected !== 0 ? Math.min(1, d.realized / d.expected) : (d.realized === 0 ? 1 : 0.5)), 0) / dims.length
    : 0.5;

  const netRealized = dims.reduce((s, d) => s + d.realized, 0);
  const rationale: string[] = [];

  let status: "helpful" | "neutral" | "harmful" | "inconclusive" = "inconclusive";
  if (netRealized > 0.2) { status = "helpful"; rationale.push("positive_net_realized"); }
  else if (netRealized < -0.1) { status = "harmful"; rationale.push("negative_net_realized"); }
  else if (Math.abs(netRealized) <= 0.1) { status = "neutral"; rationale.push("negligible_net_effect"); }

  if (avgAccuracy > 0.8) rationale.push("high_forecast_accuracy");
  if (avgAccuracy < 0.4) rationale.push("low_forecast_accuracy");

  return {
    outcome_accuracy_score: round(avgAccuracy),
    outcome_status: status,
    dimension_deltas: deltas,
    rationale_codes: rationale,
  };
}

function round(v: number): number { return Math.round(v * 10000) / 10000; }
