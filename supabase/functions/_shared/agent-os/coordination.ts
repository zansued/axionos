// Agent OS — Multi-Agent Coordination System (v0.8)
// Structured collaboration patterns for multiple agents.
// Defines coordination strategies, agent roles, interaction loops,
// and termination rules. Infrastructure-agnostic.

import type { StageName } from "./types.ts";

// ─────────────────────────────────────────────
// §1  Coordination Strategies
// ─────────────────────────────────────────────

/** Built-in coordination strategy templates. */
export type CoordinationStrategyType =
  | "planner_executor"              // Plan → Execute
  | "builder_reviewer"              // Build → Review
  | "planner_builder_critic"        // Plan → Build → Critique
  | "research_synthesize_validate"  // Research → Synthesize → Validate
  | "iterative_refinement"          // Build → Critique → Refine (loop)
  | "debate"                        // Multiple agents argue positions
  | "consensus"                     // Agents vote on best output
  | "ensemble"                      // Parallel execution, merge results
  | "custom";                       // User-defined strategy

/** Full coordination strategy definition. */
export interface CoordinationStrategy {
  strategy_id: string;
  strategy_type: CoordinationStrategyType;
  /** Human-readable name. */
  name: string;
  description?: string;
  /** Ordered roles in the strategy. */
  roles: AgentRole[];
  /** Interaction flow between roles. */
  steps: CoordinationStepTemplate[];
  /** Iteration and termination rules. */
  iteration_rules: IterationRules;
  /** Stage scopes where this strategy applies. */
  stage_scopes?: StageName[];
}

// ─────────────────────────────────────────────
// §2  Agent Roles
// ─────────────────────────────────────────────

/** Role definition within a coordination strategy. */
export interface AgentRole {
  role_id: string;
  /** Human-readable role name. */
  name: string;
  /** Role type discriminator. */
  role_type: AgentRoleType;
  /** Description of responsibilities. */
  responsibilities: string;
  /** Required capability for this role. */
  required_capability?: string;
  /** Artifact types this role consumes. */
  input_artifact_kinds: string[];
  /** Artifact types this role produces. */
  output_artifact_kinds: string[];
  /** Is this role required or optional? */
  required: boolean;
  /** Maximum agents that can fill this role. */
  max_agents: number;
}

export type AgentRoleType =
  | "planner"
  | "executor"
  | "builder"
  | "researcher"
  | "critic"
  | "reviewer"
  | "refiner"
  | "validator"
  | "synthesizer"
  | "moderator"
  | "observer";

/** Assignment of an agent to a role. */
export interface RoleAssignment {
  assignment_id: string;
  role_id: string;
  agent_id: string;
  agent_name?: string;
  /** Selection rationale from the Selection Engine. */
  selection_rationale?: string;
  assigned_at: string;
}

// ─────────────────────────────────────────────
// §3  Coordination Steps
// ─────────────────────────────────────────────

/** Template defining a step in the coordination flow. */
export interface CoordinationStepTemplate {
  step_id: string;
  /** Execution order. */
  sequence: number;
  /** Role that executes this step. */
  role_id: string;
  /** Step type. */
  step_type: CoordinationStepType;
  /** Artifact kinds consumed from previous steps. */
  consumes: string[];
  /** Artifact kinds produced by this step. */
  produces: string[];
  /** Prompt template or instructions for the agent. */
  instructions?: string;
  /** Can this step be executed in parallel with others at the same sequence? */
  parallel: boolean;
  /** Is this step conditional? */
  condition?: CoordinationCondition;
}

export type CoordinationStepType =
  | "generate"    // Produce new artifacts
  | "review"      // Evaluate artifacts
  | "refine"      // Improve existing artifacts
  | "validate"    // Validate against criteria
  | "synthesize"  // Combine multiple inputs
  | "vote"        // Cast a vote on alternatives
  | "debate"      // Argue a position
  | "merge";      // Merge parallel outputs

/** Condition for conditional step execution. */
export interface CoordinationCondition {
  field: string;
  operator: "eq" | "gt" | "lt" | "gte" | "lte" | "exists";
  value: unknown;
}

// ─────────────────────────────────────────────
// §4  Coordination Plan & State
// ─────────────────────────────────────────────

/** A concrete coordination plan created from a strategy. */
export interface CoordinationPlan {
  plan_id: string;
  run_id: string;
  strategy_id: string;
  strategy_type: CoordinationStrategyType;
  role_assignments: RoleAssignment[];
  steps: CoordinationStepTemplate[];
  iteration_rules: IterationRules;
  created_at: string;
}

/** Runtime state of an active coordination. */
export interface CoordinationState {
  plan_id: string;
  run_id: string;
  status: CoordinationStatus;
  current_iteration: number;
  current_step_index: number;
  /** All iterations executed so far. */
  iterations: CoordinationIteration[];
  /** All artifacts produced across iterations. */
  artifact_ids: string[];
  /** Quality signal from the latest validation. */
  quality_score?: number;
  /** Quality trend across iterations. */
  quality_trend: number[];
  /** Termination reason if completed/aborted. */
  termination_reason?: CoordinationTerminationReason;
  started_at: string;
  completed_at?: string;
}

export type CoordinationStatus =
  | "planning"
  | "executing"
  | "iterating"
  | "completed"
  | "aborted"
  | "failed";

// ─────────────────────────────────────────────
// §5  Iterations & Interactions
// ─────────────────────────────────────────────

/** A single iteration of the coordination loop. */
export interface CoordinationIteration {
  iteration_number: number;
  steps_executed: CoordinationStepExecution[];
  artifacts_produced: string[];
  quality_score?: number;
  duration_ms: number;
  started_at: string;
  completed_at: string;
}

/** Result of executing a single coordination step. */
export interface CoordinationStepExecution {
  step_id: string;
  role_id: string;
  agent_id: string;
  /** Artifacts consumed as input. */
  input_artifact_ids: string[];
  /** Artifacts produced as output. */
  output_artifact_ids: string[];
  /** Agent's interaction outcome. */
  outcome: InteractionOutcome;
  duration_ms: number;
  cost_usd: number;
  tokens_used: number;
  timestamp: string;
}

/** Outcome of a single agent interaction within coordination. */
export interface InteractionOutcome {
  status: "completed" | "failed" | "skipped";
  /** Summary from the agent. */
  summary: string;
  /** Quality/confidence score 0.0–1.0. */
  score?: number;
  /** Recommendations for next steps. */
  recommendations?: string[];
  /** Vote (for consensus/debate strategies). */
  vote?: CoordinationVote;
  error_message?: string;
}

/** Vote cast by an agent in consensus/debate strategies. */
export interface CoordinationVote {
  /** What the agent is voting on. */
  subject_id: string;
  /** Position: approve, reject, or abstain. */
  position: "approve" | "reject" | "abstain";
  /** Confidence in the vote 0.0–1.0. */
  confidence: number;
  rationale: string;
}

// ─────────────────────────────────────────────
// §6  Iteration & Termination Rules
// ─────────────────────────────────────────────

/** Rules controlling iteration and termination. */
export interface IterationRules {
  /** Maximum coordination iterations. */
  max_iterations: number;
  /** Maximum critique/review cycles per iteration. */
  max_critique_cycles: number;
  /** Terminate early if quality exceeds this threshold. */
  quality_threshold: number;
  /** Abort if quality drops below this. */
  quality_floor: number;
  /** Abort if quality degrades N iterations in a row. */
  max_quality_degradations: number;
  /** Maximum total duration in ms. */
  max_duration_ms: number;
  /** Maximum total cost in USD. */
  max_cost_usd: number;
  /** Consensus threshold (for voting strategies). */
  consensus_threshold?: number;
}

export type CoordinationTerminationReason =
  | "quality_achieved"
  | "max_iterations_reached"
  | "max_duration_exceeded"
  | "max_cost_exceeded"
  | "quality_degradation"
  | "quality_below_floor"
  | "consensus_reached"
  | "consensus_failed"
  | "manual_abort"
  | "agent_failure";

export const DEFAULT_ITERATION_RULES: IterationRules = {
  max_iterations: 5,
  max_critique_cycles: 3,
  quality_threshold: 0.85,
  quality_floor: 0.3,
  max_quality_degradations: 2,
  max_duration_ms: 300_000, // 5 minutes
  max_cost_usd: 5.0,
  consensus_threshold: 0.67,
};

// ─────────────────────────────────────────────
// §7  Coordination Result
// ─────────────────────────────────────────────

/** Final result of a coordination run. */
export interface CoordinationResult {
  plan_id: string;
  run_id: string;
  strategy_type: CoordinationStrategyType;
  status: CoordinationStatus;
  iterations_executed: number;
  total_steps_executed: number;
  total_agents_involved: number;
  final_artifact_ids: string[];
  final_quality_score?: number;
  total_duration_ms: number;
  total_cost_usd: number;
  total_tokens_used: number;
  termination_reason: CoordinationTerminationReason;
  quality_progression: number[];
  completed_at: string;
}

// ─────────────────────────────────────────────
// §8  Coordination Manager Interface
// ─────────────────────────────────────────────

/**
 * Core interface for the Multi-Agent Coordination System.
 * Orchestrates multi-agent collaboration patterns.
 */
export interface ICoordinationManager {
  // ── Planning ──
  createPlan(
    strategy: CoordinationStrategy,
    run_id: string,
    context: Record<string, unknown>,
  ): Promise<CoordinationPlan>;

  // ── Execution ──
  execute(plan: CoordinationPlan): Promise<CoordinationResult>;

  // ── State ──
  getState(plan_id: string): CoordinationState | undefined;

  // ── Control ──
  abort(plan_id: string, reason: string): Promise<void>;

  // ── Strategy ──
  registerStrategy(strategy: CoordinationStrategy): void;
  getStrategy(strategy_id: string): CoordinationStrategy | undefined;
  listStrategies(): CoordinationStrategy[];
}

// ─────────────────────────────────────────────
// §9  Configuration
// ─────────────────────────────────────────────

export interface CoordinationConfig {
  enabled: boolean;
  default_strategy: CoordinationStrategyType;
  default_iteration_rules: IterationRules;
  /** Allow parallel step execution. */
  parallel_execution: boolean;
  /** Maximum concurrent agents in parallel steps. */
  max_parallel_agents: number;
}

export const DEFAULT_COORDINATION_CONFIG: CoordinationConfig = {
  enabled: true,
  default_strategy: "planner_builder_critic",
  default_iteration_rules: DEFAULT_ITERATION_RULES,
  parallel_execution: true,
  max_parallel_agents: 4,
};

// ─────────────────────────────────────────────
// §10  Event Types (EventBus integration)
// ─────────────────────────────────────────────

export type CoordinationEventType =
  | "coordination.plan_created"
  | "coordination.started"
  | "coordination.role_assigned"
  | "coordination.step_started"
  | "coordination.step_completed"
  | "coordination.step_failed"
  | "coordination.iteration_completed"
  | "coordination.quality_improved"
  | "coordination.quality_degraded"
  | "coordination.vote_cast"
  | "coordination.consensus_reached"
  | "coordination.consensus_failed"
  | "coordination.completed"
  | "coordination.aborted";
