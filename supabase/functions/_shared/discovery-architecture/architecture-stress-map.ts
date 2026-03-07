/**
 * Architecture Stress Map — Sprint 37
 * Computes bounded stress dimensions showing where architecture assumptions are under pressure.
 * Pure functions. No DB access.
 */

import { AggregatedDiscoverySignal } from "./discovery-signal-aggregator.ts";

export interface StressDimension {
  dimension: string;
  score: number; // 0-1
  contributing_signals: number;
  trend: "increasing" | "stable" | "decreasing";
  top_signal_types: string[];
}

export interface ArchitectureStressMap {
  overall_stress: number;
  dimensions: StressDimension[];
  hotspots: string[];
  computed_at: string;
}

const DIMENSION_KEYWORDS: Record<string, string[]> = {
  runtime_stress: ["bottleneck", "latency", "timeout", "retry", "failure"],
  policy_complexity: ["policy", "conflict", "overlap", "oscillation"],
  tenant_divergence: ["tenant", "workspace", "segment", "diverge"],
  memory_retrieval_pressure: ["retrieval", "memory", "embedding", "semantic"],
  strategy_churn: ["strategy", "variant", "rollback", "experiment"],
  stabilization_frequency: ["stabilization", "stability", "safe_mode", "unstable"],
  advisory_recurrence: ["advisory", "recommendation", "advisor", "review"],
};

function computeDimension(dimension: string, keywords: string[], signals: AggregatedDiscoverySignal[]): StressDimension {
  const matching = signals.filter(s =>
    keywords.some(k => s.signal_type.toLowerCase().includes(k)) ||
    s.source_types.some(st => keywords.some(k => st.toLowerCase().includes(k)))
  );

  const score = matching.length === 0 ? 0 : Math.min(1,
    matching.reduce((sum, s) => sum + s.architectural_relevance_score * (s.recurrence_count / 10), 0) / Math.max(matching.length, 1)
  );

  const trends = matching.map(s => s.trend_direction);
  const increasing = trends.filter(t => t === "increasing").length;
  const decreasing = trends.filter(t => t === "decreasing").length;
  const trend = increasing > decreasing ? "increasing" : decreasing > increasing ? "decreasing" : "stable";

  return {
    dimension,
    score: Math.round(score * 100) / 100,
    contributing_signals: matching.length,
    trend,
    top_signal_types: matching.slice(0, 3).map(s => s.signal_type),
  };
}

export function computeArchitectureStressMap(signals: AggregatedDiscoverySignal[]): ArchitectureStressMap {
  const dimensions: StressDimension[] = [];

  for (const [dim, keywords] of Object.entries(DIMENSION_KEYWORDS)) {
    dimensions.push(computeDimension(dim, keywords, signals));
  }

  const activeDimensions = dimensions.filter(d => d.score > 0);
  const overall_stress = activeDimensions.length === 0 ? 0 :
    Math.round((activeDimensions.reduce((sum, d) => sum + d.score, 0) / activeDimensions.length) * 100) / 100;

  const hotspots = dimensions.filter(d => d.score >= 0.5 && d.trend === "increasing").map(d => d.dimension);

  return {
    overall_stress,
    dimensions: dimensions.sort((a, b) => b.score - a.score),
    hotspots,
    computed_at: new Date().toISOString(),
  };
}
