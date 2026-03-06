// Agent Selection Engine v0.1 — Contract Layer
// Pure type-level contracts. Zero runtime dependencies.
// Spec: docs/AGENT_SELECTION_ENGINE.md
//
// DESIGN RATIONALE:
//
// The Selection Engine is the decision-making core between
// task requirements and agent assignment. It operates as a
// pure function pipeline:
//
//   Request → Eligibility → Matching → Ranking → Selection → Decision
//
// Key principles:
//   1. Eligibility and ranking are separate phases
//   2. Every decision is explainable (audit trail)
//   3. Selection is deterministic given the same inputs
//   4. Fallback and retry_other are first-class paths
//   5. The engine emits structured decisions, not side effects
//
// The engine does NOT:
//   - Mutate state
//   - Call agents
//   - Access infrastructure
//   - Make network requests
//
// It produces a SelectionDecision that the orchestrator consumes.

import type {
  AgentType,
  AgentMode,
  StageName,
} from "./types.ts";

import type {
  AgentProfile,
  CapabilityRequirement,
  CapabilityMatchResult,
  CapabilityScorecard,
  ScorecardSummary,
  SelectionPolicy,
  SelectionSortKey,
  FallbackChain,
  DegradedCapability,
  ConfidenceDriftStatus,
} from "./capabilities.ts";

// ════════════════════════════════════════════════════════════════
// 1. SELECTION REQUEST
// ════════════════════════════════════════════════════════════════

/**
 * SelectionRequest — input to the selection engine.
 *
 * Contains everything the engine needs to produce a decision:
 * the task context, capability requirements, candidate pool,
 * performance data, and policy configuration.
 */
export interface SelectionRequest {
  /** Unique request ID for tracing */
  request_id: string;

  /** Run context */
  run_id: string;
  task_id: string;
  stage: StageName;

  /** What the task needs */
  required_agent_type: AgentType;
  required_mode?: AgentMode;
  capability_requirements: CapabilityRequirement[];

  /** Available agent profiles (pre-fetched by orchestrator) */
  candidate_pool: AgentProfile[];

  /** Historical performance data (pre-fetched) */
  scorecards: CapabilityScorecard[];

  /** Configured fallback chains */
  fallback_chains?: FallbackChain[];

  /** Selection policy to apply */
  policy: SelectionPolicy;

  /** Agents to exclude (e.g., already failed for this task) */
  excluded_agent_ids?: string[];

  /** Budget constraints */
  max_cost_usd?: number;
  max_latency_ms?: number;

  /** Context for retry_other scenarios */
  retry_context?: RetrySelectionContext;

  /** Timestamp of the request */
  requested_at: string;
}

/**
 * Context provided when selection is triggered by retry_other.
 * Carries lineage from the original failed attempt.
 */
export interface RetrySelectionContext {
  original_task_id: string;
  original_agent_id: string;
  failure_reason: string;
  attempt_number: number;

  /** Agents that already failed for this task */
  failed_agent_ids: string[];

  /** Whether mode change is allowed */
  allow_mode_change: boolean;

  /** Whether provider change is allowed */
  allow_provider_change: boolean;
}

// ════════════════════════════════════════════════════════════════
// 2. ELIGIBILITY
// ════════════════════════════════════════════════════════════════

/**
 * EligibilityResult — output of the eligibility filter phase.
 *
 * Eligibility is a hard filter. An agent is either eligible or not.
 * No scoring happens here. This phase reduces the candidate pool
 * to agents that CAN handle the task.
 *
 * Eligibility rules (applied in order):
 *   1. agent_type matches required_agent_type
 *   2. agent status is "active" (not "inactive" or "degraded")
 *   3. agent_id not in excluded_agent_ids
 *   4. agent supports required_mode (if specified)
 *   5. agent has at least one binding for each "required" capability
 *   6. no binding is "suspended"
 *   7. agent is not on probation (if policy.exclude_probation)
 *   8. agent's routing_preferences don't exclude this stage
 *   9. cost_tier is within budget (if max_cost_usd specified)
 *
 * Rule 2 exception: "degraded" agents MAY pass if the
 * fallback chain explicitly allows degraded mode.
 */
export interface EligibilityResult {
  /** Agents that passed all eligibility checks */
  eligible: EligibleAgent[];

  /** Agents that failed with reasons */
  ineligible: IneligibleAgent[];

  /** Total candidates evaluated */
  total_evaluated: number;

  /** Eligibility rate (eligible / total) */
  eligibility_rate: number;
}

export interface EligibleAgent {
  agent_id: string;
  agent_type: AgentType;
  profile: AgentProfile;

  /** Which eligibility rules were checked and passed */
  passed_rules: EligibilityRule[];
}

export interface IneligibleAgent {
  agent_id: string;
  agent_type: AgentType;

  /** First rule that failed (short-circuit) */
  failed_rule: EligibilityRule;

  /** Human-readable reason */
  reason: string;
}

export type EligibilityRule =
  | "type_match"
  | "status_active"
  | "not_excluded"
  | "mode_support"
  | "required_capabilities"
  | "no_suspended_bindings"
  | "not_on_probation"
  | "stage_not_excluded"
  | "within_cost_tier";

// ════════════════════════════════════════════════════════════════
// 3. RANKING
// ════════════════════════════════════════════════════════════════

/**
 * RankingResult — output of the ranking phase.
 *
 * Takes eligible agents and scores them. Ranking is deterministic:
 * given the same inputs, the same ranking is produced.
 *
 * Ranking formula:
 *
 *   final_score = (
 *     match_component     * W_match     +
 *     performance_component * W_perf     +
 *     cost_component       * W_cost     +
 *     latency_component    * W_latency  +
 *     preference_component * W_pref     +
 *     priority_component   * W_priority
 *   )
 *
 * Where:
 *   match_component     = CapabilityMatchResult.match_score (0-1)
 *   performance_component = scorecard.performance_score (0-1)
 *   cost_component       = 1 - normalized_cost (0-1, lower is better)
 *   latency_component    = 1 - normalized_latency (0-1, lower is better)
 *   preference_component = routing preference alignment (0-1)
 *   priority_component   = normalized agent priority (0-1)
 *
 * Normalization:
 *   - cost: normalized to [0,1] within the candidate pool
 *   - latency: normalized to [0,1] within the candidate pool
 *   - priority: normalized to [0,1] within the candidate pool
 *
 * Penalties:
 *   - confidence_drift "over_confident" + severity "severe": -0.15
 *   - confidence_drift "over_confident" + severity "significant": -0.08
 *   - trend "degrading": -0.10
 *   - binding_status "probation": -0.12
 *
 * Tie-breaking:
 *   When two agents have identical final_score:
 *   1. Higher agent priority wins
 *   2. If still tied, lower agent_id (lexicographic) wins (determinism)
 */
export interface RankingResult {
  /** Ranked candidates, best first */
  ranked: RankedAgent[];

  /** Ranking weights used */
  weights: RankingWeights;

  /** Applied penalties */
  penalties_applied: PenaltyRecord[];
}

export interface RankedAgent {
  agent_id: string;
  agent_type: AgentType;
  rank: number;

  /** Final composite score (0.0 - 1.0) */
  final_score: number;

  /** Score breakdown for explainability */
  score_breakdown: ScoreBreakdown;

  /** Capability match result */
  match_result: CapabilityMatchResult;

  /** Performance summary (if available) */
  scorecard_summary?: ScorecardSummary;

  /** Penalties applied to this agent */
  penalties: PenaltyRecord[];
}

export interface ScoreBreakdown {
  match_component: number;
  performance_component: number;
  cost_component: number;
  latency_component: number;
  preference_component: number;
  priority_component: number;

  /** Raw weighted sum before penalties */
  raw_score: number;

  /** Total penalty deducted */
  total_penalty: number;

  /** Final score = raw_score - total_penalty, clamped to [0, 1] */
  final_score: number;
}

export interface RankingWeights {
  match: number;
  performance: number;
  cost: number;
  latency: number;
  preference: number;
  priority: number;
}

/**
 * Default ranking weights.
 *
 * Match quality is king (0.30).
 * Performance history is critical (0.25).
 * Cost and latency matter equally (0.15 each).
 * Preferences and priority are tiebreakers (0.10 + 0.05).
 */
export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  match: 0.30,
  performance: 0.25,
  cost: 0.15,
  latency: 0.15,
  preference: 0.10,
  priority: 0.05,
};

export interface PenaltyRecord {
  agent_id: string;
  penalty_type: PenaltyType;
  penalty_value: number;
  reason: string;
}

export type PenaltyType =
  | "confidence_drift_severe"
  | "confidence_drift_significant"
  | "trend_degrading"
  | "binding_probation"
  | "retry_same_provider"
  | "over_budget";

/**
 * Standard penalty values.
 *
 * These are subtracted from the raw_score.
 * All penalties are positive numbers (deductions).
 */
export const STANDARD_PENALTIES: Record<PenaltyType, number> = {
  confidence_drift_severe: 0.15,
  confidence_drift_significant: 0.08,
  trend_degrading: 0.10,
  binding_probation: 0.12,
  retry_same_provider: 0.05,
  over_budget: 0.20,
};

// ════════════════════════════════════════════════════════════════
// 4. SELECTION DECISION
// ════════════════════════════════════════════════════════════════

/**
 * SelectionDecision — the final output of the selection engine.
 *
 * This is the primary artifact consumed by the orchestrator.
 * It is designed to be:
 *   - Self-contained (all info needed to dispatch)
 *   - Auditable (full decision trail)
 *   - Actionable (clear outcome)
 */
export interface SelectionDecision {
  /** Decision ID for tracing */
  decision_id: string;

  /** Back-reference to the request */
  request_id: string;
  run_id: string;
  task_id: string;
  stage: StageName;

  /** Decision outcome */
  outcome: SelectionOutcome;

  /** Selected agent (if outcome is "selected") */
  selected?: SelectedAgent;

  /** Shortlisted candidates (next-best after selected) */
  shortlist: ShortlistedAgent[];

  /** Fallback sequence if selected agent fails */
  fallback_sequence: FallbackEntry[];

  /** Why this decision was made */
  rationale: SelectionRationale;

  /** Degradation info if selection required compromise */
  degradation?: DegradedCapability[];

  /** Timing */
  decided_at: string;
  selection_duration_ms: number;

  /** Eligibility summary */
  eligibility_summary: EligibilitySummary;

  /** Full ranking (for audit/observability) */
  ranking_snapshot?: RankingResult;
}

export type SelectionOutcome =
  | "selected"           // agent found and assigned
  | "fallback_selected"  // primary failed, using fallback
  | "degraded_selected"  // selected with reduced guarantees
  | "no_candidates"      // no eligible agents found
  | "no_qualified"       // eligible but none meet min_match_score
  | "exhausted";         // all fallbacks exhausted

export interface SelectedAgent {
  agent_id: string;
  agent_type: AgentType;
  agent_name: string;
  mode: AgentMode;

  /** Why this specific agent was chosen */
  selection_reason: string;

  /** Score that earned selection */
  final_score: number;
  score_breakdown: ScoreBreakdown;

  /** Match details */
  match_result: CapabilityMatchResult;

  /** Performance summary */
  scorecard_summary?: ScorecardSummary;

  /** Estimated cost and latency */
  estimated_cost_usd?: number;
  estimated_latency_ms?: number;
}

export interface ShortlistedAgent {
  agent_id: string;
  agent_type: AgentType;
  rank: number;
  final_score: number;

  /** Score gap relative to selected agent */
  score_gap: number;

  /** Can be used as fallback? */
  fallback_eligible: boolean;
}

export interface FallbackEntry {
  position: number;
  agent_id: string;
  agent_type: AgentType;

  /** Mode to use if this fallback is activated */
  fallback_mode?: AgentMode;

  /** Estimated degradation if this agent is used */
  expected_degradation?: string[];

  /** Confidence penalty if this fallback is used */
  confidence_penalty: number;
}

// ════════════════════════════════════════════════════════════════
// 5. SELECTION RATIONALE (Explainability)
// ════════════════════════════════════════════════════════════════

/**
 * SelectionRationale — structured explanation of WHY
 * the engine made the decision it made.
 *
 * Designed for:
 *   - Audit logs
 *   - Observability dashboards
 *   - Evolution agent learning
 *   - Human review of agent routing
 */
export interface SelectionRationale {
  /** One-sentence summary */
  summary: string;

  /** Step-by-step decision trace */
  decision_trace: DecisionTraceEntry[];

  /** Key factors that influenced the decision */
  decisive_factors: DecisiveFactor[];

  /** Alternatives that were considered and why they lost */
  rejected_alternatives: RejectedAlternative[];

  /** Confidence in this selection (engine self-assessment) */
  selection_confidence: number;

  /** Flags for the orchestrator */
  flags: SelectionFlag[];
}

export interface DecisionTraceEntry {
  step: number;
  phase: "eligibility" | "matching" | "ranking" | "selection" | "fallback";
  action: string;
  detail: string;
  timestamp: string;
}

export interface DecisiveFactor {
  factor: string;
  weight: number;
  impact: "positive" | "negative" | "neutral";
  description: string;
}

export interface RejectedAlternative {
  agent_id: string;
  rank: number;
  final_score: number;
  rejection_reason: string;
}

export type SelectionFlag =
  | "single_candidate"         // only one agent was eligible
  | "narrow_margin"            // top-2 score gap < 0.05
  | "all_degrading"            // all candidates have degrading trend
  | "confidence_drift_winner"  // winner has drift issues
  | "fallback_activated"       // using fallback, not primary
  | "degraded_mode"            // operating with reduced guarantees
  | "no_performance_data"      // no scorecard for any candidate
  | "retry_selection"          // this is a retry_other selection
  | "budget_constrained";      // budget limits excluded candidates

// ════════════════════════════════════════════════════════════════
// 6. ELIGIBILITY SUMMARY
// ════════════════════════════════════════════════════════════════

export interface EligibilitySummary {
  total_candidates: number;
  eligible_count: number;
  ineligible_count: number;
  eligibility_rate: number;

  /** Breakdown of ineligibility reasons */
  ineligibility_breakdown: Record<EligibilityRule, number>;
}

// ════════════════════════════════════════════════════════════════
// 7. SELECTION ENGINE CONFIGURATION
// ════════════════════════════════════════════════════════════════

/**
 * SelectionEngineConfig — configuration for the selection engine.
 *
 * Allows adapters to customize engine behavior without
 * modifying the core selection logic.
 */
export interface SelectionEngineConfig {
  /** Ranking weights (defaults to DEFAULT_RANKING_WEIGHTS) */
  ranking_weights: RankingWeights;

  /** Penalty values (defaults to STANDARD_PENALTIES) */
  penalties: Record<PenaltyType, number>;

  /** Maximum shortlist size */
  max_shortlist_size: number;

  /** Maximum fallback depth */
  max_fallback_depth: number;

  /** Minimum score gap to consider a winner "clear" */
  clear_winner_threshold: number;

  /** Narrow margin threshold (triggers flag) */
  narrow_margin_threshold: number;

  /** Whether to include full ranking snapshot in decisions */
  include_ranking_snapshot: boolean;

  /** Allow degraded agents as fallback */
  allow_degraded_fallback: boolean;

  /** Minimum eligibility rate before emitting a warning event */
  min_eligibility_rate_warning: number;
}

export const DEFAULT_SELECTION_ENGINE_CONFIG: SelectionEngineConfig = {
  ranking_weights: DEFAULT_RANKING_WEIGHTS,
  penalties: STANDARD_PENALTIES,
  max_shortlist_size: 3,
  max_fallback_depth: 5,
  clear_winner_threshold: 0.10,
  narrow_margin_threshold: 0.05,
  include_ranking_snapshot: false,
  allow_degraded_fallback: true,
  min_eligibility_rate_warning: 0.20,
};

// ════════════════════════════════════════════════════════════════
// 8. SELECTION EVENTS
// ════════════════════════════════════════════════════════════════

/**
 * Events emitted by the selection engine.
 * These extend the ProtocolRuntimeEvent and CapabilityEventType
 * taxonomies.
 */
export type SelectionEventType =
  | "selection.requested"
  | "selection.eligibility_completed"
  | "selection.ranking_completed"
  | "selection.decided"
  | "selection.no_candidates"
  | "selection.fallback_activated"
  | "selection.degraded_mode"
  | "selection.retry_other_triggered"
  | "selection.narrow_margin_warning"
  | "selection.low_eligibility_warning";

// ════════════════════════════════════════════════════════════════
// 9. SELECTION ENGINE INTERFACE
// ════════════════════════════════════════════════════════════════

/**
 * ISelectionEngine — the contract that any selection engine
 * implementation must satisfy.
 *
 * The interface is intentionally minimal:
 *   - select(): full pipeline (eligibility → ranking → decision)
 *   - checkEligibility(): eligibility phase only
 *   - rank(): ranking phase only (for preview/dry-run)
 *
 * Implementations are free to add caching, batching, or
 * parallel evaluation as long as they honor the contract.
 */
export interface ISelectionEngine {
  /**
   * Full selection pipeline.
   * Produces a deterministic, explainable SelectionDecision.
   */
  select(request: SelectionRequest): SelectionDecision;

  /**
   * Eligibility check only.
   * Useful for dry-runs and capacity planning.
   */
  checkEligibility(request: SelectionRequest): EligibilityResult;

  /**
   * Ranking only (assumes all candidates are eligible).
   * Useful for preview and comparison.
   */
  rank(
    eligible: EligibleAgent[],
    requirements: CapabilityRequirement[],
    scorecards: CapabilityScorecard[],
    policy: SelectionPolicy,
    config?: SelectionEngineConfig,
  ): RankingResult;
}
