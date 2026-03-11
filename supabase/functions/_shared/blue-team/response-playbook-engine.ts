/**
 * response-playbook-engine.ts
 * Maps incident types to recommended response actions.
 */

export interface PlaybookInput {
  incident_type: string;
  severity: string;
  containment_applied: boolean;
}

export interface PlaybookAction {
  action_type: string;
  description: string;
  priority: string;
}

const PLAYBOOKS: Record<string, PlaybookAction[]> = {
  contract_anomaly: [
    { action_type: "increase_validation_intensity", description: "Increase validation depth for affected contracts.", priority: "normal" },
    { action_type: "recommend_human_review", description: "Flag for operator review.", priority: "normal" },
  ],
  tenant_scope_violation_attempt: [
    { action_type: "isolate_execution", description: "Isolate the requesting execution context.", priority: "high" },
    { action_type: "open_governance_review", description: "Open governance review for boundary policy.", priority: "high" },
  ],
  unsafe_runtime_action: [
    { action_type: "block_runtime_action", description: "Block the unsafe action immediately.", priority: "urgent" },
    { action_type: "recommend_human_review", description: "Escalate to operator.", priority: "high" },
  ],
  repeated_validation_escape: [
    { action_type: "increase_validation_intensity", description: "Add additional validation gates.", priority: "normal" },
    { action_type: "create_purple_followup", description: "Schedule purple team analysis.", priority: "normal" },
  ],
  insecure_artifact_signal: [
    { action_type: "recommend_human_review", description: "Review generated artifact for security concerns.", priority: "normal" },
  ],
  suspicious_retrieval_context: [
    { action_type: "isolate_execution", description: "Isolate retrieval pipeline for inspection.", priority: "high" },
    { action_type: "recommend_human_review", description: "Review retrieval context integrity.", priority: "normal" },
  ],
  observability_gap: [
    { action_type: "recommend_human_review", description: "Review observability coverage.", priority: "low" },
  ],
  degraded_recovery_posture: [
    { action_type: "trigger_rollback_advisory", description: "Issue rollback readiness advisory.", priority: "high" },
    { action_type: "open_governance_review", description: "Review recovery infrastructure.", priority: "high" },
  ],
};

export function getPlaybookActions(input: PlaybookInput): PlaybookAction[] {
  return PLAYBOOKS[input.incident_type] ?? [
    { action_type: "recommend_human_review", description: "No specific playbook found. Recommend human review.", priority: "normal" },
  ];
}
