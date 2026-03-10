/**
 * Outcome Evidence Synthesizer — Sprint 119
 * Synthesizes runtime health from event aggregates.
 */

export interface HealthInput {
  total_events: number;
  error_count: number;
  incident_count: number;
  rollback_count: number;
  degraded_minutes: number;
  period_hours: number;
}

export interface HealthSynthesis {
  stability_score: number;
  health_classification: string;
  risk_signals: string[];
}

export function synthesizeHealth(input: HealthInput): HealthSynthesis {
  let score = 100;
  const signals: string[] = [];

  if (input.error_count > 0) { score -= Math.min(input.error_count * 5, 30); signals.push(`${input.error_count} errors`); }
  if (input.incident_count > 0) { score -= Math.min(input.incident_count * 15, 40); signals.push(`${input.incident_count} incidents`); }
  if (input.rollback_count > 0) { score -= input.rollback_count * 20; signals.push(`${input.rollback_count} rollbacks`); }
  if (input.degraded_minutes > 0) {
    const pct = (input.degraded_minutes / (input.period_hours * 60)) * 100;
    if (pct > 5) { score -= 20; signals.push(`${input.degraded_minutes}min degraded (${pct.toFixed(1)}%)`); }
    else if (pct > 1) { score -= 10; signals.push(`${input.degraded_minutes}min degraded`); }
  }

  score = Math.max(0, Math.min(100, score));
  const classification = score >= 90 ? "healthy" : score >= 70 ? "stable" : score >= 40 ? "degraded" : "critical";

  return { stability_score: score, health_classification: classification, risk_signals: signals };
}
