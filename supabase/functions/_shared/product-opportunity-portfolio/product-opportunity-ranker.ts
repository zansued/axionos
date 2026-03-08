/**
 * Product Opportunity Ranker — Sprint 55
 * Ranks opportunities by value, confidence, feasibility, strategic fit, and capacity pressure.
 */

export interface RankableItem {
  id: string;
  strategic_fit_score: number;
  expected_value_score: number;
  confidence_score: number;
  feasibility_score: number;
  capacity_pressure_score: number;
  conflict_score: number;
  overlap_score: number;
  cannibalization_score: number;
}

export interface RankedItem {
  id: string;
  portfolio_priority_score: number;
  promotion_readiness_score: number;
  deferral_justification_score: number;
  watchlist_relevance_score: number;
  rationale: string[];
}

const WEIGHTS = {
  expected_value: 0.25,
  strategic_fit: 0.20,
  confidence: 0.15,
  feasibility: 0.15,
  capacity_headroom: 0.10,
  conflict_penalty: 0.08,
  overlap_penalty: 0.04,
  cannibalization_penalty: 0.03,
};

export function rankOpportunities(items: RankableItem[]): RankedItem[] {
  return items.map(item => {
    const capacityHeadroom = 1 - item.capacity_pressure_score;

    const priority =
      item.expected_value_score * WEIGHTS.expected_value +
      item.strategic_fit_score * WEIGHTS.strategic_fit +
      item.confidence_score * WEIGHTS.confidence +
      item.feasibility_score * WEIGHTS.feasibility +
      capacityHeadroom * WEIGHTS.capacity_headroom -
      item.conflict_score * WEIGHTS.conflict_penalty -
      item.overlap_score * WEIGHTS.overlap_penalty -
      item.cannibalization_score * WEIGHTS.cannibalization_penalty;

    const rationale: string[] = [];

    const promotionReadiness = Math.min(1, priority * 1.1);
    const deferralJustification =
      item.conflict_score > 0.5 || item.capacity_pressure_score > 0.8 || item.confidence_score < 0.3
        ? round(0.5 + item.conflict_score * 0.2 + item.capacity_pressure_score * 0.2 + (1 - item.confidence_score) * 0.1)
        : 0;
    const watchlistRelevance =
      item.confidence_score < 0.5 && item.expected_value_score > 0.5
        ? round(item.expected_value_score * 0.6 + (1 - item.confidence_score) * 0.4)
        : 0;

    if (item.expected_value_score > 0.7) rationale.push("High expected value");
    if (item.confidence_score < 0.3) rationale.push("Low confidence — penalized");
    if (item.conflict_score > 0.5) rationale.push("Conflict detected — penalized");
    if (item.capacity_pressure_score > 0.8) rationale.push("High capacity pressure");
    if (item.feasibility_score < 0.3) rationale.push("Low feasibility");
    if (rationale.length === 0) rationale.push("Within acceptable thresholds");

    return {
      id: item.id,
      portfolio_priority_score: round(Math.max(0, Math.min(1, priority))),
      promotion_readiness_score: round(Math.max(0, Math.min(1, promotionReadiness))),
      deferral_justification_score: round(Math.max(0, Math.min(1, deferralJustification))),
      watchlist_relevance_score: round(Math.max(0, Math.min(1, watchlistRelevance))),
      rationale,
    };
  }).sort((a, b) => b.portfolio_priority_score - a.portfolio_priority_score);
}

function round(n: number, d = 4): number {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}
