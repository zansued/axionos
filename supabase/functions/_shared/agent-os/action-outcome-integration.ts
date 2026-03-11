/**
 * Action Engine — Outcome Integration (Sprint 151 / AE-08)
 *
 * Closes the Action Engine loop by normalizing execution results
 * into canonical ActionOutcomes, updating ActionRecord lifecycle,
 * recording audit events, and emitting structured signals for
 * future learning/recovery.
 *
 * Chain position:
 *   Trigger → Intent → Resolution → Registry → Approval → Dispatch
 *   → Execution → **Outcome Integration** → Audit / Signals
 */

import type {
  ActionRecord,
  ActionStatus,
  ActionOutcome,
  ActionOutcomeStatus,
} from "./action-engine-types.ts";
import type { ActionAuditEntry } from "./action-registry.ts";
import { ActionRegistry } from "./action-registry.ts";
import { cryptoRandomId, nowIso } from "./utils.ts";

// ── Execution Result Input (from AgentOS / executors) ──

export interface ExecutionResultInput {
  /** Action id this result belongs to */
  action_id: string;
  /** Executor-side execution id */
  execution_id?: string;
  /** Executor type */
  executor_type: string;
  /** Agent id if applicable */
  agent_id?: string;
  /** Whether execution succeeded */
  success: boolean;
  /** Human-readable summary */
  summary: string;
  /** Detailed explanation */
  explanation?: string;
  /** Artifact ids produced */
  artifact_ids?: string[];
  /** Metrics collected */
  metrics?: Record<string, number>;
  /** Errors encountered */
  errors?: string[];
  /** System references */
  system_refs?: string[];
  /** ISO timestamp of completion */
  completed_at?: string;
}

// ── Outcome Integration Result ──

export type OutcomeIntegrationStatus =
  | "integrated"
  | "rejected_invalid_action"
  | "rejected_invalid_state"
  | "rejected_duplicate"
  | "rejected_expired"
  | "quarantined";

export interface OutcomeIntegrationResult {
  /** Whether integration succeeded */
  success: boolean;
  /** Integration status */
  status: OutcomeIntegrationStatus;
  /** Outcome id if created */
  outcome_id?: string;
  /** Action id */
  action_id: string;
  /** Previous action status */
  previous_status?: ActionStatus;
  /** New action status */
  new_status?: ActionStatus;
  /** Reason for rejection if applicable */
  rejection_reason?: string;
  /** Structured signal emitted */
  signal?: OutcomeSignal;
  /** Audit events generated */
  audit_events: OutcomeAuditEvent[];
  /** ISO timestamp */
  timestamp: string;
}

// ── Outcome Signal (for future learning/recovery) ──

export type OutcomeSignalType =
  | "action_succeeded"
  | "action_partially_succeeded"
  | "action_failed"
  | "action_escalated"
  | "action_rolled_back"
  | "action_blocked"
  | "action_skipped"
  | "approval_rejected"
  | "outcome_invalid";

export interface OutcomeSignal {
  signal_id: string;
  signal_type: OutcomeSignalType;
  action_id: string;
  trigger_type: string;
  stage?: string;
  initiative_id?: string;
  organization_id?: string;
  execution_mode: string;
  risk_level?: string;
  summary: string;
  metrics?: Record<string, number>;
  errors?: string[];
  timestamp: string;
}

// ── Outcome Audit Event ──

export interface OutcomeAuditEvent {
  event_id: string;
  action_id: string;
  event_type: string;
  previous_status: ActionStatus;
  new_status: ActionStatus;
  reason: string;
  actor_type: string;
  actor_id?: string;
  executor_type?: string;
  execution_id?: string;
  timestamp: string;
}

// ── Action Outcome Summary ──

export interface ActionOutcomeSummary {
  action_id: string;
  current_status: ActionStatus;
  outcome: ActionOutcome | null;
  outcome_count: number;
  last_outcome_at?: string;
  execution_summary: string;
  failure_reason?: string;
  escalation_reason?: string;
  rollback_summary?: string;
}

// ── Outcome-driven status transitions ──

const OUTCOME_STATUS_MAP: Record<ActionOutcomeStatus, ActionStatus> = {
  success: "completed",
  partial: "completed",
  failure: "failed",
  skipped: "cancelled",
};

const VALID_STATES_FOR_OUTCOME: ActionStatus[] = [
  "executing",
  "approved",
  "pending",
];

// ── Outcome Integration Manager ──

export class OutcomeIntegrationManager {
  private registry: ActionRegistry;
  private signals: OutcomeSignal[] = [];
  private auditLog: OutcomeAuditEvent[] = [];
  private processedOutcomes: Set<string> = new Set();

  constructor(registry: ActionRegistry) {
    this.registry = registry;
  }

  /**
   * Integrate an execution result into the Action lifecycle.
   * This is the primary entry point for outcome integration.
   */
  integrateResult(input: ExecutionResultInput): OutcomeIntegrationResult {
    const now = nowIso();
    const auditEvents: OutcomeAuditEvent[] = [];

    // 1. Validate action exists
    const action = this.registry.get(input.action_id);
    if (!action) {
      return this.rejectResult(input.action_id, "rejected_invalid_action",
        "Action not found in registry", auditEvents, now);
    }

    // 2. Check for duplicate outcome
    const dedupeKey = `${input.action_id}:${input.execution_id || "default"}`;
    if (this.processedOutcomes.has(dedupeKey)) {
      return this.rejectResult(input.action_id, "rejected_duplicate",
        "Duplicate outcome for this action/execution", auditEvents, now);
    }

    // 3. Validate action state accepts outcomes
    if (!VALID_STATES_FOR_OUTCOME.includes(action.status)) {
      // Special case: already completed/failed — quarantine
      if (action.status === "completed" || action.status === "failed" ||
          action.status === "rejected" || action.status === "cancelled") {
        return this.rejectResult(input.action_id, "rejected_invalid_state",
          `Action already in terminal state "${action.status}"`, auditEvents, now);
      }
      return this.rejectResult(input.action_id, "quarantined",
        `Action state "${action.status}" not valid for outcome integration`, auditEvents, now);
    }

    // 4. Normalize into ActionOutcome
    const outcomeStatus: ActionOutcomeStatus = input.success ? "success" : "failure";
    const outcome: ActionOutcome = {
      status: outcomeStatus,
      summary: input.summary,
      artifact_ids: input.artifact_ids,
      metrics: input.metrics,
      errors: input.errors,
      evaluated_at: input.completed_at || now,
    };

    // 5. Attach outcome to action via registry
    this.registry.setOutcome(input.action_id, outcome);

    // 6. Determine target status
    const previousStatus = action.status;
    const targetStatus = OUTCOME_STATUS_MAP[outcomeStatus];

    // 7. Transition action lifecycle
    const transitioned = this.registry.transition(
      input.action_id, targetStatus,
      `Outcome: ${outcomeStatus} — ${input.summary}`,
      input.executor_type,
    );

    // 8. Create audit event
    const auditEvent: OutcomeAuditEvent = {
      event_id: cryptoRandomId(),
      action_id: input.action_id,
      event_type: `execution_${outcomeStatus}`,
      previous_status: previousStatus,
      new_status: transitioned ? targetStatus : previousStatus,
      reason: input.summary,
      actor_type: input.executor_type,
      actor_id: input.agent_id,
      executor_type: input.executor_type,
      execution_id: input.execution_id,
      timestamp: now,
    };
    auditEvents.push(auditEvent);
    this.auditLog.push(auditEvent);

    // 9. Emit structured signal
    const signal = this.emitSignal(action, outcomeStatus, input, now);

    // 10. Mark as processed
    this.processedOutcomes.add(dedupeKey);

    return {
      success: true,
      status: "integrated",
      outcome_id: cryptoRandomId(),
      action_id: input.action_id,
      previous_status: previousStatus,
      new_status: transitioned ? targetStatus : previousStatus,
      signal,
      audit_events: auditEvents,
      timestamp: now,
    };
  }

  /**
   * Record an escalation outcome for an action.
   */
  escalate(actionId: string, reason: string, escalatedBy: string = "system"): OutcomeIntegrationResult {
    const now = nowIso();
    const auditEvents: OutcomeAuditEvent[] = [];
    const action = this.registry.get(actionId);

    if (!action) {
      return this.rejectResult(actionId, "rejected_invalid_action",
        "Action not found", auditEvents, now);
    }

    const previousStatus = action.status;
    const outcome: ActionOutcome = {
      status: "failure",
      summary: `Escalated: ${reason}`,
      errors: [reason],
      evaluated_at: now,
    };

    this.registry.setOutcome(actionId, outcome);
    this.registry.transition(actionId, "failed", `Escalated: ${reason}`, escalatedBy);

    const auditEvent: OutcomeAuditEvent = {
      event_id: cryptoRandomId(),
      action_id: actionId,
      event_type: "action_escalated",
      previous_status: previousStatus,
      new_status: "failed",
      reason,
      actor_type: escalatedBy,
      timestamp: now,
    };
    auditEvents.push(auditEvent);
    this.auditLog.push(auditEvent);

    const signal: OutcomeSignal = {
      signal_id: cryptoRandomId(),
      signal_type: "action_escalated",
      action_id: actionId,
      trigger_type: action.trigger_type,
      stage: action.stage,
      initiative_id: action.initiative_id,
      organization_id: action.organization_id,
      execution_mode: action.execution_mode,
      risk_level: action.risk_level,
      summary: reason,
      errors: [reason],
      timestamp: now,
    };
    this.signals.push(signal);

    return {
      success: true,
      status: "integrated",
      action_id: actionId,
      previous_status: previousStatus,
      new_status: "failed",
      signal,
      audit_events: auditEvents,
      timestamp: now,
    };
  }

  /**
   * Record a rollback outcome for an action.
   */
  rollback(actionId: string, summary: string, rolledBackBy: string = "system"): OutcomeIntegrationResult {
    const now = nowIso();
    const auditEvents: OutcomeAuditEvent[] = [];
    const action = this.registry.get(actionId);

    if (!action) {
      return this.rejectResult(actionId, "rejected_invalid_action",
        "Action not found", auditEvents, now);
    }

    const previousStatus = action.status;
    const outcome: ActionOutcome = {
      status: "failure",
      summary: `Rolled back: ${summary}`,
      evaluated_at: now,
    };

    this.registry.setOutcome(actionId, outcome);
    this.registry.transition(actionId, "failed", `Rolled back: ${summary}`, rolledBackBy);

    const auditEvent: OutcomeAuditEvent = {
      event_id: cryptoRandomId(),
      action_id: actionId,
      event_type: "rollback_completed",
      previous_status: previousStatus,
      new_status: "failed",
      reason: summary,
      actor_type: rolledBackBy,
      timestamp: now,
    };
    auditEvents.push(auditEvent);
    this.auditLog.push(auditEvent);

    const signal: OutcomeSignal = {
      signal_id: cryptoRandomId(),
      signal_type: "action_rolled_back",
      action_id: actionId,
      trigger_type: action.trigger_type,
      stage: action.stage,
      initiative_id: action.initiative_id,
      organization_id: action.organization_id,
      execution_mode: action.execution_mode,
      risk_level: action.risk_level,
      summary,
      timestamp: now,
    };
    this.signals.push(signal);

    return {
      success: true,
      status: "integrated",
      action_id: actionId,
      previous_status: previousStatus,
      new_status: "failed",
      signal,
      audit_events: auditEvents,
      timestamp: now,
    };
  }

  /**
   * Get a summary of the action's outcome state.
   */
  getOutcomeSummary(actionId: string): ActionOutcomeSummary | null {
    const action = this.registry.get(actionId);
    if (!action) return null;

    const signalsForAction = this.signals.filter(s => s.action_id === actionId);
    const escalationSignal = signalsForAction.find(s => s.signal_type === "action_escalated");
    const rollbackSignal = signalsForAction.find(s => s.signal_type === "action_rolled_back");

    return {
      action_id: actionId,
      current_status: action.status,
      outcome: action.outcome || null,
      outcome_count: signalsForAction.length,
      last_outcome_at: action.outcome?.evaluated_at,
      execution_summary: action.outcome?.summary || "No outcome recorded",
      failure_reason: action.outcome?.errors?.[0],
      escalation_reason: escalationSignal?.summary,
      rollback_summary: rollbackSignal?.summary,
    };
  }

  /** Get all emitted signals. */
  getSignals(): OutcomeSignal[] {
    return [...this.signals];
  }

  /** Get signals by type. */
  getSignalsByType(type: OutcomeSignalType): OutcomeSignal[] {
    return this.signals.filter(s => s.signal_type === type);
  }

  /** Get all outcome audit events. */
  getAuditLog(): OutcomeAuditEvent[] {
    return [...this.auditLog];
  }

  /** Get audit events for a specific action. */
  getAuditLogForAction(actionId: string): OutcomeAuditEvent[] {
    return this.auditLog.filter(e => e.action_id === actionId);
  }

  // ── Private helpers ──

  private rejectResult(
    actionId: string,
    status: OutcomeIntegrationStatus,
    reason: string,
    auditEvents: OutcomeAuditEvent[],
    now: string,
  ): OutcomeIntegrationResult {
    const auditEvent: OutcomeAuditEvent = {
      event_id: cryptoRandomId(),
      action_id: actionId,
      event_type: `outcome_${status}`,
      previous_status: "pending",
      new_status: "pending",
      reason,
      actor_type: "system",
      timestamp: now,
    };
    auditEvents.push(auditEvent);
    this.auditLog.push(auditEvent);

    if (status === "rejected_invalid_action" || status === "quarantined") {
      const signal: OutcomeSignal = {
        signal_id: cryptoRandomId(),
        signal_type: "outcome_invalid",
        action_id: actionId,
        trigger_type: "unknown",
        execution_mode: "unknown",
        summary: reason,
        timestamp: now,
      };
      this.signals.push(signal);
    }

    return {
      success: false,
      status,
      action_id: actionId,
      rejection_reason: reason,
      audit_events: auditEvents,
      timestamp: now,
    };
  }

  private emitSignal(
    action: ActionRecord,
    outcomeStatus: ActionOutcomeStatus,
    input: ExecutionResultInput,
    now: string,
  ): OutcomeSignal {
    const signalTypeMap: Record<ActionOutcomeStatus, OutcomeSignalType> = {
      success: "action_succeeded",
      partial: "action_partially_succeeded",
      failure: "action_failed",
      skipped: "action_skipped",
    };

    const signal: OutcomeSignal = {
      signal_id: cryptoRandomId(),
      signal_type: signalTypeMap[outcomeStatus],
      action_id: action.action_id,
      trigger_type: action.trigger_type,
      stage: action.stage,
      initiative_id: action.initiative_id,
      organization_id: action.organization_id,
      execution_mode: action.execution_mode,
      risk_level: action.risk_level,
      summary: input.summary,
      metrics: input.metrics,
      errors: input.errors,
      timestamp: now,
    };

    this.signals.push(signal);
    return signal;
  }
}
