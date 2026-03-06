// Agent Runtime Protocol v0.1.1 — Contract Layer
// Pure type-level contracts. Zero runtime dependencies.
// Spec: docs/AGENT_RUNTIME_PROTOCOL.md
//
// BOUNDARY RULE (§A):
//   protocol.ts = contracts that cross boundaries (orchestrator ↔ agent ↔ tool ↔ storage)
//   types.ts    = internal domain abstractions and kernel semantics
//   If a type is exchanged between two runtime participants → protocol.ts
//   If a type is used only inside a single module → types.ts

import type {
  AgentType,
  AgentMode,
  StageName,
} from "./types.ts";

// ════════════════════════════════════════════════════════════════
// 5. RUN CONTRACT
// ════════════════════════════════════════════════════════════════

export interface Run {
  run_id: string;
  goal: string;
  status: "queued" | "running" | "completed" | "failed" | "blocked";
  current_stage: StageName;
  started_at: string;
  updated_at: string;
  completed_at?: string;
  rollback_count: number;
  metadata?: Record<string, unknown>;
}

// ════════════════════════════════════════════════════════════════
// 6. STAGE EXECUTION CONTRACT
// ════════════════════════════════════════════════════════════════

export interface StageExecution {
  run_id: string;
  stage_name: StageName;
  attempt: number;
  status: "queued" | "running" | "completed" | "failed" | "blocked";
  started_at: string;
  completed_at?: string;
  input_artifact_ids: string[];
  output_artifact_ids: string[];
  assigned_agent_ids: string[];
}

// ════════════════════════════════════════════════════════════════
// 7. AGENT TASK CONTRACT
// ════════════════════════════════════════════════════════════════

export interface AgentTask {
  task_id: string;
  run_id: string;
  stage: StageName;
  agent_id: string;
  agent_type: AgentType;
  mode: AgentMode;
  goal: string;
  instructions: string;
  context: AgentTaskContext;
  tool_access?: ToolCapability[];
  expected_outputs: ExpectedOutputSpec[];
  trace: TraceMetadata;
  timeout_ms?: number;
}

export interface AgentTaskContext {
  memory_snapshot?: Record<string, unknown>;
  input_artifacts?: ArtifactEnvelope[];
  previous_stage_outputs?: ArtifactEnvelope[];
  constraints?: string[];
  assumptions?: string[];
}

export interface ExpectedOutputSpec {
  kind: ArtifactKind;
  description: string;
  required: boolean;
}

// ════════════════════════════════════════════════════════════════
// 8. AGENT RESPONSE CONTRACT
// ════════════════════════════════════════════════════════════════

export interface AgentResponse {
  task_id: string;
  run_id: string;
  agent_id: string;
  status: "completed" | "failed" | "blocked";
  summary: string;
  reasoning_digest?: string;

  /**
   * Confidence score (§C).
   *
   * Definition: degree of confidence the agent has in the sufficiency
   * of the response it produced.
   *
   * Scale: 0.0 to 1.0 (standardized).
   *   0.0 = no confidence, output is speculative
   *   0.5 = partial confidence, key assumptions unverified
   *   0.8 = high confidence, minor uncertainties remain
   *   1.0 = full confidence, all constraints satisfied
   *
   * Rules:
   *   - Does NOT substitute external validation.
   *   - Must never be used as sole approval criterion.
   *   - May be used as auxiliary signal for:
   *     - retry decisions
   *     - escalation triggers
   *     - learning/prompt optimization
   *   - Agents that consistently over-report confidence
   *     should be flagged by the Evolution stage.
   */
  confidence: number;

  produced_artifacts?: ArtifactEnvelope[];
  tool_calls?: ToolExecutionResult[];
  recommendations?: string[];
  warnings?: string[];
  metrics?: AgentResponseMetrics;
  next_suggestions?: AgentNextSuggestions;
}

export interface AgentResponseMetrics {
  latency_ms?: number;
  tokens_in?: number;
  tokens_out?: number;
  cost_usd?: number;
}

export interface AgentNextSuggestions {
  suggested_stage?: StageName;
  retry_recommended?: boolean;
  escalation_recommended?: boolean;
}

// ════════════════════════════════════════════════════════════════
// 9. ARTIFACT ENVELOPE
// ════════════════════════════════════════════════════════════════

export interface ArtifactEnvelope {
  artifact_id: string;
  run_id: string;
  stage: StageName;
  kind: ArtifactKind;
  title: string;
  version: number;
  content: unknown;
  schema_version: string;
  created_by: ArtifactCreator;
  created_at: string;
  lineage?: ArtifactLineage;
  quality?: ArtifactQuality;
  tags?: string[];

  /**
   * Content hash (§D).
   *
   * Algorithm: SHA-256.
   * Input: canonicalized `content` field ONLY (not the envelope).
   *
   * Canonicalization rules:
   *   1. JSON.stringify with keys sorted alphabetically (stable serialization).
   *   2. No whitespace (compact form).
   *   3. Metadata, timestamps, version, tags are EXCLUDED from hash.
   *   4. Result: lowercase hex string.
   *
   * Purpose:
   *   - Deduplication across runs.
   *   - Incremental execution (skip unchanged artifacts).
   *   - Cache invalidation.
   *
   * Two artifacts with identical content_hash have semantically
   * identical content, regardless of envelope differences.
   */
  content_hash?: string;
}

export type ArtifactKind =
  | "brief"
  | "analysis"
  | "plan"
  | "architecture"
  | "code"
  | "workflow"
  | "report"
  | "feedback"
  | "spec";

export interface ArtifactCreator {
  agent_id: string;
  agent_type: AgentType;
}

export interface ArtifactLineage {
  parent_artifact_ids?: string[];
  derived_from_stage?: StageName;
}

export interface ArtifactQuality {
  validation_score?: number;
  approved?: boolean;
}

// ════════════════════════════════════════════════════════════════
// 10. TOOL PROTOCOL
// ════════════════════════════════════════════════════════════════

export interface ToolCapability {
  tool_name: string;
  description: string;
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  permissions?: string[];
  /** Default timeout for this tool in milliseconds */
  default_timeout_ms?: number;
}

export interface ToolInvocation {
  invocation_id: string;
  task_id: string;
  tool_name: string;
  arguments: Record<string, unknown>;
  requested_at: string;
  /**
   * Timeout semantics (§E).
   *
   * timeout_requested_ms: what the agent asked for.
   * The runtime may adjust this based on policy, queue depth,
   * or tool type. The effective timeout is recorded in
   * ToolExecutionResult.timeout_effective_ms.
   */
  timeout_requested_ms?: number;
}

export interface ToolExecutionResult {
  invocation_id: string;
  tool_name: string;
  status: "completed" | "failed" | "timeout";
  output?: unknown;
  error?: string;
  started_at: string;
  completed_at?: string;
  /** Timeout actually enforced by the runtime (§E) */
  timeout_effective_ms?: number;
}

// ════════════════════════════════════════════════════════════════
// 11. VALIDATION PROTOCOL
// ════════════════════════════════════════════════════════════════

export interface ValidationReport {
  run_id: string;
  stage: "validation";
  validator_agent_id: string;
  evaluated_artifact_ids: string[];
  dimensions: ValidationDimensions;
  average_score: number;
  threshold: number;
  decision: "pass" | "fail";
  issues: ValidationIssue[];
  recommendations: string[];
  created_at: string;
}

export interface ValidationDimensions {
  completeness: number;
  correctness: number;
  consistency: number;
  maintainability: number;
  goal_alignment: number;
}

export interface ValidationIssue {
  severity: "low" | "medium" | "high" | "critical";
  category: "logic" | "structure" | "scope" | "quality" | "goal-fit" | "technical";
  message: string;
  affected_artifact_id?: string;
  recommendation?: string;
}

// ════════════════════════════════════════════════════════════════
// 12. MEMORY PROTOCOL
// ════════════════════════════════════════════════════════════════

export interface MemoryEntry {
  key: string;
  run_id: string;
  scope: "run" | "stage" | "agent" | "global";
  value: unknown;
  created_at: string;
  updated_at?: string;
}

// ════════════════════════════════════════════════════════════════
// 13. RUNTIME EVENTS
// ════════════════════════════════════════════════════════════════

export type RuntimeEventType =
  | "run.created"
  | "stage.started"
  | "stage.completed"
  | "task.created"
  | "agent.started"
  | "agent.completed"
  | "agent.failed"
  | "agent.retried"
  | "agent.blocked"
  | "tool.requested"
  | "tool.completed"
  | "tool.failed"
  | "tool.timeout"
  | "artifact.created"
  | "validation.started"
  | "validation.completed"
  | "rollback.triggered"
  | "memory.written"
  | "run.completed"
  | "run.failed";

export interface ProtocolRuntimeEvent {
  event_id: string;
  run_id: string;
  stage?: StageName;
  agent_id?: string;
  task_id?: string;
  event_type: RuntimeEventType;
  timestamp: string;
  payload: Record<string, unknown>;
  trace: TraceMetadata;
}

// ════════════════════════════════════════════════════════════════
// 14. TRACE METADATA
// ════════════════════════════════════════════════════════════════

export interface TraceMetadata {
  correlation_id: string;
  causation_id?: string;
  parent_event_id?: string;
}

// ════════════════════════════════════════════════════════════════
// 15–16. FAILURE & RETRY SEMANTICS
// ════════════════════════════════════════════════════════════════

/**
 * Failure actions (§G — retry_other rules).
 *
 * "retry"       — Re-execute same agent, same input, incremented attempt.
 * "retry_other" — Dispatch to a DIFFERENT agent. Rules:
 *                 - Must be same agent_type.
 *                 - Mode MAY change (runtime decides based on failure context).
 *                 - Model/provider MAY change.
 *                 - Creates a NEW task (new task_id) with lineage to original.
 *                 - Original task is marked as "failed" (not overwritten).
 *                 - Does NOT increment attempt on original task.
 * "block"       — Pause execution, emit "agent.blocked", wait for resolution.
 * "rollback"    — Return to a previous stage.
 * "skip"        — Skip this agent, continue with remaining agents in stage.
 * "abort"       — Terminate the entire run.
 */
export type FailureAction =
  | "retry"
  | "retry_other"
  | "block"
  | "rollback"
  | "skip"
  | "abort";

export interface RetryPolicy {
  max_retries_per_task: number;
  retry_on_status: ("failed" | "blocked")[];
  backoff_strategy: "none" | "linear" | "exponential";
  backoff_base_ms?: number;
  escalation_after_retries?: boolean;
  /** Action when max retries exceeded */
  escalation_action?: FailureAction;
}

/**
 * retry_other dispatch contract (§G).
 *
 * When the runtime uses "retry_other":
 */
export interface RetryOtherDispatch {
  original_task_id: string;
  new_task_id: string;
  original_agent_id: string;
  new_agent_id: string;
  /** Must match original agent_type */
  agent_type: AgentType;
  /** May differ from original */
  new_mode?: AgentMode;
  reason: string;
  dispatched_at: string;
}

// ════════════════════════════════════════════════════════════════
// 17. ROLLBACK POLICY
// ════════════════════════════════════════════════════════════════

export interface RollbackPolicy {
  from_stage: "validation";
  to_stage: StageName;
  condition: "average_score_below_threshold";
  max_rollbacks: number;
}
