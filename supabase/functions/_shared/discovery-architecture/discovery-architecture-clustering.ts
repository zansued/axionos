/**
 * Discovery Architecture Clustering & Deduplication — Sprint 37
 * Prevents recommendation overload through clustering and stale detection.
 * Pure functions. No DB access.
 */

import { DiscoveryArchitectureRecommendation } from "./discovery-architecture-recommendation-engine.ts";

export interface RecommendationCluster {
  cluster_key: string;
  recommendations: DiscoveryArchitectureRecommendation[];
  count: number;
  max_priority: number;
  representative: DiscoveryArchitectureRecommendation;
}

export function clusterRecommendations(recs: DiscoveryArchitectureRecommendation[]): RecommendationCluster[] {
  if (!recs.length) return [];

  const groups = new Map<string, DiscoveryArchitectureRecommendation[]>();

  for (const rec of recs) {
    const key = `${rec.recommendation_type}::${rec.target_scope}`;
    const group = groups.get(key) || [];
    group.push(rec);
    groups.set(key, group);
  }

  const clusters: RecommendationCluster[] = [];
  for (const [key, group] of groups) {
    const sorted = group.sort((a, b) => b.priority_score - a.priority_score);
    clusters.push({
      cluster_key: key,
      recommendations: sorted,
      count: sorted.length,
      max_priority: sorted[0].priority_score,
      representative: sorted[0],
    });
  }

  return clusters.sort((a, b) => b.max_priority - a.max_priority);
}

export function deduplicateRecommendations(recs: DiscoveryArchitectureRecommendation[]): DiscoveryArchitectureRecommendation[] {
  const seen = new Set<string>();
  const result: DiscoveryArchitectureRecommendation[] = [];

  for (const rec of recs) {
    const key = `${rec.recommendation_type}::${rec.target_scope}::${rec.rationale_codes.sort().join(",")}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(rec);
    }
  }

  return result;
}

export function filterStaleRecommendations(
  recs: Array<{ id: string; status: string; created_at: string }>,
  maxAgeDays: number = 30,
): string[] {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  return recs
    .filter(r => r.status === "open" && new Date(r.created_at).getTime() < cutoff)
    .map(r => r.id);
}
