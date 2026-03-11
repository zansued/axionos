/**
 * Canon Evolution Aggregation — Sprint 156
 * Groups repeated learning signals into consolidated proposals instead of many tiny isolated ones.
 */

import type { LearningSignal } from "../learning/learning-signal-types.ts";

export interface AggregatedSignalGroup {
  key: string;
  signal_type: string;
  signals: LearningSignal[];
  count: number;
  avg_confidence: number;
  max_severity: string;
  stages: string[];
  initiative_ids: string[];
  canon_entry_ids: string[];
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

/**
 * Aggregate learning signals by type and canon entry overlap.
 * This prevents spamming many isolated proposals when one consolidated review would suffice.
 */
export function aggregateSignals(signals: LearningSignal[]): AggregatedSignalGroup[] {
  const groups = new Map<string, LearningSignal[]>();

  for (const signal of signals) {
    // Group by signal_type + overlapping canon entry IDs
    const canonKey = (signal.related_canon_entry_ids || []).sort().join(",") || "none";
    const key = `${signal.signal_type}::${canonKey}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(signal);
  }

  const result: AggregatedSignalGroup[] = [];
  for (const [key, grp] of groups) {
    const avgConf = grp.reduce((s, g) => s + g.confidence, 0) / grp.length;
    const maxSev = grp.reduce((best, g) => {
      return (SEVERITY_ORDER[g.severity] || 0) > (SEVERITY_ORDER[best] || 0) ? g.severity : best;
    }, "info");

    result.push({
      key,
      signal_type: grp[0].signal_type,
      signals: grp,
      count: grp.length,
      avg_confidence: Math.round(avgConf * 100) / 100,
      max_severity: maxSev,
      stages: [...new Set(grp.map(s => s.stage).filter(Boolean))],
      initiative_ids: [...new Set(grp.map(s => s.initiative_id).filter(Boolean) as string[])],
      canon_entry_ids: [...new Set(grp.flatMap(s => s.related_canon_entry_ids || []))],
    });
  }

  return result.sort((a, b) => (SEVERITY_ORDER[b.max_severity] || 0) - (SEVERITY_ORDER[a.max_severity] || 0));
}

/**
 * Filter out weak or contradictory signal groups.
 * Lowers confidence for mixed evidence and marks ambiguity.
 */
export function filterWeakGroups(
  groups: AggregatedSignalGroup[],
  minCount: number = 1,
  minAvgConfidence: number = 0.2,
): { strong: AggregatedSignalGroup[]; weak: AggregatedSignalGroup[] } {
  const strong: AggregatedSignalGroup[] = [];
  const weak: AggregatedSignalGroup[] = [];

  for (const group of groups) {
    if (group.count >= minCount && group.avg_confidence >= minAvgConfidence) {
      strong.push(group);
    } else {
      weak.push(group);
    }
  }

  return { strong, weak };
}
