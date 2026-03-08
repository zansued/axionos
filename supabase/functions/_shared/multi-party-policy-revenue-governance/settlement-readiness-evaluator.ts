/**
 * Settlement Readiness Evaluator — Sprint 62
 * Evaluates whether a value/revenue flow is sufficiently bounded for pilot use.
 */

export interface SettlementInput {
  revenue_bound_score: number;
  enforceability_score: number;
  conflict_score: number;
  fairness_score: number;
}

export interface SettlementResult {
  settlement_readiness_score: number;
  recommendation: string;
  rationale: string[];
}

export function evaluateSettlementReadiness(input: SettlementInput): SettlementResult {
  const rationale: string[] = [];
  let readiness = input.revenue_bound_score * 0.3 + input.enforceability_score * 0.3 + (1 - input.conflict_score) * 0.2 + input.fairness_score * 0.2;

  if (input.conflict_score > 0.5) { readiness *= 0.5; rationale.push('high_conflict_blocks_settlement'); }
  if (input.revenue_bound_score < 0.3) { readiness *= 0.3; rationale.push('unbounded_revenue'); }

  const rec = readiness >= 0.6 ? 'allow_bounded' : readiness >= 0.3 ? 'needs_review' : 'reject';

  return {
    settlement_readiness_score: Math.round(Math.min(1, readiness) * 10000) / 10000,
    recommendation: rec,
    rationale,
  };
}
