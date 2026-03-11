/**
 * Policy Tuning Aggregation — Sprint 157
 * Groups learning signals relevant to policy tuning into consolidated proposal candidates.
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
  action_ids: string[];
  policy_decision_ids: string[];
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

// Signal types relevant to policy tuning
const POLICY_RELEVANT_SIGNAL_TYPES = new Set([
  "policy_friction_signal",
  "repeated_failure_pattern",
  "repeated_success_pattern",
  "unstable_action_pattern",
  "recovery_success_pattern",
  "recovery_failure_pattern",
  "readiness_false_positive",
  "readiness_false_negative",
  "agent_selection_failure",
  "agent_selection_success",
]);

/**
 * Filter signals to only those relevant to policy tuning.
 */
export function filterPolicyRelevantSignals(signals: LearningSignal[]): LearningSignal[] {
  return signals.filter(s =>
    POLICY_RELEVANT_SIGNAL_TYPES.has(s.signal_type) ||
    s.routing_target === "policy_tuning"
  );
}

/**
 * Aggregate policy-relevant signals by type and stage overlap.
 */
export function aggregatePolicySignals(signals: LearningSignal[]): AggregatedSignalGroup[] {
  const groups = new Map<string, LearningSignal[]>();

  for (const signal of signals) {
    const stageKey = signal.stage || "unknown";
    const key = `${signal.signal_type}::${stageKey}`;
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
      action_ids: [...new Set(grp.map(s => s.related_action_id).filter(Boolean) as string[])],
      policy_decision_ids: [...new Set(grp.map(s => s.related_policy_decision_id).filter(Boolean) as string[])],
    });
  }

  return result.sort((a, b) => (SEVERITY_ORDER[b.max_severity] || 0) - (SEVERITY_ORDER[a.max_severity] || 0));
}

/**
 * Filter out weak groups not meeting thresholds.
 */
export function filterWeakPolicyGroups(
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
