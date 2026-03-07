/**
 * Strategy Portfolio Analyzer — Sprint 33
 * Aggregates performance metrics across all strategy families in a portfolio.
 * Pure functions. No DB access.
 */

export interface PortfolioMemberInput {
  id: string;
  strategy_family_id: string;
  lifecycle_status: string;
  exposure_weight: number;
  performance_score: number | null;
  stability_score: number | null;
  cost_efficiency_score: number | null;
}

export interface OutcomeInput {
  outcome_status: string;
  applied_mode: string;
  outcome_metrics: Record<string, any> | null;
}

export interface PortfolioMetrics {
  portfolio_success_rate: number;
  portfolio_cost_efficiency: number;
  portfolio_stability_index: number;
  strategy_concentration_index: number;
  portfolio_regression_rate: number;
  member_count: number;
  active_count: number;
  degrading_count: number;
}

export function computePortfolioMetrics(
  members: PortfolioMemberInput[],
  outcomes: OutcomeInput[],
): PortfolioMetrics {
  const memberCount = members.length;
  const activeCount = members.filter(m => m.lifecycle_status === "active").length;
  const degradingCount = members.filter(m => m.lifecycle_status === "degrading").length;

  // Success rate from outcomes
  const totalOutcomes = outcomes.length;
  const helpfulOutcomes = outcomes.filter(o => o.outcome_status === "helpful").length;
  const harmfulOutcomes = outcomes.filter(o => o.outcome_status === "harmful").length;
  const portfolioSuccessRate = totalOutcomes > 0 ? helpfulOutcomes / totalOutcomes : 0;
  const portfolioRegressionRate = totalOutcomes > 0 ? harmfulOutcomes / totalOutcomes : 0;

  // Cost efficiency from member scores
  const costScores = members
    .map(m => m.cost_efficiency_score)
    .filter((s): s is number => s !== null);
  const portfolioCostEfficiency = costScores.length > 0
    ? costScores.reduce((a, b) => a + b, 0) / costScores.length
    : 0;

  // Stability from member scores
  const stabilityScores = members
    .map(m => m.stability_score)
    .filter((s): s is number => s !== null);
  const portfolioStabilityIndex = stabilityScores.length > 0
    ? stabilityScores.reduce((a, b) => a + b, 0) / stabilityScores.length
    : 0;

  // Concentration index (Herfindahl-like)
  const totalWeight = members.reduce((a, m) => a + m.exposure_weight, 0);
  const concentrationIndex = totalWeight > 0
    ? members.reduce((sum, m) => {
        const share = m.exposure_weight / totalWeight;
        return sum + share * share;
      }, 0)
    : 0;

  return {
    portfolio_success_rate: round(portfolioSuccessRate),
    portfolio_cost_efficiency: round(portfolioCostEfficiency),
    portfolio_stability_index: round(portfolioStabilityIndex),
    strategy_concentration_index: round(concentrationIndex),
    portfolio_regression_rate: round(portfolioRegressionRate),
    member_count: memberCount,
    active_count: activeCount,
    degrading_count: degradingCount,
  };
}

export function identifyDegradingMembers(
  members: PortfolioMemberInput[],
  outcomes: OutcomeInput[],
  threshold: number = 0.3,
): string[] {
  // Members with harmful rate above threshold
  const degrading: string[] = [];
  for (const member of members) {
    if (member.lifecycle_status === "deprecated" || member.lifecycle_status === "archived") continue;
    const memberOutcomes = outcomes.filter(o => o.applied_mode === "variant");
    if (memberOutcomes.length < 5) continue;
    const harmfulRate = memberOutcomes.filter(o => o.outcome_status === "harmful").length / memberOutcomes.length;
    if (harmfulRate > threshold) {
      degrading.push(member.id);
    }
  }
  return degrading;
}

function round(n: number, decimals: number = 4): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}
