/**
 * Action Engine — Action Registry (Sprint 146 / AE-04)
 *
 * Central in-memory registry for ActionRecords.
 * Tracks all actions, maintains status transitions,
 * and provides an audit trail for traceability.
 *
 * For persistence, records should be flushed to the database
 * via the appropriate persistence layer.
 */

import type {
  ActionRecord,
  ActionStatus,
  ActionOutcome,
} from "./action-engine-types.ts";
import { nowIso } from "./utils.ts";

// ── Status Transition Rules ──

const VALID_TRANSITIONS: Record<ActionStatus, ActionStatus[]> = {
  pending: ["queued", "waiting_approval", "approved", "executing", "rejected", "cancelled", "blocked"],
  queued: ["waiting_approval", "dispatched", "executing", "cancelled", "blocked"],
  waiting_approval: ["approved", "rejected", "expired", "cancelled"],
  approved: ["dispatched", "executing", "cancelled"],
  dispatched: ["executing", "failed", "cancelled"],
  executing: ["completed", "failed", "escalated"],
  completed: ["rolled_back"],
  failed: ["rolled_back", "queued"],
  rejected: [],
  cancelled: [],
  blocked: ["pending", "cancelled"],
  escalated: ["executing", "blocked", "cancelled", "rolled_back"],
  rolled_back: [],
  expired: [],
};

// ── Audit Entry ──

export interface ActionAuditEntry {
  action_id: string;
  from_status: ActionStatus;
  to_status: ActionStatus;
  reason: string;
  actor?: string;
  timestamp: string;
}

// ── Registry Query ──

export interface ActionRegistryQuery {
  status?: ActionStatus;
  trigger_type?: string;
  initiative_id?: string;
  organization_id?: string;
  stage?: string;
  limit?: number;
}

// ── Registry ──

export class ActionRegistry {
  private actions: Map<string, ActionRecord> = new Map();
  private auditLog: ActionAuditEntry[] = [];

  /** Register a new action. */
  register(action: ActionRecord): void {
    this.actions.set(action.action_id, { ...action });
    this.auditLog.push({
      action_id: action.action_id,
      from_status: action.status,
      to_status: action.status,
      reason: "Action registered",
      timestamp: nowIso(),
    });
  }

  /** Transition an action to a new status. Returns false if transition is invalid. */
  transition(
    actionId: string,
    toStatus: ActionStatus,
    reason: string,
    actor?: string,
  ): boolean {
    const action = this.actions.get(actionId);
    if (!action) return false;

    const allowed = VALID_TRANSITIONS[action.status] || [];
    if (!allowed.includes(toStatus)) return false;

    const fromStatus = action.status;
    action.status = toStatus;
    action.updated_at = nowIso();

    if (toStatus === "completed" || toStatus === "failed") {
      action.completed_at = nowIso();
    }
    if (toStatus === "approved" && actor) {
      action.approved_by = actor;
    }

    this.auditLog.push({
      action_id: actionId,
      from_status: fromStatus,
      to_status: toStatus,
      reason,
      actor,
      timestamp: nowIso(),
    });

    return true;
  }

  /** Attach an outcome to a completed/failed action. */
  setOutcome(actionId: string, outcome: ActionOutcome): boolean {
    const action = this.actions.get(actionId);
    if (!action) return false;
    action.outcome = outcome;
    action.updated_at = nowIso();
    return true;
  }

  /** Get a single action by id. */
  get(actionId: string): ActionRecord | undefined {
    const a = this.actions.get(actionId);
    return a ? { ...a } : undefined;
  }

  /** Query actions by filter. */
  query(filter: ActionRegistryQuery = {}): ActionRecord[] {
    let results = Array.from(this.actions.values());

    if (filter.status) results = results.filter((a) => a.status === filter.status);
    if (filter.trigger_type) results = results.filter((a) => a.trigger_type === filter.trigger_type);
    if (filter.initiative_id) results = results.filter((a) => a.initiative_id === filter.initiative_id);
    if (filter.organization_id) results = results.filter((a) => a.organization_id === filter.organization_id);
    if (filter.stage) results = results.filter((a) => a.stage === filter.stage);
    if (filter.limit) results = results.slice(0, filter.limit);

    return results.map((a) => ({ ...a }));
  }

  /** Get audit trail for a specific action. */
  getAuditTrail(actionId: string): ActionAuditEntry[] {
    return this.auditLog.filter((e) => e.action_id === actionId);
  }

  /** Get full audit log. */
  getFullAuditLog(): ActionAuditEntry[] {
    return [...this.auditLog];
  }

  /** Count actions by status. */
  countByStatus(): Record<ActionStatus, number> {
    const counts: Record<string, number> = {
      pending: 0,
      approved: 0,
      executing: 0,
      completed: 0,
      failed: 0,
      rejected: 0,
      cancelled: 0,
      blocked: 0,
    };
    for (const a of this.actions.values()) {
      counts[a.status] = (counts[a.status] || 0) + 1;
    }
    return counts as Record<ActionStatus, number>;
  }

  /** Total registered actions. */
  get size(): number {
    return this.actions.size;
  }
}
