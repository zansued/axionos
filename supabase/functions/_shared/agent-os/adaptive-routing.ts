// Agent OS — Adaptive Routing System (v0.7)
// Decision feedback layer that dynamically adjusts agent selection
// based on observed performance, cost, and reliability metrics.
// Infrastructure-agnostic; consumes Observability + Memory data.

import type { StageName } from "./types.ts";

// ─────────────────────────────────────────────
// §1  Routing Strategies
// ─────────────────────────────────────────────

/** Available routing strategy modes. */
export type RoutingStrategyMode =
  | "performance_first"  // Prioritize validation scores and success rate
  | "cost_first"         // Minimize cost per task
  | "balanced"           // Weighted blend of performance and cost
  | "exploration"        // Discover better agents via controlled randomness
  | "stability"          // Favor proven, reliable agents only
  | "latency_first"      // Minimize execution time
  | "custom";            // User-defined strategy via weights

/** Configurable routing strategy with tunable weights. */
export interface RoutingStrategy {
  strategy_id: string;
  mode: RoutingStrategyMode;
  /** Weights for blending scoring dimensions. */
  weights: RoutingWeights;
  /** Exploration parameters (used in exploration mode). */
  exploration?: ExplorationConfig;
  /** Active stage scopes (empty = all stages). */
  stage_scopes?: StageName[];
  /** Description for traceability. */
  description?: string;
}

/** Scoring dimension weights (must sum to 1.0). */
export interface RoutingWeights {
  reliability: number;
  performance: number;
  cost_efficiency: number;
  latency: number;
  confidence_calibration: number;
}

export const DEFAULT_ROUTING_WEIGHTS: RoutingWeights = {
  reliability: 0.30,
  performance: 0.25,
  cost_efficiency: 0.20,
  latency: 0.15,
  confidence_calibration: 0.10,
};

// ─────────────────────────────────────────────
// §2  Performance Profiles
// ─────────────────────────────────────────────

/** Performance snapshot for a single agent. */
export interface AgentPerformanceProfile {
  agent_id: string;
  /** Total invocations in the observation window. */
  total_invocations: number;
  /** Success rate 0.0–1.0. */
  success_rate: number;
  /** Average validation score 0.0–1.0. */
  avg_validation_score: number;
  /** Average latency in ms. */
  avg_latency_ms: number;
  /** Average cost per invocation in USD. */
  avg_cost_usd: number;
  /** Retry frequency 0.0–1.0. */
  retry_rate: number;
  /** Fallback trigger rate 0.0–1.0. */
  fallback_rate: number;
  /** Confidence calibration score 0.0–1.0. */
  confidence_calibration: number;
  /** Performance trend: positive = improving. */
  trend: number;
  /** Observation window. */
  window_start: string;
  window_end: string;
}

/** Performance snapshot for a capability. */
export interface CapabilityPerformanceProfile {
  capability_id: string;
  total_invocations: number;
  success_rate: number;
  avg_validation_score: number;
  avg_latency_ms: number;
  avg_cost_usd: number;
  retry_rate: number;
  /** Stability score 0.0–1.0 (variance-based). */
  stability_score: number;
  /** Best performing agent for this capability. */
  best_agent_id?: string;
  trend: number;
  window_start: string;
  window_end: string;
}

/** Aggregate performance snapshot used by the routing analyzer. */
export interface PerformanceSnapshot {
  snapshot_id: string;
  timestamp: string;
  agents: AgentPerformanceProfile[];
  capabilities: CapabilityPerformanceProfile[];
  /** Global metrics. */
  global_success_rate: number;
  global_avg_cost_usd: number;
  global_avg_latency_ms: number;
}

// ─────────────────────────────────────────────
// §3  Routing Signals
// ─────────────────────────────────────────────

/** A signal derived from telemetry that influences routing. */
export interface RoutingSignal {
  signal_id: string;
  signal_type: RoutingSignalType;
  /** Entity the signal applies to. */
  target_type: "agent" | "capability" | "model" | "tool";
  target_id: string;
  /** Signal value 0.0–1.0 (higher = better). */
  value: number;
  /** Confidence in the signal 0.0–1.0. */
  confidence: number;
  /** Number of observations backing this signal. */
  sample_size: number;
  /** When the signal was computed. */
  computed_at: string;
  /** Trend direction. */
  trend: SignalTrend;
}

export type RoutingSignalType =
  | "reliability"
  | "capability_stability"
  | "cost_efficiency"
  | "validation_performance"
  | "latency_performance"
  | "confidence_calibration"
  | "tool_reliability"
  | "retry_burden"
  | "drift_detected";

export type SignalTrend =
  | "improving"
  | "stable"
  | "degrading"
  | "insufficient_data";

// ─────────────────────────────────────────────
// §4  Routing Adjustments
// ─────────────────────────────────────────────

/** An adjustment to apply to the Selection Engine ranking. */
export interface RoutingAdjustment {
  adjustment_id: string;
  /** What kind of adjustment. */
  action: RoutingAdjustmentAction;
  /** Entity to adjust. */
  target_type: "agent" | "capability" | "model";
  target_id: string;
  /** Numeric modifier (positive = boost, negative = penalize). */
  modifier: number;
  /** Why this adjustment was made. */
  reason: string;
  /** Signal that triggered it. */
  source_signal_id?: string;
  /** Strategy that produced it. */
  strategy_id?: string;
  /** Expiration timestamp (adjustments are temporary). */
  expires_at: string;
  /** When created. */
  created_at: string;
}

export type RoutingAdjustmentAction =
  | "boost_score"          // Increase ranking score
  | "penalize_score"       // Decrease ranking score
  | "prefer_agent"         // Soft preference for agent
  | "avoid_agent"          // Soft avoidance of agent
  | "block_agent"          // Hard block (escalated to Policy)
  | "promote_capability"   // Boost capability ranking
  | "suppress_capability"  // Reduce capability ranking
  | "limit_retries"        // Reduce retry budget
  | "force_exploration"    // Force testing alternative agents
  | "lock_routing";        // Lock current best agent (no changes)

/** Result of applying routing adjustments. */
export interface RoutingAdjustmentResult {
  adjustments_applied: RoutingAdjustment[];
  adjustments_expired: number;
  adjustments_conflicting: number;
  active_strategy: RoutingStrategyMode;
  timestamp: string;
}

// ─────────────────────────────────────────────
// §5  Decision Feedback
// ─────────────────────────────────────────────

/** Feedback recorded after a routing decision is executed. */
export interface RoutingDecisionFeedback {
  feedback_id: string;
  run_id: string;
  stage: StageName;
  /** Agent that was selected. */
  selected_agent_id: string;
  /** Capability that was requested. */
  capability_id?: string;
  /** Was the execution successful? */
  success: boolean;
  /** Validation score achieved. */
  validation_score?: number;
  /** Actual latency in ms. */
  latency_ms: number;
  /** Actual cost in USD. */
  cost_usd: number;
  /** Number of retries needed. */
  retries: number;
  /** Was a fallback used? */
  fallback_used: boolean;
  /** Timestamp. */
  timestamp: string;
}

// ─────────────────────────────────────────────
// §6  Exploration vs Exploitation
// ─────────────────────────────────────────────

/** Configuration for exploration strategies. */
export interface ExplorationConfig {
  /** Exploration method. */
  method: ExplorationMethod;
  /** Epsilon for epsilon-greedy (probability of exploring). */
  epsilon?: number;
  /** Temperature for softmax-based selection. */
  temperature?: number;
  /** Minimum invocations before an agent is considered "known". */
  min_observations: number;
  /** Decay rate for epsilon over time (0.0–1.0). */
  epsilon_decay?: number;
  /** Floor for epsilon (never go below this). */
  epsilon_min?: number;
}

export type ExplorationMethod =
  | "epsilon_greedy"   // Random exploration with probability epsilon
  | "softmax"          // Temperature-based weighted random
  | "ucb1"             // Upper Confidence Bound
  | "thompson"         // Thompson Sampling (Beta distribution)
  | "round_robin";     // Cycle through candidates

export const DEFAULT_EXPLORATION_CONFIG: ExplorationConfig = {
  method: "epsilon_greedy",
  epsilon: 0.1,
  min_observations: 5,
  epsilon_decay: 0.995,
  epsilon_min: 0.01,
};

// ─────────────────────────────────────────────
// §7  Adaptive Router Interface
// ─────────────────────────────────────────────

/**
 * Core interface for the Adaptive Routing System.
 * Consumes telemetry and memory, produces routing adjustments.
 */
export interface IAdaptiveRouter {
  // ── Analysis ──
  analyzePerformance(snapshot: PerformanceSnapshot): RoutingSignal[];
  
  // ── Adjustments ──
  computeAdjustments(signals: RoutingSignal[], strategy: RoutingStrategy): RoutingAdjustment[];
  getActiveAdjustments(): RoutingAdjustment[];
  expireAdjustments(): number;

  // ── Feedback ──
  recordFeedback(feedback: RoutingDecisionFeedback): void;

  // ── Strategy ──
  setStrategy(strategy: RoutingStrategy): void;
  getStrategy(): RoutingStrategy;

  // ── Exploration ──
  shouldExplore(agent_id: string, capability_id?: string): boolean;
  selectExplorationCandidate(candidates: string[]): string;
}

// ─────────────────────────────────────────────
// §8  Configuration
// ─────────────────────────────────────────────

export interface AdaptiveRoutingConfig {
  /** Enable adaptive routing. */
  enabled: boolean;
  /** Default strategy mode. */
  default_strategy: RoutingStrategyMode;
  /** Default routing weights. */
  default_weights: RoutingWeights;
  /** Exploration configuration. */
  exploration: ExplorationConfig;
  /** Adjustment TTL in seconds. */
  adjustment_ttl_seconds: number;
  /** Minimum sample size before producing signals. */
  min_sample_size: number;
  /** Signal refresh interval in seconds. */
  signal_refresh_seconds: number;
  /** Performance degradation threshold (triggers alerts). */
  degradation_threshold: number;
}

export const DEFAULT_ADAPTIVE_ROUTING_CONFIG: AdaptiveRoutingConfig = {
  enabled: true,
  default_strategy: "balanced",
  default_weights: DEFAULT_ROUTING_WEIGHTS,
  exploration: DEFAULT_EXPLORATION_CONFIG,
  adjustment_ttl_seconds: 3600, // 1 hour
  min_sample_size: 10,
  signal_refresh_seconds: 300, // 5 minutes
  degradation_threshold: 0.2,
};

// ─────────────────────────────────────────────
// §9  Event Types (EventBus integration)
// ─────────────────────────────────────────────

export type AdaptiveRoutingEventType =
  | "routing.signal_computed"
  | "routing.adjustment_applied"
  | "routing.adjustment_expired"
  | "routing.feedback_recorded"
  | "routing.strategy_changed"
  | "routing.exploration_triggered"
  | "routing.degradation_detected"
  | "routing.agent_promoted"
  | "routing.agent_demoted"
  | "routing.capability_suppressed"
  | "routing.lock_engaged"
  | "routing.lock_released";
