/**
 * Rollback Linker — Sprint 119
 * Links rollback events to their triggering incidents and deployments.
 */

export interface RollbackLinkInput {
  deploy_id?: string;
  incident_id?: string;
  rollback_reason: string;
  rollback_type?: string;
  triggered_by?: string;
}

export interface RollbackRecord {
  deploy_id: string | null;
  linked_incident_id: string | null;
  rollback_reason: string;
  rollback_type: string;
  triggered_by: string;
  rolled_back_to: string;
  outcome_notes: string;
}

export function buildRollbackRecord(input: RollbackLinkInput): RollbackRecord {
  return {
    deploy_id: input.deploy_id || null,
    linked_incident_id: input.incident_id || null,
    rollback_reason: input.rollback_reason || "Unspecified",
    rollback_type: input.rollback_type || "manual",
    triggered_by: input.triggered_by || "system",
    rolled_back_to: "",
    outcome_notes: "",
  };
}
