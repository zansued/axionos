/**
 * AgentOS Decision Contract — Sprint 142
 *
 * Formalizes the structured decision object required before agent dispatch.
 * No agent execution may occur without a valid DispatchDecision.
 *
 * Architectural invariant:
 *   Canon informs → Readiness evaluates → Policy constrains →
 *   Decision formalizes → AgentOS dispatches → Executors act
 */

import type { StageName, WorkInput, AgentDefinition } from "./types.ts";
import type { CanonTraceRecord } from "./canon-orchestrator-integration.ts";
import type { ReadinessTraceRecord } from "./readiness-orchestrator-integration.ts";
import type {
  PolicyEnforcementResult,
  PolicyTraceRecord,
  ApprovalRequest,
  ExecutionMode,
} from "./policy-orchestrator-integration.ts";
import { cryptoRandomId, nowIso } from "./utils.ts";

// ── Decision Contract ──

export interface DispatchDecision {
  /** Unique decision identifier */
  decision_id: string;
  /** Run this decision belongs to */
  run_id: string;
  /** Initiative context id, if available */
  initiative_id?: string;
  /** Pipeline stage */
  stage: StageName;
  /** Agent(s) selected for dispatch */
  selected_agents: SelectedAgentRef[];
  /** Canon knowledge context used */
  canon_context: CanonTraceRecord | null;
  /** Readiness evaluation result */
  readiness_result: ReadinessTraceRecord;
  /** Policy enforcement decision */
  policy_decision: PolicyTraceRecord;
  /** Resolved execution mode */
  execution_mode: ExecutionMode;
  /** Approval request if mode is approval_required */
  approval_request: ApprovalRequest | null;
  /** Constraints applied to this dispatch */
  constraints: DispatchConstraint[];
  /** Human-readable rationale for the decision */
  rationale: string;
  /** ISO timestamp */
  timestamp: string;
}

export interface SelectedAgentRef {
  agent_id: string;
  agent_name: string;
  agent_type: string;
  priority?: number;
}

export interface DispatchConstraint {
  source: "policy" | "readiness" | "canon" | "system";
  key: string;
  description: string;
}

// ── Builder ──

export interface DispatchDecisionInput {
  run_id: string;
  initiative_id?: string;
  stage: StageName;
  selected_agents: AgentDefinition[];
  canon_trace: CanonTraceRecord | null;
  readiness_trace: ReadinessTraceRecord;
  policy_result: PolicyEnforcementResult;
  approval_request: ApprovalRequest | null;
  input: WorkInput;
}

/**
 * Build a formal DispatchDecision from all evaluated inputs.
 * This is the single factory for decisions — no dispatch without it.
 */
export function buildDispatchDecision(
  params: DispatchDecisionInput,
): DispatchDecision {
  const agentRefs: SelectedAgentRef[] = params.selected_agents.map((a) => ({
    agent_id: a.id,
    agent_name: a.name,
    agent_type: a.type,
    priority: a.priority,
  }));

  const constraints = collectConstraints(params);
  const rationale = buildRationale(params);

  return {
    decision_id: cryptoRandomId(),
    run_id: params.run_id,
    initiative_id: params.initiative_id,
    stage: params.stage,
    selected_agents: agentRefs,
    canon_context: params.canon_trace,
    readiness_result: params.readiness_trace,
    policy_decision: params.policy_result.trace,
    execution_mode: params.policy_result.execution_mode,
    approval_request: params.approval_request,
    constraints,
    rationale,
    timestamp: nowIso(),
  };
}

// ── Constraint Collection ──

function collectConstraints(params: DispatchDecisionInput): DispatchConstraint[] {
  const constraints: DispatchConstraint[] = [];

  // Policy constraints
  if (params.policy_result.decision.blocking_violations?.length) {
    for (const v of params.policy_result.decision.blocking_violations) {
      constraints.push({
        source: "policy",
        key: v.rule_id || "policy_violation",
        description: v.message || "Policy violation",
      });
    }
  }

  if (params.policy_result.decision.warnings?.length) {
    for (const w of params.policy_result.decision.warnings) {
      constraints.push({
        source: "policy",
        key: w.rule_id || "policy_warning",
        description: w.message || "Policy warning",
      });
    }
  }

  // Readiness warnings
  if (params.readiness_trace.warning_count > 0 && params.readiness_trace.warning_keys) {
    for (const key of params.readiness_trace.warning_keys) {
      constraints.push({
        source: "readiness",
        key,
        description: `Readiness warning: ${key}`,
      });
    }
  }

  // Input constraints
  if (params.input.constraints?.length) {
    for (const c of params.input.constraints) {
      constraints.push({
        source: "system",
        key: "input_constraint",
        description: c,
      });
    }
  }

  return constraints;
}

// ── Rationale Builder ──

function buildRationale(params: DispatchDecisionInput): string {
  const parts: string[] = [];

  // Readiness
  parts.push(
    `Readiness: score=${params.readiness_trace.readiness_score}, can_proceed=${params.readiness_trace.can_proceed}`,
  );

  // Policy
  parts.push(
    `Policy: verdict=${params.policy_result.trace.verdict}, mode=${params.policy_result.execution_mode}, risk=${params.policy_result.trace.risk_level}`,
  );

  // Canon
  if (params.canon_trace) {
    parts.push(
      `Canon: retrieved=${params.canon_trace.canon_retrieval_success}, entries=${params.canon_trace.entries_retrieved}`,
    );
  } else {
    parts.push("Canon: not available");
  }

  // Agents
  const agentNames = params.selected_agents.map((a) => a.name).join(", ");
  parts.push(`Agents: [${agentNames}]`);

  // Approval
  if (params.approval_request) {
    parts.push(`Approval: required (${params.approval_request.approval_id})`);
  }

  return parts.join(" | ");
}

// ── Validation ──

/**
 * Validate that a decision is well-formed before dispatch.
 * Returns null if valid, or an error message if invalid.
 */
export function validateDecision(decision: DispatchDecision): string | null {
  if (!decision.decision_id) return "Missing decision_id";
  if (!decision.run_id) return "Missing run_id";
  if (!decision.stage) return "Missing stage";
  if (!decision.selected_agents?.length) return "No agents selected";
  if (!decision.readiness_result) return "Missing readiness_result";
  if (!decision.policy_decision) return "Missing policy_decision";
  if (!decision.timestamp) return "Missing timestamp";
  return null;
}
