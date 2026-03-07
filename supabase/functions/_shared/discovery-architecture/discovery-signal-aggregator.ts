/**
 * Discovery Signal Aggregator — Sprint 37
 * Aggregates discovery signals across product, tenant, platform, and advisory layers.
 * Pure functions. No DB access.
 */

export interface DiscoverySignal {
  id: string;
  signal_type: string;
  source_type: string;
  scope_ref: Record<string, any> | null;
  signal_payload: Record<string, any>;
  severity: string;
  confidence_score: number | null;
  evidence_refs: Record<string, any>[] | null;
  created_at: string;
}

export interface AggregatedDiscoverySignal {
  signal_type: string;
  source_types: string[];
  recurrence_count: number;
  max_severity: string;
  avg_confidence: number;
  trend_direction: "increasing" | "stable" | "decreasing";
  architectural_relevance_score: number;
  scope_clusters: string[];
  evidence_refs: Record<string, any>[];
  first_seen: string;
  last_seen: string;
}

const SEVERITY_ORDER: Record<string, number> = { low: 1, moderate: 2, high: 3, critical: 4 };
const ARCH_RELEVANT_SOURCES = new Set(["advisory", "platform_intelligence", "workflow", "tenant_behavior"]);

export function aggregateDiscoverySignals(signals: DiscoverySignal[]): AggregatedDiscoverySignal[] {
  if (!signals.length) return [];

  const grouped = new Map<string, DiscoverySignal[]>();
  for (const s of signals) {
    const key = s.signal_type;
    const group = grouped.get(key) || [];
    group.push(s);
    grouped.set(key, group);
  }

  const results: AggregatedDiscoverySignal[] = [];

  for (const [signalType, group] of grouped) {
    const sorted = group.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const sourceTypes = [...new Set(group.map(s => s.source_type))];
    const maxSeverity = group.reduce((max, s) => (SEVERITY_ORDER[s.severity] || 0) > (SEVERITY_ORDER[max] || 0) ? s.severity : max, "low");
    const confidences = group.filter(s => s.confidence_score !== null).map(s => s.confidence_score!);
    const avgConfidence = confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0.5;

    const scopeClusters = [...new Set(group.map(s => s.scope_ref ? JSON.stringify(s.scope_ref) : "global"))];
    const evidenceRefs = group.flatMap(s => s.evidence_refs || []).slice(0, 20);

    // Trend: compare first half vs second half recurrence
    const mid = Math.floor(group.length / 2);
    const firstHalf = group.slice(0, mid || 1).length;
    const secondHalf = group.slice(mid).length;
    const trend_direction = secondHalf > firstHalf * 1.2 ? "increasing" : secondHalf < firstHalf * 0.8 ? "decreasing" : "stable";

    // Architectural relevance: higher if from arch-relevant sources, recurrent, high severity
    const archSourceRatio = sourceTypes.filter(s => ARCH_RELEVANT_SOURCES.has(s)).length / Math.max(sourceTypes.length, 1);
    const recurrenceBoost = Math.min(group.length / 10, 1);
    const severityBoost = (SEVERITY_ORDER[maxSeverity] || 1) / 4;
    const architectural_relevance_score = Math.min(1, (archSourceRatio * 0.4 + recurrenceBoost * 0.3 + severityBoost * 0.2 + avgConfidence * 0.1));

    results.push({
      signal_type: signalType,
      source_types: sourceTypes,
      recurrence_count: group.length,
      max_severity: maxSeverity,
      avg_confidence: Math.round(avgConfidence * 100) / 100,
      trend_direction,
      architectural_relevance_score: Math.round(architectural_relevance_score * 100) / 100,
      scope_clusters: scopeClusters,
      evidence_refs: evidenceRefs,
      first_seen: sorted[0].created_at,
      last_seen: sorted[sorted.length - 1].created_at,
    });
  }

  return results.sort((a, b) => b.architectural_relevance_score - a.architectural_relevance_score);
}
