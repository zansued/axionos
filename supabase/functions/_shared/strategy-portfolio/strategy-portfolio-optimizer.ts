/**
 * Strategy Portfolio Optimizer — Sprint 33
 * Generates advisory portfolio-level recommendations.
 * Pure functions. No DB access.
 */

import type { PortfolioMetrics, PortfolioMemberInput } from "./strategy-portfolio-analyzer.ts";

export type RecommendationType =
  | "merge_strategies"
  | "retire_weak"
  | "rebalance_exposure"
  | "promote_diversification"
  | "monoculture_risk"
  | "reduce_degrading"
  | "promote_candidate";

export interface PortfolioRecommendation {
  recommendation_type: RecommendationType;
  target_strategy_ids: string[];
  description: string;
  confidence: number;
  advisory_first: true;
}

const FORBIDDEN_MUTATION_TARGETS = [
  "pipeline_topology",
  "governance_rules",
  "billing_logic",
  "plan_enforcement",
  "execution_contracts",
  "hard_safety_constraints",
];

export function generateRecommendations(
  members: PortfolioMemberInput[],
  metrics: PortfolioMetrics,
): PortfolioRecommendation[] {
  const recs: PortfolioRecommendation[] = [];

  // 1. Monoculture risk
  if (metrics.strategy_concentration_index > 0.5 && members.length > 1) {
    const dominant = [...members].sort((a, b) => b.exposure_weight - a.exposure_weight);
    recs.push({
      recommendation_type: "monoculture_risk",
      target_strategy_ids: [dominant[0].strategy_family_id],
      description: `Concentration index ${metrics.strategy_concentration_index.toFixed(2)} indicates monoculture risk. Dominant strategy has disproportionate exposure.`,
      confidence: 0.85,
      advisory_first: true,
    });
  }

  // 2. Retire weak strategies
  const weakMembers = members.filter(m =>
    m.lifecycle_status === "active" &&
    m.performance_score !== null &&
    m.performance_score < 0.3
  );
  if (weakMembers.length > 0) {
    recs.push({
      recommendation_type: "retire_weak",
      target_strategy_ids: weakMembers.map(m => m.strategy_family_id),
      description: `${weakMembers.length} active strategy(ies) have performance below 0.3. Consider deprecation.`,
      confidence: 0.7,
      advisory_first: true,
    });
  }

  // 3. Reduce degrading strategies
  if (metrics.degrading_count > 0) {
    const degrading = members.filter(m => m.lifecycle_status === "degrading");
    recs.push({
      recommendation_type: "reduce_degrading",
      target_strategy_ids: degrading.map(m => m.strategy_family_id),
      description: `${metrics.degrading_count} strategy(ies) are degrading. Investigate and consider rollback or deprecation.`,
      confidence: 0.8,
      advisory_first: true,
    });
  }

  // 4. Promote diversification if too few active
  if (metrics.active_count < 2 && members.length > 2) {
    const candidates = members.filter(m => m.lifecycle_status === "proposed" || m.lifecycle_status === "experimental");
    if (candidates.length > 0) {
      recs.push({
        recommendation_type: "promote_diversification",
        target_strategy_ids: candidates.slice(0, 2).map(m => m.strategy_family_id),
        description: "Portfolio has fewer than 2 active strategies. Consider promoting candidates to increase diversity.",
        confidence: 0.6,
        advisory_first: true,
      });
    }
  }

  // 5. Rebalance exposure if imbalanced
  const totalWeight = members.reduce((a, m) => a + m.exposure_weight, 0);
  if (totalWeight > 0 && members.length > 1) {
    const maxShare = Math.max(...members.map(m => m.exposure_weight / totalWeight));
    if (maxShare > 0.7) {
      recs.push({
        recommendation_type: "rebalance_exposure",
        target_strategy_ids: members.map(m => m.strategy_family_id),
        description: `Max exposure share ${(maxShare * 100).toFixed(0)}% exceeds 70%. Consider rebalancing.`,
        confidence: 0.75,
        advisory_first: true,
      });
    }
  }

  return recs;
}

export function isForbiddenTarget(familyKey: string): boolean {
  return FORBIDDEN_MUTATION_TARGETS.some(f => familyKey.includes(f));
}
