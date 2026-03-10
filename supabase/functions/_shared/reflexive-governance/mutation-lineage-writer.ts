/**
 * Mutation Lineage Writer — Sprint 112
 * Records lineage events for mutation cases.
 */

export interface LineageEvent {
  organization_id: string;
  mutation_case_id: string;
  event_type: string;
  event_description: string;
  actor: string;
  snapshot: Record<string, unknown>;
}

export const MUTATION_LINEAGE_EVENTS = {
  CASE_CREATED: "case_created",
  BLAST_RADIUS_ANALYZED: "blast_radius_analyzed",
  COUPLING_ANALYZED: "coupling_analyzed",
  REVERSIBILITY_EVALUATED: "reversibility_evaluated",
  FORBIDDEN_CHECK_RUN: "forbidden_check_run",
  LEGITIMACY_SCORED: "legitimacy_scored",
  DRIFT_RISK_SCORED: "drift_risk_scored",
  STATUS_TRANSITIONED: "status_transitioned",
  APPROVED: "approved",
  REJECTED: "rejected",
  BLOCKED: "blocked",
  EXPLAINED: "explained",
} as const;

export function buildLineageEvent(
  organizationId: string,
  mutationCaseId: string,
  eventType: string,
  actor: string,
  description: string,
  snapshot: Record<string, unknown> = {}
): LineageEvent {
  return {
    organization_id: organizationId,
    mutation_case_id: mutationCaseId,
    event_type: eventType,
    event_description: description,
    actor,
    snapshot,
  };
}
