/**
 * anomaly-correlator.ts
 * Correlates multiple signals into a unified incident view.
 */

export interface CorrelationInput {
  alerts: Array<{ id: string; detection_category: string; severity: string; target_surface: string; created_at: string }>;
}

export interface CorrelatedIncident {
  incident_type: string;
  severity: string;
  target_surface: string;
  alert_ids: string[];
  anomaly_summary: string;
  correlation_confidence: number;
}

export function correlateAlerts(input: CorrelationInput): CorrelatedIncident[] {
  const groups = new globalThis.Map<string, typeof input.alerts>();
  for (const a of input.alerts) {
    const key = `${a.detection_category}::${a.target_surface}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }

  const incidents: CorrelatedIncident[] = [];
  for (const [key, alerts] of groups) {
    if (alerts.length < 1) continue;
    const [category, surface] = key.split("::");
    const maxSeverity = alerts.some(a => a.severity === "critical") ? "critical"
      : alerts.some(a => a.severity === "high") ? "high"
      : alerts.some(a => a.severity === "medium") ? "medium" : "low";

    incidents.push({
      incident_type: category,
      severity: maxSeverity,
      target_surface: surface,
      alert_ids: alerts.map(a => a.id),
      anomaly_summary: `${alerts.length} correlated alert(s) for ${category} on ${surface}.`,
      correlation_confidence: Math.min(1, 0.5 + alerts.length * 0.1),
    });
  }
  return incidents;
}
