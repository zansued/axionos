/**
 * Governance Review Workflow — State Machine
 * Sprint 162 — Formal lifecycle for system evolution proposals.
 *
 * This module is a pure-domain model with zero UI or DB dependencies.
 * Re-usable by: Decision Surface, Insights follow-ups, Handoff workflows, SLA tracking.
 */

// ── Lifecycle States ────────────────────────────────────────────────────────

export type WorkflowState =
  | "draft"
  | "pending_triage"
  | "in_triage"
  | "awaiting_evidence"
  | "evidence_ready"
  | "in_review"
  | "needs_revision"
  | "escalated_review"
  | "approved"
  | "rejected"
  | "deferred"
  | "superseded"
  | "closed";

export type StateCategory = "initial" | "triage" | "evidence" | "review" | "decision" | "terminal";

export interface StateDefinition {
  key: WorkflowState;
  label: string;
  description: string;
  category: StateCategory;
  isTerminal: boolean;
  isBlocking: boolean;
  requiresEvidence: boolean;
  requiresAssignee: boolean;
  requiresApprovalAuthority: boolean;
  order: number;
}

export const STATE_DEFINITIONS: Record<WorkflowState, StateDefinition> = {
  draft: {
    key: "draft",
    label: "Draft",
    description: "Proposal generated but not yet accepted into governance review.",
    category: "initial",
    isTerminal: false,
    isBlocking: false,
    requiresEvidence: false,
    requiresAssignee: false,
    requiresApprovalAuthority: false,
    order: 0,
  },
  pending_triage: {
    key: "pending_triage",
    label: "Pending Triage",
    description: "Awaiting initial classification and routing.",
    category: "triage",
    isTerminal: false,
    isBlocking: false,
    requiresEvidence: false,
    requiresAssignee: false,
    requiresApprovalAuthority: false,
    order: 1,
  },
  in_triage: {
    key: "in_triage",
    label: "In Triage",
    description: "Actively being classified by a governance operator.",
    category: "triage",
    isTerminal: false,
    isBlocking: false,
    requiresEvidence: false,
    requiresAssignee: true,
    requiresApprovalAuthority: false,
    order: 2,
  },
  awaiting_evidence: {
    key: "awaiting_evidence",
    label: "Awaiting Evidence",
    description: "Cannot proceed — evidence is incomplete, weak, or insufficient.",
    category: "evidence",
    isTerminal: false,
    isBlocking: true,
    requiresEvidence: false,
    requiresAssignee: false,
    requiresApprovalAuthority: false,
    order: 3,
  },
  evidence_ready: {
    key: "evidence_ready",
    label: "Evidence Ready",
    description: "Sufficient evidence to enter formal governance evaluation.",
    category: "evidence",
    isTerminal: false,
    isBlocking: false,
    requiresEvidence: true,
    requiresAssignee: false,
    requiresApprovalAuthority: false,
    order: 4,
  },
  in_review: {
    key: "in_review",
    label: "In Review",
    description: "Under active governance analysis by assigned reviewer.",
    category: "review",
    isTerminal: false,
    isBlocking: false,
    requiresEvidence: true,
    requiresAssignee: true,
    requiresApprovalAuthority: false,
    order: 5,
  },
  needs_revision: {
    key: "needs_revision",
    label: "Needs Revision",
    description: "Proposal is materially incomplete or poorly framed and must be revised.",
    category: "review",
    isTerminal: false,
    isBlocking: true,
    requiresEvidence: false,
    requiresAssignee: false,
    requiresApprovalAuthority: false,
    order: 6,
  },
  escalated_review: {
    key: "escalated_review",
    label: "Escalated Review",
    description: "Requires stronger governance handling due to high blast radius, cross-system impact, or policy sensitivity.",
    category: "review",
    isTerminal: false,
    isBlocking: false,
    requiresEvidence: true,
    requiresAssignee: true,
    requiresApprovalAuthority: true,
    order: 7,
  },
  approved: {
    key: "approved",
    label: "Approved",
    description: "Formally approved by required governance authority. May proceed to downstream handoff.",
    category: "decision",
    isTerminal: false,
    isBlocking: false,
    requiresEvidence: true,
    requiresAssignee: true,
    requiresApprovalAuthority: true,
    order: 8,
  },
  rejected: {
    key: "rejected",
    label: "Rejected",
    description: "Formally rejected. No downstream change allowed.",
    category: "decision",
    isTerminal: false,
    isBlocking: false,
    requiresEvidence: false,
    requiresAssignee: true,
    requiresApprovalAuthority: true,
    order: 9,
  },
  deferred: {
    key: "deferred",
    label: "Deferred",
    description: "Valid but postponed. May require future review window.",
    category: "decision",
    isTerminal: false,
    isBlocking: false,
    requiresEvidence: false,
    requiresAssignee: false,
    requiresApprovalAuthority: false,
    order: 10,
  },
  superseded: {
    key: "superseded",
    label: "Superseded",
    description: "No longer relevant — displaced by a newer or broader governance action.",
    category: "terminal",
    isTerminal: false,
    isBlocking: false,
    requiresEvidence: false,
    requiresAssignee: false,
    requiresApprovalAuthority: false,
    order: 11,
  },
  closed: {
    key: "closed",
    label: "Closed",
    description: "Terminal administrative closure. No more review activity expected.",
    category: "terminal",
    isTerminal: true,
    isBlocking: false,
    requiresEvidence: false,
    requiresAssignee: false,
    requiresApprovalAuthority: false,
    order: 12,
  },
};

// ── Governance Roles ────────────────────────────────────────────────────────

export type GovernanceRole =
  | "governance_operator"
  | "reviewer"
  | "senior_reviewer"
  | "policy_owner"
  | "canon_owner"
  | "readiness_owner"
  | "orchestrator_owner"
  | "executive_reviewer";

export const ROLE_LABELS: Record<GovernanceRole, string> = {
  governance_operator: "Governance Operator",
  reviewer: "Reviewer",
  senior_reviewer: "Senior Reviewer",
  policy_owner: "Policy Owner",
  canon_owner: "Canon Owner",
  readiness_owner: "Readiness Owner",
  orchestrator_owner: "Orchestrator Owner",
  executive_reviewer: "Executive Governance Reviewer",
};

// ── Approval Modes ──────────────────────────────────────────────────────────

export type ApprovalMode =
  | "single_reviewer"
  | "dual_approval"
  | "senior_approval"
  | "executive_escalation"
  | "evidence_threshold_gate"
  | "human_validation_required";

export const APPROVAL_MODE_LABELS: Record<ApprovalMode, string> = {
  single_reviewer: "Single Reviewer Approval",
  dual_approval: "Dual Approval Required",
  senior_approval: "Senior Approval Required",
  executive_escalation: "Executive Escalation Required",
  evidence_threshold_gate: "Evidence Threshold Gate",
  human_validation_required: "Human Validation Before Handoff",
};

// ── Transition Definitions ──────────────────────────────────────────────────

export interface TransitionRequiredField {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "number" | "date";
  required: boolean;
  options?: { value: string; label: string }[];
}

export interface TransitionDefinition {
  from: WorkflowState;
  to: WorkflowState;
  label: string;
  allowedRoles: GovernanceRole[];
  requiredFields: TransitionRequiredField[];
  sideEffects: string[];
  auditEventName: string;
}

export const TRANSITIONS: TransitionDefinition[] = [
  // Draft → Pending Triage
  {
    from: "draft",
    to: "pending_triage",
    label: "Submit to Triage",
    allowedRoles: ["governance_operator", "reviewer", "senior_reviewer"],
    requiredFields: [],
    sideEffects: ["append_governance_log"],
    auditEventName: "proposal_submitted_to_triage",
  },
  // Pending Triage → In Triage
  {
    from: "pending_triage",
    to: "in_triage",
    label: "Begin Triage",
    allowedRoles: ["governance_operator", "reviewer", "senior_reviewer"],
    requiredFields: [
      { name: "assignee", label: "Assigned Reviewer", type: "text", required: true },
    ],
    sideEffects: ["append_governance_log", "notify_assigned_reviewer"],
    auditEventName: "triage_started",
  },
  // In Triage → Awaiting Evidence
  {
    from: "in_triage",
    to: "awaiting_evidence",
    label: "Request Evidence",
    allowedRoles: ["governance_operator", "reviewer", "senior_reviewer"],
    requiredFields: [
      { name: "evidence_gap_reason", label: "Evidence Gap Reason", type: "textarea", required: true },
      { name: "missing_categories", label: "Missing Evidence Categories", type: "text", required: false },
    ],
    sideEffects: ["append_governance_log", "mark_evidence_review_required"],
    auditEventName: "evidence_requested",
  },
  // In Triage → Evidence Ready
  {
    from: "in_triage",
    to: "evidence_ready",
    label: "Evidence Sufficient",
    allowedRoles: ["governance_operator", "reviewer", "senior_reviewer"],
    requiredFields: [
      { name: "evidence_summary", label: "Evidence Summary", type: "textarea", required: true },
      { name: "evidence_completeness", label: "Evidence Completeness (%)", type: "number", required: true },
    ],
    sideEffects: ["append_governance_log"],
    auditEventName: "evidence_confirmed",
  },
  // Awaiting Evidence → Evidence Ready
  {
    from: "awaiting_evidence",
    to: "evidence_ready",
    label: "Evidence Provided",
    allowedRoles: ["governance_operator", "reviewer", "senior_reviewer"],
    requiredFields: [
      { name: "evidence_summary", label: "Evidence Summary", type: "textarea", required: true },
      { name: "evidence_completeness", label: "Evidence Completeness (%)", type: "number", required: true },
      { name: "signal_count", label: "Signal Count", type: "number", required: false },
    ],
    sideEffects: ["append_governance_log"],
    auditEventName: "evidence_provided",
  },
  // Evidence Ready → In Review
  {
    from: "evidence_ready",
    to: "in_review",
    label: "Start Review",
    allowedRoles: ["reviewer", "senior_reviewer", "policy_owner", "canon_owner", "readiness_owner", "orchestrator_owner"],
    requiredFields: [
      { name: "reviewer", label: "Assigned Reviewer", type: "text", required: true },
    ],
    sideEffects: ["append_governance_log", "notify_assigned_reviewer"],
    auditEventName: "review_started",
  },
  // In Review → Needs Revision
  {
    from: "in_review",
    to: "needs_revision",
    label: "Request Revision",
    allowedRoles: ["reviewer", "senior_reviewer", "policy_owner", "canon_owner", "readiness_owner", "orchestrator_owner"],
    requiredFields: [
      { name: "revision_reason", label: "Revision Reason", type: "textarea", required: true },
      { name: "requested_changes", label: "Requested Changes", type: "textarea", required: true },
      { name: "blocking_concerns", label: "Blocking Concerns", type: "textarea", required: false },
    ],
    sideEffects: ["append_governance_log"],
    auditEventName: "revision_requested",
  },
  // In Review → Escalated Review
  {
    from: "in_review",
    to: "escalated_review",
    label: "Escalate",
    allowedRoles: ["reviewer", "senior_reviewer", "governance_operator"],
    requiredFields: [
      { name: "escalation_reason", label: "Escalation Reason", type: "textarea", required: true },
      {
        name: "escalation_level",
        label: "Escalation Level",
        type: "select",
        required: true,
        options: [
          { value: "senior", label: "Senior Reviewer" },
          { value: "executive", label: "Executive Governance" },
          { value: "cross_domain", label: "Cross-Domain Review" },
        ],
      },
    ],
    sideEffects: ["append_governance_log", "notify_assigned_reviewer"],
    auditEventName: "proposal_escalated",
  },
  // In Review → Approved
  {
    from: "in_review",
    to: "approved",
    label: "Approve",
    allowedRoles: ["senior_reviewer", "policy_owner", "canon_owner", "readiness_owner", "orchestrator_owner", "executive_reviewer"],
    requiredFields: [
      { name: "decision_rationale", label: "Decision Rationale", type: "textarea", required: true },
      { name: "risk_acknowledgment", label: "Risk Acknowledgment", type: "textarea", required: true },
      { name: "monitoring_recommendation", label: "Monitoring Recommendation", type: "textarea", required: false },
      { name: "handoff_notes", label: "Rollout / Handoff Notes", type: "textarea", required: false },
    ],
    sideEffects: ["append_governance_log", "unlock_handoff_preview", "freeze_further_edits"],
    auditEventName: "proposal_approved",
  },
  // In Review → Rejected
  {
    from: "in_review",
    to: "rejected",
    label: "Reject",
    allowedRoles: ["reviewer", "senior_reviewer", "policy_owner", "canon_owner", "readiness_owner", "orchestrator_owner", "executive_reviewer"],
    requiredFields: [
      { name: "rejection_reason", label: "Rejection Reason", type: "textarea", required: true },
      { name: "final_rationale", label: "Final Rationale", type: "textarea", required: true },
    ],
    sideEffects: ["append_governance_log"],
    auditEventName: "proposal_rejected",
  },
  // In Review → Deferred
  {
    from: "in_review",
    to: "deferred",
    label: "Defer",
    allowedRoles: ["reviewer", "senior_reviewer", "policy_owner", "canon_owner", "readiness_owner", "orchestrator_owner"],
    requiredFields: [
      { name: "defer_reason", label: "Defer Reason", type: "textarea", required: true },
      { name: "review_date", label: "Re-review Target Date", type: "date", required: false },
      { name: "dependency_note", label: "Dependency Note", type: "textarea", required: false },
    ],
    sideEffects: ["append_governance_log"],
    auditEventName: "proposal_deferred",
  },
  // Needs Revision → Pending Triage
  {
    from: "needs_revision",
    to: "pending_triage",
    label: "Resubmit After Revision",
    allowedRoles: ["governance_operator", "reviewer"],
    requiredFields: [
      { name: "revision_summary", label: "Revision Summary", type: "textarea", required: true },
    ],
    sideEffects: ["append_governance_log"],
    auditEventName: "proposal_resubmitted",
  },
  // Escalated Review → Approved
  {
    from: "escalated_review",
    to: "approved",
    label: "Approve (Escalated)",
    allowedRoles: ["senior_reviewer", "executive_reviewer"],
    requiredFields: [
      { name: "decision_rationale", label: "Decision Rationale", type: "textarea", required: true },
      { name: "risk_acknowledgment", label: "Risk Acknowledgment", type: "textarea", required: true },
      { name: "monitoring_recommendation", label: "Monitoring Recommendation", type: "textarea", required: false },
    ],
    sideEffects: ["append_governance_log", "unlock_handoff_preview", "freeze_further_edits"],
    auditEventName: "proposal_approved_escalated",
  },
  // Escalated Review → Rejected
  {
    from: "escalated_review",
    to: "rejected",
    label: "Reject (Escalated)",
    allowedRoles: ["senior_reviewer", "executive_reviewer"],
    requiredFields: [
      { name: "rejection_reason", label: "Rejection Reason", type: "textarea", required: true },
      { name: "final_rationale", label: "Final Rationale", type: "textarea", required: true },
    ],
    sideEffects: ["append_governance_log"],
    auditEventName: "proposal_rejected_escalated",
  },
  // Escalated Review → Deferred
  {
    from: "escalated_review",
    to: "deferred",
    label: "Defer (Escalated)",
    allowedRoles: ["senior_reviewer", "executive_reviewer"],
    requiredFields: [
      { name: "defer_reason", label: "Defer Reason", type: "textarea", required: true },
      { name: "review_date", label: "Re-review Target Date", type: "date", required: false },
    ],
    sideEffects: ["append_governance_log"],
    auditEventName: "proposal_deferred_escalated",
  },
  // Approved → Closed
  {
    from: "approved",
    to: "closed",
    label: "Close (Handoff Complete)",
    allowedRoles: ["governance_operator", "senior_reviewer", "executive_reviewer"],
    requiredFields: [
      { name: "closure_reason", label: "Closure Reason", type: "textarea", required: true },
    ],
    sideEffects: ["append_governance_log"],
    auditEventName: "proposal_closed_after_approval",
  },
  // Rejected → Closed
  {
    from: "rejected",
    to: "closed",
    label: "Close (Rejected)",
    allowedRoles: ["governance_operator", "senior_reviewer"],
    requiredFields: [
      { name: "closure_reason", label: "Closure Reason", type: "textarea", required: true },
    ],
    sideEffects: ["append_governance_log"],
    auditEventName: "proposal_closed_after_rejection",
  },
  // Deferred → Pending Triage
  {
    from: "deferred",
    to: "pending_triage",
    label: "Reopen for Triage",
    allowedRoles: ["governance_operator", "reviewer", "senior_reviewer"],
    requiredFields: [
      { name: "reopen_reason", label: "Reopen Reason", type: "textarea", required: true },
    ],
    sideEffects: ["append_governance_log"],
    auditEventName: "proposal_reopened_from_deferral",
  },
  // Superseded → Closed
  {
    from: "superseded",
    to: "closed",
    label: "Close (Superseded)",
    allowedRoles: ["governance_operator"],
    requiredFields: [
      { name: "closure_reason", label: "Closure Reason", type: "textarea", required: true },
    ],
    sideEffects: ["append_governance_log"],
    auditEventName: "proposal_closed_after_supersession",
  },
];

// ── Query Functions ─────────────────────────────────────────────────────────

export function getStateDefinition(state: WorkflowState): StateDefinition {
  return STATE_DEFINITIONS[state];
}

export function getAvailableTransitions(currentState: WorkflowState): TransitionDefinition[] {
  return TRANSITIONS.filter((t) => t.from === currentState);
}

export function canTransition(from: WorkflowState, to: WorkflowState): boolean {
  return TRANSITIONS.some((t) => t.from === from && t.to === to);
}

export function getTransition(from: WorkflowState, to: WorkflowState): TransitionDefinition | null {
  return TRANSITIONS.find((t) => t.from === from && t.to === to) ?? null;
}

export function isTerminalState(state: WorkflowState): boolean {
  return STATE_DEFINITIONS[state].isTerminal;
}

export function isBlockingState(state: WorkflowState): boolean {
  return STATE_DEFINITIONS[state].isBlocking;
}

// ── Transition Validation ───────────────────────────────────────────────────

export interface BlockingCondition {
  code: string;
  label: string;
  detail: string;
}

export interface TransitionValidationResult {
  allowed: boolean;
  blockingConditions: BlockingCondition[];
}

export function validateTransition(
  from: WorkflowState,
  to: WorkflowState,
  context: {
    evidenceCompleteness: number;
    hasAssignee: boolean;
    approvalCount: number;
    requiredApprovalMode: ApprovalMode;
    actorRole: GovernanceRole;
  }
): TransitionValidationResult {
  const conditions: BlockingCondition[] = [];
  const transition = getTransition(from, to);

  if (!transition) {
    conditions.push({ code: "invalid_transition", label: "Invalid Transition", detail: `Transition from '${from}' to '${to}' is not allowed.` });
    return { allowed: false, blockingConditions: conditions };
  }

  // Role check
  if (!transition.allowedRoles.includes(context.actorRole)) {
    conditions.push({ code: "insufficient_role", label: "Insufficient Role", detail: `Role '${ROLE_LABELS[context.actorRole]}' cannot perform this transition.` });
  }

  // Target state requirements
  const targetDef = STATE_DEFINITIONS[to];

  if (targetDef.requiresEvidence && context.evidenceCompleteness < 0.5) {
    conditions.push({ code: "insufficient_evidence", label: "Insufficient Evidence", detail: `Evidence completeness is ${(context.evidenceCompleteness * 100).toFixed(0)}%. Minimum 50% required.` });
  }

  if (targetDef.requiresAssignee && !context.hasAssignee) {
    conditions.push({ code: "missing_assignee", label: "Missing Assignee", detail: "A reviewer must be assigned before this transition." });
  }

  // Approval mode enforcement for approval transitions
  if (to === "approved") {
    if (context.requiredApprovalMode === "dual_approval" && context.approvalCount < 2) {
      conditions.push({ code: "dual_approval_missing", label: "Dual Approval Required", detail: `Only ${context.approvalCount} of 2 required approvals recorded.` });
    }
    if (context.requiredApprovalMode === "senior_approval" && !["senior_reviewer", "executive_reviewer"].includes(context.actorRole)) {
      conditions.push({ code: "senior_approval_required", label: "Senior Approval Required", detail: "This proposal requires senior or executive reviewer approval." });
    }
    if (context.requiredApprovalMode === "executive_escalation" && context.actorRole !== "executive_reviewer") {
      conditions.push({ code: "executive_escalation_required", label: "Executive Escalation Required", detail: "This proposal requires executive governance reviewer approval." });
    }
    if (context.requiredApprovalMode === "evidence_threshold_gate" && context.evidenceCompleteness < 0.8) {
      conditions.push({ code: "evidence_threshold", label: "Evidence Threshold Not Met", detail: `Evidence completeness is ${(context.evidenceCompleteness * 100).toFixed(0)}%. Minimum 80% required for this approval mode.` });
    }
  }

  return { allowed: conditions.length === 0, blockingConditions: conditions };
}

// ── Audit Event ─────────────────────────────────────────────────────────────

export interface WorkflowAuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: GovernanceRole;
  fromState: WorkflowState;
  toState: WorkflowState;
  auditEvent: string;
  notes: string;
  metadata: Record<string, string>;
}

// ── Proposal Workflow Enrichment ────────────────────────────────────────────

export type ProposalSourceType = "canon_evolution" | "policy_tuning" | "agent_selection_tuning" | "readiness_tuning" | "knowledge_renewal";

export function getDefaultReviewerRoles(source: ProposalSourceType): GovernanceRole[] {
  const map: Record<ProposalSourceType, GovernanceRole[]> = {
    canon_evolution: ["canon_owner", "reviewer", "senior_reviewer"],
    policy_tuning: ["policy_owner", "senior_reviewer"],
    agent_selection_tuning: ["orchestrator_owner", "reviewer"],
    readiness_tuning: ["readiness_owner", "reviewer"],
    knowledge_renewal: ["canon_owner", "reviewer", "senior_reviewer"],
  };
  return map[source];
}

export function getDefaultApprovalMode(source: ProposalSourceType, riskLevel: string): ApprovalMode {
  if (riskLevel === "critical") return "executive_escalation";
  if (riskLevel === "high") return "dual_approval";
  if (source === "policy_tuning" && riskLevel === "medium") return "senior_approval";
  return "single_reviewer";
}

// ── State Category Progression (for timeline visualization) ─────────────────

export const STATE_PROGRESSION: { category: StateCategory; label: string; states: WorkflowState[] }[] = [
  { category: "initial", label: "Creation", states: ["draft"] },
  { category: "triage", label: "Triage", states: ["pending_triage", "in_triage"] },
  { category: "evidence", label: "Evidence", states: ["awaiting_evidence", "evidence_ready"] },
  { category: "review", label: "Review", states: ["in_review", "needs_revision", "escalated_review"] },
  { category: "decision", label: "Decision", states: ["approved", "rejected", "deferred"] },
  { category: "terminal", label: "Closure", states: ["superseded", "closed"] },
];
