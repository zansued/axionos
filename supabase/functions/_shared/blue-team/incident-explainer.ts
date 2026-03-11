/**
 * incident-explainer.ts
 * Generates human-readable explanations for blue team incidents.
 */

export interface IncidentExplainerInput {
  incident_type: string;
  severity: string;
  target_surface: string;
  anomaly_summary: string;
  containment_applied: boolean;
  rollback_recommended: boolean;
  response_actions: Array<{ action_type: string; description: string }>;
}

export interface IncidentExplanation {
  summary: string;
  what_happened: string;
  what_was_done: string;
  current_posture: string;
  next_steps: string;
}

export function explainIncident(input: IncidentExplainerInput): IncidentExplanation {
  const actionsSummary = input.response_actions.length > 0
    ? input.response_actions.map(a => a.description).join("; ")
    : "No response actions taken yet.";

  const posture = input.containment_applied
    ? "Containment is active. Affected surface is isolated."
    : input.rollback_recommended
    ? "Rollback recommended but not yet executed."
    : "Monitoring active. No containment required.";

  return {
    summary: `${input.severity.toUpperCase()} ${input.incident_type} incident on ${input.target_surface}.`,
    what_happened: input.anomaly_summary || "Anomaly detected by blue team detection layer.",
    what_was_done: actionsSummary,
    current_posture: posture,
    next_steps: input.severity === "critical"
      ? "Immediate operator review required. Verify integrity and close incident."
      : "Monitor and review at next operational cycle.",
  };
}
