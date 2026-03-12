/**
 * Action Engine — Domain Model (Sprint 143 / AE-01)
 *
 * Foundational types for the Action Engine layer.
 * The Action Engine formalizes traceable actions from signals,
 * sitting between Policy and AgentOS in the Operational Decision Chain:
 *
 *   Canon → Readiness → Policy → **Action Engine** → AgentOS → Executors
 *
 * All types are pure data contracts with zero runtime dependencies.
 */

// ── Trigger Types ──

export type ActionTriggerType =
  | "readiness_complete"
  | "build_failed"
  | "deploy_failed"
  | "runtime_degraded"
  | "policy_violation"
  | "approval_required";

export interface ActionTrigger {
  /** Unique trigger instance id */
  trigger_id: string;
  /** Trigger classification */
  type: ActionTriggerType;
  /** Source system that emitted the trigger */
  source: string;
  /** Entity the trigger relates to (initiative, run, stage) */
  entity_id: string;
  /** Entity type */
  entity_type: string;
  /** Stage where the trigger originated */
  stage?: string;
  /** Trigger payload / evidence */
  payload: Record<string, unknown>;
  /** ISO timestamp */
  timestamp: string;
}

// ── Intent ──

export interface ActionIntent {
  /** Unique intent id */
  intent_id: string;
  /** Human-readable label */
  label: string;
  /** What the action aims to achieve */
  goal: string;
  /** Target entity */
  target_entity_id: string;
  /** Target entity type */
  target_entity_type: string;
  /** Stage context */
  stage?: string;
  /** Originating trigger */
  trigger_id: string;
  /** Trigger type for quick filtering */
  trigger_type: ActionTriggerType;
  /** Suggested execution mode before policy evaluation */
  suggested_mode: ActionExecutionMode;
  /** Priority (lower = more urgent) */
  priority: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** ISO timestamp */
  created_at: string;
}

// ── Execution Mode ──

export type ActionExecutionMode =
  | "auto"
  | "approval_required"
  | "manual_only"
  | "blocked";

// ── Action Record ──

export type ActionStatus =
  | "pending"
  | "queued"
  | "waiting_approval"
  | "approved"
  | "dispatched"
  | "executing"
  | "completed"
  | "failed"
  | "rejected"
  | "cancelled"
  | "blocked"
  | "escalated"
  | "rolled_back"
  | "expired";

export interface ActionRecord {
  /** Unique action id */
  action_id: string;
  /** Resolved intent */
  intent_id: string;
  /** Originating trigger */
  trigger_id: string;
  /** Trigger type */
  trigger_type: ActionTriggerType;
  /** Initiative context */
  initiative_id?: string;
  /** Organization scope */
  organization_id?: string;
  /** Pipeline stage */
  stage?: string;
  /** Resolved execution mode (after policy) */
  execution_mode: ActionExecutionMode;
  /** Current status */
  status: ActionStatus;
  /** Human-readable description */
  description: string;
  /** Policy decision id that governed this action */
  policy_decision_id?: string;
  /** Dispatch decision id if forwarded to AgentOS */
  dispatch_decision_id?: string;
  /** Approval id if approval was required */
  approval_id?: string;
  /** Who or what approved (user id or "system") */
  approved_by?: string;
  /** Risk level assessed */
  risk_level?: string;
  /** Constraints applied */
  constraints: ActionConstraint[];
  /** Outcome after execution */
  outcome?: ActionOutcome;
  /** ISO timestamp — created */
  created_at: string;
  /** ISO timestamp — last updated */
  updated_at: string;
  /** ISO timestamp — completed or failed */
  completed_at?: string;
}

export interface ActionConstraint {
  source: "policy" | "readiness" | "canon" | "system" | "manual";
  key: string;
  description: string;
}

// ── Action Outcome ──

export type ActionOutcomeStatus = "success" | "partial" | "failure" | "skipped";

export interface ActionOutcome {
  /** Outcome status */
  status: ActionOutcomeStatus;
  /** Summary of what happened */
  summary: string;
  /** Artifacts produced, if any */
  artifact_ids?: string[];
  /** Metrics collected */
  metrics?: Record<string, number>;
  /** Errors encountered */
  errors?: string[];
  /** ISO timestamp */
  evaluated_at: string;
}
