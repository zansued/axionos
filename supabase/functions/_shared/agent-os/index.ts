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

// Policy Engine (v0.1)
export type {
  // Scope
  PolicyScope,
  PolicyEnvironment,
  // Context
  PolicyContext,
  RunMetricsSnapshot,
  // Rules
  PolicyRule,
  PolicySeverity,
  PolicyCondition,
  PolicyContextField,
  PolicyOperator,
  PolicyAction,
  PolicyActionType,
  // Evaluation
  PolicyEvaluation,
  PolicyViolation,
  // Decision
  PolicyDecision,
  PolicyVerdict,
  PolicyModifier,
  PolicyModifierTarget,
  PolicyRecommendation,
  // Overrides
  PolicyOverride,
  PolicyOverrideScope,
  // Sets
  PolicySet,
  // Config
  PolicyEngineConfig,
  // Events
  PolicyEventType,
  // Interface
  IPolicyEngine,
} from "./policy-engine.ts";

export {
  POLICY_SCOPE_PRECEDENCE,
  DEFAULT_POLICY_ENGINE_CONFIG,
  DEFAULT_POLICY_RULES,
} from "./policy-engine.ts";

// Artifact Store (v0.1)
export type {
  // Record
  ArtifactRecord,
  ArtifactStorageMeta,
  // Versioning
  ArtifactVersionInfo,
  VersionCreator,
  ArtifactVersion,
  // Lineage
  ArtifactLineageRecord,
  ArtifactRelationType,
  ArtifactLineageGraph,
  // Reference
  ArtifactReference,
  // Hashing
  ContentHashSpec,
  ArtifactHashEntry,
  DuplicateCheckResult,
  // Write
  ArtifactWriteRequest,
  ArtifactWriteResult,
  // Retrieval
  ArtifactRetrievalRequest,
  ArtifactRetrievalResult,
  // Query
  ArtifactQuery,
  ArtifactSortKey,
  ArtifactQueryResult,
  // History
  ArtifactHistory,
  // Run Reconstruction
  RunArtifactManifest,
  // Config
  ArtifactStoreConfig,
  // Events
  ArtifactStoreEventType,
  // Interface
  IArtifactStore,
} from "./artifact-store.ts";

export {
  CONTENT_HASH_SPEC,
  DEFAULT_ARTIFACT_STORE_CONFIG,
} from "./artifact-store.ts";

// Observability & Telemetry Layer (v0.3)
export type {
  TelemetryEvent,
  TelemetryCategory,
  ExecutionTrace,
  TraceStatus,
  TraceEntry,
  TraceEntryKind,
  TraceSummary,
  MetricSample,
  MetricUnit,
  MetricDimension,
  MetricAggregate,
  MetricWindow,
  RunMetrics,
  StageMetrics,
  AgentMetrics,
  CapabilityMetrics,
  ToolMetrics,
  CostRecord,
  CostCategory,
  TokenUsage,
  CostMetrics,
  ExecutionError,
  ErrorType,
  FailureMetrics,
  RetryMetrics,
  FallbackMetrics,
  TelemetryExportResult,
  ITelemetrySink,
  ObservabilityConfig,
  IObservabilityLayer,
  ObservabilityEventType,
} from "./observability.ts";

export {
  DEFAULT_OBSERVABILITY_CONFIG,
} from "./observability.ts";
