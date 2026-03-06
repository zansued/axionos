// Agent Capability Model v0.1 — Contract Layer
// Pure type-level contracts. Zero runtime dependencies.
// Spec: docs/AGENT_CAPABILITY_MODEL.md
//
// DESIGN RATIONALE:
//
// Agent identity and agent capability are separate concerns.
// An agent IS a runtime process. A capability is WHAT it can do.
//
// This separation enables:
//   - Same agent type with different capability profiles
//   - Capability-based routing (match task requirements to agent skills)
//   - Hot-swapping agents without changing task definitions
//   - Performance tracking per capability, not per agent identity
//   - Capability evolution independent of agent code
//
// The model has three layers:
//   1. Declaration — what an agent CAN do
//   2. Matching   — what a task NEEDS vs what agents OFFER
//   3. Tracking   — how well an agent PERFORMS each capability

import type {
  AgentType,
  AgentMode,
  StageName,
} from "./types.ts";

// ════════════════════════════════════════════════════════════════
// 1. CAPABILITY DECLARATION
// ════════════════════════════════════════════════════════════════

/**
 * A capability is a discrete, named skill that an agent can perform.
 *
 * Capabilities are orthogonal to agent type and mode.
 * An agent of type "build" might have capabilities:
 *   - "code_generation"
 *   - "test_generation"
 *   - "migration_authoring"
 *
 * Capabilities are versioned independently of the agent.
 */
export interface CapabilityDeclaration {
  /** Unique capability identifier (e.g. "code_generation") */
  capability_id: string;

  /** Human-readable name */
  name: string;

  /** What this capability does */
  description: string;

  /** Semantic version of this capability definition */
  version: string;

  /** Which agent types may declare this capability */
  valid_for_types: AgentType[];

  /** Which modes activate this capability */
  valid_modes: AgentMode[];

  /** Which stages this capability is relevant in */
  valid_stages: StageName[];

  /** Input requirements for exercising this capability */
  input_requirements: CapabilityInputSpec[];

  /** What this capability produces */
  output_guarantees: CapabilityOutputSpec[];

  /** Hard constraints the capability operates under */
  constraints?: CapabilityConstraint[];

  /** Tags for filtering and categorization */
  tags?: string[];
}

export interface CapabilityInputSpec {
  /** Name of the required input */
  name: string;
  /** Description of what is needed */
  description: string;
  /** Whether this input is mandatory */
  required: boolean;
  /** Expected artifact kind, if applicable */
  artifact_kind?: string;
}

export interface CapabilityOutputSpec {
  /** Name of the guaranteed output */
  name: string;
  /** Description of what is produced */
  description: string;
  /** Artifact kind produced */
  artifact_kind?: string;
  /** Whether this output is always produced */
  guaranteed: boolean;
}

export interface CapabilityConstraint {
  /** Constraint identifier */
  key: string;
  /** What this constraint enforces */
  description: string;
  /** Constraint type for programmatic evaluation */
  type: "max_tokens" | "max_cost_usd" | "max_latency_ms" | "requires_tool" | "custom";
  /** Constraint value */
  value: unknown;
}

// ════════════════════════════════════════════════════════════════
// 2. AGENT CAPABILITY PROFILE
// ════════════════════════════════════════════════════════════════

/**
 * An AgentProfile binds an agent identity to its capabilities.
 *
 * This is the bridge between WHO the agent is and WHAT it can do.
 * The profile is registered in the AgentRegistry and used by the
 * router for capability-based matching.
 */
export interface AgentProfile {
  /** Agent identity */
  agent_id: string;
  agent_name: string;
  agent_type: AgentType;

  /** Supported modes */
  supported_modes: AgentMode[];

  /** Declared capabilities with agent-specific config */
  capabilities: AgentCapabilityBinding[];

  /** Global priority for tie-breaking (higher = preferred) */
  priority: number;

  /** Whether this agent is currently available */
  status: "active" | "inactive" | "degraded";

  /** Profile version (incremented on capability changes) */
  profile_version: number;

  /** Provider/model backing this agent (for observability) */
  provider?: string;
  model?: string;

  /** Maximum concurrent tasks this agent can handle */
  max_concurrency?: number;

  /** Cost tier for budget-aware routing */
  cost_tier?: "low" | "medium" | "high";
}

/**
 * Binds a capability to a specific agent with agent-level overrides.
 */
export interface AgentCapabilityBinding {
  capability_id: string;

  /** Agent-specific priority for this capability */
  priority: number;

  /** Confidence floor: minimum confidence this agent reports for this capability */
  confidence_floor?: number;

  /** Agent-specific constraint overrides */
  constraint_overrides?: CapabilityConstraint[];

  /** Whether this binding is currently enabled */
  enabled: boolean;
}

// ════════════════════════════════════════════════════════════════
// 3. CAPABILITY REQUIREMENTS (Task Side)
// ════════════════════════════════════════════════════════════════

/**
 * CapabilityRequirement defines what a task NEEDS.
 * The router matches these against AgentProfile.capabilities.
 */
export interface CapabilityRequirement {
  /** Required capability */
  capability_id: string;

  /** Whether this capability is mandatory or preferred */
  priority: "required" | "preferred" | "optional";

  /** Minimum acceptable performance score (0.0 - 1.0) */
  min_performance_score?: number;

  /** Maximum acceptable cost for this capability */
  max_cost_usd?: number;

  /** Maximum acceptable latency */
  max_latency_ms?: number;

  /** Specific mode required */
  required_mode?: AgentMode;
}

// ════════════════════════════════════════════════════════════════
// 4. MATCHING & ROUTING
// ════════════════════════════════════════════════════════════════

/**
 * MatchResult represents the outcome of matching a task's
 * requirements against an agent's capabilities.
 */
export interface CapabilityMatchResult {
  agent_id: string;
  agent_type: AgentType;

  /** Overall match score (0.0 - 1.0) */
  match_score: number;

  /** Per-requirement match detail */
  matches: CapabilityMatchDetail[];

  /** Requirements that were NOT matched */
  unmatched: string[];

  /** Whether all "required" capabilities are satisfied */
  fully_qualified: boolean;

  /** Estimated cost based on agent profile */
  estimated_cost_usd?: number;
}

export interface CapabilityMatchDetail {
  capability_id: string;
  requirement_priority: "required" | "preferred" | "optional";
  matched: boolean;
  /** Performance score from tracking history */
  performance_score?: number;
  /** Agent-specific priority for this capability */
  agent_priority: number;
}

/**
 * Selection criteria for choosing among matched agents.
 */
export interface SelectionPolicy {
  /** Primary sort: which factor matters most */
  primary_sort: "match_score" | "performance" | "cost" | "priority" | "latency";

  /** Tiebreaker sort */
  secondary_sort?: "match_score" | "performance" | "cost" | "priority" | "latency";

  /** Only consider fully qualified agents */
  require_full_qualification: boolean;

  /** Minimum match score to be considered */
  min_match_score: number;

  /** Maximum number of agents to select (for parallel execution) */
  max_agents: number;

  /** Whether to prefer agents with recent successful history */
  prefer_proven: boolean;
}

// ════════════════════════════════════════════════════════════════
// 5. FALLBACK & SUBSTITUTION
// ════════════════════════════════════════════════════════════════

/**
 * FallbackChain defines substitution behavior when the
 * primary agent fails or is unavailable.
 */
export interface FallbackChain {
  /** Capability being fulfilled */
  capability_id: string;

  /** Ordered list of agent IDs to try */
  agent_sequence: string[];

  /** What to do when all agents in the chain fail */
  exhaustion_action: "abort" | "skip" | "block" | "degrade";

  /** Whether to allow mode changes in fallback */
  allow_mode_change: boolean;

  /** Whether to allow model/provider changes in fallback */
  allow_provider_change: boolean;

  /** Maximum total cost across all fallback attempts */
  max_total_cost_usd?: number;
}

/**
 * Degraded capability: when no agent fully matches,
 * the system may proceed with partial capability.
 */
export interface DegradedCapability {
  capability_id: string;
  original_requirement: CapabilityRequirement;
  actual_agent_id: string;
  degradation_reason: string;
  /** What guarantees are lost in degraded mode */
  lost_guarantees: string[];
  /** Confidence penalty applied */
  confidence_penalty: number;
}

// ════════════════════════════════════════════════════════════════
// 6. PERFORMANCE TRACKING
// ════════════════════════════════════════════════════════════════

/**
 * Tracks how well an agent performs a specific capability over time.
 * Used by the router for informed selection and by Evolution for learning.
 */
export interface CapabilityPerformanceRecord {
  agent_id: string;
  capability_id: string;

  /** Rolling performance metrics */
  total_invocations: number;
  successful_invocations: number;
  failed_invocations: number;

  /** Success rate (0.0 - 1.0) */
  success_rate: number;

  /** Average confidence reported by the agent */
  avg_confidence: number;

  /** Average validation score when this capability was used */
  avg_validation_score: number;

  /** Average latency in ms */
  avg_latency_ms: number;

  /** Average cost in USD */
  avg_cost_usd: number;

  /** Composite performance score (0.0 - 1.0) */
  performance_score: number;

  /** Trend direction */
  trend: "improving" | "stable" | "degrading";

  /** Last updated */
  last_updated_at: string;

  /** Window size for rolling metrics */
  window_size: number;
}

/**
 * Weights for computing composite performance_score.
 */
export interface PerformanceWeights {
  success_rate: number;
  avg_confidence: number;
  avg_validation_score: number;
  latency_factor: number;
  cost_factor: number;
}

export const DEFAULT_PERFORMANCE_WEIGHTS: PerformanceWeights = {
  success_rate: 0.35,
  avg_confidence: 0.15,
  avg_validation_score: 0.30,
  latency_factor: 0.10,
  cost_factor: 0.10,
};

// ════════════════════════════════════════════════════════════════
// 7. CAPABILITY EVOLUTION
// ════════════════════════════════════════════════════════════════

/**
 * CapabilityEvolutionEvent records changes to capabilities over time.
 * Enables audit trail and rollback of capability definitions.
 */
export interface CapabilityEvolutionEvent {
  event_id: string;
  capability_id: string;
  agent_id?: string;

  change_type:
    | "capability_added"
    | "capability_removed"
    | "capability_version_bumped"
    | "binding_enabled"
    | "binding_disabled"
    | "constraint_added"
    | "constraint_removed"
    | "performance_threshold_changed"
    | "profile_upgraded";

  previous_value?: unknown;
  new_value?: unknown;
  reason: string;
  occurred_at: string;
}

/**
 * Capability catalog: the global registry of all declared capabilities.
 * Infrastructure-agnostic — could be in-memory, database, or file-based.
 */
export interface CapabilityCatalog {
  capabilities: CapabilityDeclaration[];
  version: string;
  last_updated_at: string;
}
