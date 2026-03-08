/**
 * Product Opportunity Decision Engine — Sprint 55
 * Produces advisory-first decisions: promote / defer / reject / monitor / split / merge_candidate.
 */

export interface DecisionInput {
  id: string;
  portfolio_priority_score: number;
  promotion_readiness_score: number;
  deferral_justification_score: number;
  watchlist_relevance_score: number;
  conflict_score: number;
  confidence_score: number;
  feasibility_score: number;
  capacity_headroom: number;
}

export interface DecisionOutput {
  item_id: string;
  recommended_decision: string;
  decision_confidence: number;
  rationale: string[];
}

export function generateDecisions(items: DecisionInput[]): DecisionOutput[] {
  return items.map(item => {
    let decision = "monitor";
    const rationale: string[] = [];
    let confidence = 0.5;

    if (item.promotion_readiness_score > 0.7 && item.capacity_headroom > 0.2 && item.conflict_score < 0.3) {
      decision = "promote";
      confidence = item.promotion_readiness_score;
      rationale.push("High promotion readiness with available capacity");
    } else if (item.deferral_justification_score > 0.6) {
      decision = "defer";
      confidence = item.deferral_justification_score;
      if (item.conflict_score > 0.5) rationale.push("Active conflicts require resolution first");
      if (item.capacity_headroom < 0.2) rationale.push("Insufficient capacity headroom");
      if (item.confidence_score < 0.3) rationale.push("Evidence too weak for promotion");
    } else if (item.feasibility_score < 0.2 && item.confidence_score < 0.2) {
      decision = "reject";
      confidence = 0.7;
      rationale.push("Very low feasibility and confidence — reject");
    } else if (item.watchlist_relevance_score > 0.5) {
      decision = "monitor";
      confidence = item.watchlist_relevance_score;
      rationale.push("Potential value but insufficient evidence — monitor for signal strengthening");
    } else {
      decision = "monitor";
      confidence = 0.4;
      rationale.push("Does not meet promotion or deferral thresholds — keep on watchlist");
    }

    if (item.conflict_score > 0.7) {
      rationale.push("High conflict score — merge candidate review recommended");
    }

    return {
      item_id: item.id,
      recommended_decision: decision,
      decision_confidence: round(confidence),
      rationale,
    };
  });
}

function round(n: number, d = 4): number {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}
