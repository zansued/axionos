/**
 * Action Engine — Policy-Aware Action Resolution (Sprint 145 / AE-03)
 *
 * Resolves ActionIntents into policy-governed ActionRecords.
 * No action may bypass policy evaluation.
 *
 * Flow: Trigger → Intent → **Resolution (policy gate)** → ActionRecord
 */

import type {
  ActionIntent,
  ActionExecutionMode,
  ActionRecord,
  ActionStatus,
  ActionConstraint,
} from "./action-engine-types.ts";
import type {
  PolicyRule,
  PolicyOverride,
} from "./policy-engine.ts";
import {
  evaluatePolicy,
  type PolicyEnforcementResult,
} from "./policy-orchestrator-integration.ts";
import type { StageName, WorkInput } from "./types.ts";
import { cryptoRandomId, nowIso } from "./utils.ts";

// ── Resolution Input ──

export interface ActionResolutionInput {
  intent: ActionIntent;
  risk_level?: string;
  initiative_id?: string;
  organization_id?: string;
  additional_policy_rules?: PolicyRule[];
  policy_overrides?: PolicyOverride[];
}

// ── Resolution Result ──

export interface ActionResolutionResult {
  success: boolean;
  action: ActionRecord;
  policy_evaluated: boolean;
  policy_execution_mode: ActionExecutionMode;
  policy_reason: string;
  requires_approval: boolean;
  trace: ActionResolutionTrace;
}

export interface ActionResolutionTrace {
  intent_id: string;
  trigger_id: string;
  trigger_type: string;
  suggested_mode: ActionExecutionMode;
  resolved_mode: ActionExecutionMode;
  risk_level: string;
  policy_verdict: string;
  policy_rules_evaluated: number;
  policy_rules_triggered: number;
  constraints_count: number;
  timestamp: string;
}

// ── Resolver ──

/**
 * Resolve an ActionIntent into a policy-governed ActionRecord.
 * Policy evaluation is mandatory — no bypass path exists.
 */
export function resolveAction(
  input: ActionResolutionInput,
): ActionResolutionResult {
  const now = nowIso();
  const { intent } = input;

  // Build a WorkInput for policy evaluation
  const workInput: WorkInput = {
    goal: intent.goal,
    context: {
      intent_id: intent.intent_id,
      trigger_type: intent.trigger_type,
      entity_id: intent.target_entity_id,
      entity_type: intent.target_entity_type,
      risk_level: input.risk_level || "unknown",
    },
  };

  const stage = (intent.stage || "intake") as StageName;
  const runId = cryptoRandomId();

  // Policy evaluation — always runs
  const policyResult = evaluatePolicy(
    runId,
    stage,
    workInput,
    input.additional_policy_rules || [],
    input.policy_overrides || [],
  );

  // Resolve final execution mode: strictest of intent suggestion and policy
  const resolvedMode = resolveExecutionMode(
    intent.suggested_mode,
    policyResult,
  );

  const requiresApproval =
    resolvedMode === "approval_required" ||
    policyResult.execution_mode === "approval_required";

  const constraints = buildConstraints(input, policyResult);
  const reason = buildReason(intent, policyResult, resolvedMode);

  // Determine initial status
  let status: ActionStatus = "pending";
  if (resolvedMode === "blocked") status = "rejected";
  if (resolvedMode === "auto") status = "pending";
  if (resolvedMode === "approval_required") status = "pending";

  const action: ActionRecord = {
    action_id: cryptoRandomId(),
    intent_id: intent.intent_id,
    trigger_id: intent.trigger_id,
    trigger_type: intent.trigger_type,
    initiative_id: input.initiative_id,
    organization_id: input.organization_id,
    stage: intent.stage,
    execution_mode: resolvedMode,
    status,
    description: reason,
    policy_decision_id: policyResult.decision.decision_id,
    approval_id: requiresApproval ? cryptoRandomId() : undefined,
    risk_level: input.risk_level || policyResult.trace.risk_level,
    constraints,
    created_at: now,
    updated_at: now,
  };

  const trace: ActionResolutionTrace = {
    intent_id: intent.intent_id,
    trigger_id: intent.trigger_id,
    trigger_type: intent.trigger_type,
    suggested_mode: intent.suggested_mode,
    resolved_mode: resolvedMode,
    risk_level: input.risk_level || policyResult.trace.risk_level,
    policy_verdict: policyResult.trace.verdict,
    policy_rules_evaluated: policyResult.trace.rules_evaluated,
    policy_rules_triggered: policyResult.trace.rules_triggered,
    constraints_count: constraints.length,
    timestamp: now,
  };

  return {
    success: resolvedMode !== "blocked",
    action,
    policy_evaluated: true,
    policy_execution_mode: policyResult.execution_mode,
    policy_reason: policyResult.trace.decision_reason,
    requires_approval: requiresApproval,
    trace,
  };
}

// ── Mode Resolution (strictest wins) ──

const MODE_SEVERITY: Record<ActionExecutionMode, number> = {
  auto: 0,
  approval_required: 1,
  manual_only: 2,
  blocked: 3,
};

function resolveExecutionMode(
  suggested: ActionExecutionMode,
  policyResult: PolicyEnforcementResult,
): ActionExecutionMode {
  const policySev = MODE_SEVERITY[policyResult.execution_mode] ?? 0;
  const suggestedSev = MODE_SEVERITY[suggested] ?? 0;
  return policySev >= suggestedSev
    ? policyResult.execution_mode
    : suggested;
}

// ── Constraint Builder ──

function buildConstraints(
  input: ActionResolutionInput,
  policyResult: PolicyEnforcementResult,
): ActionConstraint[] {
  const constraints: ActionConstraint[] = [];

  for (const v of policyResult.decision.blocking_violations || []) {
    constraints.push({
      source: "policy",
      key: v.rule_id || "violation",
      description: v.message || "Policy violation",
    });
  }

  for (const w of policyResult.decision.warnings || []) {
    constraints.push({
      source: "policy",
      key: w.rule_id || "warning",
      description: w.message || "Policy warning",
    });
  }

  if (input.risk_level === "critical" || input.risk_level === "high") {
    constraints.push({
      source: "system",
      key: "risk_level",
      description: `Risk level is ${input.risk_level}`,
    });
  }

  return constraints;
}

// ── Reason Builder ──

function buildReason(
  intent: ActionIntent,
  policyResult: PolicyEnforcementResult,
  resolvedMode: ActionExecutionMode,
): string {
  return [
    `Intent: ${intent.label} (${intent.trigger_type})`,
    `Policy: ${policyResult.trace.verdict} → mode=${resolvedMode}`,
    `Risk: ${policyResult.trace.risk_level}`,
  ].join(" | ");
}
