// Agent Runtime Protocol v0.1 — Contract Layer
// Pure type-level contracts. Zero runtime dependencies.
// Spec: docs/AGENT_RUNTIME_PROTOCOL.md

import type {
  AgentType,
  AgentMode,
  StageName,
  ValidationScore,
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
}

export interface ToolInvocation {
  invocation_id: string;
  task_id: string;
  tool_name: string;
  arguments: Record<string, unknown>;
  requested_at: string;
}

export interface ToolExecutionResult {
  invocation_id: string;
  tool_name: string;
  status: "completed" | "failed";
  output?: unknown;
  error?: string;
  started_at: string;
  completed_at?: string;
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
  | "tool.requested"
  | "tool.completed"
  | "artifact.created"
  | "validation.completed"
  | "rollback.triggered"
  | "run.completed"
  | "run.failed";

export interface ProtocolRuntimeEvent {
  event_id: string;
  run_id: string;
  stage?: StageName;
  agent_id?: string;
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

export interface RetryPolicy {
  max_retries_per_task: number;
  retry_on_status: ("failed" | "blocked")[];
  backoff_strategy: "none" | "linear" | "exponential";
  escalation_after_retries?: boolean;
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
