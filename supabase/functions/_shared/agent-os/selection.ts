// Agent Selection Engine v0.2 — Contract Layer
// Pure type-level contracts. Zero runtime dependencies.
// Spec: docs/AGENT_SELECTION_ENGINE.md
//
// DESIGN RATIONALE:
//
// The Selection Engine is the decision-making core between
// task requirements and agent assignment. It transforms:
//
//   AgentTask + CapabilityProfiles + Policies → SelectionDecision
//
// The pipeline enforces strict phase separation:
//
//   SelectionInput → Eligibility → Ranking → Selection → Decision
//
// Key principles:
//   1. Eligibility before ranking (no ineligible agent is scored)
//   2. Every decision is explainable (full audit trail)
//   3. Deterministic routing (same inputs → same output)
//   4. Capability-oriented selection (not agent_id-oriented)
//   5. Policy-aware dispatch (policies influence all phases)
//   6. Safe substitution (fallback preserves task semantics)
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
  FallbackChain,
  DegradedCapability,
  ConfidenceDriftStatus,
  RoutingPreferences,
} from "./capabilities.ts";

import type {
  AgentTask,
} from "./protocol.ts";

// ════════════════════════════════════════════════════════════════
// 1. SELECTION INPUT
// ════════════════════════════════════════════════════════════════

/**
 * SelectionInput — everything the engine needs to produce a decision.
 *
 * The orchestrator pre-fetches all data and passes it in.
 * The engine is a pure function: no I/O, no side effects.
 */
export interface SelectionInput {
  /** Unique request ID for tracing */
  request_id: string;

  /** The task being assigned */
  task: AgentTask;

  /** Available agent profiles (pre-fetched by orchestrator) */
  candidate_profiles: AgentProfile[];

  /** Historical performance data (pre-fetched) */
  scorecards: CapabilityScorecard[];

  /** Stage-level policies */
  stage_policy?: string[];

  /** Routing preferences (system-level or task-level) */
  routing_preferences?: RoutingPreferences[];

  /** Runtime constraints (budget, latency, compliance) */
  runtime_constraints?: RuntimeConstraint[];

  /** Agent IDs that already failed for this task */
  previous_attempts?: string[];

  /** Configured fallback chains */
  fallback_chains?: FallbackChain[];

  /** Selection policy to apply */
  policy: SelectionPolicy;

  /** Contextual hints for matching */
  selection_context?: SelectionContext;

  /** Context for retry_other scenarios */
  retry_context?: RetrySelectionContext;

  /** Timestamp of the request */
  requested_at: string;
}

export interface SelectionContext {
  stage: StageName;
  mode?: AgentMode;
  domain?: string;
  complexity?: "low" | "medium" | "high" | "critical";
}

export interface RuntimeConstraint {
  type: "max_cost_usd" | "max_latency_ms" | "require_provider" | "exclude_provider" | "compliance" | "custom";
  value: unknown;
  hard: boolean; // hard = eliminates candidate; soft = penalty
  description?: string;
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

  /** Retry type */
  retry_type: RetryType;
}

/**
 * Three forms of retry:
 *
 * "same_agent"       — Re-invoke same agent. Used for transient failures,
 *                      tool errors, mild timeouts.
 * "other_agent"      — Select different agent, same capability.
 *                      Used for persistent errors, low confidence, instability.
 * "other_capability" — Select different capability entirely.
 *                      Used when capability underperforms in context,
 *                      or policy requires diversification.
 */
export type RetryType =
  | "same_agent"
  | "other_agent"
  | "other_capability";

// ════════════════════════════════════════════════════════════════
// 2. ELIGIBILITY PHASE
// ════════════════════════════════════════════════════════════════

/**
 * Eligibility is a hard filter. An agent is either eligible or not.
 * No scoring happens here. This phase reduces the candidate pool
 * to agents that CAN handle the task.
 *
 * Rules are applied in order. First failure short-circuits.
 *
 * Checks (ordered):
 *   1. agent_status_check    — agent.status == "active"
 *   2. stage_support_check   — capability supports this stage
 *   3. mode_support_check    — agent supports required mode
 *   4. requirement_check     — mandatory requirements satisfied
 *   5. constraint_check      — no hard constraint violated
 *   6. policy_check          — no policy blocks execution
 *   7. exclusion_check       — agent not in previous_attempts
 *   8. probation_check       — not on probation (if policy excludes)
 *   9. routing_exclusion_check — stage not in excluded_stages
 *
 * Exception: "degraded" agents MAY pass if the fallback chain
 * explicitly allows degraded mode and no active agents passed.
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
  capability_id: string;
  profile: AgentProfile;

  /** Which eligibility checks were passed */
  passed_checks: EligibilityCheck[];
}

export interface IneligibleAgent {
  agent_id: string;
  agent_type: AgentType;
  capability_id?: string;

  /** All checks evaluated */
  passed_checks: EligibilityCheck[];

  /** First check that failed (short-circuit) */
  failed_check: EligibilityCheck;

  /** Blocking reasons (human-readable) */
  blocking_reasons: string[];
}

export type EligibilityCheck =
  | "agent_status_check"
  | "stage_support_check"
  | "mode_support_check"
  | "requirement_check"
  | "constraint_check"
  | "policy_check"
  | "exclusion_check"
  | "probation_check"
  | "routing_exclusion_check";

// ════════════════════════════════════════════════════════════════
// 3. RANKING PHASE
// ════════════════════════════════════════════════════════════════

/**
 * RankedCandidate — an eligible agent with multi-dimensional scores.
 *
 * Scoring model (all 0.0 – 1.0):
 *
 *   requirement_score  — how well mandatory/optional requirements match
 *   context_score      — alignment with domain, complexity, artifact shape
 *   performance_score  — historical success rate, validation scores
 *   policy_score       — alignment with system preferences (stability, compliance)
 *   efficiency_score   — quality/cost/latency ratio
 *
 * Penalties are applied AFTER the weighted composite.
 */
export interface RankedCandidate {
  agent_id: string;
  capability_id: string;
  agent_type: AgentType;
  rank: number;

  /** Individual dimension scores */
  requirement_score: number;
  context_score: number;
  performance_score: number;
  policy_score: number;
  efficiency_score: number;

  /** Penalties applied */
  penalties: CandidatePenalties;

  /** Weighted composite BEFORE penalties */
  final_match_score: number;

  /** Final score AFTER penalties */
  final_adjusted_score: number;

  /** Capability match result */
  match_result?: CapabilityMatchResult;

  /** Performance summary (if available) */
  scorecard_summary?: ScorecardSummary;

  /** Warnings for observability */
  warnings?: string[];
}

export interface CandidatePenalties {
  confidence_drift_penalty: number;
  instability_penalty: number;
  fallback_overuse_penalty: number;

  /** Total penalty (sum of all) */
  total: number;
}

export interface RankingResult {
  /** Ranked candidates, best first */
  ranked: RankedCandidate[];

  /** Ranking weights used */
  weights: RankingWeights;

  /** Algorithm version for reproducibility */
  algorithm_version: string;
}

// ════════════════════════════════════════════════════════════════
// 4. RANKING WEIGHTS & FORMULA
// ════════════════════════════════════════════════════════════════

/**
 * Ranking weights for the 5-component scoring model.
 *
 * Formula:
 *   final_match_score =
 *     (requirement_score  × W_req)  +
 *     (context_score      × W_ctx)  +
 *     (performance_score  × W_perf) +
 *     (policy_score       × W_pol)  +
 *     (efficiency_score   × W_eff)
 *
 *   final_adjusted_score =
 *     final_match_score
 *     - confidence_drift_penalty
 *     - instability_penalty
 *     - fallback_overuse_penalty
 *
 *   final_adjusted_score = clamp(final_adjusted_score, 0.0, 1.0)
 */
export interface RankingWeights {
  requirement: number;
  context: number;
  performance: number;
  policy: number;
  efficiency: number;
}

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  requirement: 0.35,
  context: 0.20,
  performance: 0.20,
  policy: 0.15,
  efficiency: 0.10,
};

// ════════════════════════════════════════════════════════════════
// 5. PENALTIES
// ════════════════════════════════════════════════════════════════

/**
 * Penalty types and standard values.
 *
 * Penalties are subtracted from final_match_score.
 * All values are positive (deductions).
 */
export type PenaltyType =
  | "confidence_drift_severe"
  | "confidence_drift_significant"
  | "confidence_drift_mild"
  | "trend_degrading"
  | "binding_probation"
  | "retry_same_provider"
  | "fallback_overuse"
  | "instability"
  | "over_budget"
  | "no_scorecard";

export interface PenaltyRecord {
  agent_id: string;
  penalty_type: PenaltyType;
  penalty_value: number;
  reason: string;
}

export const STANDARD_PENALTIES: Record<PenaltyType, number> = {
  confidence_drift_severe: 0.15,
  confidence_drift_significant: 0.08,
  confidence_drift_mild: 0.03,
  trend_degrading: 0.10,
  binding_probation: 0.12,
  retry_same_provider: 0.05,
  fallback_overuse: 0.07,
  instability: 0.09,
  over_budget: 0.20,
  no_scorecard: 0.04,
};

// ════════════════════════════════════════════════════════════════
// 6. SELECTION DECISION
// ════════════════════════════════════════════════════════════════

/**
 * SelectionDecision — the final output of the selection engine.
 *
 * This is the primary artifact consumed by the orchestrator.
 * Self-contained, auditable, and actionable.
 */
export interface SelectionDecision {
  /** Decision ID for tracing */
  decision_id: string;

  /** Back-reference to the input */
  request_id: string;
  task_id: string;

  /** Decision outcome */
  outcome: SelectionOutcome;

  /** Selected agent (if outcome involves selection) */
  selected_agent_id?: string;
  selected_capability_id?: string;

  /** Shortlisted candidates (next-best after selected) */
  shortlisted_candidates: RankedCandidate[];

  /** Rejected candidates with reasons */
  rejected_candidates?: IneligibleAgent[];

  /** Fallback sequence if selected agent fails */
  fallback_candidates: FallbackCandidate[];

  /** Why this decision was made */
  decision_reason: string;

  /** Rules/policies that influenced the decision */
  applied_rules: string[];

  /** Degradation info if selection required compromise */
  degradation?: DegradedCapability[];

  /** Flags for the orchestrator */
  flags: SelectionFlag[];

  /** Full rationale for audit */
  rationale?: SelectionRationale;

  /** Timing */
  created_at: string;
  selection_duration_ms?: number;

  /** Eligibility summary */
  eligibility_summary: EligibilitySummary;
}

export type SelectionOutcome =
  | "selected"               // agent found and assigned
  | "fallback_selected"      // primary failed, using fallback
  | "degraded_selected"      // selected with reduced guarantees
  | "no_eligible_agents"     // no agents passed eligibility
  | "no_qualified_agents"    // eligible but none meet min_match_score
  | "exhausted";             // all candidates (incl. fallbacks) exhausted

// ════════════════════════════════════════════════════════════════
// 7. FALLBACK CANDIDATES
// ════════════════════════════════════════════════════════════════

export interface FallbackCandidate {
  agent_id: string;
  capability_id: string;
  fallback_rank: number;

  /** Mode to use if this fallback is activated */
  fallback_mode?: AgentMode;

  /** Expected degradation if this agent is used */
  expected_degradation?: string[];

  /** Confidence penalty if this fallback is used */
  confidence_penalty: number;
}

// ════════════════════════════════════════════════════════════════
// 8. SELECTION RATIONALE (Explainability)
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

  /** Alternatives considered and why they lost */
  rejected_alternatives: RejectedAlternative[];

  /** Engine self-assessment of selection quality */
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
  capability_id?: string;
  rank: number;
  final_adjusted_score: number;
  rejection_reason: string;
}

export type SelectionFlag =
  | "single_candidate"             // only one agent was eligible
  | "narrow_margin"                // top-2 score gap < threshold
  | "all_degrading"                // all candidates have degrading trend
  | "confidence_drift_winner"      // winner has drift issues
  | "fallback_activated"           // using fallback, not primary
  | "degraded_mode"                // operating with reduced guarantees
  | "no_performance_data"          // no scorecard for any candidate
  | "retry_selection"              // this is a retry_other selection
  | "budget_constrained"           // budget limits excluded candidates
  | "experimental_capability";     // selected capability is in draft/deprecated

// ════════════════════════════════════════════════════════════════
// 9. SELECTION TRACE (Audit)
// ════════════════════════════════════════════════════════════════

/**
 * SelectionTrace — lightweight audit record.
 *
 * Designed for storage and querying without the full decision payload.
 */
export interface SelectionTrace {
  task_id: string;
  decision_id: string;

  evaluated_candidates: number;
  eligible_candidates: number;

  ranking_algorithm_version: string;

  applied_penalties?: string[];

  decision_latency_ms?: number;

  outcome: SelectionOutcome;
  selected_agent_id?: string;

  created_at: string;
}

// ════════════════════════════════════════════════════════════════
// 10. ELIGIBILITY SUMMARY
// ════════════════════════════════════════════════════════════════

export interface EligibilitySummary {
  total_candidates: number;
  eligible_count: number;
  ineligible_count: number;
  eligibility_rate: number;

  /** Breakdown of ineligibility reasons */
  ineligibility_breakdown: Record<EligibilityCheck, number>;
}

// ════════════════════════════════════════════════════════════════
// 11. SELECTION ENGINE CONFIGURATION
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

  /** Algorithm version string for reproducibility */
  algorithm_version: string;
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
  algorithm_version: "0.2.0",
};

// ════════════════════════════════════════════════════════════════
// 12. TIE-BREAKING RULES
// ════════════════════════════════════════════════════════════════

/**
 * When two candidates have identical final_adjusted_score:
 *
 *   1. Lower avg_cost_usd wins
 *   2. If still tied, lower avg_latency_ms wins
 *   3. If still tied, higher historical stability (success_rate) wins
 *   4. If still tied, lexicographically lower agent_id wins (determinism)
 */
export type TieBreakKey =
  | "cost"
  | "latency"
  | "stability"
  | "agent_id";

export const DEFAULT_TIE_BREAK_ORDER: TieBreakKey[] = [
  "cost",
  "latency",
  "stability",
  "agent_id",
];

// ════════════════════════════════════════════════════════════════
// 13. SELECTION EVENTS
// ════════════════════════════════════════════════════════════════

/**
 * Events emitted by the selection engine.
 * These extend the ProtocolRuntimeEvent and CapabilityEventType
 * taxonomies.
 */
export type SelectionEventType =
  | "selection.started"
  | "selection.eligibility_checked"
  | "selection.ranking_completed"
  | "selection.decision_made"
  | "selection.fallback_defined"
  | "selection.retry_other_dispatched"
  | "selection.no_eligible_agents"
  | "selection.degraded_mode"
  | "selection.narrow_margin_warning"
  | "selection.low_eligibility_warning";

// ════════════════════════════════════════════════════════════════
// 14. SELECTION POLICY MODIFIER
// ════════════════════════════════════════════════════════════════

/**
 * SelectionPolicyModifier — runtime overrides that influence
 * selection behavior for a specific request.
 *
 * These are applied ON TOP of the base SelectionPolicy and
 * SelectionEngineConfig.
 */
export interface SelectionPolicyModifier {
  /** Override ranking weights for this request */
  weight_overrides?: Partial<RankingWeights>;

  /** Additional penalties for this request */
  extra_penalties?: PenaltyRecord[];

  /** Force a specific agent (bypass selection) */
  force_agent_id?: string;

  /** Force a specific capability */
  force_capability_id?: string;

  /** Reason for the modification */
  reason: string;

  /** Who applied this modifier */
  applied_by: "system" | "policy" | "human" | "evolution_agent";
}

// ════════════════════════════════════════════════════════════════
// 15. SELECTION ENGINE INTERFACE
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
  select(input: SelectionInput): SelectionDecision;

  /**
   * Eligibility check only.
   * Useful for dry-runs and capacity planning.
   */
  checkEligibility(input: SelectionInput): EligibilityResult;

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
