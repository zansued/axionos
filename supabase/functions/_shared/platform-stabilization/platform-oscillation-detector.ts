// Platform Oscillation Detector — Sprint 34
// Detects repeated back-and-forth system motion.

export interface OscillationEvent {
  entity_id: string;
  entity_type: string;
  transition_from: string;
  transition_to: string;
  timestamp: string;
}

export interface OscillationSignal {
  oscillation_pattern: string;
  affected_entities: string[];
  oscillation_score: number;
  severity: "low" | "medium" | "high" | "critical";
  recommended_suppression_action: string;
}

/**
 * Detect oscillation patterns from a list of state transition events.
 * A reversal is when entity goes A→B then B→A within the window.
 */
export function detectOscillation(events: OscillationEvent[], windowMs: number = 7 * 24 * 3600 * 1000): OscillationSignal[] {
  if (!events || events.length < 2) return [];

  // Group by entity
  const byEntity = new Map<string, OscillationEvent[]>();
  for (const e of events) {
    const key = `${e.entity_type}:${e.entity_id}`;
    if (!byEntity.has(key)) byEntity.set(key, []);
    byEntity.get(key)!.push(e);
  }

  const signals: OscillationSignal[] = [];
  const patternGroups = new Map<string, { entities: Set<string>; reversals: number }>();

  for (const [key, entityEvents] of byEntity) {
    const sorted = entityEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const now = Date.now();
    const windowed = sorted.filter(e => now - new Date(e.timestamp).getTime() <= windowMs);

    let reversals = 0;
    for (let i = 2; i < windowed.length; i++) {
      if (windowed[i].transition_to === windowed[i - 2].transition_to &&
          windowed[i].transition_from === windowed[i - 1].transition_to) {
        reversals++;
      }
    }

    if (reversals > 0) {
      const entityType = entityEvents[0].entity_type;
      const pattern = `${entityType}_oscillation`;
      if (!patternGroups.has(pattern)) {
        patternGroups.set(pattern, { entities: new Set(), reversals: 0 });
      }
      const group = patternGroups.get(pattern)!;
      group.entities.add(key);
      group.reversals += reversals;
    }
  }

  for (const [pattern, group] of patternGroups) {
    const score = Math.min(1, group.reversals / (group.entities.size * 3));
    const severity: OscillationSignal["severity"] =
      score >= 0.8 ? "critical" :
      score >= 0.5 ? "high" :
      score >= 0.25 ? "medium" : "low";

    const suppressionMap: Record<string, string> = {
      policy_oscillation: "freeze_policy_transitions",
      strategy_oscillation: "freeze_strategy_transitions",
      calibration_oscillation: "widen_confidence_requirements",
      tenant_preference_oscillation: "pause_tenant_tuning",
      exposure_oscillation: "lock_exposure_caps",
    };

    signals.push({
      oscillation_pattern: pattern,
      affected_entities: Array.from(group.entities),
      oscillation_score: Math.round(score * 100) / 100,
      severity,
      recommended_suppression_action: suppressionMap[pattern] || "reduce_adaptation_frequency",
    });
  }

  return signals;
}
