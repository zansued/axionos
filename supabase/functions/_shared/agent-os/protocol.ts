// Agent Runtime Protocol — Contract Layer
// Pure type-level contracts. Zero runtime dependencies.
// Standardizes how agents execute, communicate, fail and recover.
//
// ┌──────────────────────────────────────────────────────────────┐
// │                    PROTOCOL ARCHITECTURE                     │
// │                                                              │
// │  RunContract ─┐                                              │
// │               ├─ StageContract ─┐                            │
// │               │                 ├─ TaskEnvelope (input)      │
// │               │                 ├─ AgentResponse (output)    │
// │               │                 ├─ ToolInvocation / Result   │
// │               │                 ├─ ArtifactEnvelope          │
// │               │                 └─ ValidationReport          │
// │               │                                              │
// │               ├─ TraceMetadata (observability)               │
// │               ├─ ProtocolEvent (event taxonomy)              │
// │               └─ FailureSemantics (retry/block/rollback)     │
// └──────────────────────────────────────────────────────────────┘
//
// DESIGN RATIONALE:
// 1. Contracts are pure interfaces — no classes, no side effects.
// 2. Every interaction between orchestrator ↔ agent is typed.
// 3. Tool calls are first-class: agents request tools, orchestrator resolves.
// 4. Every agent response carries trace metadata for cost/latency tracking.
// 5. Failure semantics are explicit: retry, block, rollback, abort.
// 6. Artifact envelopes carry lineage (who produced, from which stage).
// 7. Validation reports are structured for scoring + learning.
// 8. Events form an append-only audit log with causal ordering.

import type {
  AgentType,
  AgentMode,
  StageName,
  WorkStatus,
  ValidationScore,
} from "./types.ts";

// ════════════════════════════════════════════════════════════════
// 1. RUN CONTRACT
// Top-level envelope for an entire pipeline execution.
// ════════════════════════════════════════════════════════════════

export interface RunContract {
  runId: string;
  goal: string;
  constraints: string[];
  context: Record<string, unknown>;
  inputArtifacts: ArtifactEnvelope[];
  config: RunConfig;
  createdAt: string;
}

export interface RunConfig {
  maxRollbacks: number;
  maxRetries: number;
  timeoutMs: number;
  policies: StagePolicyRef[];
  /** Feature flags for experimental capabilities */
  flags?: Record<string, boolean>;
}

export interface StagePolicyRef {
  stage: StageName;
  requiredTypes: AgentType[];
  minSuccessScore?: number;
  nextOnSuccess: StageName;
  nextOnFailure?: StageName;
}

export interface RunResult {
  runId: string;
  status: "completed" | "failed" | "aborted";
  stages: StageResult[];
  artifacts: ArtifactEnvelope[];
  score?: ValidationScore;
  trace: RunTrace;
  completedAt: string;
}

export interface RunTrace {
  totalDurationMs: number;
  totalTokens: number;
  totalCostUsd: number;
  stagesExecuted: number;
  rollbacks: number;
  agentInvocations: number;
  toolInvocations: number;
}

// ════════════════════════════════════════════════════════════════
// 2. STAGE EXECUTION CONTRACT
// Defines input/output for a single stage in the pipeline.
// ════════════════════════════════════════════════════════════════

export interface StageContract {
  runId: string;
  stage: StageName;
  attempt: number;
  inputArtifacts: ArtifactEnvelope[];
  assignedAgents: AgentAssignment[];
  startedAt: string;
}

export interface AgentAssignment {
  agentId: string;
  agentName: string;
  agentType: AgentType;
  mode: AgentMode;
}

export interface StageResult {
  runId: string;
  stage: StageName;
  attempt: number;
  status: "completed" | "failed" | "rolled_back";
  agentResults: AgentResponse[];
  producedArtifacts: ArtifactEnvelope[];
  validationReport?: ValidationReport;
  trace: StageTrace;
  completedAt: string;
}

export interface StageTrace {
  durationMs: number;
  tokens: number;
  costUsd: number;
  agentCount: number;
  artifactCount: number;
}

// ════════════════════════════════════════════════════════════════
// 3. AGENT TASK INPUT CONTRACT (TaskEnvelope)
// What the orchestrator sends to an agent.
// ════════════════════════════════════════════════════════════════

export interface TaskEnvelope {
  taskId: string;
  runId: string;
  stage: StageName;
  agentId: string;
  agentType: AgentType;
  mode: AgentMode;

  /** The goal for this specific task */
  goal: string;
  constraints: string[];

  /** Artifacts available as input */
  inputArtifacts: ArtifactEnvelope[];

  /** Memory snapshot relevant to this task */
  memorySnapshot: Record<string, unknown>;

  /** Available tools the agent may invoke */
  availableTools: ToolDeclaration[];

  /** Trace context for correlation */
  traceContext: TraceContext;

  issuedAt: string;
}

export interface ToolDeclaration {
  toolId: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}

// ════════════════════════════════════════════════════════════════
// 4. AGENT RESPONSE OUTPUT CONTRACT
// What an agent returns after execution.
// ════════════════════════════════════════════════════════════════

export interface AgentResponse {
  taskId: string;
  agentId: string;
  agentType: AgentType;
  mode: AgentMode;
  status: WorkStatus;

  /** Human-readable summary of what was done */
  summary: string;

  /** Structured decisions made during execution */
  decisions: AgentDecision[];

  /** Artifacts produced */
  artifacts: ArtifactEnvelope[];

  /** Tool calls made during execution */
  toolCalls: ToolResult[];

  /** Confidence in the output (0.0 - 1.0) */
  confidence: number;

  /** Metrics for observability */
  metrics: AgentMetrics;

  /** Suggested next stage (advisory, orchestrator decides) */
  nextSuggestedStage?: StageName;

  /** Execution logs */
  logs: string[];

  /** Trace metadata */
  trace: TraceMetadata;

  completedAt: string;
}

export interface AgentDecision {
  id: string;
  category: string;
  decision: string;
  reason: string;
  impact: "low" | "medium" | "high" | "critical";
  reversible: boolean;
}

export interface AgentMetrics {
  durationMs: number;
  tokensInput: number;
  tokensOutput: number;
  totalTokens: number;
  costUsd: number;
  toolCallCount: number;
  artifactCount: number;
  retryCount: number;
}

// ════════════════════════════════════════════════════════════════
// 5. ARTIFACT ENVELOPE CONTRACT
// Wraps any artifact with lineage and versioning metadata.
// ════════════════════════════════════════════════════════════════

export interface ArtifactEnvelope {
  artifactId: string;
  kind: ArtifactKind;
  title: string;
  content: unknown;

  /** Semantic version within this run */
  version: number;

  /** Who produced this artifact */
  producedBy: ArtifactLineage;

  /** Content hash for deduplication / incremental checks */
  contentHash?: string;

  /** Schema identifier for content validation */
  schemaRef?: string;

  createdAt: string;
  metadata?: Record<string, unknown>;
}

export type ArtifactKind =
  | "brief"
  | "plan"
  | "architecture"
  | "schema"
  | "api_contract"
  | "code"
  | "test"
  | "config"
  | "migration"
  | "documentation"
  | "analysis"
  | "feedback"
  | "validation_report"
  | "custom";

export interface ArtifactLineage {
  agentId: string;
  agentType: AgentType;
  mode: AgentMode;
  stage: StageName;
  runId: string;
  taskId: string;
}

// ════════════════════════════════════════════════════════════════
// 6. TOOL INVOCATION & TOOL RESULT CONTRACTS
// First-class tool calls: agents request, orchestrator resolves.
// ════════════════════════════════════════════════════════════════

export interface ToolInvocation {
  invocationId: string;
  taskId: string;
  agentId: string;
  toolId: string;
  toolName: string;
  input: Record<string, unknown>;
  issuedAt: string;
}

export interface ToolResult {
  invocationId: string;
  toolId: string;
  toolName: string;
  status: "success" | "error" | "timeout";
  output?: unknown;
  error?: string;
  durationMs: number;
  completedAt: string;
}

// ════════════════════════════════════════════════════════════════
// 7. VALIDATION REPORT CONTRACT
// Structured output from the validation stage.
// ════════════════════════════════════════════════════════════════

export interface ValidationReport {
  reportId: string;
  runId: string;
  stage: "validation";
  score: ValidationScore;
  averageScore: number;
  threshold: number;
  passed: boolean;

  /** Per-dimension findings */
  findings: ValidationFinding[];

  /** Actionable suggestions for improvement */
  suggestions: ValidationSuggestion[];

  /** Artifacts that were validated */
  validatedArtifacts: string[]; // artifact IDs

  completedAt: string;
}

export interface ValidationFinding {
  id: string;
  dimension: keyof ValidationScore;
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  artifactId?: string;
  filePath?: string;
}

export interface ValidationSuggestion {
  id: string;
  targetStage: StageName;
  targetAgentType: AgentType;
  suggestion: string;
  priority: number;
}

// ════════════════════════════════════════════════════════════════
// 8. RUNTIME EVENT CONTRACT (Event Taxonomy)
// Append-only audit log with causal ordering.
// ════════════════════════════════════════════════════════════════

export type ProtocolEventType =
  // Run lifecycle
  | "run.created"
  | "run.completed"
  | "run.failed"
  | "run.aborted"
  // Stage lifecycle
  | "stage.started"
  | "stage.completed"
  | "stage.failed"
  | "stage.rolled_back"
  // Agent lifecycle
  | "agent.task_issued"
  | "agent.started"
  | "agent.completed"
  | "agent.failed"
  | "agent.retried"
  | "agent.blocked"
  // Artifact lifecycle
  | "artifact.created"
  | "artifact.versioned"
  | "artifact.invalidated"
  // Tool lifecycle
  | "tool.invoked"
  | "tool.completed"
  | "tool.failed"
  | "tool.timeout"
  // Validation lifecycle
  | "validation.started"
  | "validation.passed"
  | "validation.failed"
  | "validation.report_created"
  // Memory lifecycle
  | "memory.written"
  | "memory.read"
  | "memory.snapshot";

export interface ProtocolEvent {
  eventId: string;
  type: ProtocolEventType;
  timestamp: string;
  runId: string;
  stage?: StageName;
  agentId?: string;
  taskId?: string;
  payload: Record<string, unknown>;

  /** Causal parent event for ordering */
  causedBy?: string;
}

// ════════════════════════════════════════════════════════════════
// 9. TRACE METADATA CONTRACT
// Attached to every agent response for cost/latency tracking.
// ════════════════════════════════════════════════════════════════

export interface TraceContext {
  runId: string;
  stage: StageName;
  taskId: string;
  parentEventId?: string;
  correlationId?: string;
}

export interface TraceMetadata {
  traceId: string;
  runId: string;
  stage: StageName;
  taskId: string;
  agentId: string;
  model?: string;
  provider?: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
  cacheHit: boolean;
  retryAttempt: number;
}

// ════════════════════════════════════════════════════════════════
// 10. FAILURE SEMANTICS — Retry, Block, Rollback, Abort
// ════════════════════════════════════════════════════════════════

export type FailureAction =
  | "retry"       // Re-execute the same agent with same input
  | "retry_other" // Re-execute with a different agent of same type
  | "block"       // Pause execution, wait for external resolution
  | "rollback"    // Return to a previous stage (e.g. validation → design)
  | "skip"        // Skip this agent, continue with remaining
  | "abort";      // Terminate the entire run

export interface FailurePolicy {
  /** Which failure action to take */
  action: FailureAction;

  /** Max retries before escalating to next action */
  maxRetries: number;

  /** Delay between retries in ms */
  retryDelayMs: number;

  /** Exponential backoff multiplier */
  backoffMultiplier: number;

  /** Stage to rollback to (when action = "rollback") */
  rollbackTarget?: StageName;

  /** Escalation action when maxRetries exceeded */
  escalation: FailureAction;
}

export interface FailureReport {
  failureId: string;
  runId: string;
  stage: StageName;
  agentId: string;
  taskId: string;

  /** Error classification */
  errorType: FailureErrorType;
  errorMessage: string;
  errorStack?: string;

  /** What action was taken */
  actionTaken: FailureAction;
  retryAttempt: number;

  /** Resolution state */
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;

  occurredAt: string;
}

export type FailureErrorType =
  | "agent_error"        // Agent threw during execution
  | "tool_error"         // Tool call failed
  | "timeout"            // Agent or tool exceeded time limit
  | "validation_error"   // Output failed schema validation
  | "scoring_below_threshold" // Validation score too low
  | "no_agents_available"    // No agents matched for stage
  | "policy_violation"       // Agent violated a contract
  | "resource_exhausted"     // Token/cost budget exceeded
  | "external_dependency";   // External service failure

// ════════════════════════════════════════════════════════════════
// EXAMPLE EXECUTION FLOW
// ════════════════════════════════════════════════════════════════
//
// 1. Orchestrator creates RunContract { runId, goal, constraints }
//    → emits "run.created"
//
// 2. Stage "perception" starts
//    → emits "stage.started"
//    → creates TaskEnvelope for Perception Agent
//    → emits "agent.task_issued"
//
// 3. Perception Agent executes
//    → emits "agent.started"
//    → produces ArtifactEnvelope { kind: "brief" }
//    → returns AgentResponse { confidence: 0.92 }
//    → emits "artifact.created", "agent.completed"
//
// 4. Stage "perception" completes
//    → emits "stage.completed"
//    → transitions to "design"
//
// 5. Stage "design" starts
//    → Design Agent receives brief artifact as input
//    → may invoke tools (e.g. schema generator)
//    → emits "tool.invoked", "tool.completed"
//    → produces ArtifactEnvelope { kind: "architecture" }
//    → returns AgentResponse with decisions[]
//
// 6. Stage "build" starts
//    → Build Agent receives architecture + brief
//    → produces code artifacts
//
// 7. Stage "validation" starts
//    → Validation Agent reviews all artifacts
//    → produces ValidationReport
//    → IF score < threshold:
//       → emits "validation.failed"
//       → creates FailureReport { action: "rollback", rollbackTarget: "design" }
//       → emits "stage.rolled_back"
//       → returns to "design" (attempt 2)
//    → IF score >= threshold:
//       → emits "validation.passed"
//       → transitions to "evolution"
//
// 8. Stage "evolution" starts
//    → Evolution Agent extracts learnings
//    → writes to memory
//    → emits "memory.written"
//
// 9. Run completes
//    → emits "run.completed" with RunResult + RunTrace
//
