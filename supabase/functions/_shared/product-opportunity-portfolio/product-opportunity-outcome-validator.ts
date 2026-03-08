/**
 * Product Opportunity Outcome Validator — Sprint 55
 * Tracks whether portfolio decisions produced useful downstream outcomes.
 */

export interface OutcomeInput {
  decision_id: string;
  item_id: string;
  expected_outcomes: Record<string, number>;
  realized_outcomes: Record<string, number>;
}

export interface OutcomeResult {
  decision_id: string;
  item_id: string;
  outcome_status: string;
  portfolio_decision_quality_score: number;
  portfolio_outcome_accuracy_score: number;
  false_positive_flag: boolean;
  rationale: string[];
}

export function validateOutcomes(inputs: OutcomeInput[]): OutcomeResult[] {
  return inputs.map(input => {
    const expected = input.expected_outcomes;
    const realized = input.realized_outcomes;
    const keys = new Set([...Object.keys(expected), ...Object.keys(realized)]);

    if (keys.size === 0) {
      return {
        decision_id: input.decision_id,
        item_id: input.item_id,
        outcome_status: "inconclusive",
        portfolio_decision_quality_score: 0,
        portfolio_outcome_accuracy_score: 0,
        false_positive_flag: false,
        rationale: ["No outcomes data available"],
      };
    }

    let totalAccuracy = 0;
    let count = 0;
    for (const key of keys) {
      const exp = expected[key] ?? 0;
      const real = realized[key] ?? 0;
      if (exp > 0) {
        totalAccuracy += Math.min(1, real / exp);
        count++;
      }
    }

    const accuracy = count > 0 ? round(totalAccuracy / count) : 0;
    const quality = round(accuracy * 0.7 + (count > 0 ? 0.3 : 0));
    const falsePositive = accuracy < 0.2 && count > 0;

    let status: string;
    if (accuracy > 0.7) status = "helpful";
    else if (accuracy > 0.4) status = "neutral";
    else if (accuracy > 0.1) status = "inconclusive";
    else status = "harmful";

    const rationale: string[] = [];
    if (falsePositive) rationale.push("Realized outcomes far below expectations — false positive");
    if (accuracy > 0.8) rationale.push("Outcomes matched or exceeded expectations");
    if (rationale.length === 0) rationale.push("Partial outcome realization");

    return {
      decision_id: input.decision_id,
      item_id: input.item_id,
      outcome_status: status,
      portfolio_decision_quality_score: quality,
      portfolio_outcome_accuracy_score: accuracy,
      false_positive_flag: falsePositive,
      rationale,
    };
  });
}

function round(n: number, d = 4): number {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}
