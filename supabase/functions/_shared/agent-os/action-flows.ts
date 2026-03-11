/**
 * Action Engine — Operational Flows (Sprint 149 / AE-07)
 *
 * End-to-end flows that wire triggers through intake, resolution,
 * registry, approval, and dispatch.
 *
 * Each flow: Trigger → Intake → Resolution → Registry → (Approval?) → Dispatch
 */

import type {
  ActionRecord,
  ActionTriggerType,
} from "./action-engine-types.ts";
import type { ActionDispatchRequest, ActionDispatchResult } from "./action-dispatch.ts";
import type { ActionApprovalRequest } from "./action-approval.ts";
import type { PolicyRule, PolicyOverride } from "./policy-engine.ts";
import { createTrigger, processTrigger, type TriggerSource } from "./action-trigger-intake.ts";
import { resolveAction } from "./action-resolution.ts";
import { ActionRegistry } from "./action-registry.ts";
import { ApprovalManager } from "./action-approval.ts";
import { buildActionDispatchRequest, isDispatchRequest } from "./action-dispatch.ts";

// ── Flow Result ──

export interface OperationalFlowResult {
  flow: string;
  success: boolean;
  action: ActionRecord | null;
  approval_request: ActionApprovalRequest | null;
  dispatch: ActionDispatchRequest | null;
  rejection_reason?: string;
  trace: OperationalFlowTrace;
}

export interface OperationalFlowTrace {
  trigger_type: ActionTriggerType;
  trigger_source: TriggerSource;
  intake_matched_rule: string | null;
  resolution_mode: string;
  policy_verdict: string;
  requires_approval: boolean;
  dispatched: boolean;
  timestamp: string;
}

// ── Flow Definitions ──

export interface OperationalFlowDef {
  name: string;
  trigger_type: ActionTriggerType;
  default_source: TriggerSource;
  goal: string;
  risk_level: string;
}

export const OPERATIONAL_FLOWS: Record<string, OperationalFlowDef> = {
  deploy_initiative: {
    name: "deploy_initiative",
    trigger_type: "readiness_complete",
    default_source: "readiness",
    goal: "Deploy initiative after readiness checks passed",
    risk_level: "medium",
  },
  assign_repair_task: {
    name: "assign_repair_task",
    trigger_type: "build_failed",
    default_source: "event",
    goal: "Investigate build failure and assign repair task",
    risk_level: "high",
  },
  open_investigation: {
    name: "open_investigation",
    trigger_type: "deploy_failed",
    default_source: "event",
    goal: "Open deployment failure investigation and determine root cause",
    risk_level: "high",
  },
  rollback_release: {
    name: "rollback_release",
    trigger_type: "runtime_degraded",
    default_source: "metric",
    goal: "Evaluate runtime degradation and initiate rollback if warranted",
    risk_level: "critical",
  },
  freeze_pipeline: {
    name: "freeze_pipeline",
    trigger_type: "policy_violation",
    default_source: "policy",
    goal: "Freeze pipeline execution due to policy violation",
    risk_level: "critical",
  },
};

// ── Flow Executor ──

export class OperationalFlowExecutor {
  private registry: ActionRegistry;
  private approvalManager: ApprovalManager;

  constructor(
    registry?: ActionRegistry,
    approvalManager?: ApprovalManager,
  ) {
    this.registry = registry || new ActionRegistry();
    this.approvalManager = approvalManager || new ApprovalManager();
  }

  /**
   * Execute a named operational flow end-to-end.
   */
  executeFlow(
    flowName: string,
    entityId: string,
    entityType: string,
    payload: Record<string, unknown> = {},
    options: {
      initiative_id?: string;
      organization_id?: string;
      stage?: string;
      additional_policy_rules?: PolicyRule[];
      policy_overrides?: PolicyOverride[];
      canon_refs?: string[];
    } = {},
  ): OperationalFlowResult {
    const flowDef = OPERATIONAL_FLOWS[flowName];
    if (!flowDef) {
      return this.failResult(flowName, "build_failed", "event", `Unknown flow: ${flowName}`);
    }

    // 1. Create trigger
    const trigger = createTrigger(
      flowDef.trigger_type,
      flowDef.default_source,
      entityId,
      entityType,
      payload,
      options.stage,
    );

    // 2. Intake → Intent
    const intakeResult = processTrigger(trigger);
    if (!intakeResult.success || !intakeResult.intent) {
      return this.failResult(
        flowName,
        flowDef.trigger_type,
        flowDef.default_source,
        intakeResult.skip_reason || "Intake produced no intent",
      );
    }

    // 3. Resolution → ActionRecord (with policy)
    const resolution = resolveAction({
      intent: intakeResult.intent,
      risk_level: flowDef.risk_level,
      initiative_id: options.initiative_id,
      organization_id: options.organization_id,
      additional_policy_rules: options.additional_policy_rules,
      policy_overrides: options.policy_overrides,
    });

    // 4. Register action
    this.registry.register(resolution.action);

    // 5. Handle approval if required
    let approvalRequest: ActionApprovalRequest | null = null;
    if (resolution.requires_approval) {
      approvalRequest = this.approvalManager.createRequest(
        resolution.action,
        resolution.policy_reason,
      );
      this.registry.transition(
        resolution.action.action_id,
        "pending",
        "Waiting for approval",
      );
    }

    // 6. Dispatch (only if auto or already approved)
    let dispatch: ActionDispatchRequest | null = null;
    if (resolution.action.execution_mode === "auto") {
      const dispatchResult = buildActionDispatchRequest(
        resolution.action,
        flowDef.goal,
        options.canon_refs || [],
        { flow: flowName },
      );
      if (isDispatchRequest(dispatchResult)) {
        dispatch = dispatchResult;
        this.registry.transition(
          resolution.action.action_id,
          "executing",
          `Dispatched via flow ${flowName}`,
        );
      }
    }

    const trace: OperationalFlowTrace = {
      trigger_type: flowDef.trigger_type,
      trigger_source: flowDef.default_source,
      intake_matched_rule: intakeResult.matched_rule_id,
      resolution_mode: resolution.action.execution_mode,
      policy_verdict: resolution.trace.policy_verdict,
      requires_approval: resolution.requires_approval,
      dispatched: dispatch !== null,
      timestamp: new Date().toISOString(),
    };

    return {
      flow: flowName,
      success: resolution.success,
      action: resolution.action,
      approval_request: approvalRequest,
      dispatch,
      trace,
    };
  }

  /** Get the underlying registry. */
  getRegistry(): ActionRegistry {
    return this.registry;
  }

  /** Get the underlying approval manager. */
  getApprovalManager(): ApprovalManager {
    return this.approvalManager;
  }

  private failResult(
    flow: string,
    triggerType: ActionTriggerType,
    source: TriggerSource,
    reason: string,
  ): OperationalFlowResult {
    return {
      flow,
      success: false,
      action: null,
      approval_request: null,
      dispatch: null,
      rejection_reason: reason,
      trace: {
        trigger_type: triggerType,
        trigger_source: source,
        intake_matched_rule: null,
        resolution_mode: "blocked",
        policy_verdict: "block",
        requires_approval: false,
        dispatched: false,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
