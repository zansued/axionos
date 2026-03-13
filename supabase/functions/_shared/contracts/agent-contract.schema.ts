/**
 * Agent Contract Schema — Hierarchical Orchestration Model
 * 
 * Defines structured contracts for agent identity, delegation,
 * review policies, and handoff protocols within swarm campaigns.
 */

// ══════════════════════════════════════════════════
//  AGENT CONTRACT — Identity & Capability
// ══════════════════════════════════════════════════

export type AgentContractRole = 
  | "manager" 
  | "planner" 
  | "executor" 
  | "reviewer" 
  | "specialist" 
  | "coordinator";

export type DelegationMode = "auto" | "manual" | "conditional";
export type ReviewVerdict = "approved" | "needs_revision" | "rejected" | "escalated";

export interface AgentContract {
  agent_id: string;
  role: AgentContractRole;
  goal: string;
  backstory: string;
  allow_delegation: boolean;
  delegation_mode: DelegationMode;
  capabilities: string[];
  tools: string[];
  constraints: AgentConstraints;
  review_policy: ReviewPolicy;
  handoff_policy: HandoffPolicy;
}

export interface AgentConstraints {
  max_retries: number;
  timeout_ms: number;
  max_tokens_per_task: number;
  allowed_stages: string[];
  forbidden_actions: string[];
  cost_budget_usd: number;
  require_approval_above_risk: "low" | "medium" | "high";
}

// ══════════════════════════════════════════════════
//  REVIEW POLICY
// ══════════════════════════════════════════════════

export interface ReviewPolicy {
  auto_approve_threshold: number;      // 0-100 score above which auto-approve
  escalate_below_threshold: number;    // 0-100 score below which escalate to human
  max_revision_rounds: number;
  require_peer_review: boolean;
  reviewer_agent_ids: string[];        // agents authorized to review this agent's output
}

// ══════════════════════════════════════════════════
//  HANDOFF POLICY
// ══════════════════════════════════════════════════

export type HandoffTrigger = "completion" | "failure" | "timeout" | "quality_gate" | "delegation";

export interface HandoffPolicy {
  on_completion: HandoffAction;
  on_failure: HandoffAction;
  on_timeout: HandoffAction;
  preserve_context: boolean;
  max_handoff_chain: number;
}

export interface HandoffAction {
  trigger: HandoffTrigger;
  target_role: AgentContractRole | null;
  target_agent_id: string | null;
  fallback_role: AgentContractRole | null;
  include_artifacts: boolean;
  include_error_context: boolean;
}

// ══════════════════════════════════════════════════
//  TASK DELEGATION CONTRACT
// ══════════════════════════════════════════════════

export type DelegationStatus = "pending" | "accepted" | "in_progress" | "completed" | "failed" | "rejected";

export interface TaskDelegation {
  delegation_id: string;
  from_agent_id: string;
  to_agent_id: string;
  task_description: string;
  task_context: Record<string, unknown>;
  expected_output_schema: Record<string, unknown> | null;
  priority: "low" | "medium" | "high" | "critical";
  status: DelegationStatus;
  constraints: Partial<AgentConstraints>;
  created_at: string;
  completed_at: string | null;
  result: DelegationResult | null;
}

export interface DelegationResult {
  verdict: ReviewVerdict;
  output: Record<string, unknown>;
  quality_score: number;
  tokens_used: number;
  cost_usd: number;
  duration_ms: number;
  revision_round: number;
  reviewer_notes: string | null;
}

// ══════════════════════════════════════════════════
//  MANAGER ORCHESTRATION PLAN
// ══════════════════════════════════════════════════

export type OrchestrationType = "sequential" | "parallel" | "conditional" | "iterative";

export interface OrchestrationPlan {
  plan_id: string;
  campaign_id: string;
  orchestration_type: OrchestrationType;
  phases: OrchestrationPhase[];
  global_constraints: Partial<AgentConstraints>;
  completion_criteria: CompletionCriteria;
}

export interface OrchestrationPhase {
  phase_id: string;
  phase_label: string;
  phase_type: OrchestrationType;
  delegations: TaskDelegation[];
  depends_on_phases: string[];
  gate: QualityGate | null;
}

export interface QualityGate {
  min_score: number;
  required_verdicts: ReviewVerdict[];
  allow_partial_pass: boolean;
  escalation_on_fail: boolean;
}

export interface CompletionCriteria {
  min_phases_completed: number;
  min_overall_score: number;
  require_all_reviews_passed: boolean;
  max_total_cost_usd: number;
}

// ══════════════════════════════════════════════════
//  DEFAULTS
// ══════════════════════════════════════════════════

export const DEFAULT_AGENT_CONSTRAINTS: AgentConstraints = {
  max_retries: 2,
  timeout_ms: 120_000,
  max_tokens_per_task: 8000,
  allowed_stages: [],
  forbidden_actions: [],
  cost_budget_usd: 0.50,
  require_approval_above_risk: "high",
};

export const DEFAULT_REVIEW_POLICY: ReviewPolicy = {
  auto_approve_threshold: 80,
  escalate_below_threshold: 40,
  max_revision_rounds: 2,
  require_peer_review: false,
  reviewer_agent_ids: [],
};

export const DEFAULT_HANDOFF_ACTION: HandoffAction = {
  trigger: "completion",
  target_role: null,
  target_agent_id: null,
  fallback_role: "coordinator",
  include_artifacts: true,
  include_error_context: true,
};

export const DEFAULT_HANDOFF_POLICY: HandoffPolicy = {
  on_completion: { ...DEFAULT_HANDOFF_ACTION, trigger: "completion" },
  on_failure: { ...DEFAULT_HANDOFF_ACTION, trigger: "failure", target_role: "reviewer" },
  on_timeout: { ...DEFAULT_HANDOFF_ACTION, trigger: "timeout", target_role: "coordinator" },
  preserve_context: true,
  max_handoff_chain: 5,
};

export function createAgentContract(overrides: Partial<AgentContract> & { agent_id: string; role: AgentContractRole; goal: string }): AgentContract {
  return {
    backstory: "",
    allow_delegation: overrides.role === "manager" || overrides.role === "coordinator",
    delegation_mode: overrides.role === "manager" ? "auto" : "manual",
    capabilities: [],
    tools: [],
    constraints: { ...DEFAULT_AGENT_CONSTRAINTS, ...overrides.constraints },
    review_policy: { ...DEFAULT_REVIEW_POLICY, ...overrides.review_policy },
    handoff_policy: { ...DEFAULT_HANDOFF_POLICY, ...overrides.handoff_policy },
    ...overrides,
  };
}

// ══════════════════════════════════════════════════
//  VALIDATION
// ══════════════════════════════════════════════════

const VALID_ROLES: AgentContractRole[] = ["manager", "planner", "executor", "reviewer", "specialist", "coordinator"];

export function validateAgentContract(data: unknown): { valid: true; contract: AgentContract } | { valid: false; error: string } {
  if (!data || typeof data !== "object") return { valid: false, error: "Contract must be an object" };
  const d = data as Record<string, unknown>;
  
  if (!d.agent_id || typeof d.agent_id !== "string") return { valid: false, error: "agent_id required" };
  if (!VALID_ROLES.includes(d.role as AgentContractRole)) return { valid: false, error: `role must be one of: ${VALID_ROLES.join(", ")}` };
  if (!d.goal || typeof d.goal !== "string") return { valid: false, error: "goal required" };
  
  return { valid: true, contract: createAgentContract(d as any) };
}
