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

// LLM Adapter Layer (v0.4)
export type {
  LLMMessageRole,
  LLMMessage,
  LLMToolDefinition,
  LLMToolChoice,
  LLMInvocation,
  LLMResponseFormat,
  LLMTraceMetadata,
  LLMResponse,
  LLMToolCall,
  LLMFinishReason,
  LLMUsage,
  LLMPricing,
  LLMProviderMetadata,
  LLMModelDescriptor,
  LLMModality,
  LLMQualityTier,
  LLMLatencyClass,
  LLMError,
  LLMErrorType,
  LLMRoutingHints,
  ILLMAdapter,
  LLMStreamChunk,
  ILLMAdapterRegistry,
  LLMAdapterConfig,
  LLMAdapterEventType,
} from "./llm-adapter.ts";

export {
  DEFAULT_LLM_ADAPTER_CONFIG,
} from "./llm-adapter.ts";

// Tool Adapter Layer (v0.5)
export type {
  ToolCapability as ToolAdapterCapability,
  ToolDescriptor,
  ToolExecutionMode,
  ToolInvocationRequest,
  ToolTraceMetadata,
  ToolExecutionContext,
  ToolEnvironment,
  ToolResourceLimits,
  ToolExecutionResult,
  ToolExecutionStatus,
  ToolExecutionError,
  ToolErrorType,
  ToolPermissionKind,
  ToolPermissionResult,
  IToolPermissionEvaluator,
  IToolAdapter,
  IToolAdapterRegistry,
  ToolExecutionMetrics,
  ToolAggregateMetrics,
  ToolAdapterConfig,
  ToolAdapterEventType,
} from "./tool-adapter.ts";

export {
  DEFAULT_TOOL_ADAPTER_CONFIG,
} from "./tool-adapter.ts";

// Memory System (v0.6)
export type {
  PersistentMemoryType,
  MemoryRecord,
  MemoryContent,
  MemoryContentFormat,
  MemoryReference,
  MemoryRefType,
  MemoryEmbeddingVector,
  MemorySimilarityResult,
  MemoryDistanceMetric,
  MemoryVectorQuery,
  MemoryQuery,
  MemorySortKey,
  MemoryQueryResult,
  MemoryWriteRequest,
  MemoryWriteResult,
  MemoryRetrievalRequest,
  MemoryRetrievalResult,
  MemoryTraceMetadata,
  MemoryRetentionInfo,
  MemoryRetentionPolicy,
  MemoryRetentionStrategy,
  IMemoryEmbeddingProvider,
  IMemoryStore,
  MemorySystemConfig,
  MemorySystemEventType,
} from "./memory-system.ts";

export {
  DEFAULT_RETENTION_POLICIES,
  DEFAULT_MEMORY_SYSTEM_CONFIG,
} from "./memory-system.ts";

// Adaptive Routing System (v0.7)
export type {
  RoutingStrategyMode,
  RoutingStrategy,
  RoutingWeights,
  AgentPerformanceProfile,
  CapabilityPerformanceProfile,
  PerformanceSnapshot,
  RoutingSignal,
  RoutingSignalType,
  SignalTrend,
  RoutingAdjustment,
  RoutingAdjustmentAction,
  RoutingAdjustmentResult,
  RoutingDecisionFeedback,
  ExplorationConfig,
  ExplorationMethod,
  IAdaptiveRouter,
  AdaptiveRoutingConfig,
  AdaptiveRoutingEventType,
} from "./adaptive-routing.ts";

export {
  DEFAULT_ROUTING_WEIGHTS,
  DEFAULT_EXPLORATION_CONFIG,
  DEFAULT_ADAPTIVE_ROUTING_CONFIG,
} from "./adaptive-routing.ts";

// Multi-Agent Coordination System (v0.8)
export type {
  CoordinationStrategyType,
  CoordinationStrategy,
  AgentRole,
  AgentRoleType,
  RoleAssignment,
  CoordinationStepTemplate,
  CoordinationStepType,
  CoordinationCondition,
  CoordinationPlan,
  CoordinationState,
  CoordinationStatus,
  CoordinationIteration,
  CoordinationStepExecution,
  InteractionOutcome,
  CoordinationVote,
  IterationRules,
  CoordinationTerminationReason,
  CoordinationResult,
  ICoordinationManager,
  CoordinationConfig,
  CoordinationEventType,
} from "./coordination.ts";

export {
  DEFAULT_ITERATION_RULES,
  DEFAULT_COORDINATION_CONFIG,
} from "./coordination.ts";

// Distributed Agent Runtime (v0.9)
export type {
  DistributedTask,
  DistributedTaskType,
  TaskPriority,
  DistributedTaskStatus,
  TaskResourceRequirements,
  TaskRetryPolicy,
  DistributedTraceMetadata,
  TaskAssignment,
  TaskExecutionResult as DistributedTaskExecutionResult,
  TaskFailure,
  TaskFailureType,
  TaskExecutionMetrics as DistributedTaskExecutionMetrics,
  WorkerDescriptor,
  WorkerType,
  WorkerStatus,
  WorkerCapabilities,
  WorkerResources,
  WorkerHeartbeat,
  WorkerHealthAssessment,
  WorkerHealthAction,
  ITaskQueue,
  IWorkerRegistry,
  ITaskScheduler,
  SchedulerMetrics,
  IDistributedRuntime,
  DistributedRuntimeConfig,
  DistributedRuntimeEventType,
} from "./distributed-runtime.ts";

export {
  DEFAULT_TASK_RETRY_POLICY,
  DEFAULT_DISTRIBUTED_RUNTIME_CONFIG,
} from "./distributed-runtime.ts";
