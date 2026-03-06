// Agent Capability Model v0.2 — Contract Layer
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
// The model has four layers:
//   1. Declaration  — what an agent CAN do
//   2. Matching     — what a task NEEDS vs what agents OFFER
//   3. Scorecard    — how well an agent PERFORMS each capability
//   4. Lifecycle    — how capabilities evolve, drift and retire

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
  capability_id: string;
  name: string;
  description: string;

  /** Semantic version of this capability definition */
  version: string;

  /** Lifecycle state of this capability */
  lifecycle: CapabilityLifecycleState;

  valid_for_types: AgentType[];
  valid_modes: AgentMode[];
  valid_stages: StageName[];

  input_requirements: CapabilityInputSpec[];
  output_guarantees: CapabilityOutputSpec[];
  constraints?: CapabilityConstraint[];
  tags?: string[];

  /** Capability this one supersedes (for evolution chains) */
  supersedes?: string;

  /** When this capability was first declared */
  declared_at: string;

  /** When this capability definition was last modified */
  updated_at: string;
}

export type CapabilityLifecycleState =
  | "draft"        // designed but not yet active
  | "active"       // available for routing
  | "deprecated"   // still functional but scheduled for removal
  | "retired";     // no longer routable

export interface CapabilityInputSpec {
  name: string;
  description: string;
  required: boolean;
  artifact_kind?: string;
}

export interface CapabilityOutputSpec {
  name: string;
  description: string;
  artifact_kind?: string;
  guaranteed: boolean;
}

export interface CapabilityConstraint {
  key: string;
  description: string;
  type: "max_tokens" | "max_cost_usd" | "max_latency_ms" | "requires_tool" | "custom";
  value: unknown;
}

// ════════════════════════════════════════════════════════════════
// 2. AGENT IDENTITY & CAPABILITY PROFILE
// ════════════════════════════════════════════════════════════════

/**
 * AgentIdentity — WHO the agent is.
 * Minimal, stable, rarely changes.
 */
export interface AgentIdentity {
  agent_id: string;
  agent_name: string;
  agent_type: AgentType;
  provider?: string;
  model?: string;
  created_at: string;
}

/**
 * AgentProfile — WHAT the agent can do.
 * Binds identity to capabilities. Changes over time.
 */
export interface AgentProfile {
  /** Identity reference */
  agent_id: string;
  agent_name: string;
  agent_type: AgentType;

  supported_modes: AgentMode[];
  capabilities: AgentCapabilityBinding[];

  /** Global priority for tie-breaking (higher = preferred) */
  priority: number;

  status: "active" | "inactive" | "degraded";

  /** Profile version — incremented on ANY capability change */
  profile_version: number;

  provider?: string;
  model?: string;
  max_concurrency?: number;
  cost_tier?: "low" | "medium" | "high";

  /** Routing preferences (agent-declared) */
  routing_preferences?: RoutingPreferences;
}

export interface AgentCapabilityBinding {
  capability_id: string;
  priority: number;

  /** Confidence floor: agent should not report confidence below this */
  confidence_floor?: number;

  /** Confidence ceiling: agent should not report confidence above this
   *  (guards against overconfident agents) */
  confidence_ceiling?: number;

  constraint_overrides?: CapabilityConstraint[];
  enabled: boolean;

  /** Binding-level lifecycle: overrides capability lifecycle for this agent */
  binding_status?: "active" | "suspended" | "probation";
}

/**
 * Agent-declared preferences that influence (but don't override) routing.
 */
export interface RoutingPreferences {
  /** Preferred stages to operate in */
  preferred_stages?: StageName[];

  /** Preferred modes */
  preferred_modes?: AgentMode[];

  /** Preferred co-agents (for multi-agent stages) */
  preferred_collaborators?: string[];

  /** Stages this agent should NOT be routed to */
  excluded_stages?: StageName[];

  /** Maximum concurrent load preference */
  max_load?: number;
}

// ════════════════════════════════════════════════════════════════
// 3. CAPABILITY REQUIREMENTS (Task Side)
// ════════════════════════════════════════════════════════════════

export interface CapabilityRequirement {
  capability_id: string;
  priority: "required" | "preferred" | "optional";
  min_performance_score?: number;
  max_cost_usd?: number;
  max_latency_ms?: number;
  required_mode?: AgentMode;

  /** Minimum confidence floor the agent must declare */
  min_confidence_floor?: number;

  /** Exclude agents with degrading trend */
  exclude_degrading?: boolean;
}

// ════════════════════════════════════════════════════════════════
// 4. MATCHING & ROUTING
// ════════════════════════════════════════════════════════════════

export interface CapabilityMatchResult {
  agent_id: string;
  agent_type: AgentType;
  match_score: number;
  matches: CapabilityMatchDetail[];
  unmatched: string[];
  fully_qualified: boolean;
  estimated_cost_usd?: number;

  /** Routing preference alignment score (0.0 - 1.0) */
  preference_alignment?: number;

  /** Scorecard summary if performance data available */
  scorecard_summary?: ScorecardSummary;
}

export interface CapabilityMatchDetail {
  capability_id: string;
  requirement_priority: "required" | "preferred" | "optional";
  matched: boolean;
  performance_score?: number;
  agent_priority: number;

  /** Confidence drift status for this capability */
  confidence_drift?: ConfidenceDriftStatus;

  /** Binding status */
  binding_status?: "active" | "suspended" | "probation";
}

export interface SelectionPolicy {
  primary_sort: SelectionSortKey;
  secondary_sort?: SelectionSortKey;
  require_full_qualification: boolean;
  min_match_score: number;
  max_agents: number;
  prefer_proven: boolean;

  /** Exclude agents on probation */
  exclude_probation?: boolean;

  /** Factor routing preferences into score */
  weight_routing_preferences?: number;
}

export type SelectionSortKey =
  | "match_score"
  | "performance"
  | "cost"
  | "priority"
  | "latency"
  | "preference_alignment";

// ════════════════════════════════════════════════════════════════
// 5. FALLBACK & SUBSTITUTION
// ════════════════════════════════════════════════════════════════

export interface FallbackChain {
  capability_id: string;
  agent_sequence: string[];
  exhaustion_action: "abort" | "skip" | "block" | "degrade";
  allow_mode_change: boolean;
  allow_provider_change: boolean;
  max_total_cost_usd?: number;

  /** Maximum total latency across fallback chain */
  max_total_latency_ms?: number;
}

export interface DegradedCapability {
  capability_id: string;
  original_requirement: CapabilityRequirement;
  actual_agent_id: string;
  degradation_reason: string;
  lost_guarantees: string[];
  confidence_penalty: number;
}

// ════════════════════════════════════════════════════════════════
// 6. CAPABILITY SCORECARD
// ════════════════════════════════════════════════════════════════

/**
 * CapabilityScorecard — comprehensive performance view
 * for one agent × one capability over a rolling window.
 *
 * This is the primary data structure the router uses for
 * informed selection and the Evolution stage uses for learning.
 */
export interface CapabilityScorecard {
  agent_id: string;
  capability_id: string;

  // ── Volume metrics ──
  total_invocations: number;
  successful_invocations: number;
  failed_invocations: number;
  blocked_invocations: number;

  // ── Rate metrics (0.0 - 1.0) ──
  success_rate: number;
  failure_rate: number;

  // ── Quality metrics ──
  avg_confidence: number;
  avg_validation_score: number;

  // ── Efficiency metrics ──
  avg_latency_ms: number;
  p95_latency_ms: number;
  avg_cost_usd: number;
  total_cost_usd: number;
  avg_tokens: number;

  // ── Composite score ──
  /** Weighted composite (0.0 - 1.0), computed by PerformanceWeights */
  performance_score: number;

  // ── Trend ──
  trend: "improving" | "stable" | "degrading";
  trend_delta: number; // percentage change over window

  // ── Confidence drift ──
  confidence_drift: ConfidenceDriftStatus;

  // ── Temporal ──
  window_size: number;
  first_invocation_at: string;
  last_invocation_at: string;
  last_updated_at: string;
}

/** Summarized scorecard for embedding in match results */
export interface ScorecardSummary {
  performance_score: number;
  success_rate: number;
  avg_latency_ms: number;
  avg_cost_usd: number;
  trend: "improving" | "stable" | "degrading";
  confidence_drift: ConfidenceDriftStatus;
  invocation_count: number;
}

// ════════════════════════════════════════════════════════════════
// 7. CONFIDENCE DRIFT DETECTION
// ════════════════════════════════════════════════════════════════

/**
 * Confidence drift occurs when an agent's self-reported confidence
 * diverges from its actual validation scores.
 *
 * Types:
 *   - over_confident: confidence >> validation (dangerous)
 *   - under_confident: confidence << validation (wasteful retries)
 *   - calibrated: confidence ≈ validation (ideal)
 *
 * Detection:
 *   drift_magnitude = |avg_confidence - avg_validation_score|
 *   drift_direction = sign(avg_confidence - avg_validation_score)
 *
 * Thresholds:
 *   calibrated:       drift_magnitude < 0.10
 *   mild_drift:       0.10 ≤ drift_magnitude < 0.20
 *   significant_drift: 0.20 ≤ drift_magnitude < 0.35
 *   severe_drift:     drift_magnitude ≥ 0.35
 */
export interface ConfidenceDriftStatus {
  status: "calibrated" | "over_confident" | "under_confident";
  drift_magnitude: number;
  severity: "none" | "mild" | "significant" | "severe";

  /** Average confidence agent reports */
  avg_reported_confidence: number;

  /** Average validation score (external ground truth) */
  avg_actual_validation: number;

  /** Samples in the measurement window */
  sample_count: number;

  /** Recommended action */
  recommended_action?: ConfidenceDriftAction;
}

export type ConfidenceDriftAction =
  | "none"                    // calibrated, no action needed
  | "monitor"                 // mild drift, watch closely
  | "adjust_confidence_floor" // significant, tighten confidence_floor
  | "reduce_priority"         // severe over-confidence, lower routing priority
  | "increase_priority"       // severe under-confidence, raise routing priority
  | "flag_for_evolution";     // persistent drift, Evolution stage should intervene

export const CONFIDENCE_DRIFT_THRESHOLDS = {
  calibrated: 0.10,
  mild: 0.20,
  significant: 0.35,
} as const;

// ════════════════════════════════════════════════════════════════
// 8. PERFORMANCE WEIGHTS
// ════════════════════════════════════════════════════════════════

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
// 9. CAPABILITY LIFECYCLE & EVOLUTION
// ════════════════════════════════════════════════════════════════

/**
 * Records changes to capabilities over time.
 * Enables audit trail and rollback of capability definitions.
 */
export interface CapabilityEvolutionEvent {
  event_id: string;
  capability_id: string;
  agent_id?: string;

  change_type: CapabilityChangeType;

  previous_value?: unknown;
  new_value?: unknown;
  reason: string;
  occurred_at: string;

  /** Who/what triggered this change */
  triggered_by: "system" | "evolution_agent" | "human" | "drift_detector";
}

export type CapabilityChangeType =
  | "capability_declared"
  | "capability_activated"
  | "capability_deprecated"
  | "capability_retired"
  | "capability_version_bumped"
  | "capability_superseded"
  | "binding_enabled"
  | "binding_disabled"
  | "binding_probation"
  | "constraint_added"
  | "constraint_removed"
  | "constraint_modified"
  | "confidence_floor_adjusted"
  | "confidence_ceiling_adjusted"
  | "priority_changed"
  | "performance_threshold_changed"
  | "profile_upgraded"
  | "drift_detected"
  | "drift_resolved";

/**
 * Lifecycle transition rules:
 *
 *   draft → active         (capability validated and ready)
 *   active → deprecated    (superseded or scheduled for removal)
 *   deprecated → retired   (grace period expired)
 *   deprecated → active    (deprecation reversed)
 *   retired → (none)       (terminal state)
 *
 *   draft → retired        (never activated, discarded)
 */
export interface CapabilityLifecycleTransition {
  capability_id: string;
  from_state: CapabilityLifecycleState;
  to_state: CapabilityLifecycleState;
  reason: string;
  transition_at: string;
  grace_period_until?: string;
}

/**
 * Capability catalog: the global registry of all declared capabilities.
 */
export interface CapabilityCatalog {
  capabilities: CapabilityDeclaration[];
  version: string;
  last_updated_at: string;

  /** Capabilities pending retirement */
  deprecated_count: number;

  /** Active capabilities available for routing */
  active_count: number;
}

// ════════════════════════════════════════════════════════════════
// 10. CAPABILITY EVENTS (extends ProtocolEventType)
// ════════════════════════════════════════════════════════════════

/**
 * Events emitted by the capability model layer.
 * These extend the ProtocolRuntimeEvent taxonomy.
 */
export type CapabilityEventType =
  | "capability.matched"
  | "capability.no_match"
  | "capability.fallback_triggered"
  | "capability.degraded"
  | "capability.scorecard_updated"
  | "capability.drift_detected"
  | "capability.drift_resolved"
  | "capability.lifecycle_transition"
  | "capability.binding_changed";
