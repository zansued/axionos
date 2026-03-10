/**
 * Runtime Incident Classifier — Sprint 119
 * Classifies runtime incidents by type and severity.
 */

export interface IncidentInput {
  event_type: string;
  severity: string;
  observed_behavior: string;
  affected_surface: string;
}

export interface IncidentClassification {
  incident_type: string;
  severity: string;
  urgency: string;
  requires_rollback: boolean;
  containment_suggestion: string;
}

export function classifyIncident(input: IncidentInput): IncidentClassification {
  const behavior = (input.observed_behavior || "").toLowerCase();
  
  let incidentType = "unknown";
  if (behavior.includes("crash") || behavior.includes("500")) incidentType = "crash";
  else if (behavior.includes("timeout") || behavior.includes("slow")) incidentType = "performance";
  else if (behavior.includes("data loss") || behavior.includes("corrupt")) incidentType = "data_integrity";
  else if (behavior.includes("auth") || behavior.includes("permission")) incidentType = "security";
  else if (behavior.includes("memory") || behavior.includes("oom")) incidentType = "resource";
  else incidentType = "error";

  const severity = input.severity === "critical" ? "critical" : input.severity === "high" ? "high" : input.severity === "medium" ? "medium" : "low";
  const urgency = severity === "critical" || incidentType === "data_integrity" ? "immediate" : severity === "high" ? "urgent" : "standard";
  const requiresRollback = severity === "critical" || incidentType === "data_integrity";

  const suggestions: Record<string, string> = {
    crash: "Investigate stack trace and recent deployments. Consider rollback if widespread.",
    performance: "Check resource utilization and recent changes. Scale if needed.",
    data_integrity: "Immediate investigation required. Halt writes if data corruption confirmed.",
    security: "Escalate to security review. Check auth configuration and access logs.",
    resource: "Monitor resource consumption. Scale or optimize as needed.",
    error: "Review error logs and recent changes.",
    unknown: "Investigate observed behavior and correlate with recent events.",
  };

  return {
    incident_type: incidentType,
    severity,
    urgency,
    requires_rollback: requiresRollback,
    containment_suggestion: suggestions[incidentType] || suggestions.unknown,
  };
}
