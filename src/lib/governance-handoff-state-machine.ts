/**
 * Governance Execution Handoff — State Machine & Domain Model
 * Sprint 162 — Formal handoff lifecycle for approved governance proposals.
 *
 * Pure domain model. No UI or DB dependencies.
 */

import type { WorkflowState, GovernanceRole, WorkflowAuditEntry } from "./governance-workflow-state-machine";

// ── Handoff Status ──────────────────────────────────────────────────────────

export type HandoffStatus =
  | "awaiting_preparation"
  | "in_preparation"
  | "awaiting_validation"
  | "ready_for_release"
  | "released"
  | "blocked"
  | "cancelled"
  | "acknowledged_downstream";

export interface HandoffStatusDefinition {
  key: HandoffStatus;
  label: string;
  description: string;
  isTerminal: boolean;
  isBlocking: boolean;
  order: number;
}

export const HANDOFF_STATUS_DEFINITIONS: Record<HandoffStatus, HandoffStatusDefinition> = {
  awaiting_preparation: {
    key: "awaiting_preparation",
    label: "Awaiting Preparation",
    description: "Approved proposal waiting for handoff package creation.",
    isTerminal: false,
    isBlocking: false,
    order: 0,
  },
  in_preparation: {
    key: "in_preparation",
    label: "In Preparation",
    description: "Handoff package is being assembled.",
    isTerminal: false,
    isBlocking: false,
    order: 1,
  },
  awaiting_validation: {
    key: "awaiting_validation",
    label: "Awaiting Validation",
    description: "Package prepared, pending validation checks.",
    isTerminal: false,
    isBlocking: false,
    order: 2,
  },
  ready_for_release: {
    key: "ready_for_release",
    label: "Ready for Release",
    description: "All validations passed. Package can be released.",
    isTerminal: false,
    isBlocking: false,
    order: 3,
  },
  released: {
    key: "released",
    label: "Released",
    description: "Package released to target downstream workflow.",
    isTerminal: false,
    isBlocking: false,
    order: 4,
  },
  blocked: {
    key: "blocked",
    label: "Blocked",
    description: "Release blocked due to missing prerequisites or governance hold.",
    isTerminal: false,
    isBlocking: true,
    order: 5,
  },
  cancelled: {
    key: "cancelled",
    label: "Cancelled",
    description: "Handoff cancelled. No downstream release.",
    isTerminal: true,
    isBlocking: false,
    order: 6,
  },
  acknowledged_downstream: {
    key: "acknowledged_downstream",
    label: "Acknowledged Downstream",
    description: "Target workflow has acknowledged receipt of the handoff package.",
    isTerminal: true,
    isBlocking: false,
    order: 7,
  },
};

// ── Handoff Transitions ─────────────────────────────────────────────────────

export interface HandoffTransition {
  from: HandoffStatus;
  to: HandoffStatus;
  label: string;
  requiresInput: boolean;
  inputFields: { name: string; label: string; type: "text" | "textarea"; required: boolean }[];
}

export const HANDOFF_TRANSITIONS: HandoffTransition[] = [
  {
    from: "awaiting_preparation",
    to: "in_preparation",
    label: "Begin Preparation",
    requiresInput: false,
    inputFields: [],
  },
  {
    from: "in_preparation",
    to: "awaiting_validation",
    label: "Submit for Validation",
    requiresInput: false,
    inputFields: [],
  },
  {
    from: "awaiting_validation",
    to: "ready_for_release",
    label: "Mark Ready for Release",
    requiresInput: false,
    inputFields: [],
  },
  {
    from: "ready_for_release",
    to: "released",
    label: "Release to Target Workflow",
    requiresInput: true,
    inputFields: [
      { name: "release_note", label: "Release Note", type: "textarea", required: true },
      { name: "scope_confirmation", label: "Scope & Constraints Acknowledged", type: "text", required: true },
    ],
  },
  {
    from: "released",
    to: "acknowledged_downstream",
    label: "Confirm Downstream Acknowledgment",
    requiresInput: true,
    inputFields: [
      { name: "acknowledgment_note", label: "Acknowledgment Note", type: "textarea", required: false },
    ],
  },
  // Blocking
  {
    from: "awaiting_validation",
    to: "blocked",
    label: "Block Handoff",
    requiresInput: true,
    inputFields: [
      { name: "blocking_reason", label: "Blocking Reason", type: "textarea", required: true },
      { name: "missing_prerequisite", label: "Missing Prerequisite", type: "text", required: false },
    ],
  },
  {
    from: "in_preparation",
    to: "blocked",
    label: "Block Handoff",
    requiresInput: true,
    inputFields: [
      { name: "blocking_reason", label: "Blocking Reason", type: "textarea", required: true },
    ],
  },
  {
    from: "blocked",
    to: "in_preparation",
    label: "Reopen Preparation",
    requiresInput: true,
    inputFields: [
      { name: "reopen_reason", label: "Reopen Reason", type: "textarea", required: true },
    ],
  },
  // Cancel from any non-terminal
  ...["awaiting_preparation", "in_preparation", "awaiting_validation", "ready_for_release", "blocked"].map(
    (from): HandoffTransition => ({
      from: from as HandoffStatus,
      to: "cancelled",
      label: "Cancel Handoff",
      requiresInput: true,
      inputFields: [
        { name: "cancellation_reason", label: "Cancellation Reason", type: "textarea", required: true },
      ],
    })
  ),
];

export function getAvailableHandoffTransitions(current: HandoffStatus): HandoffTransition[] {
  return HANDOFF_TRANSITIONS.filter((t) => t.from === current);
}

// ── Validation Checks ───────────────────────────────────────────────────────

export interface ValidationCheck {
  key: string;
  label: string;
  required: boolean;
  status: "pass" | "fail" | "pending";
  message: string;
}

export function computeValidationChecks(pkg: HandoffPackage): ValidationCheck[] {
  return [
    {
      key: "decision_present",
      label: "Approved decision present",
      required: true,
      status: pkg.sourceProposalId ? "pass" : "fail",
      message: pkg.sourceProposalId ? "Decision reference linked" : "No source decision linked",
    },
    {
      key: "rationale_recorded",
      label: "Governance rationale recorded",
      required: true,
      status: pkg.governanceRationale?.trim() ? "pass" : "fail",
      message: pkg.governanceRationale?.trim() ? "Rationale present" : "Rationale missing",
    },
    {
      key: "target_workflow",
      label: "Target workflow assigned",
      required: true,
      status: pkg.targetWorkflow ? "pass" : "fail",
      message: pkg.targetWorkflow || "No target workflow",
    },
    {
      key: "scope_defined",
      label: "Scope boundaries defined",
      required: true,
      status: pkg.scopeBoundaries?.trim() ? "pass" : "fail",
      message: pkg.scopeBoundaries?.trim() ? "Scope defined" : "Scope boundaries empty",
    },
    {
      key: "constraints_attached",
      label: "Constraints attached",
      required: true,
      status: pkg.constraints?.trim() ? "pass" : "fail",
      message: pkg.constraints?.trim() ? "Constraints present" : "No constraints specified",
    },
    {
      key: "monitoring_instructions",
      label: "Monitoring instructions present",
      required: true,
      status: pkg.monitoringRequirements?.trim() ? "pass" : "fail",
      message: pkg.monitoringRequirements?.trim() ? "Monitoring documented" : "No monitoring instructions",
    },
    {
      key: "rollback_expectations",
      label: "Rollback expectations documented",
      required: false,
      status: pkg.rollbackExpectations?.trim() ? "pass" : "pending",
      message: pkg.rollbackExpectations?.trim() ? "Rollback plan present" : "No rollback plan (optional)",
    },
    {
      key: "risk_acknowledgment",
      label: "Risk acknowledgment attached",
      required: true,
      status: pkg.riskNotes?.trim() ? "pass" : "fail",
      message: pkg.riskNotes?.trim() ? "Risk acknowledged" : "Risk notes missing",
    },
  ];
}

export function allRequiredValidationsPassed(checks: ValidationCheck[]): boolean {
  return checks.filter((c) => c.required).every((c) => c.status === "pass");
}

// ── Handoff Package ─────────────────────────────────────────────────────────

export interface HandoffPackage {
  handoffId: string;
  sourceProposalId: string;
  proposalType: string;
  proposalTitle: string;
  handoffStatus: HandoffStatus;
  targetWorkflow: string;
  targetSubsystem: string;
  targetOwner: string;
  changeSummary: string;
  changeIntent: string;
  scopeBoundaries: string;
  constraints: string;
  riskNotes: string;
  monitoringRequirements: string;
  validationRequirements: string;
  rollbackExpectations: string;
  releaseNotes: string;
  governanceRationale: string;
  approvedAt: string;
  approvalMode: string;
  approvers: string[];
  riskLevel: string;
  impactScope: string;
  attachedEvidenceRefs: string[];
  attachedGovernanceRefs: string[];
  auditHistory: HandoffAuditEntry[];
  releasedAt: string | null;
  releasedBy: string | null;
  downstreamReceipt: DownstreamReceipt | null;
  createdAt: string;
  updatedAt: string;
}

export interface HandoffAuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  eventType: string;
  fromStatus: HandoffStatus;
  toStatus: HandoffStatus;
  summary: string;
  notes: string;
}

export interface DownstreamReceipt {
  targetWorkflow: string;
  releaseTimestamp: string;
  releasePayloadSummary: string;
  expectedNextState: string;
  ownerFunction: string;
  handoffReferenceId: string;
}

// ── Target Workflow Mapping ─────────────────────────────────────────────────

export interface TargetWorkflowMapping {
  workflowName: string;
  subsystem: string;
  targetArea: string;
  downstreamActionType: string;
}

export const TARGET_WORKFLOW_MAP: Record<string, TargetWorkflowMapping> = {
  canon_evolution: {
    workflowName: "Canon Evolution Pipeline",
    subsystem: "Canon / Pattern Library",
    targetArea: "Canon entry structure and pattern governance",
    downstreamActionType: "Create draft canon update",
  },
  policy_tuning: {
    workflowName: "Policy Configuration Pipeline",
    subsystem: "Policy / Governance Engine",
    targetArea: "Policy rule configuration and enforcement parameters",
    downstreamActionType: "Prepare policy rule change",
  },
  agent_selection_tuning: {
    workflowName: "Agent Selection Tuning Pipeline",
    subsystem: "AgentOS Orchestrator",
    targetArea: "Agent routing and selection criteria",
    downstreamActionType: "Create agent routing tuning package",
  },
  readiness_tuning: {
    workflowName: "Readiness Rules Pipeline",
    subsystem: "Readiness Engine",
    targetArea: "Stage readiness thresholds and conditions",
    downstreamActionType: "Prepare readiness rule adjustment",
  },
};
