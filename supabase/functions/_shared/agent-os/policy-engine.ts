// Agent Policy Engine v0.1 — Contract Layer
// Pure type-level contracts. Zero runtime dependencies.
// Spec: docs/AGENT_POLICY_ENGINE.md
//
// DESIGN RATIONALE:
//
// The Policy Engine is the rule evaluation layer of the Agent OS.
// It does NOT execute tasks, select agents, or mutate state.
// It evaluates rules against context and produces structured decisions.
//
// Policies govern:
//   - Agent eligibility constraints
//   - Execution safety limits
//   - Cost and latency guardrails
//   - Retry and rollback permissions
//   - Tool access restrictions
//   - Capability suppression
//   - Environment-specific rules
//   - Compliance requirements
//
// The engine operates as a pure function:
//   PolicyContext + PolicyRule[] → PolicyDecision
//
// Integration points:
//   - Orchestrator: before stage execution
//   - Selection Engine: during candidate filtering
//   - Retry logic: before retry dispatch
//   - Tool invocation: before tool calls
//   - Validation: before stage promotion

import type {
  AgentType,
  AgentMode,
  StageName,
} from "./types.ts";

// ════════════════════════════════════════════════════════════════
// 1. POLICY SCOPE
// ════════════════════════════════════════════════════════════════

/**
 * PolicyScope — defines the level at which a policy applies.
 *
 * Scopes form a hierarchy (most specific wins):
 *   global → environment → stage → capability → agent → task
 *
 * When multiple policies conflict, the most specific scope wins.
 * Within the same scope, higher priority wins.
 */
export type PolicyScope =
  | "global"
  | "environment"
  | "stage"
  | "capability"
  | "agent"
  | "task";

export type PolicyEnvironment =
  | "development"
  | "staging"
  | "production";

/**
 * Scope hierarchy for conflict resolution.
 * Higher index = more specific = higher precedence.
 */
export const POLICY_SCOPE_PRECEDENCE: Record<PolicyScope, number> = {
  global: 0,
  environment: 1,
  stage: 2,
  capability: 3,
  agent: 4,
  task: 5,
};

// ════════════════════════════════════════════════════════════════
// 2. POLICY CONTEXT
// ════════════════════════════════════════════════════════════════

/**
 * PolicyContext — the evaluation context passed to the policy engine.
 *
 * Contains all information needed to evaluate policies.
 * Pre-fetched by the orchestrator. No I/O inside the engine.
 */
export interface PolicyContext {
  /** Run context */
  run_id: string;
  task_id?: string;
  stage: StageName;

  /** Environment */
  environment: PolicyEnvironment;

  /** Agent being evaluated (if applicable) */
  agent_id?: string;
  agent_type?: AgentType;
  agent_mode?: AgentMode;

  /** Capability being evaluated (if applicable) */
  capability_id?: string;

  /** Tool being invoked (if applicable) */
  tool_name?: string;

  /** Current run metrics */
  run_metrics?: RunMetricsSnapshot;

  /** Current attempt/retry context */
  attempt_number?: number;
  total_retries_in_run?: number;
  total_retry_others_in_run?: number;

  /** Cost context */
  run_cost_usd?: number;
  estimated_task_cost_usd?: number;

  /** Latency context */
  run_elapsed_ms?: number;
  estimated_task_latency_ms?: number;

  /** Active agent count */
  concurrent_agents?: number;

  /** Validation context */
  last_validation_score?: number;

  /** Confidence context */
  agent_confidence?: number;

  /** Capability lifecycle */
  capability_lifecycle?: "draft" | "active" | "deprecated" | "retired";

  /** Custom metadata for adapter-defined policies */
  metadata?: Record<string, unknown>;

  /** Evaluation timestamp */
  evaluated_at: string;
}

export interface RunMetricsSnapshot {
  total_stages_completed: number;
  total_tasks_executed: number;
  total_retries: number;
  total_retry_others: number;
  total_rollbacks: number;
  total_cost_usd: number;
  total_elapsed_ms: number;
  total_tokens_used: number;
}

// ════════════════════════════════════════════════════════════════
// 3. POLICY RULE
// ════════════════════════════════════════════════════════════════

/**
 * PolicyRule — a single evaluatable rule.
 *
 * A rule consists of:
 *   - scope and targeting (where it applies)
 *   - conditions (when it triggers)
 *   - actions (what happens when triggered)
 *   - severity (how serious the violation is)
 */
export interface PolicyRule {
  /** Unique rule identifier */
  rule_id: string;

  /** Human-readable name */
  name: string;

  /** Description of what this rule enforces */
  description: string;

  /** Scope level */
  scope: PolicyScope;

  /** Priority within scope (higher = evaluated first) */
  priority: number;

  /** Whether this rule is currently active */
  enabled: boolean;

  /** Version of this rule definition */
  version: string;

  /** Environment targeting (if scope is "environment" or narrower) */
  environments?: PolicyEnvironment[];

  /** Stage targeting (if scope is "stage" or narrower) */
  stages?: StageName[];

  /** Agent targeting */
  agent_ids?: string[];
  agent_types?: AgentType[];

  /** Capability targeting */
  capability_ids?: string[];

  /** Tool targeting */
  tool_names?: string[];

  /** Conditions that must ALL be true for the rule to trigger */
  conditions: PolicyCondition[];

  /** Actions to apply when triggered */
  actions: PolicyAction[];

  /** Severity of violation */
  severity: PolicySeverity;

  /** Tags for categorization */
  tags?: string[];

  /** When this rule was created */
  created_at: string;

  /** When this rule was last modified */
  updated_at: string;
}

export type PolicySeverity =
  | "info"       // informational, no enforcement
  | "warning"    // logged but not blocking
  | "error"      // blocks execution
  | "critical";  // blocks execution and triggers alert

// ════════════════════════════════════════════════════════════════
// 4. POLICY CONDITIONS
// ════════════════════════════════════════════════════════════════

/**
 * PolicyCondition — a single evaluatable predicate.
 *
 * Conditions are pure comparisons against PolicyContext fields.
 * All conditions in a rule must be true for the rule to trigger (AND logic).
 * For OR logic, create separate rules.
 */
export interface PolicyCondition {
  /** Context field to evaluate */
  field: PolicyContextField;

  /** Comparison operator */
  operator: PolicyOperator;

  /** Value to compare against */
  value: unknown;

  /** Human-readable description */
  description?: string;
}

export type PolicyContextField =
  | "environment"
  | "stage"
  | "agent_id"
  | "agent_type"
  | "agent_mode"
  | "capability_id"
  | "capability_lifecycle"
  | "tool_name"
  | "attempt_number"
  | "total_retries_in_run"
  | "total_retry_others_in_run"
  | "run_cost_usd"
  | "estimated_task_cost_usd"
  | "run_elapsed_ms"
  | "estimated_task_latency_ms"
  | "concurrent_agents"
  | "last_validation_score"
  | "agent_confidence"
  | "run_metrics.total_rollbacks"
  | "run_metrics.total_cost_usd"
  | "run_metrics.total_elapsed_ms"
  | "run_metrics.total_tokens_used";

export type PolicyOperator =
  | "eq"          // ==
  | "neq"         // !=
  | "gt"          // >
  | "gte"         // >=
  | "lt"          // <
  | "lte"         // <=
  | "in"          // value ∈ list
  | "not_in"      // value ∉ list
  | "contains"    // string/array contains
  | "exists"      // field is not null/undefined
  | "not_exists"; // field is null/undefined

// ════════════════════════════════════════════════════════════════
// 5. POLICY ACTIONS
// ════════════════════════════════════════════════════════════════

/**
 * PolicyAction — what happens when a rule's conditions are met.
 *
 * Actions are declarative. The engine collects them;
 * the orchestrator/selection engine applies them.
 */
export interface PolicyAction {
  type: PolicyActionType;

  /** Action-specific parameters */
  params?: Record<string, unknown>;

  /** Human-readable description */
  description?: string;
}

export type PolicyActionType =
  | "block"                      // block execution entirely
  | "warn"                       // emit warning, allow execution
  | "deny_agent"                 // exclude specific agent
  | "deny_capability"            // suppress specific capability
  | "deny_tool"                  // block specific tool
  | "limit_retries"              // cap retry count
  | "limit_retry_other"          // cap retry_other count
  | "limit_cost"                 // enforce cost ceiling
  | "limit_latency"              // enforce latency ceiling
  | "limit_concurrency"          // cap concurrent agents
  | "limit_execution_time"       // cap total run time
  | "require_validation_score"   // enforce minimum validation score
  | "require_confidence"         // enforce minimum confidence
  | "apply_ranking_penalty"      // add penalty to selection ranking
  | "force_mode"                 // override agent mode
  | "force_rollback"             // force rollback to specific stage
  | "require_approval"           // require human approval before proceeding
  | "emit_alert"                 // emit alert event
  | "log";                       // log for audit

// ════════════════════════════════════════════════════════════════
// 6. POLICY EVALUATION RESULT
// ════════════════════════════════════════════════════════════════

/**
 * PolicyEvaluation — the result of evaluating a single rule
 * against a context.
 */
export interface PolicyEvaluation {
  rule_id: string;
  rule_name: string;
  scope: PolicyScope;
  severity: PolicySeverity;

  /** Whether the rule's conditions were met */
  triggered: boolean;

  /** Conditions that passed */
  conditions_met: PolicyCondition[];

  /** Conditions that failed (only if triggered == false) */
  conditions_unmet: PolicyCondition[];

  /** Actions to apply (only if triggered == true) */
  actions: PolicyAction[];

  /** Evaluation timestamp */
  evaluated_at: string;
}

// ════════════════════════════════════════════════════════════════
// 7. POLICY VIOLATION
// ════════════════════════════════════════════════════════════════

/**
 * PolicyViolation — a concrete violation detected during evaluation.
 *
 * Violations are collected and returned in the PolicyDecision.
 * They enable audit trails and observability.
 */
export interface PolicyViolation {
  /** Unique violation ID */
  violation_id: string;

  /** Rule that was violated */
  rule_id: string;
  rule_name: string;

  /** Severity of the violation */
  severity: PolicySeverity;

  /** Human-readable message */
  message: string;

  /** What triggered the violation */
  trigger_field: PolicyContextField;
  trigger_value: unknown;
  trigger_threshold: unknown;

  /** Action the policy prescribes */
  prescribed_action: PolicyActionType;

  /** Whether this violation blocks execution */
  blocking: boolean;
}

// ════════════════════════════════════════════════════════════════
// 8. POLICY DECISION
// ════════════════════════════════════════════════════════════════

/**
 * PolicyDecision — the final output of the policy engine.
 *
 * This is the primary artifact consumed by the orchestrator
 * and selection engine.
 *
 * A PolicyDecision is:
 *   - Self-contained
 *   - Auditable
 *   - Actionable
 */
export interface PolicyDecision {
  /** Decision ID for tracing */
  decision_id: string;

  /** Back-reference to context */
  run_id: string;
  task_id?: string;
  stage: StageName;

  /** Overall verdict */
  verdict: PolicyVerdict;

  /** Is execution allowed? */
  allowed: boolean;

  /** Is execution blocked? */
  blocked: boolean;

  /** Blocking violations (severity error/critical) */
  blocking_violations: PolicyViolation[];

  /** Non-blocking warnings */
  warnings: PolicyViolation[];

  /** All rules that were evaluated */
  evaluated_rules: PolicyEvaluation[];

  /** Rules that triggered (subset of evaluated) */
  applied_rules: PolicyEvaluation[];

  /** Modifiers to apply to selection/execution */
  policy_modifiers: PolicyModifier[];

  /** Recommended actions for the orchestrator */
  recommended_actions: PolicyRecommendation[];

  /** Timing */
  evaluated_at: string;
  evaluation_duration_ms: number;
}

export type PolicyVerdict =
  | "allow"              // all clear, proceed
  | "allow_with_warnings" // proceed but warnings logged
  | "block"              // blocked by error-severity rule
  | "block_critical"     // blocked by critical-severity rule
  | "require_approval";  // human approval needed

// ════════════════════════════════════════════════════════════════
// 9. POLICY MODIFIERS
// ════════════════════════════════════════════════════════════════

/**
 * PolicyModifier — adjustments the policy engine prescribes
 * for downstream systems (selection engine, orchestrator).
 */
export interface PolicyModifier {
  /** What is being modified */
  target: PolicyModifierTarget;

  /** The modification */
  modification: string;

  /** Parameters */
  params: Record<string, unknown>;

  /** Source rule */
  source_rule_id: string;
}

export type PolicyModifierTarget =
  | "selection_ranking"    // adjust ranking weights/penalties
  | "retry_limit"          // override retry limits
  | "cost_ceiling"         // set cost ceiling
  | "latency_ceiling"      // set latency ceiling
  | "concurrency_limit"    // set concurrency limit
  | "execution_time_limit" // set execution time limit
  | "agent_denylist"       // add agent to denylist
  | "tool_denylist"        // add tool to denylist
  | "capability_denylist"  // suppress capability
  | "mode_override"        // force agent mode
  | "validation_threshold" // set minimum validation score
  | "confidence_threshold"; // set minimum confidence

// ════════════════════════════════════════════════════════════════
// 10. POLICY RECOMMENDATIONS
// ════════════════════════════════════════════════════════════════

/**
 * PolicyRecommendation — advisory actions the policy engine
 * suggests to the orchestrator.
 *
 * Recommendations are non-binding. The orchestrator decides
 * whether to follow them.
 */
export interface PolicyRecommendation {
  action: PolicyActionType;
  reason: string;
  urgency: "low" | "medium" | "high" | "immediate";
  source_rule_id: string;
}

// ════════════════════════════════════════════════════════════════
// 11. POLICY OVERRIDE
// ════════════════════════════════════════════════════════════════

/**
 * PolicyOverride — a temporary exemption from a policy rule.
 *
 * Overrides must be:
 *   - Time-limited (expires_at)
 *   - Auditable (who approved, why)
 *   - Scoped (which rule, which context)
 */
export interface PolicyOverride {
  override_id: string;
  rule_id: string;

  /** Who approved this override */
  approved_by: string;

  /** Why the override was granted */
  reason: string;

  /** Scope of the override */
  scope: PolicyOverrideScope;

  /** When the override expires */
  expires_at: string;

  /** Whether the override is currently active */
  active: boolean;

  created_at: string;
}

export interface PolicyOverrideScope {
  run_id?: string;
  task_id?: string;
  agent_id?: string;
  capability_id?: string;
  stage?: StageName;
  environment?: PolicyEnvironment;
}

// ════════════════════════════════════════════════════════════════
// 12. POLICY SET
// ════════════════════════════════════════════════════════════════

/**
 * PolicySet — a named collection of policy rules.
 *
 * Policy sets enable:
 *   - Environment-specific rule groups
 *   - Versioned policy bundles
 *   - A/B testing of policy configurations
 */
export interface PolicySet {
  set_id: string;
  name: string;
  description: string;
  version: string;

  rules: PolicyRule[];
  overrides: PolicyOverride[];

  /** Default environment for this set */
  default_environment?: PolicyEnvironment;

  /** Whether this set is active */
  active: boolean;

  created_at: string;
  updated_at: string;
}

// ════════════════════════════════════════════════════════════════
// 13. POLICY ENGINE CONFIGURATION
// ════════════════════════════════════════════════════════════════

export interface PolicyEngineConfig {
  /** Whether to short-circuit on first blocking violation */
  short_circuit_on_block: boolean;

  /** Whether to evaluate all rules even after a block */
  evaluate_all_rules: boolean;

  /** Whether to include non-triggered rules in the decision */
  include_non_triggered: boolean;

  /** Maximum rules to evaluate per request (safety limit) */
  max_rules_per_evaluation: number;

  /** Default severity for rules without explicit severity */
  default_severity: PolicySeverity;

  /** Whether overrides are enabled */
  overrides_enabled: boolean;
}

export const DEFAULT_POLICY_ENGINE_CONFIG: PolicyEngineConfig = {
  short_circuit_on_block: false,
  evaluate_all_rules: true,
  include_non_triggered: false,
  max_rules_per_evaluation: 100,
  default_severity: "warning",
  overrides_enabled: true,
};

// ════════════════════════════════════════════════════════════════
// 14. POLICY EVENTS
// ════════════════════════════════════════════════════════════════

/**
 * Events emitted by the policy engine.
 * Extends the ProtocolRuntimeEvent taxonomy.
 */
export type PolicyEventType =
  | "policy.evaluation_started"
  | "policy.evaluation_completed"
  | "policy.rule_triggered"
  | "policy.violation_detected"
  | "policy.execution_blocked"
  | "policy.warning_issued"
  | "policy.override_applied"
  | "policy.override_expired"
  | "policy.modifier_applied"
  | "policy.approval_required";

// ════════════════════════════════════════════════════════════════
// 15. DEFAULT POLICY RULES
// ════════════════════════════════════════════════════════════════

/**
 * Built-in policy rule templates.
 *
 * These provide sensible defaults. Adapters can override or extend.
 */
export const DEFAULT_POLICY_RULES: PolicyRule[] = [
  // ── Retry Limits ──
  {
    rule_id: "builtin:max-retries-per-run",
    name: "Maximum retries per run",
    description: "Limits total retries within a single run to prevent infinite loops",
    scope: "global",
    priority: 100,
    enabled: true,
    version: "0.1.0",
    conditions: [
      { field: "total_retries_in_run", operator: "gte", value: 10 },
    ],
    actions: [
      { type: "block", description: "Max retries exceeded for this run" },
      { type: "emit_alert", description: "Run exceeded retry limit" },
    ],
    severity: "error",
    tags: ["safety", "retry"],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },

  // ── retry_other Limits ──
  {
    rule_id: "builtin:max-retry-other",
    name: "Maximum retry_other attempts",
    description: "Limits retry_other dispatches to prevent agent exhaustion",
    scope: "global",
    priority: 99,
    enabled: true,
    version: "0.1.0",
    conditions: [
      { field: "total_retry_others_in_run", operator: "gte", value: 5 },
    ],
    actions: [
      { type: "block", description: "Max retry_other attempts exceeded" },
    ],
    severity: "error",
    tags: ["safety", "retry"],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },

  // ── Experimental Capabilities in Production ──
  {
    rule_id: "builtin:no-experimental-in-prod",
    name: "Block experimental capabilities in production",
    description: "Prevents draft or deprecated capabilities from running in production",
    scope: "environment",
    priority: 95,
    enabled: true,
    version: "0.1.0",
    environments: ["production"],
    conditions: [
      { field: "capability_lifecycle", operator: "in", value: ["draft", "deprecated"] },
    ],
    actions: [
      { type: "deny_capability", description: "Experimental capability blocked in production" },
    ],
    severity: "error",
    tags: ["safety", "environment", "capability"],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },

  // ── Cost Budget ──
  {
    rule_id: "builtin:run-cost-limit",
    name: "Run cost budget",
    description: "Blocks execution when run cost exceeds $10 USD",
    scope: "global",
    priority: 90,
    enabled: true,
    version: "0.1.0",
    conditions: [
      { field: "run_cost_usd", operator: "gte", value: 10.0 },
    ],
    actions: [
      { type: "block", description: "Run cost budget exceeded" },
      { type: "emit_alert", description: "Cost limit reached" },
    ],
    severity: "critical",
    tags: ["cost", "budget"],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },

  // ── Execution Time Limit ──
  {
    rule_id: "builtin:max-execution-time",
    name: "Maximum run execution time",
    description: "Blocks execution after 30 minutes of total run time",
    scope: "global",
    priority: 88,
    enabled: true,
    version: "0.1.0",
    conditions: [
      { field: "run_elapsed_ms", operator: "gte", value: 1_800_000 },
    ],
    actions: [
      { type: "block", description: "Run exceeded maximum execution time" },
      { type: "emit_alert", description: "Execution time limit reached" },
    ],
    severity: "error",
    tags: ["safety", "latency"],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },

  // ── Concurrency Limit ──
  {
    rule_id: "builtin:max-concurrent-agents",
    name: "Maximum concurrent agents",
    description: "Limits concurrent agent executions to 5",
    scope: "global",
    priority: 85,
    enabled: true,
    version: "0.1.0",
    conditions: [
      { field: "concurrent_agents", operator: "gte", value: 5 },
    ],
    actions: [
      { type: "limit_concurrency", params: { max: 5 }, description: "Concurrency limit reached" },
    ],
    severity: "warning",
    tags: ["safety", "concurrency"],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },

  // ── Minimum Confidence ──
  {
    rule_id: "builtin:min-confidence-prod",
    name: "Minimum confidence in production",
    description: "Warns when agent confidence is below 0.6 in production",
    scope: "environment",
    priority: 80,
    enabled: true,
    version: "0.1.0",
    environments: ["production"],
    conditions: [
      { field: "agent_confidence", operator: "lt", value: 0.6 },
    ],
    actions: [
      { type: "warn", description: "Low confidence agent in production" },
      { type: "apply_ranking_penalty", params: { penalty: 0.10 }, description: "Penalty for low confidence" },
    ],
    severity: "warning",
    tags: ["quality", "confidence"],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },

  // ── Minimum Validation Score for Promotion ──
  {
    rule_id: "builtin:min-validation-for-promotion",
    name: "Minimum validation score for stage promotion",
    description: "Blocks promotion to next stage if validation score is below 0.70",
    scope: "stage",
    priority: 92,
    enabled: true,
    version: "0.1.0",
    stages: ["validation"],
    conditions: [
      { field: "last_validation_score", operator: "lt", value: 0.70 },
    ],
    actions: [
      { type: "block", description: "Validation score below promotion threshold" },
      { type: "force_rollback", params: { to_stage: "design" }, description: "Rollback to design" },
    ],
    severity: "error",
    tags: ["quality", "validation"],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

// ════════════════════════════════════════════════════════════════
// 16. POLICY ENGINE INTERFACE
// ════════════════════════════════════════════════════════════════

/**
 * IPolicyEngine — the contract that any policy engine
 * implementation must satisfy.
 *
 * The interface is intentionally minimal:
 *   - evaluate(): full pipeline (load → evaluate → decide)
 *   - evaluateRule(): single rule evaluation (for testing/preview)
 *   - checkAllowed(): quick boolean check
 */
export interface IPolicyEngine {
  /**
   * Full policy evaluation pipeline.
   * Produces a deterministic PolicyDecision.
   */
  evaluate(
    context: PolicyContext,
    rules: PolicyRule[],
    overrides?: PolicyOverride[],
    config?: PolicyEngineConfig,
  ): PolicyDecision;

  /**
   * Evaluate a single rule against context.
   * Useful for testing and previewing rule behavior.
   */
  evaluateRule(
    context: PolicyContext,
    rule: PolicyRule,
  ): PolicyEvaluation;

  /**
   * Quick boolean check: is this action allowed?
   * Shorthand for evaluate() + checking verdict.
   */
  checkAllowed(
    context: PolicyContext,
    rules: PolicyRule[],
    overrides?: PolicyOverride[],
  ): boolean;
}
