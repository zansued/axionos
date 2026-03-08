/**
 * Product Opportunity Balance Analyzer — Sprint 55
 * Evaluates portfolio balance across value, risk, confidence, and scope distribution.
 */

export interface BalanceInput {
  items: {
    id: string;
    expected_value_score: number;
    confidence_score: number;
    feasibility_score: number;
    conflict_score: number;
    governance_state: string;
    product_area?: string;
  }[];
}

export interface BalanceResult {
  portfolio_balance_score: number;
  value_concentration: number;
  confidence_spread: number;
  scope_diversity: number;
  state_distribution: Record<string, number>;
  warnings: string[];
}

export function analyzeBalance(input: BalanceInput): BalanceResult {
  const items = input.items;
  if (items.length === 0) {
    return { portfolio_balance_score: 0, value_concentration: 0, confidence_spread: 0, scope_diversity: 0, state_distribution: {}, warnings: ["Empty portfolio"] };
  }

  // Value concentration — Herfindahl-like
  const totalValue = items.reduce((s, i) => s + i.expected_value_score, 0);
  const valueConcentration = totalValue > 0
    ? items.reduce((s, i) => s + Math.pow(i.expected_value_score / totalValue, 2), 0)
    : 0;

  // Confidence spread
  const avgConf = items.reduce((s, i) => s + i.confidence_score, 0) / items.length;
  const confVariance = items.reduce((s, i) => s + Math.pow(i.confidence_score - avgConf, 2), 0) / items.length;
  const confidenceSpread = Math.sqrt(confVariance);

  // Scope diversity
  const areas = new Set(items.map(i => i.product_area).filter(Boolean));
  const scopeDiversity = Math.min(1, areas.size / Math.max(items.length, 1));

  // State distribution
  const stateDist: Record<string, number> = {};
  for (const item of items) {
    stateDist[item.governance_state] = (stateDist[item.governance_state] || 0) + 1;
  }

  // Balance score
  const balance = round(
    (1 - valueConcentration) * 0.3 +
    (1 - confidenceSpread) * 0.2 +
    scopeDiversity * 0.3 +
    (items.filter(i => i.conflict_score < 0.3).length / items.length) * 0.2
  );

  const warnings: string[] = [];
  if (valueConcentration > 0.5) warnings.push("Portfolio value too concentrated in few items");
  if (confidenceSpread > 0.3) warnings.push("Wide confidence variance — some items lack evidence");
  if (scopeDiversity < 0.2) warnings.push("Low scope diversity — portfolio too narrow");

  return {
    portfolio_balance_score: Math.max(0, Math.min(1, balance)),
    value_concentration: round(valueConcentration),
    confidence_spread: round(confidenceSpread),
    scope_diversity: round(scopeDiversity),
    state_distribution: stateDist,
    warnings,
  };
}

function round(n: number, d = 4): number {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}
