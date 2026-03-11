// Learning Signal Routing — AxionOS Sprint 155
// Determines routing targets for learning signals.
// Signals are classified but NOT auto-applied. They feed future governed evolution.

import type { LearningSignal, LearningSignalType, RoutingTarget } from "./learning-signal-types.ts";

// ── Default routing map ──

const SIGNAL_ROUTING: Record<LearningSignalType, RoutingTarget> = {
  high_value_pattern: "canon_evolution",
  low_value_pattern: "canon_evolution",
  likely_misapplied_pattern: "canon_evolution",
  likely_stale_pattern: "canon_evolution",
  ignored_but_effective_guidance: "canon_evolution",
  repeated_failure_pattern: "governance_review",
  repeated_success_pattern: "canon_evolution",
  recovery_success_pattern: "recovery_tuning",
  recovery_failure_pattern: "recovery_tuning",
  unstable_action_pattern: "governance_review",
  policy_friction_signal: "policy_tuning",
  readiness_false_positive: "readiness_tuning",
  readiness_false_negative: "readiness_tuning",
  agent_selection_success: "agent_selection_tuning",
  agent_selection_failure: "agent_selection_tuning",
};

/**
 * Resolves the routing target for a signal.
 * Preserves any explicitly set routing_target; otherwise uses the default map.
 */
export function resolveRoutingTarget(signal: LearningSignal): RoutingTarget {
  if (signal.routing_target) return signal.routing_target;
  return SIGNAL_ROUTING[signal.signal_type] || "governance_review";
}

/**
 * Enrich signals with resolved routing targets.
 */
export function routeSignals(signals: LearningSignal[]): LearningSignal[] {
  return signals.map((s) => ({
    ...s,
    routing_target: resolveRoutingTarget(s),
  }));
}

/**
 * Group signals by routing target for downstream inspection.
 */
export function groupByRoutingTarget(
  signals: LearningSignal[],
): Record<RoutingTarget, LearningSignal[]> {
  const groups: Record<string, LearningSignal[]> = {};
  for (const s of signals) {
    const target = resolveRoutingTarget(s);
    if (!groups[target]) groups[target] = [];
    groups[target].push(s);
  }
  return groups as Record<RoutingTarget, LearningSignal[]>;
}
