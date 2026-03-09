/**
 * Drift Pattern Detector — Sprint 109
 * Identifies recurrent forms of operational and strategic drift.
 */

export interface DriftEvent {
  id: string;
  drift_type: string;
  severity: string;
  event_summary: string;
  created_at: string;
  resolved_at: string | null;
}

export interface DriftPattern {
  drift_type: string;
  occurrence_count: number;
  unresolved_count: number;
  max_severity: string;
  is_recurrent: boolean;
  pattern_summary: string;
}

const SEVERITY_ORDER: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };

export function detectPatterns(events: DriftEvent[]): DriftPattern[] {
  const byType: Record<string, DriftEvent[]> = {};
  for (const e of events) {
    if (!byType[e.drift_type]) byType[e.drift_type] = [];
    byType[e.drift_type].push(e);
  }

  return Object.entries(byType).map(([type, evts]) => {
    const unresolved = evts.filter(e => !e.resolved_at).length;
    const maxSev = evts.reduce((best, e) => (SEVERITY_ORDER[e.severity] || 0) > (SEVERITY_ORDER[best] || 0) ? e.severity : best, "low");
    const isRecurrent = evts.length >= 3;

    return {
      drift_type: type,
      occurrence_count: evts.length,
      unresolved_count: unresolved,
      max_severity: maxSev,
      is_recurrent: isRecurrent,
      pattern_summary: isRecurrent
        ? `Recurrent ${type} drift detected (${evts.length} occurrences, ${unresolved} unresolved). Indicates systemic pattern.`
        : `${type} drift observed ${evts.length} time(s). ${unresolved} unresolved.`,
    };
  });
}

export function computeDriftDensity(events: DriftEvent[], subjectCount: number): number {
  if (subjectCount === 0) return 0;
  const unresolvedHigh = events.filter(e => !e.resolved_at && (e.severity === "high" || e.severity === "critical")).length;
  return Math.round(Math.min(1, unresolvedHigh / Math.max(subjectCount, 1)) * 10000) / 10000;
}
