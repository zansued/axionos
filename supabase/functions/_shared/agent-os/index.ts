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
  Run,
  StageExecution,
  AgentTask,
  AgentTaskContext,
  ExpectedOutputSpec,
  AgentResponse,
  AgentResponseMetrics,
  AgentNextSuggestions,
  ArtifactEnvelope,
  ArtifactKind,
  ArtifactCreator,
  ArtifactLineage,
  ArtifactQuality,
  ToolCapability,
  ToolInvocation,
  ToolExecutionResult,
  ValidationReport,
  ValidationDimensions,
  ValidationIssue,
  MemoryEntry,
  RuntimeEventType as ProtocolEventType,
  ProtocolRuntimeEvent,
  TraceMetadata,
  FailureAction,
  RetryPolicy,
  RetryOtherDispatch,
  RollbackPolicy,
} from "./protocol.ts";

// Capability Model (v0.2)
export type {
  // Declaration
  CapabilityDeclaration,
  CapabilityLifecycleState,
  CapabilityInputSpec,
  CapabilityOutputSpec,
  CapabilityConstraint,
  // Identity & Profile
  AgentIdentity,
  AgentProfile,
  AgentCapabilityBinding,
  RoutingPreferences,
  // Requirements
  CapabilityRequirement,
  // Matching
  CapabilityMatchResult,
  CapabilityMatchDetail,
  SelectionPolicy,
  SelectionSortKey,
  // Fallback
  FallbackChain,
  DegradedCapability,
  // Scorecard
  CapabilityScorecard,
  ScorecardSummary,
  // Confidence Drift
  ConfidenceDriftStatus,
  ConfidenceDriftAction,
  // Performance
  PerformanceWeights,
  // Lifecycle
  CapabilityEvolutionEvent,
  CapabilityChangeType,
  CapabilityLifecycleTransition,
  CapabilityCatalog,
  // Events
  CapabilityEventType,
} from "./capabilities.ts";

export {
  DEFAULT_PERFORMANCE_WEIGHTS,
  CONFIDENCE_DRIFT_THRESHOLDS,
} from "./capabilities.ts";

// Selection Engine (v0.2)
export type {
  // Input
  SelectionInput,
  SelectionContext,
  RuntimeConstraint,
  RetrySelectionContext,
  RetryType,
  // Eligibility
  EligibilityResult,
  EligibleAgent,
  IneligibleAgent,
  EligibilityCheck,
  // Ranking
  RankedCandidate,
  CandidatePenalties,
  RankingResult,
  RankingWeights,
  PenaltyRecord,
  PenaltyType,
  // Decision
  SelectionDecision,
  SelectionOutcome,
  FallbackCandidate,
  // Rationale
  SelectionRationale,
  DecisionTraceEntry,
  DecisiveFactor,
  RejectedAlternative,
  SelectionFlag,
  // Trace
  SelectionTrace,
  // Summary
  EligibilitySummary,
  // Config
  SelectionEngineConfig,
  // Tie-breaking
  TieBreakKey,
  // Events
  SelectionEventType,
  // Modifier
  SelectionPolicyModifier,
  // Interface
  ISelectionEngine,
} from "./selection.ts";

export {
  DEFAULT_RANKING_WEIGHTS,
  STANDARD_PENALTIES,
  DEFAULT_SELECTION_ENGINE_CONFIG,
  DEFAULT_TIE_BREAK_ORDER,
} from "./selection.ts";
