/**
 * Degraded Window Detector — Sprint 119
 * Detects periods of degraded service from runtime events.
 */

export interface DegradedWindowInput {
  events: Array<{
    event_type: string;
    severity: string;
    occurred_at: string;
  }>;
  threshold_minutes: number;
}

export interface DegradedWindow {
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  severity: string;
  degradation_type: string;
  event_count: number;
}

export function detectDegradedWindows(input: DegradedWindowInput): DegradedWindow[] {
  const significantEvents = input.events
    .filter(e => e.severity === "high" || e.severity === "critical" || e.event_type === "degradation" || e.event_type === "incident")
    .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());

  if (significantEvents.length === 0) return [];

  const windows: DegradedWindow[] = [];
  let windowStart = significantEvents[0].occurred_at;
  let windowEvents = [significantEvents[0]];
  let maxSeverity = significantEvents[0].severity;

  for (let i = 1; i < significantEvents.length; i++) {
    const gap = (new Date(significantEvents[i].occurred_at).getTime() - new Date(significantEvents[i - 1].occurred_at).getTime()) / 60000;
    if (gap <= input.threshold_minutes) {
      windowEvents.push(significantEvents[i]);
      if (significantEvents[i].severity === "critical") maxSeverity = "critical";
    } else {
      const lastEvent = windowEvents[windowEvents.length - 1];
      const dur = Math.round((new Date(lastEvent.occurred_at).getTime() - new Date(windowStart).getTime()) / 60000);
      if (dur > 0 || windowEvents.length > 1) {
        windows.push({
          started_at: windowStart,
          ended_at: lastEvent.occurred_at,
          duration_minutes: Math.max(dur, 1),
          severity: maxSeverity,
          degradation_type: maxSeverity === "critical" ? "full" : "partial",
          event_count: windowEvents.length,
        });
      }
      windowStart = significantEvents[i].occurred_at;
      windowEvents = [significantEvents[i]];
      maxSeverity = significantEvents[i].severity;
    }
  }

  // Close last window
  const lastEvent = windowEvents[windowEvents.length - 1];
  const dur = Math.round((new Date(lastEvent.occurred_at).getTime() - new Date(windowStart).getTime()) / 60000);
  if (windowEvents.length > 1 || dur > 0) {
    windows.push({
      started_at: windowStart,
      ended_at: lastEvent.occurred_at,
      duration_minutes: Math.max(dur, 1),
      severity: maxSeverity,
      degradation_type: maxSeverity === "critical" ? "full" : "partial",
      event_count: windowEvents.length,
    });
  }

  return windows;
}
