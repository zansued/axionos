/**
 * Action Engine — Action-to-AgentOS Dispatch (Sprint 147 / AE-05)
 *
 * Bridges the Action Engine to AgentOS by producing a structured
 * ActionDispatchRequest from a resolved ActionRecord.
 *
 * Operational Decision Chain position:
 *   Canon → Readiness → Policy → Action Engine → **Dispatch** → AgentOS → Executors
 */

import type {
  ActionRecord,
  ActionConstraint,
  ActionExecutionMode,
} from "./action-engine-types.ts";
import type { StageName } from "./types.ts";
import { cryptoRandomId, nowIso } from "./utils.ts";

// ── Dispatch Request ──

export interface ActionDispatchRequest {
  /** Unique dispatch id */
  dispatch_id: string;
  /** Source action id */
  action_id: string;
  /** Intent id that originated this dispatch */
  intent_id: string;
  /** Trigger type for routing context */
  trigger_type: string;
  /** Pipeline stage */
  stage: StageName;
  /** Goal passed to AgentOS */
  goal: string;
  /** Initiative context */
  initiative_id?: string;
  /** Organization scope */
  organization_id?: string;
  /** Resolved execution mode */
  execution_mode: ActionExecutionMode;
  /** Policy decision id governing this dispatch */
  policy_decision_id?: string;
  /** Approval id if approval was granted */
  approval_id?: string;
  /** Constraints forwarded to AgentOS */
  constraints: ActionConstraint[];
  /** Canon references available for this dispatch */
  canon_refs: string[];
  /** Policy state summary */
  policy_state: ActionDispatchPolicyState;
  /** Additional context for AgentOS WorkInput */
  context: Record<string, unknown>;
  /** ISO timestamp */
  created_at: string;
}

export interface ActionDispatchPolicyState {
  verdict: string;
  risk_level: string;
  rules_triggered: number;
  blocking_violations: number;
  warnings: number;
}

// ── Dispatch Result ──

export interface ActionDispatchResult {
  success: boolean;
  dispatch_id: string;
  action_id: string;
  /** Error reason if dispatch was rejected */
  rejection_reason?: string;
  /** ISO timestamp */
  dispatched_at: string;
}

// ── Builder ──

/**
 * Build a structured dispatch request from a resolved ActionRecord.
 * Only actions with mode 'auto' or 'approval_required' (approved) can dispatch.
 */
export function buildActionDispatchRequest(
  action: ActionRecord,
  goal: string,
  canonRefs: string[] = [],
  additionalContext: Record<string, unknown> = {},
): ActionDispatchResult | ActionDispatchRequest {
  // Gate: blocked and manual_only never dispatch
  if (action.execution_mode === "blocked" || action.execution_mode === "manual_only") {
    return {
      success: false,
      dispatch_id: "",
      action_id: action.action_id,
      rejection_reason: `Execution mode "${action.execution_mode}" does not allow dispatch`,
      dispatched_at: nowIso(),
    } as ActionDispatchResult;
  }

  // Gate: approval_required must be approved
  if (action.execution_mode === "approval_required" && action.status !== "approved") {
    return {
      success: false,
      dispatch_id: "",
      action_id: action.action_id,
      rejection_reason: "Action requires approval before dispatch",
      dispatched_at: nowIso(),
    } as ActionDispatchResult;
  }

  // Gate: rejected/cancelled/failed actions cannot dispatch
  if (action.status === "rejected" || action.status === "cancelled" || action.status === "failed") {
    return {
      success: false,
      dispatch_id: "",
      action_id: action.action_id,
      rejection_reason: `Action status "${action.status}" cannot be dispatched`,
      dispatched_at: nowIso(),
    } as ActionDispatchResult;
  }

  const stage = (action.stage || "intake") as StageName;

  return {
    dispatch_id: cryptoRandomId(),
    action_id: action.action_id,
    intent_id: action.intent_id,
    trigger_type: action.trigger_type,
    stage,
    goal,
    initiative_id: action.initiative_id,
    organization_id: action.organization_id,
    execution_mode: action.execution_mode,
    policy_decision_id: action.policy_decision_id,
    approval_id: action.approval_id,
    constraints: action.constraints,
    canon_refs: canonRefs,
    policy_state: {
      verdict: action.execution_mode === "auto" ? "allow" : "allow_with_conditions",
      risk_level: action.risk_level || "unknown",
      rules_triggered: action.constraints.filter((c) => c.source === "policy").length,
      blocking_violations: 0,
      warnings: action.constraints.filter((c) => c.source === "policy").length,
    },
    context: {
      action_id: action.action_id,
      intent_id: action.intent_id,
      trigger_type: action.trigger_type,
      ...additionalContext,
    },
    created_at: nowIso(),
  } as ActionDispatchRequest;
}

/**
 * Type guard: check if result is a dispatch request (success) or rejection.
 */
export function isDispatchRequest(
  result: ActionDispatchResult | ActionDispatchRequest,
): result is ActionDispatchRequest {
  return "dispatch_id" in result && !!(result as ActionDispatchRequest).dispatch_id;
}
