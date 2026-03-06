// Agent OS — Public API
// Single entry point for all Agent OS modules.

// Core Types
export type {
  AgentType,
  AgentMode,
  WorkStatus,
  StageName,
  AgentCapability,
  Artifact,
  WorkInput,
  WorkResult,
  ExecutionContext,
  RuntimeEvent,
  RuntimeEventType,
  AgentDefinition,
  StagePolicy,
  ValidationScore,
  RunState,
  IMemory,
} from "./types.ts";

// Classes
export { AgentOS } from "./orchestrator.ts";
export type { OrchestratorOptions } from "./orchestrator.ts";
export { AgentRegistry } from "./registry.ts";
export { EventBus } from "./event-bus.ts";
export type { EventListener } from "./event-bus.ts";
export { RuntimeMemory } from "./memory.ts";

// Functions
export { createDefaultPolicies } from "./policies.ts";
export { scoreArtifacts, averageScore, meetsThreshold } from "./scoring.ts";
export { cryptoRandomId, nowIso, createArtifact } from "./utils.ts";

// Protocol Contracts (v0.1.1)
export type {
  // Run
  Run,
  // Stage
  StageExecution,
  // Agent IO
  AgentTask,
  AgentTaskContext,
  ExpectedOutputSpec,
  AgentResponse,
  AgentResponseMetrics,
  AgentNextSuggestions,
  // Artifacts
  ArtifactEnvelope,
  ArtifactKind,
  ArtifactCreator,
  ArtifactLineage,
  ArtifactQuality,
  // Tools
  ToolCapability,
  ToolInvocation,
  ToolExecutionResult,
  // Validation
  ValidationReport,
  ValidationDimensions,
  ValidationIssue,
  // Memory
  MemoryEntry,
  // Events
  RuntimeEventType as ProtocolEventType,
  ProtocolRuntimeEvent,
  // Trace
  TraceMetadata,
  // Failure
  FailureAction,
  RetryPolicy,
  RetryOtherDispatch,
  RollbackPolicy,
} from "./protocol.ts";
