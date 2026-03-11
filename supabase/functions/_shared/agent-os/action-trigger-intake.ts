/**
 * Action Engine — Trigger Intake & Mapping (Sprint 144 / AE-02)
 *
 * Central intake that receives system triggers from any source
 * (events, metrics, readiness, policy, manual) and maps them
 * to structured ActionIntents via deterministic mapping rules.
 *
 * Architectural position:
 *   Trigger → **Intake & Mapping** → Intent → Policy Gate → Action Record
 */

import type {
  ActionTrigger,
  ActionTriggerType,
  ActionIntent,
  ActionExecutionMode,
} from "./action-engine-types.ts";
import { cryptoRandomId, nowIso } from "./utils.ts";

// ── Trigger Source ──

export type TriggerSource =
  | "event"
  | "metric"
  | "readiness"
  | "policy"
  | "manual";

// ── Mapping Rule ──

export interface TriggerMappingRule {
  /** Unique rule id */
  rule_id: string;
  /** Which trigger type this rule handles */
  trigger_type: ActionTriggerType;
  /** Optional source filter (null = any source) */
  source_filter?: TriggerSource;
  /** Intent label to produce */
  intent_label: string;
  /** Intent goal description */
  intent_goal: string;
  /** Default execution mode suggestion */
  default_mode: ActionExecutionMode;
  /** Default priority (lower = more urgent) */
  default_priority: number;
  /** Whether this rule is enabled */
  enabled: boolean;
}

// ── Intake Result ──

export interface TriggerIntakeResult {
  /** Whether intake succeeded */
  success: boolean;
  /** Produced intent (null if no rule matched) */
  intent: ActionIntent | null;
  /** Rule that was applied */
  matched_rule_id: string | null;
  /** Reason if no intent was produced */
  skip_reason?: string;
  /** ISO timestamp */
  processed_at: string;
}

// ── Default Mapping Rules ──

export const DEFAULT_TRIGGER_MAPPING_RULES: TriggerMappingRule[] = [
  {
    rule_id: "map_build_failed",
    trigger_type: "build_failed",
    intent_label: "Assign Repair Task",
    intent_goal: "Investigate build failure and assign a repair task to resolve it",
    default_mode: "auto",
    default_priority: 2,
    enabled: true,
  },
  {
    rule_id: "map_deploy_failed",
    trigger_type: "deploy_failed",
    intent_label: "Open Investigation",
    intent_goal: "Open a deployment failure investigation and determine root cause",
    default_mode: "approval_required",
    default_priority: 1,
    enabled: true,
  },
  {
    rule_id: "map_runtime_degraded",
    trigger_type: "runtime_degraded",
    intent_label: "Rollback Release",
    intent_goal: "Evaluate runtime degradation and initiate rollback if warranted",
    default_mode: "approval_required",
    default_priority: 1,
    enabled: true,
  },
  {
    rule_id: "map_readiness_complete",
    trigger_type: "readiness_complete",
    intent_label: "Advance Stage",
    intent_goal: "Readiness checks passed — advance initiative to next pipeline stage",
    default_mode: "auto",
    default_priority: 3,
    enabled: true,
  },
  {
    rule_id: "map_policy_violation",
    trigger_type: "policy_violation",
    intent_label: "Enforce Policy",
    intent_goal: "Policy violation detected — enforce corrective action or block execution",
    default_mode: "blocked",
    default_priority: 1,
    enabled: true,
  },
  {
    rule_id: "map_approval_required",
    trigger_type: "approval_required",
    intent_label: "Request Approval",
    intent_goal: "Action requires human approval before proceeding",
    default_mode: "approval_required",
    default_priority: 2,
    enabled: true,
  },
];

// ── Intake Function ──

/**
 * Process a trigger through the intake pipeline.
 * Matches the trigger against mapping rules and produces a structured ActionIntent.
 */
export function processTrigger(
  trigger: ActionTrigger,
  rules: TriggerMappingRule[] = DEFAULT_TRIGGER_MAPPING_RULES,
): TriggerIntakeResult {
  const now = nowIso();

  const matched = rules.find(
    (r) =>
      r.enabled &&
      r.trigger_type === trigger.type &&
      (!r.source_filter || r.source_filter === trigger.source),
  );

  if (!matched) {
    return {
      success: false,
      intent: null,
      matched_rule_id: null,
      skip_reason: `No enabled mapping rule for trigger type "${trigger.type}" from source "${trigger.source}"`,
      processed_at: now,
    };
  }

  const intent: ActionIntent = {
    intent_id: cryptoRandomId(),
    label: matched.intent_label,
    goal: matched.intent_goal,
    target_entity_id: trigger.entity_id,
    target_entity_type: trigger.entity_type,
    stage: trigger.stage,
    trigger_id: trigger.trigger_id,
    trigger_type: trigger.type,
    suggested_mode: matched.default_mode,
    priority: matched.default_priority,
    metadata: {
      source: trigger.source,
      rule_id: matched.rule_id,
      trigger_payload_keys: Object.keys(trigger.payload),
    },
    created_at: now,
  };

  return {
    success: true,
    intent,
    matched_rule_id: matched.rule_id,
    processed_at: now,
  };
}

// ── Trigger Builder Helpers ──

/**
 * Create a well-formed ActionTrigger from minimal inputs.
 */
export function createTrigger(
  type: ActionTriggerType,
  source: TriggerSource,
  entityId: string,
  entityType: string,
  payload: Record<string, unknown> = {},
  stage?: string,
): ActionTrigger {
  return {
    trigger_id: cryptoRandomId(),
    type,
    source,
    entity_id: entityId,
    entity_type: entityType,
    stage,
    payload,
    timestamp: nowIso(),
  };
}
