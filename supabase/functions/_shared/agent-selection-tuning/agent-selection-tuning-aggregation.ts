/**
 * Agent Selection Tuning Aggregation — Sprint 158
 * Groups learning signals relevant to agent selection tuning into consolidated proposal candidates.
 */

import type { LearningSignal } from "../learning/learning-signal-types.ts";

export interface AggregatedAgentSignalGroup {
  key: string;
  signal_type: string;
  signals: LearningSignal[];
  count: number;
  avg_confidence: number;
  max_severity: string;
  stages: string[];
  agent_ids: string[];
  initiative_ids: string[];
  action_ids: string[];
  outcome_ids: string[];
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 5, high: 4, medium: 3, low: 2, info: 1,
};

const AGENT_SELECTION_RELEVANT_SIGNAL_TYPES = new Set([
  "agent_selection_success",
  "agent_selection_failure",
  "repeated_success_pattern",
  "repeated_failure_pattern",
  "unstable_action_pattern",
  "recovery_success_pattern",
  "recovery_failure_pattern",
]);

/**
 * Filter signals relevant to agent selection tuning.
 */
export function filterAgentSelectionRelevantSignals(signals: LearningSignal[]): LearningSignal[] {
  return signals.filter(s =>
    AGENT_SELECTION_RELEVANT_SIGNAL_TYPES.has(s.signal_type) ||
    s.routing_target === "agent_selection_tuning"
  );
}

/**
 * Aggregate signals by type + agent + stage.
 */
export function aggregateAgentSelectionSignals(signals: LearningSignal[]): AggregatedAgentSignalGroup[] {
  const groups = new Map<string, LearningSignal[]>();

  for (const signal of signals) {
    const agentKey = signal.related_agent_id || "unknown_agent";
    const stageKey = signal.stage || "unknown";
    const key = `${signal.signal_type}::${agentKey}::${stageKey}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(signal);
  }

  const result: AggregatedAgentSignalGroup[] = [];
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
      agent_ids: [...new Set(grp.map(s => s.related_agent_id).filter(Boolean) as string[])],
      initiative_ids: [...new Set(grp.map(s => s.initiative_id).filter(Boolean) as string[])],
      action_ids: [...new Set(grp.map(s => s.related_action_id).filter(Boolean) as string[])],
      outcome_ids: [...new Set(grp.map(s => s.related_outcome_id).filter(Boolean) as string[])],
    });
  }

  return result.sort((a, b) => (SEVERITY_ORDER[b.max_severity] || 0) - (SEVERITY_ORDER[a.max_severity] || 0));
}

/**
 * Filter out weak groups.
 */
export function filterWeakAgentGroups(
  groups: AggregatedAgentSignalGroup[],
  minCount = 1,
  minAvgConfidence = 0.2,
): { strong: AggregatedAgentSignalGroup[]; weak: AggregatedAgentSignalGroup[] } {
  const strong: AggregatedAgentSignalGroup[] = [];
  const weak: AggregatedAgentSignalGroup[] = [];
  for (const group of groups) {
    if (group.count >= minCount && group.avg_confidence >= minAvgConfidence) {
      strong.push(group);
    } else {
      weak.push(group);
    }
  }
  return { strong, weak };
}
