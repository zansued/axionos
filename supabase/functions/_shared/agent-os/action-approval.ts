/**
 * Action Engine — Human Approval Hooks (Sprint 148 / AE-06)
 *
 * Manages the approval lifecycle for actions requiring human review.
 * No approval_required action may execute without passing through this contract.
 *
 * Flow: ActionRecord (waiting_approval) → ApprovalRequest → Decision → Status Update
 */

import type { ActionRecord } from "./action-engine-types.ts";
import { cryptoRandomId, nowIso } from "./utils.ts";

// ── Approval Status ──

export type ApprovalLifecycleStatus =
  | "waiting_approval"
  | "approved"
  | "rejected"
  | "expired";

// ── Approval Request ──

export interface ActionApprovalRequest {
  /** Unique approval request id */
  approval_id: string;
  /** Action being reviewed */
  action_id: string;
  /** Intent that originated the action */
  intent_id: string;
  /** Trigger type for context */
  trigger_type: string;
  /** Initiative scope */
  initiative_id?: string;
  /** Organization scope */
  organization_id?: string;
  /** Pipeline stage */
  stage?: string;
  /** Why approval is needed */
  reason: string;
  /** Risk level assessed */
  risk_level: string;
  /** Policy rules that triggered approval */
  policy_rules: string[];
  /** Constraints summary */
  constraints_summary: string[];
  /** Current lifecycle status */
  status: ApprovalLifecycleStatus;
  /** Who requested (system or user id) */
  requested_by: string;
  /** Who decided (user id) */
  decided_by?: string;
  /** Decision notes */
  decision_notes?: string;
  /** ISO timestamp — created */
  created_at: string;
  /** ISO timestamp — decided */
  decided_at?: string;
  /** ISO timestamp — expiry */
  expires_at?: string;
}

// ── Approval Decision ──

export interface ApprovalDecisionInput {
  approval_id: string;
  decision: "approved" | "rejected";
  decided_by: string;
  notes?: string;
}

export interface ApprovalDecisionResult {
  success: boolean;
  approval_id: string;
  new_status: ApprovalLifecycleStatus;
  reason?: string;
  decided_at: string;
}

// ── Approval Manager ──

export class ApprovalManager {
  private requests: Map<string, ActionApprovalRequest> = new Map();
  /** Default TTL for approval requests (ms). 24 hours. */
  private defaultTtlMs: number;

  constructor(defaultTtlMs: number = 24 * 60 * 60 * 1000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  /** Create an approval request from an ActionRecord. */
  createRequest(
    action: ActionRecord,
    reason: string,
    requestedBy: string = "system",
  ): ActionApprovalRequest {
    const now = nowIso();
    const expiresAt = new Date(Date.now() + this.defaultTtlMs).toISOString();

    const request: ActionApprovalRequest = {
      approval_id: action.approval_id || cryptoRandomId(),
      action_id: action.action_id,
      intent_id: action.intent_id,
      trigger_type: action.trigger_type,
      initiative_id: action.initiative_id,
      organization_id: action.organization_id,
      stage: action.stage,
      reason,
      risk_level: action.risk_level || "unknown",
      policy_rules: action.constraints
        .filter((c) => c.source === "policy")
        .map((c) => c.key),
      constraints_summary: action.constraints.map((c) => c.description),
      status: "waiting_approval",
      requested_by: requestedBy,
      created_at: now,
      expires_at: expiresAt,
    };

    this.requests.set(request.approval_id, request);
    return request;
  }

  /** Process an approval decision. */
  decide(input: ApprovalDecisionInput): ApprovalDecisionResult {
    const now = nowIso();
    const request = this.requests.get(input.approval_id);

    if (!request) {
      return {
        success: false,
        approval_id: input.approval_id,
        new_status: "rejected",
        reason: "Approval request not found",
        decided_at: now,
      };
    }

    if (request.status !== "waiting_approval") {
      return {
        success: false,
        approval_id: input.approval_id,
        new_status: request.status,
        reason: `Cannot decide on request with status "${request.status}"`,
        decided_at: now,
      };
    }

    // Check expiry
    if (request.expires_at && new Date(request.expires_at) < new Date()) {
      request.status = "expired";
      request.decided_at = now;
      return {
        success: false,
        approval_id: input.approval_id,
        new_status: "expired",
        reason: "Approval request has expired",
        decided_at: now,
      };
    }

    request.status = input.decision;
    request.decided_by = input.decided_by;
    request.decision_notes = input.notes;
    request.decided_at = now;

    return {
      success: true,
      approval_id: input.approval_id,
      new_status: input.decision,
      decided_at: now,
    };
  }

  /** Expire all overdue requests. Returns count of expired. */
  expireOverdue(): number {
    const now = new Date();
    let count = 0;
    for (const req of this.requests.values()) {
      if (
        req.status === "waiting_approval" &&
        req.expires_at &&
        new Date(req.expires_at) < now
      ) {
        req.status = "expired";
        req.decided_at = nowIso();
        count++;
      }
    }
    return count;
  }

  /** Get a request by id. */
  get(approvalId: string): ActionApprovalRequest | undefined {
    const r = this.requests.get(approvalId);
    return r ? { ...r } : undefined;
  }

  /** Get all pending requests. */
  getPending(): ActionApprovalRequest[] {
    return Array.from(this.requests.values())
      .filter((r) => r.status === "waiting_approval")
      .map((r) => ({ ...r }));
  }

  /** Get requests by action id. */
  getByAction(actionId: string): ActionApprovalRequest[] {
    return Array.from(this.requests.values())
      .filter((r) => r.action_id === actionId)
      .map((r) => ({ ...r }));
  }
}
