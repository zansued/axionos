/**
 * Action Domain State Machine — Sprint 169
 *
 * Formal lifecycle model for the Action domain.
 * Pure domain logic — zero UI or DB dependencies.
 *
 * Re-usable by: Action Center, Approval Queue, execution workers,
 * outcome integration, recovery hooks, edge functions.
 */

// ── Action States ──────────────────────────────────────────────────────────

export type ActionState =
  | "pending"
  | "queued"
  | "waiting_approval"
  | "approved"
  | "rejected"
  | "dispatched"
  | "executing"
  | "completed"
  | "failed"
  | "blocked"
  | "escalated"
  | "cancelled"
  | "rolled_back"
  | "expired";

export type StateCategory = "initial" | "approval" | "execution" | "terminal" | "recovery";

export interface ActionStateDefinition {
  key: ActionState;
  label: string;
  description: string;
  category: StateCategory;
  isTerminal: boolean;
  /** Whether the action is blocked awaiting human or system intervention */
  isBlocking: boolean;
  /** Whether recovery simulation is available from this state */
  recoveryEligible: boolean;
  order: number;
}

export const ACTION_STATES: Record<ActionState, ActionStateDefinition> = {
  pending: {
    key: "pending",
    label: "Pending",
    description: "Action formalized but not yet queued or routed.",
    category: "initial",
    isTerminal: false,
    isBlocking: false,
    recoveryEligible: false,
    order: 0,
  },
  queued: {
    key: "queued",
    label: "Queued",
    description: "Action accepted and queued for dispatch.",
    category: "initial",
    isTerminal: false,
    isBlocking: false,
    recoveryEligible: false,
    order: 1,
  },
  waiting_approval: {
    key: "waiting_approval",
    label: "Waiting Approval",
    description: "Action paused pending human approval gate.",
    category: "approval",
    isTerminal: false,
    isBlocking: true,
    recoveryEligible: false,
    order: 2,
  },
  approved: {
    key: "approved",
    label: "Approved",
    description: "Human approval granted; ready for dispatch.",
    category: "approval",
    isTerminal: false,
    isBlocking: false,
    recoveryEligible: false,
    order: 3,
  },
  rejected: {
    key: "rejected",
    label: "Rejected",
    description: "Human approval denied; action will not execute.",
    category: "terminal",
    isTerminal: true,
    isBlocking: false,
    recoveryEligible: false,
    order: 4,
  },
  dispatched: {
    key: "dispatched",
    label: "Dispatched",
    description: "Action dispatched to executor agent.",
    category: "execution",
    isTerminal: false,
    isBlocking: false,
    recoveryEligible: false,
    order: 5,
  },
  executing: {
    key: "executing",
    label: "Running",
    description: "Executor is actively processing this action.",
    category: "execution",
    isTerminal: false,
    isBlocking: false,
    recoveryEligible: false,
    order: 6,
  },
  completed: {
    key: "completed",
    label: "Completed",
    description: "Action executed successfully.",
    category: "terminal",
    isTerminal: true,
    isBlocking: false,
    recoveryEligible: false,
    order: 7,
  },
  failed: {
    key: "failed",
    label: "Failed",
    description: "Execution failed with errors.",
    category: "terminal",
    isTerminal: true,
    isBlocking: false,
    recoveryEligible: true,
    order: 8,
  },
  blocked: {
    key: "blocked",
    label: "Blocked",
    description: "Action blocked by policy or system constraint.",
    category: "recovery",
    isTerminal: false,
    isBlocking: true,
    recoveryEligible: true,
    order: 9,
  },
  escalated: {
    key: "escalated",
    label: "Escalated",
    description: "Action escalated for higher-level review.",
    category: "recovery",
    isTerminal: false,
    isBlocking: true,
    recoveryEligible: true,
    order: 10,
  },
  cancelled: {
    key: "cancelled",
    label: "Cancelled",
    description: "Action cancelled by operator or system.",
    category: "terminal",
    isTerminal: true,
    isBlocking: false,
    recoveryEligible: false,
    order: 11,
  },
  rolled_back: {
    key: "rolled_back",
    label: "Rolled Back",
    description: "Action was rolled back after execution.",
    category: "terminal",
    isTerminal: true,
    isBlocking: false,
    recoveryEligible: true,
    order: 12,
  },
  expired: {
    key: "expired",
    label: "Expired",
    description: "Approval window expired without decision.",
    category: "terminal",
    isTerminal: true,
    isBlocking: false,
    recoveryEligible: false,
    order: 13,
  },
};

// ── Allowed Roles ──────────────────────────────────────────────────────────

export type TransitionActor = "system" | "human" | "agent" | "scheduler";

// ── Transition Definition ──────────────────────────────────────────────────

export interface TransitionDefinition {
  from: ActionState;
  to: ActionState;
  label: string;
  /** Who can trigger this transition */
  allowedActors: TransitionActor[];
  /** Pre-conditions that must hold (described, not executable) */
  guards: string[];
  /** Side effects produced (audit events, status propagation, etc.) */
  sideEffects: string[];
  /** Audit event type emitted for this transition */
  auditEventType: string;
}

export const ACTION_TRANSITIONS: TransitionDefinition[] = [
  // ── Initial flow ──
  {
    from: "pending",
    to: "queued",
    label: "Enqueue",
    allowedActors: ["system", "agent"],
    guards: ["Policy resolution completed", "Execution mode determined"],
    sideEffects: ["Emit audit: action_queued"],
    auditEventType: "action_queued",
  },
  {
    from: "pending",
    to: "waiting_approval",
    label: "Request Approval",
    allowedActors: ["system"],
    guards: ["execution_mode == approval_required", "Approval request created"],
    sideEffects: ["Create action_approval_request", "Emit audit: approval_requested"],
    auditEventType: "approval_requested",
  },
  {
    from: "pending",
    to: "blocked",
    label: "Block",
    allowedActors: ["system"],
    guards: ["execution_mode == blocked", "Prevention rule matched"],
    sideEffects: ["Emit audit: action_blocked"],
    auditEventType: "action_blocked",
  },
  {
    from: "pending",
    to: "cancelled",
    label: "Cancel",
    allowedActors: ["human", "system"],
    guards: [],
    sideEffects: ["Emit audit: action_cancelled"],
    auditEventType: "action_cancelled",
  },

  // ── Approval flow ──
  {
    from: "waiting_approval",
    to: "approved",
    label: "Approve",
    allowedActors: ["human"],
    guards: ["Approval not expired", "Decider has operator+ role"],
    sideEffects: [
      "Update approval request status",
      "Record approved_by",
      "Emit audit: approval_approved",
    ],
    auditEventType: "approval_approved",
  },
  {
    from: "waiting_approval",
    to: "rejected",
    label: "Reject",
    allowedActors: ["human"],
    guards: ["Approval not expired", "Decider has operator+ role"],
    sideEffects: [
      "Update approval request status",
      "Emit audit: approval_rejected",
    ],
    auditEventType: "approval_rejected",
  },
  {
    from: "waiting_approval",
    to: "expired",
    label: "Expire",
    allowedActors: ["scheduler", "system"],
    guards: ["expires_at < now()"],
    sideEffects: [
      "Update approval request to expired",
      "Emit audit: approval_expired",
    ],
    auditEventType: "approval_expired",
  },
  {
    from: "waiting_approval",
    to: "cancelled",
    label: "Cancel",
    allowedActors: ["human", "system"],
    guards: [],
    sideEffects: ["Emit audit: action_cancelled"],
    auditEventType: "action_cancelled",
  },

  // ── Dispatch flow ──
  {
    from: "queued",
    to: "dispatched",
    label: "Dispatch",
    allowedActors: ["system", "agent"],
    guards: ["Dispatch decision created", "Agent selected"],
    sideEffects: ["Record dispatch_decision_id", "Emit audit: action_dispatched"],
    auditEventType: "action_dispatched",
  },
  {
    from: "approved",
    to: "dispatched",
    label: "Dispatch after approval",
    allowedActors: ["system", "agent"],
    guards: ["Dispatch decision created"],
    sideEffects: ["Emit audit: action_dispatched"],
    auditEventType: "action_dispatched",
  },
  {
    from: "approved",
    to: "queued",
    label: "Re-queue",
    allowedActors: ["system"],
    guards: [],
    sideEffects: ["Emit audit: action_requeued"],
    auditEventType: "action_requeued",
  },

  // ── Execution flow ──
  {
    from: "dispatched",
    to: "executing",
    label: "Start Execution",
    allowedActors: ["agent"],
    guards: ["Executor acknowledged"],
    sideEffects: ["Emit audit: execution_started"],
    auditEventType: "execution_started",
  },
  {
    from: "executing",
    to: "completed",
    label: "Complete",
    allowedActors: ["agent", "system"],
    guards: ["Outcome received", "outcome_status == success"],
    sideEffects: [
      "Record outcome_status, outcome_summary",
      "Set completed_at",
      "Emit audit: execution_completed",
    ],
    auditEventType: "execution_completed",
  },
  {
    from: "executing",
    to: "failed",
    label: "Fail",
    allowedActors: ["agent", "system"],
    guards: ["Outcome received", "outcome_status == failure"],
    sideEffects: [
      "Record outcome_status, outcome_errors",
      "Emit audit: execution_failed",
    ],
    auditEventType: "execution_failed",
  },
  {
    from: "executing",
    to: "escalated",
    label: "Escalate",
    allowedActors: ["agent", "system"],
    guards: ["Escalation threshold reached"],
    sideEffects: ["Emit audit: action_escalated"],
    auditEventType: "action_escalated",
  },

  // ── Recovery flow ──
  {
    from: "failed",
    to: "queued",
    label: "Retry",
    allowedActors: ["human", "system"],
    guards: ["Recovery simulation passed or human override"],
    sideEffects: ["Emit audit: action_retried"],
    auditEventType: "action_retried",
  },
  {
    from: "failed",
    to: "rolled_back",
    label: "Rollback",
    allowedActors: ["human", "system"],
    guards: ["rollback_available == true"],
    sideEffects: ["Execute rollback hook", "Emit audit: action_rolled_back"],
    auditEventType: "action_rolled_back",
  },
  {
    from: "failed",
    to: "cancelled",
    label: "Cancel after failure",
    allowedActors: ["human"],
    guards: [],
    sideEffects: ["Emit audit: action_cancelled"],
    auditEventType: "action_cancelled",
  },
  {
    from: "blocked",
    to: "queued",
    label: "Unblock",
    allowedActors: ["human", "system"],
    guards: ["Blocking condition resolved"],
    sideEffects: ["Emit audit: action_unblocked"],
    auditEventType: "action_unblocked",
  },
  {
    from: "blocked",
    to: "cancelled",
    label: "Cancel blocked",
    allowedActors: ["human"],
    guards: [],
    sideEffects: ["Emit audit: action_cancelled"],
    auditEventType: "action_cancelled",
  },
  {
    from: "escalated",
    to: "queued",
    label: "Resolve escalation",
    allowedActors: ["human"],
    guards: ["Escalation reviewed"],
    sideEffects: ["Emit audit: escalation_resolved"],
    auditEventType: "escalation_resolved",
  },
  {
    from: "escalated",
    to: "cancelled",
    label: "Cancel escalation",
    allowedActors: ["human"],
    guards: [],
    sideEffects: ["Emit audit: action_cancelled"],
    auditEventType: "action_cancelled",
  },
  {
    from: "completed",
    to: "rolled_back",
    label: "Post-completion rollback",
    allowedActors: ["human"],
    guards: ["rollback_available == true", "Operator confirms rollback"],
    sideEffects: ["Execute rollback hook", "Emit audit: action_rolled_back"],
    auditEventType: "action_rolled_back",
  },

  // ── Queue flow ──
  {
    from: "queued",
    to: "cancelled",
    label: "Cancel queued",
    allowedActors: ["human", "system"],
    guards: [],
    sideEffects: ["Emit audit: action_cancelled"],
    auditEventType: "action_cancelled",
  },
  {
    from: "dispatched",
    to: "failed",
    label: "Dispatch failure",
    allowedActors: ["system"],
    guards: ["Executor rejected or timed out"],
    sideEffects: ["Emit audit: dispatch_failed"],
    auditEventType: "dispatch_failed",
  },
];

// ── Query Helpers ──────────────────────────────────────────────────────────

/** Get all valid transitions FROM a given state */
export function getTransitionsFrom(state: ActionState): TransitionDefinition[] {
  return ACTION_TRANSITIONS.filter((t) => t.from === state);
}

/** Get all valid transitions TO a given state */
export function getTransitionsTo(state: ActionState): TransitionDefinition[] {
  return ACTION_TRANSITIONS.filter((t) => t.to === state);
}

/** Check if a specific transition is valid */
export function isValidTransition(from: ActionState, to: ActionState): boolean {
  return ACTION_TRANSITIONS.some((t) => t.from === from && t.to === to);
}

/** Get the transition definition for a specific from→to pair */
export function getTransition(from: ActionState, to: ActionState): TransitionDefinition | undefined {
  return ACTION_TRANSITIONS.find((t) => t.from === from && t.to === to);
}

/** Get all valid next states from a given state */
export function getNextStates(state: ActionState): ActionState[] {
  return getTransitionsFrom(state).map((t) => t.to);
}

/** Get transitions available to a specific actor type */
export function getTransitionsForActor(
  state: ActionState,
  actor: TransitionActor
): TransitionDefinition[] {
  return getTransitionsFrom(state).filter((t) => t.allowedActors.includes(actor));
}

/**
 * Validate a proposed transition, returning a result with
 * the transition definition or an error message.
 */
export interface TransitionValidationResult {
  valid: boolean;
  transition?: TransitionDefinition;
  error?: string;
}

export function validateTransition(
  from: ActionState,
  to: ActionState,
  actor: TransitionActor
): TransitionValidationResult {
  const transition = getTransition(from, to);

  if (!transition) {
    return {
      valid: false,
      error: `Invalid transition: ${from} → ${to} is not a recognized state change.`,
    };
  }

  if (!transition.allowedActors.includes(actor)) {
    return {
      valid: false,
      error: `Actor '${actor}' is not authorized for transition ${from} → ${to}. Allowed: ${transition.allowedActors.join(", ")}.`,
    };
  }

  return { valid: true, transition };
}

// ── Tab/Filter classification helpers (for UI surfaces) ────────────────────

export const STATE_CATEGORIES = {
  active: ["pending", "queued", "executing", "dispatched", "waiting_approval", "approved"] as ActionState[],
  blocked: ["blocked", "rejected", "escalated"] as ActionState[],
  failed: ["failed"] as ActionState[],
  completed: ["completed", "rolled_back"] as ActionState[],
  terminal: ["completed", "failed", "rejected", "cancelled", "rolled_back", "expired"] as ActionState[],
};

export function isActiveState(state: ActionState): boolean {
  return STATE_CATEGORIES.active.includes(state);
}

export function isTerminalState(state: ActionState): boolean {
  return ACTION_STATES[state]?.isTerminal ?? false;
}

export function isRecoveryEligible(state: ActionState): boolean {
  return ACTION_STATES[state]?.recoveryEligible ?? false;
}
