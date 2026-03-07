// Engineering Advisory Clustering — Sprint 35
// Prevents noisy recommendation overload via clustering and de-duplication.

import { AdvisoryRecommendation } from "./engineering-advisory-recommendation-engine.ts";

export interface ClusterResult {
  clusters: Array<{
    cluster_key: string;
    recommendations: AdvisoryRecommendation[];
    representative: AdvisoryRecommendation;
  }>;
  suppressed: AdvisoryRecommendation[];
  deduplicated_count: number;
}

/**
 * Cluster near-duplicate recommendations and suppress low-value repetitive advice.
 */
export function clusterRecommendations(
  recommendations: AdvisoryRecommendation[],
  existingTypes?: Set<string>,
  minConfidence: number = 0.3,
): ClusterResult {
  if (!recommendations || recommendations.length === 0) {
    return { clusters: [], suppressed: [], deduplicated_count: 0 };
  }

  const suppressed: AdvisoryRecommendation[] = [];
  const valid: AdvisoryRecommendation[] = [];

  // Suppress low-confidence
  for (const rec of recommendations) {
    if (rec.confidence_score < minConfidence) {
      suppressed.push(rec);
    } else {
      valid.push(rec);
    }
  }

  // Suppress duplicates of existing recommendations
  const deduped: AdvisoryRecommendation[] = [];
  let deduplicated_count = 0;
  for (const rec of valid) {
    const key = `${rec.recommendation_type}:${rec.target_scope}`;
    if (existingTypes && existingTypes.has(key)) {
      suppressed.push(rec);
      deduplicated_count++;
    } else {
      deduped.push(rec);
    }
  }

  // Group by recommendation_type + target_scope
  const groups = new Map<string, AdvisoryRecommendation[]>();
  for (const rec of deduped) {
    const key = `${rec.recommendation_type}:${rec.target_scope}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(rec);
  }

  const clusters = Array.from(groups.entries()).map(([key, recs]) => {
    // Representative is the highest priority one
    const sorted = [...recs].sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
    return {
      cluster_key: key,
      recommendations: recs,
      representative: sorted[0],
    };
  });

  return { clusters, suppressed, deduplicated_count };
}

/**
 * Check if a recommendation is stale relative to current system state.
 */
export function isRecommendationStale(createdAt: string, staleDays: number = 14): boolean {
  return (Date.now() - new Date(createdAt).getTime()) > staleDays * 24 * 3600 * 1000;
}
