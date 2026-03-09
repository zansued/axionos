/**
 * Incident Continuity Router — Sprint 102
 * Links incidents to available continuity plans.
 */

export interface IncidentRecord {
  id: string;
  domain: string;
  disruption_type: string;
  severity: string;
  continuity_plan_id: string | null;
}

export interface PlanRecord {
  id: string;
  domain: string;
  disruption_type: string;
  plan_status: string;
}

export interface IncidentRoutingResult {
  incident_id: string;
  matched_plan: PlanRecord | null;
  coverage_status: "covered" | "partial" | "uncovered";
  alert: string | null;
}

export function routeIncidentToPlan(
  incident: IncidentRecord,
  plans: PlanRecord[]
): IncidentRoutingResult {
  if (incident.continuity_plan_id) {
    const linked = plans.find((p) => p.id === incident.continuity_plan_id);
    if (linked) {
      return { incident_id: incident.id, matched_plan: linked, coverage_status: "covered", alert: null };
    }
  }

  const exactMatch = plans.find(
    (p) => p.domain === incident.domain && p.disruption_type === incident.disruption_type && p.plan_status === "active"
  );
  if (exactMatch) {
    return { incident_id: incident.id, matched_plan: exactMatch, coverage_status: "covered", alert: null };
  }

  const domainMatch = plans.find(
    (p) => p.domain === incident.domain && p.plan_status === "active"
  );
  if (domainMatch) {
    return {
      incident_id: incident.id,
      matched_plan: domainMatch,
      coverage_status: "partial",
      alert: `No exact plan for disruption type "${incident.disruption_type}" — closest match is "${domainMatch.disruption_type}".`,
    };
  }

  return {
    incident_id: incident.id,
    matched_plan: null,
    coverage_status: "uncovered",
    alert: `No continuity plan covers domain "${incident.domain}" with disruption "${incident.disruption_type}". Maturity gap detected.`,
  };
}
