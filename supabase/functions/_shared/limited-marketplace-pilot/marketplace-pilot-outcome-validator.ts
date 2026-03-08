/**
 * Marketplace Pilot Outcome Validator — Sprint 60
 * Compares expected vs realized pilot outcomes.
 */

export interface OutcomeValidation {
  total_outcomes: number;
  helpful_count: number;
  harmful_count: number;
  pilot_outcome_accuracy_score: number;
  outcome_rationale: string[];
}

export function validateOutcomes(outcomes: any[]): OutcomeValidation {
  let helpful = 0, harmful = 0, neutral = 0, inconclusive = 0;
  const rationale: string[] = [];

  for (const o of outcomes) {
    if (o.outcome_status === 'helpful') helpful++;
    else if (o.outcome_status === 'harmful') harmful++;
    else if (o.outcome_status === 'neutral') neutral++;
    else inconclusive++;
  }

  const total = outcomes.length || 1;
  const accuracy = (helpful + neutral) / total;

  if (harmful > 0) rationale.push(`${harmful}_harmful_outcomes`);
  if (helpful > total * 0.5) rationale.push('majority_helpful');
  if (inconclusive > total * 0.3) rationale.push('high_inconclusive_rate');

  return {
    total_outcomes: outcomes.length,
    helpful_count: helpful,
    harmful_count: harmful,
    pilot_outcome_accuracy_score: Math.round(accuracy * 10000) / 10000,
    outcome_rationale: rationale,
  };
}
