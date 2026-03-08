/**
 * Change Load Balancer — Sprint 45
 * Limits simultaneous architecture initiatives, prevents pile-up.
 * Pure functions. No DB access.
 */

import type { NormalizedChangeOpportunity } from "./change-opportunity-normalizer.ts";

export interface LoadBalanceResult {
  load_score: number;
  concurrency_recommendation: string;
  deferment_recommendations: string[];
  constrained_scopes: string[];
  within_capacity: boolean;
}

export interface LoadBalanceConfig {
  max_concurrent_changes: number;
  max_per_scope: number;
  fragility_threshold: number;
}

const DEFAULT_CONFIG: LoadBalanceConfig = {
  max_concurrent_changes: 10,
  max_per_scope: 3,
  fragility_threshold: 0.7,
};

export function balanceLoad(
  opportunities: NormalizedChangeOpportunity[],
  config: Partial<LoadBalanceConfig> = {}
): LoadBalanceResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const deferrals: string[] = [];
  const constrained: string[] = [];

  if (opportunities.length === 0) {
    return { load_score: 0, concurrency_recommendation: "No changes pending", deferment_recommendations: [], constrained_scopes: [], within_capacity: true };
  }

  const loadScore = Math.min(1, opportunities.length / cfg.max_concurrent_changes);

  // Per-scope check
  const scopeCounts = new Map<string, number>();
  for (const opp of opportunities) {
    scopeCounts.set(opp.affected_scope, (scopeCounts.get(opp.affected_scope) || 0) + 1);
  }

  for (const [scope, count] of scopeCounts) {
    if (count > cfg.max_per_scope) {
      constrained.push(scope);
      deferrals.push(`Defer ${count - cfg.max_per_scope} changes in scope "${scope}" (exceeds limit of ${cfg.max_per_scope})`);
    }
  }

  // High-risk fragility
  const highRiskCount = opportunities.filter((o) => o.risk_score >= cfg.fragility_threshold).length;
  if (highRiskCount > 2) {
    deferrals.push(`Defer ${highRiskCount - 2} high-risk changes to avoid fragility pile-up`);
  }

  const withinCapacity = opportunities.length <= cfg.max_concurrent_changes && constrained.length === 0;

  let concurrencyRec = "Load within acceptable bounds";
  if (loadScore > 0.8) concurrencyRec = "Critical: reduce concurrent architecture changes immediately";
  else if (loadScore > 0.6) concurrencyRec = "Warning: approaching change capacity limits";
  else if (loadScore > 0.4) concurrencyRec = "Moderate load: monitor for pile-up";

  return {
    load_score: Math.round(loadScore * 100) / 100,
    concurrency_recommendation: concurrencyRec,
    deferment_recommendations: deferrals,
    constrained_scopes: constrained,
    within_capacity: withinCapacity,
  };
}
