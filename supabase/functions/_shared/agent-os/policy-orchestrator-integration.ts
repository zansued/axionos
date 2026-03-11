/**
 * Policy–Orchestrator Integration — Sprint 140
 *
 * Connects the Policy Engine to the AgentOS Orchestrator.
 * Before agent dispatch, evaluates policy rules to determine
 * the execution mode: auto, approval_required, manual_only, or blocked.
 *
 * Architectural rule:
 *   Policy constrains → Orchestrator enforces → Agents execute within bounds.
 *   Policy never executes. Orchestrator never bypasses Policy in governed flows.
 */

import type { StageName, WorkInput } from "./types.ts";
import type {
  PolicyContext,
  PolicyDecision,
  PolicyRule,
  PolicyOverride,
  PolicyVerdict,
} from "./policy-engine.ts";
import { DEFAULT_POLICY_RULES } from "./policy-engine.ts";
import { PolicyEnforcer } from "./policy-enforcer.ts";
import { cryptoRandomId, nowIso } from "./utils.ts";

// ── Execution Modes ──

export type ExecutionMode = "auto" | "approval_required" | "manual_only" | "blocked";

export interface PolicyEnforcementResult {
  execution_mode: ExecutionMode;
  allowed: boolean;
  decision: PolicyDecision;
  trace: PolicyTraceRecord;
}

export interface PolicyTraceRecord {
  policy_evaluation_attempted: boolean;
  policy_evaluation_success: boolean;
  execution_mode: ExecutionMode;
  verdict: PolicyVerdict;
  rules_evaluated: number;
  rules_triggered: number;
  blocking_violations: number;
  warnings: number;
  risk_level: string;
  decision_reason: string;
  rules_applied: string[];
  stage: string;
  timestamp: string;
  error?: string;
}

export interface ApprovalRequest {
  approval_id: string;
  run_id: string;
  stage: string;
  reason: string;
  source_rules: string[];
  risk_level: string;
  created_at: string;
  status: "pending" | "approved" | "rejected";
}

// ── Verdict → ExecutionMode Mapping ──

function verdictToExecutionMode(verdict: PolicyVerdict): ExecutionMode {
  switch (verdict) {
    case "allow":
    case "allow_with_warnings":
      return "auto";
    case "require_approval":
      return "approval_required";
    case "block":
    case "block_critical":
      return "blocked";
    default:
      return "blocked";
  }
}

// ── Risk Classification ──

function classifyRisk(decision: PolicyDecision): string {
  if (decision.blocking_violations.some((v) => v.severity === "critical")) return "critical";
  if (decision.blocking_violations.length > 0) return "high";
  if (decision.warnings.length > 2) return "medium";
  if (decision.warnings.length > 0) return "low";
  return "none";
}

// ── Core Functions ──

const enforcer = new PolicyEnforcer();

/**
 * Build a PolicyContext from the current orchestrator state.
 */
export function buildPolicyContext(
  runId: string,
  stage: StageName,
  input: WorkInput,
  metrics?: {
    run_cost_usd?: number;
    run_elapsed_ms?: number;
    concurrent_agents?: number;
    attempt_number?: number;
    total_retries?: number;
  },
): PolicyContext {
  const contextData = input.context || {};

  return {
    run_id: runId,
    stage,
    environment: (contextData.environment as "development" | "staging" | "production") || "development",
    agent_type: undefined,
    run_cost_usd: metrics?.run_cost_usd || 0,
    run_elapsed_ms: metrics?.run_elapsed_ms || 0,
    concurrent_agents: metrics?.concurrent_agents || 1,
    attempt_number: metrics?.attempt_number || 1,
    total_retries_in_run: metrics?.total_retries || 0,
    evaluated_at: nowIso(),
    metadata: {
      goal: input.goal,
      stage,
    },
  };
}

/**
 * Evaluate policy before agent dispatch.
 * Returns the enforcement result with execution mode and traceability.
 *
 * SAFE FALLBACK: If policy evaluation fails, defaults to 'auto' mode
 * so execution is not blocked by policy infrastructure failures.
 */
export function evaluatePolicy(
  runId: string,
  stage: StageName,
  input: WorkInput,
  additionalRules: PolicyRule[] = [],
  overrides: PolicyOverride[] = [],
  metrics?: {
    run_cost_usd?: number;
    run_elapsed_ms?: number;
    concurrent_agents?: number;
    attempt_number?: number;
    total_retries?: number;
  },
): PolicyEnforcementResult {
  try {
    const context = buildPolicyContext(runId, stage, input, metrics);
    const allRules = [...DEFAULT_POLICY_RULES, ...additionalRules];
    const decision = enforcer.evaluate(context, allRules, overrides);
    const executionMode = verdictToExecutionMode(decision.verdict);
    const riskLevel = classifyRisk(decision);

    const trace: PolicyTraceRecord = {
      policy_evaluation_attempted: true,
      policy_evaluation_success: true,
      execution_mode: executionMode,
      verdict: decision.verdict,
      rules_evaluated: decision.evaluated_rules.length,
      rules_triggered: decision.applied_rules.length,
      blocking_violations: decision.blocking_violations.length,
      warnings: decision.warnings.length,
      risk_level: riskLevel,
      decision_reason: decision.blocked
        ? decision.blocking_violations.map((v) => v.message).join("; ")
        : decision.verdict === "require_approval"
          ? decision.recommended_actions.map((r) => r.reason).join("; ")
          : "Policy allows execution",
      rules_applied: decision.applied_rules.map((r) => r.rule_id),
      stage,
      timestamp: nowIso(),
    };

    return {
      execution_mode: executionMode,
      allowed: decision.allowed,
      decision,
      trace,
    };
  } catch (error) {
    // Safe fallback: if policy evaluation fails, allow execution
    const fallbackTrace: PolicyTraceRecord = {
      policy_evaluation_attempted: true,
      policy_evaluation_success: false,
      execution_mode: "auto",
      verdict: "allow",
      rules_evaluated: 0,
      rules_triggered: 0,
      blocking_violations: 0,
      warnings: 0,
      risk_level: "unknown",
      decision_reason: "Policy evaluation failed — fallback to auto",
      rules_applied: [],
      stage,
      timestamp: nowIso(),
      error: error instanceof Error ? error.message : String(error),
    };

    return {
      execution_mode: "auto",
      allowed: true,
      decision: {
        decision_id: cryptoRandomId(),
        run_id: runId,
        stage,
        verdict: "allow",
        allowed: true,
        blocked: false,
        blocking_violations: [],
        warnings: [],
        evaluated_rules: [],
        applied_rules: [],
        policy_modifiers: [],
        recommended_actions: [],
        evaluated_at: nowIso(),
        evaluation_duration_ms: 0,
      },
      trace: fallbackTrace,
    };
  }
}

/**
 * Create an approval request placeholder when execution_mode is approval_required.
 */
export function createApprovalRequest(
  runId: string,
  stage: StageName,
  result: PolicyEnforcementResult,
): ApprovalRequest {
  return {
    approval_id: cryptoRandomId(),
    run_id: runId,
    stage,
    reason: result.trace.decision_reason,
    source_rules: result.trace.rules_applied,
    risk_level: result.trace.risk_level,
    created_at: nowIso(),
    status: "pending",
  };
}
