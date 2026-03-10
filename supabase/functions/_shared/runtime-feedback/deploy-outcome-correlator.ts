/**
 * Deploy Outcome Correlator — Sprint 119
 * Correlates deploy events with runtime outcomes.
 */

export interface DeployCorrelationInput {
  deploy_id: string;
  deploy_status: string;
  deployed_at: string;
  runtime_events: Array<{
    event_type: string;
    severity: string;
    occurred_at: string;
  }>;
}

export interface DeployCorrelation {
  stability_score: number;
  first_error_minutes: number | null;
  error_count: number;
  incident_count: number;
  classification: string;
}

export function correlateDeployOutcome(input: DeployCorrelationInput): DeployCorrelation {
  const deployTime = new Date(input.deployed_at).getTime();
  const errors = input.runtime_events.filter(e => e.event_type === "error" || e.severity === "critical" || e.severity === "high");
  const incidents = input.runtime_events.filter(e => e.event_type === "incident");

  let firstErrorMinutes: number | null = null;
  if (errors.length > 0) {
    const firstError = errors.reduce((min, e) => {
      const t = new Date(e.occurred_at).getTime();
      return t < min ? t : min;
    }, Infinity);
    firstErrorMinutes = Math.round((firstError - deployTime) / 60000);
  }

  let stability = 100;
  stability -= errors.length * 10;
  stability -= incidents.length * 20;
  if (firstErrorMinutes !== null && firstErrorMinutes < 60) stability -= 20;
  stability = Math.max(0, Math.min(100, stability));

  const classification = stability >= 80 ? "stable" : stability >= 50 ? "degraded" : stability >= 20 ? "unstable" : "critical";

  return {
    stability_score: stability,
    first_error_minutes: firstErrorMinutes,
    error_count: errors.length,
    incident_count: incidents.length,
    classification,
  };
}
