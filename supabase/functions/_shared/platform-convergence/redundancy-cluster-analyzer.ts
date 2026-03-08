/**
 * Redundancy Cluster Analyzer — Sprint 49
 * Detects duplicated strategy / calibration / architecture patterns
 * that should be merged or retired.
 * Pure functions. No DB access.
 */

export interface RedundancyItem {
  key: string;
  domain: string;             // "strategy" | "calibration" | "architecture_mode"
  config_signature: string;   // hash or stringified config for similarity
  performance_score: number;
  adoption_ratio: number;
  last_used_days_ago: number;
}

export interface RedundancyCluster {
  cluster_id: string;
  domain: string;
  members: Array<{ key: string; performance_score: number; adoption_ratio: number }>;
  redundancy_score: number;
  recommended_survivor: string;
  retirement_candidates: string[];
  rationale_codes: string[];
}

export function analyzeRedundancyClusters(items: RedundancyItem[]): RedundancyCluster[] {
  const clusters: RedundancyCluster[] = [];
  const grouped = new Map<string, RedundancyItem[]>();

  // Group by config_signature (identical or near-identical configs)
  for (const item of items) {
    const key = `${item.domain}::${item.config_signature}`;
    const group = grouped.get(key) || [];
    group.push(item);
    grouped.set(key, group);
  }

  let clusterIdx = 0;
  for (const [, group] of grouped) {
    if (group.length < 2) continue;

    const sorted = group.sort((a, b) => b.performance_score - a.performance_score);
    const survivor = sorted[0];
    const retirees = sorted.slice(1);

    const redundancyScore = round(Math.min(1, retirees.length * 0.3 +
      retirees.reduce((s, r) => s + (1 - r.adoption_ratio), 0) / retirees.length * 0.4));

    const rationale: string[] = ["identical_config_signature"];
    if (retirees.some(r => r.last_used_days_ago > 30)) rationale.push("stale_duplicates");
    if (retirees.some(r => r.adoption_ratio < 0.05)) rationale.push("near_zero_adoption");

    clusters.push({
      cluster_id: `cluster_${clusterIdx++}`,
      domain: group[0].domain,
      members: group.map(g => ({ key: g.key, performance_score: g.performance_score, adoption_ratio: g.adoption_ratio })),
      redundancy_score: redundancyScore,
      recommended_survivor: survivor.key,
      retirement_candidates: retirees.map(r => r.key),
      rationale_codes: rationale,
    });
  }

  return clusters.sort((a, b) => b.redundancy_score - a.redundancy_score);
}

function round(v: number): number { return Math.round(v * 10000) / 10000; }
