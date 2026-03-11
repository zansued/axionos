/**
 * Readiness Tuning Aggregation — Sprint 159
 * Groups learning signals relevant to readiness tuning into consolidated proposal candidates.
 */

import type { LearningSignal } from "../learning/learning-signal-types.ts";

export interface AggregatedReadinessSignalGroup {
  key: string;
  signal_type: string;
  signals: LearningSignal[];
  count: number;
  avg_confidence: number;
  max_severity: string;
  stages: string[];
  check_ids: string[];
  initiative_ids: string[];
  action_ids: string[];
  outcome_ids: string[];
  recovery_hook_ids: string[];
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 5, high: 4, medium: 3, low: 2, info: 1,
};

const READINESS_RELEVANT_SIGNAL_TYPES = new Set([
  "readiness_false_positive",
  "readiness_false_negative",
  "repeated_failure_pattern",
  "repeated_success_pattern",
  "recovery_success_pattern",
  "recovery_failure_pattern",
  "unstable_action_pattern",
  "policy_friction_signal",
]);

/**
 * Filter signals relevant to readiness tuning.
 */
export function filterReadinessRelevantSignals(signals: LearningSignal[]): LearningSignal[] {
  return signals.filter(s =>
    READINESS_RELEVANT_SIGNAL_TYPES.has(s.signal_type) ||
    s.routing_target === "readiness_tuning"
  );
}

/**
 * Aggregate signals by type + stage + check context.
 */
export function aggregateReadinessSignals(signals: LearningSignal[]): AggregatedReadinessSignalGroup[] {
  const groups = new Map<string, LearningSignal[]>();

  for (const signal of signals) {
    const stageKey = signal.stage || "unknown";
    const checkKey = (signal.metadata as Record<string, unknown>)?.readiness_check_id as string || "unknown_check";
    const key = `${signal.signal_type}::${stageKey}::${checkKey}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(signal);
  }

  const result: AggregatedReadinessSignalGroup[] = [];
  for (const [key, grp] of groups) {
    const avgConf = grp.reduce((s, g) => s + g.confidence, 0) / grp.length;
    const maxSev = grp.reduce((best, g) =>
      (SEVERITY_ORDER[g.severity] || 0) > (SEVERITY_ORDER[best] || 0) ? g.severity : best,
    "info");

    result.push({
      key,
      signal_type: grp[0].signal_type,
      signals: grp,
      count: grp.length,
      avg_confidence: Math.round(avgConf * 100) / 100,
      max_severity: maxSev,
      stages: [...new Set(grp.map(s => s.stage).filter(Boolean))],
      check_ids: [...new Set(grp.map(s => (s.metadata as Record<string, unknown>)?.readiness_check_id as string).filter(Boolean))],
      initiative_ids: [...new Set(grp.map(s => s.initiative_id).filter(Boolean) as string[])],
      action_ids: [...new Set(grp.map(s => s.related_action_id).filter(Boolean) as string[])],
      outcome_ids: [...new Set(grp.map(s => s.related_outcome_id).filter(Boolean) as string[])],
      recovery_hook_ids: [...new Set(grp.map(s => s.related_recovery_hook_id).filter(Boolean) as string[])],
    });
  }

  return result.sort((a, b) => (SEVERITY_ORDER[b.max_severity] || 0) - (SEVERITY_ORDER[a.max_severity] || 0));
}

/**
 * Filter out weak groups.
 */
export function filterWeakReadinessGroups(
  groups: AggregatedReadinessSignalGroup[],
  minCount = 1,
  minAvgConfidence = 0.2,
): { strong: AggregatedReadinessSignalGroup[]; weak: AggregatedReadinessSignalGroup[] } {
  const strong: AggregatedReadinessSignalGroup[] = [];
  const weak: AggregatedReadinessSignalGroup[] = [];
  for (const group of groups) {
    if (group.count >= minCount && group.avg_confidence >= minAvgConfidence) {
      strong.push(group);
    } else {
      weak.push(group);
    }
  }
  return { strong, weak };
}
