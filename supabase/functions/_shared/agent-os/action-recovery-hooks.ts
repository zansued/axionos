/**
 * Action Engine — Self-Healing Recovery Hooks (Sprint 152 / AE-09)
 *
 * Bounded, governed recovery layer that reacts to failed/degraded
 * outcomes by proposing structured recovery actions routed back
 * through the Action Engine chain.
 *
 * Flow: ActionOutcome (failed/degraded) → RecoveryHook → Policy gate
 *       → new ActionIntent or blocked/escalated
 *
 * Invariant: No uncontrolled autonomous recovery. All recovery is
 * bounded by retry limits, cooldowns, policy, and approval gates.
 */

import type {
  ActionRecord,
  ActionOutcome,
  ActionOutcomeStatus,
  ActionTriggerType,
  ActionExecutionMode,
} from "./action-engine-types.ts";
import type { OutcomeSignal } from "./action-outcome-integration.ts";
import { cryptoRandomId, nowIso } from "./utils.ts";

// ── Recovery Types ──

export type RecoveryType =
  | "retry_action"
  | "rollback_action"
  | "freeze_execution"
  | "open_investigation"
  | "escalate_to_human"
  | "revalidate_readiness"
  | "refresh_canon_context"
  | "request_manual_repair";

export type RecoveryHookStatus =
  | "recovery_proposed"
  | "recovery_blocked"
  | "recovery_requires_approval"
  | "recovery_formalized"
  | "recovery_executed"
  | "recovery_rejected"
  | "recovery_expired";

// ── Recovery Hook ──

export interface RecoveryHook {
  recovery_hook_id: string;
  action_id: string;
  related_outcome_id?: string;
  related_trigger_id?: string;
  recovery_type: RecoveryType;
  reason: string;
  severity: string;
  recommended_execution_mode: ActionExecutionMode;
  auto_eligible: boolean;
  requires_approval: boolean;
  constraints: string[];
  status: RecoveryHookStatus;
  retry_count: number;
  max_retries: number;
  cooldown_until?: string;
  created_at: string;
  updated_at: string;
}

// ── Recovery Signal (for future learning) ──

export type RecoverySignalType =
  | "recovery_succeeded"
  | "recovery_failed"
  | "recovery_blocked"
  | "retry_suppressed"
  | "rollback_recommended"
  | "escalation_required"
  | "unstable_action_pattern"
  | "repeated_failure_pattern";

export interface RecoverySignal {
  signal_id: string;
  signal_type: RecoverySignalType;
  action_id: string;
  recovery_hook_id: string;
  recovery_type: RecoveryType;
  severity: string;
  summary: string;
  retry_count: number;
  timestamp: string;
}

// ── Recovery Audit Event ──

export interface RecoveryAuditEvent {
  event_id: string;
  action_id: string;
  recovery_hook_id: string;
  event_type: string;
  recovery_type: RecoveryType;
  reason: string;
  previous_status: RecoveryHookStatus;
  new_status: RecoveryHookStatus;
  timestamp: string;
}

// ── Recovery Evaluation Result ──

export interface RecoveryEvaluationResult {
  hooks: RecoveryHook[];
  signals: RecoverySignal[];
  audit_events: RecoveryAuditEvent[];
  summary: string;
}

// ── Safeguard Config ──

export interface RecoverySafeguardConfig {
  max_retries: number;
  cooldown_ms: number;
  escalation_threshold: number;
  allow_auto_rollback: boolean;
  allow_auto_retry_low_risk: boolean;
}

const DEFAULT_SAFEGUARDS: RecoverySafeguardConfig = {
  max_retries: 3,
  cooldown_ms: 60_000,
  escalation_threshold: 2,
  allow_auto_rollback: false,
  allow_auto_retry_low_risk: true,
};

// ── Recovery condition → type mapping ──

interface RecoveryRule {
  condition: (action: ActionRecord, outcome: ActionOutcome, retryCount: number) => boolean;
  recovery_type: RecoveryType;
  severity: string;
  auto_eligible: (action: ActionRecord, safeguards: RecoverySafeguardConfig) => boolean;
  requires_approval: (action: ActionRecord) => boolean;
}

const RECOVERY_RULES: RecoveryRule[] = [
  // 1. Low-risk bounded failure → retry
  {
    condition: (a, o, retries) =>
      o.status === "failure" && (a.risk_level === "low" || a.risk_level === "medium") && retries < 3,
    recovery_type: "retry_action",
    severity: "medium",
    auto_eligible: (a, s) => s.allow_auto_retry_low_risk && a.risk_level === "low",
    requires_approval: () => false,
  },
  // 2. High-risk failure → escalate
  {
    condition: (a, o) =>
      o.status === "failure" && (a.risk_level === "high" || a.risk_level === "critical"),
    recovery_type: "escalate_to_human",
    severity: "high",
    auto_eligible: () => false,
    requires_approval: () => true,
  },
  // 3. Deploy failure → rollback
  {
    condition: (a, o) =>
      o.status === "failure" && a.trigger_type === "deploy_failed",
    recovery_type: "rollback_action",
    severity: "high",
    auto_eligible: (_a, s) => s.allow_auto_rollback,
    requires_approval: (a) => a.risk_level !== "low",
  },
  // 4. Runtime degraded → freeze
  {
    condition: (a, o) =>
      o.status === "failure" && a.trigger_type === "runtime_degraded",
    recovery_type: "freeze_execution",
    severity: "critical",
    auto_eligible: () => false,
    requires_approval: () => true,
  },
  // 5. Repeated retries exceeded → escalate
  {
    condition: (_a, _o, retries) => retries >= 2,
    recovery_type: "escalate_to_human",
    severity: "high",
    auto_eligible: () => false,
    requires_approval: () => true,
  },
  // 6. Partial outcome → investigation
  {
    condition: (_a, o) => o.status === "partial",
    recovery_type: "open_investigation",
    severity: "medium",
    auto_eligible: () => false,
    requires_approval: () => false,
  },
];

// ── Recovery Manager ──

export class RecoveryHookManager {
  private hooks: Map<string, RecoveryHook> = new Map();
  private retryCounts: Map<string, number> = new Map();
  private signals: RecoverySignal[] = [];
  private auditLog: RecoveryAuditEvent[] = [];
  private safeguards: RecoverySafeguardConfig;

  constructor(safeguards?: Partial<RecoverySafeguardConfig>) {
    this.safeguards = { ...DEFAULT_SAFEGUARDS, ...safeguards };
  }

  /**
   * Evaluate an action outcome and generate recovery hooks if applicable.
   */
  evaluateOutcome(
    action: ActionRecord,
    outcome: ActionOutcome,
    outcomeId?: string,
  ): RecoveryEvaluationResult {
    const now = nowIso();
    const hooks: RecoveryHook[] = [];
    const signals: RecoverySignal[] = [];
    const auditEvents: RecoveryAuditEvent[] = [];

    // Don't recover successful or skipped outcomes
    if (outcome.status === "success" || outcome.status === "skipped") {
      return { hooks, signals, audit_events: auditEvents, summary: "No recovery needed" };
    }

    // Don't recover blocked/rejected/cancelled actions
    if (action.status === "rejected" || action.status === "cancelled") {
      return { hooks, signals, audit_events: auditEvents, summary: "Action in terminal governed state" };
    }

    const retryCount = this.retryCounts.get(action.action_id) || 0;

    // Check cooldown
    const existingHook = this.getLatestHookForAction(action.action_id);
    if (existingHook?.cooldown_until && new Date(existingHook.cooldown_until) > new Date()) {
      const signal = this.emitSignal("retry_suppressed", action.action_id,
        existingHook.recovery_hook_id, existingHook.recovery_type,
        existingHook.severity, "Cooldown active", retryCount, now);
      signals.push(signal);
      return { hooks, signals, audit_events: auditEvents, summary: "Recovery suppressed (cooldown)" };
    }

    // Check max retries globally
    if (retryCount >= this.safeguards.max_retries) {
      const hook = this.createHook(action, "escalate_to_human", "critical",
        `Max retries (${this.safeguards.max_retries}) exceeded`,
        false, true, outcomeId, retryCount, now);
      hook.status = "recovery_requires_approval";
      hooks.push(hook);

      const signal = this.emitSignal("repeated_failure_pattern", action.action_id,
        hook.recovery_hook_id, hook.recovery_type, hook.severity,
        `Repeated failure: ${retryCount} retries`, retryCount, now);
      signals.push(signal);

      auditEvents.push(this.auditEvent(hook, "recovery_proposed", "recovery_requires_approval",
        "Max retries exceeded — escalating", now));
      return { hooks, signals, audit_events: auditEvents, summary: "Escalated after max retries" };
    }

    // Evaluate rules (first match wins, but some rules produce multiple hooks)
    for (const rule of RECOVERY_RULES) {
      if (rule.condition(action, outcome, retryCount)) {
        const autoEligible = rule.auto_eligible(action, this.safeguards);
        const needsApproval = rule.requires_approval(action);

        const hook = this.createHook(action, rule.recovery_type, rule.severity,
          `${outcome.status}: ${outcome.summary}`,
          autoEligible && !needsApproval, needsApproval, outcomeId, retryCount, now);

        // Determine status
        if (needsApproval) {
          hook.status = "recovery_requires_approval";
        } else if (autoEligible) {
          hook.status = "recovery_formalized";
        } else {
          hook.status = "recovery_proposed";
        }

        hooks.push(hook);

        const signalType: RecoverySignalType = needsApproval
          ? "escalation_required"
          : autoEligible ? "recovery_succeeded" : "rollback_recommended";
        const signal = this.emitSignal(signalType, action.action_id,
          hook.recovery_hook_id, hook.recovery_type, hook.severity,
          hook.reason, retryCount, now);
        signals.push(signal);

        auditEvents.push(this.auditEvent(hook, "recovery_proposed", hook.status,
          `Rule matched: ${rule.recovery_type}`, now));

        // Only first matching rule produces a hook (strictest-first)
        break;
      }
    }

    if (hooks.length === 0) {
      return { hooks, signals, audit_events: auditEvents, summary: "No recovery rules matched" };
    }

    return {
      hooks,
      signals,
      audit_events: auditEvents,
      summary: `${hooks.length} recovery hook(s) proposed`,
    };
  }

  /**
   * Mark a recovery hook as executed and increment retry count.
   */
  markExecuted(recoveryHookId: string): boolean {
    const hook = this.hooks.get(recoveryHookId);
    if (!hook) return false;
    if (hook.status === "recovery_blocked" || hook.status === "recovery_rejected") return false;

    const now = nowIso();
    const prevStatus = hook.status;
    hook.status = "recovery_executed";
    hook.updated_at = now;

    // Increment retry count for action
    const currentRetries = this.retryCounts.get(hook.action_id) || 0;
    this.retryCounts.set(hook.action_id, currentRetries + 1);

    // Set cooldown
    hook.cooldown_until = new Date(Date.now() + this.safeguards.cooldown_ms).toISOString();

    this.auditLog.push(this.auditEvent(hook, prevStatus, "recovery_executed", "Recovery executed", now));
    return true;
  }

  /**
   * Block a recovery hook (e.g. by policy).
   */
  block(recoveryHookId: string, reason: string): boolean {
    const hook = this.hooks.get(recoveryHookId);
    if (!hook) return false;

    const now = nowIso();
    const prevStatus = hook.status;
    hook.status = "recovery_blocked";
    hook.updated_at = now;

    this.auditLog.push(this.auditEvent(hook, prevStatus, "recovery_blocked", reason, now));
    this.signals.push(this.emitSignal("recovery_blocked", hook.action_id,
      hook.recovery_hook_id, hook.recovery_type, hook.severity, reason,
      hook.retry_count, now));
    return true;
  }

  /**
   * Reject a recovery hook.
   */
  reject(recoveryHookId: string, reason: string): boolean {
    const hook = this.hooks.get(recoveryHookId);
    if (!hook) return false;

    const now = nowIso();
    const prevStatus = hook.status;
    hook.status = "recovery_rejected";
    hook.updated_at = now;

    this.auditLog.push(this.auditEvent(hook, prevStatus, "recovery_rejected", reason, now));
    return true;
  }

  /** Get recovery hooks for an action. */
  getHooksForAction(actionId: string): RecoveryHook[] {
    return Array.from(this.hooks.values())
      .filter(h => h.action_id === actionId)
      .map(h => ({ ...h }));
  }

  /** Get retry count for an action. */
  getRetryCount(actionId: string): number {
    return this.retryCounts.get(actionId) || 0;
  }

  /** Get all signals. */
  getSignals(): RecoverySignal[] { return [...this.signals]; }

  /** Get all audit events. */
  getAuditLog(): RecoveryAuditEvent[] { return [...this.auditLog]; }

  // ── Private ──

  private getLatestHookForAction(actionId: string): RecoveryHook | undefined {
    const hooks = Array.from(this.hooks.values())
      .filter(h => h.action_id === actionId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return hooks[0];
  }

  private createHook(
    action: ActionRecord, recoveryType: RecoveryType, severity: string,
    reason: string, autoEligible: boolean, requiresApproval: boolean,
    outcomeId: string | undefined, retryCount: number, now: string,
  ): RecoveryHook {
    const hook: RecoveryHook = {
      recovery_hook_id: cryptoRandomId(),
      action_id: action.action_id,
      related_outcome_id: outcomeId,
      related_trigger_id: action.trigger_id,
      recovery_type: recoveryType,
      reason,
      severity,
      recommended_execution_mode: requiresApproval ? "approval_required" : autoEligible ? "auto" : "manual_only",
      auto_eligible: autoEligible,
      requires_approval: requiresApproval,
      constraints: action.constraints.map(c => c.description),
      status: "recovery_proposed",
      retry_count: retryCount,
      max_retries: this.safeguards.max_retries,
      created_at: now,
      updated_at: now,
    };
    this.hooks.set(hook.recovery_hook_id, hook);
    return hook;
  }

  private emitSignal(
    type: RecoverySignalType, actionId: string, hookId: string,
    recoveryType: RecoveryType, severity: string, summary: string,
    retryCount: number, now: string,
  ): RecoverySignal {
    const signal: RecoverySignal = {
      signal_id: cryptoRandomId(),
      signal_type: type,
      action_id: actionId,
      recovery_hook_id: hookId,
      recovery_type: recoveryType,
      severity,
      summary,
      retry_count: retryCount,
      timestamp: now,
    };
    this.signals.push(signal);
    return signal;
  }

  private auditEvent(
    hook: RecoveryHook, prevStatus: RecoveryHookStatus,
    newStatus: RecoveryHookStatus, reason: string, now: string,
  ): RecoveryAuditEvent {
    return {
      event_id: cryptoRandomId(),
      action_id: hook.action_id,
      recovery_hook_id: hook.recovery_hook_id,
      event_type: `recovery_${newStatus}`,
      recovery_type: hook.recovery_type,
      reason,
      previous_status: prevStatus,
      new_status: newStatus,
      timestamp: now,
    };
  }
}
