/**
 * Product Opportunity Portfolio Explainer — Sprint 55
 * Returns structured explanations for rankings, conflicts, and decisions.
 */

export interface ExplainInput {
  portfolio: any;
  items: any[];
  conflicts: any[];
  decisions: any[];
  balance: any;
  capacity: any;
}

export interface PortfolioExplanation {
  portfolio_summary: string;
  item_count: number;
  balance_assessment: string;
  capacity_assessment: string;
  top_opportunities: { id: string; priority: number; state: string }[];
  active_conflicts: number;
  pending_decisions: number;
  safety_constraints: string[];
}

export function explainPortfolio(input: ExplainInput): PortfolioExplanation {
  const { portfolio, items, conflicts, decisions, balance, capacity } = input;

  const topOpps = (items || [])
    .sort((a: any, b: any) => (b.portfolio_priority_score || 0) - (a.portfolio_priority_score || 0))
    .slice(0, 5)
    .map((i: any) => ({
      id: i.id,
      priority: i.portfolio_priority_score || 0,
      state: i.governance_state || "unknown",
    }));

  const balanceAssessment = balance?.portfolio_balance_score > 0.7
    ? "Well-balanced portfolio"
    : balance?.portfolio_balance_score > 0.4
      ? "Moderately balanced — some concentration detected"
      : "Portfolio imbalanced — review distribution";

  const capacityAssessment = capacity?.can_promote
    ? `Capacity available (${capacity.capacity_headroom_score?.toFixed(2)} headroom)`
    : "At capacity — defer new promotions";

  return {
    portfolio_summary: `Portfolio "${portfolio?.portfolio_name || "unnamed"}" with ${items?.length || 0} items in ${portfolio?.lifecycle_status || "unknown"} state`,
    item_count: items?.length || 0,
    balance_assessment: balanceAssessment,
    capacity_assessment: capacityAssessment,
    top_opportunities: topOpps,
    active_conflicts: (conflicts || []).filter((c: any) => c.status === "open").length,
    pending_decisions: (decisions || []).filter((d: any) => d.decision_status === "pending").length,
    safety_constraints: [
      "Cannot auto-promote opportunities to execution",
      "Cannot auto-allocate implementation capacity",
      "Cannot auto-create initiatives without human review",
      "Cannot mutate architecture, governance, or billing",
      "All portfolio consequences require human approval",
      "Marketplace/ecosystem remains frozen",
    ],
  };
}
