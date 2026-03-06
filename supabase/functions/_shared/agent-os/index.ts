// Agent OS — Public API
// Single entry point for all Agent OS modules.

// Types
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

// Protocol Contracts
export type {
  RunContract,
  RunConfig,
  StagePolicyRef,
  RunResult,
  RunTrace,
  StageContract,
  AgentAssignment,
  StageResult,
  StageTrace,
  TaskEnvelope,
  ToolDeclaration,
  AgentResponse,
  AgentDecision,
  AgentMetrics,
  ArtifactEnvelope,
  ArtifactKind,
  ArtifactLineage,
  ToolInvocation,
  ToolResult,
  ValidationReport,
  ValidationFinding,
  ValidationSuggestion,
  ProtocolEventType,
  ProtocolEvent,
  TraceContext,
  TraceMetadata,
  FailureAction,
  FailurePolicy,
  FailureReport,
  FailureErrorType,
} from "./protocol.ts";
