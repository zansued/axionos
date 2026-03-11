/**
 * Agent Selection Tuning Proposal Types — Sprint 158
 * Domain model for governed agent selection tuning proposals derived from operational learning signals.
 */

// ── Proposal types ──

export type AgentSelectionTuningProposalType =
  | "prefer_agent"
  | "deprioritize_agent"
  | "restrict_agent_scope"
  | "expand_agent_scope"
  | "adjust_capability_weight"
  | "adjust_fallback_order"
  | "flag_agent_instability"
  | "request_selection_review";

export type AgentSelectionTargetScope =
  | "global"
  | "stage"
  | "action_type"
  | "capability"
  | "environment";

export type AgentSelectionReviewStatus =
  | "proposed"
  | "under_review"
  | "accepted"
  | "rejected"
  | "deferred"
  | "superseded"
  | "expired";

export type AgentSelectionSeverity = "critical" | "high" | "medium" | "low" | "info";

// ── Core proposal model ──

export interface AgentSelectionTuningProposalRecord {
  id?: string;
  organization_id: string;
  proposal_type: AgentSelectionTuningProposalType;
  target_selection_scope: AgentSelectionTargetScope;
  target_agent_id: string | null;
  target_stage_scope: string | null;
  target_action_type_scope: string | null;
  target_capability_scope: string | null;
  related_learning_signal_ids: string[];
  related_action_ids: string[];
  related_outcome_ids: string[];
  related_agent_decision_ids: string[];
  initiative_ids: string[];
  environment_scope: string | null;
  evidence_summary: string;
  rationale: string;
  confidence: number; // 0.0–1.0
  severity: AgentSelectionSeverity;
  recommendation: string;
  review_status: AgentSelectionReviewStatus;
  proposed_by_actor_type: string;
  aggregation_key: string | null;
  aggregation_count: number;
  metadata: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

// ── Review lifecycle ──

const ALLOWED_REVIEW_TRANSITIONS: Record<AgentSelectionReviewStatus, AgentSelectionReviewStatus[]> = {
  proposed: ["under_review", "deferred", "rejected"],
  under_review: ["accepted", "rejected", "deferred"],
  accepted: ["superseded"],
  rejected: [],
  deferred: ["proposed", "under_review", "expired"],
  superseded: [],
  expired: [],
};

export interface ReviewTransitionResult {
  allowed: boolean;
  from: AgentSelectionReviewStatus;
  to: AgentSelectionReviewStatus;
  reason: string;
}

export function validateReviewTransition(
  from: AgentSelectionReviewStatus,
  to: AgentSelectionReviewStatus,
): ReviewTransitionResult {
  const allowed = ALLOWED_REVIEW_TRANSITIONS[from]?.includes(to) || false;
  return {
    allowed,
    from,
    to,
    reason: allowed
      ? `Transition from '${from}' to '${to}' is valid`
      : `Transition from '${from}' to '${to}' is not allowed. Valid: ${ALLOWED_REVIEW_TRANSITIONS[from]?.join(", ") || "none"}`,
  };
}

export function getAvailableReviewTransitions(current: AgentSelectionReviewStatus): AgentSelectionReviewStatus[] {
  return ALLOWED_REVIEW_TRANSITIONS[current] || [];
}

// ── Validation ──

const PROPOSAL_TYPES: AgentSelectionTuningProposalType[] = [
  "prefer_agent", "deprioritize_agent", "restrict_agent_scope",
  "expand_agent_scope", "adjust_capability_weight", "adjust_fallback_order",
  "flag_agent_instability", "request_selection_review",
];

const TARGET_SCOPES: AgentSelectionTargetScope[] = [
  "global", "stage", "action_type", "capability", "environment",
];

export function validateProposalRecord(
  data: unknown,
): { valid: true; proposal: AgentSelectionTuningProposalRecord } | { valid: false; errors: string[] } {
  if (!data || typeof data !== "object") return { valid: false, errors: ["Proposal must be an object"] };
  const d = data as Record<string, unknown>;
  const errors: string[] = [];

  if (!d.organization_id || typeof d.organization_id !== "string") errors.push("organization_id required");
  if (!d.proposal_type || !PROPOSAL_TYPES.includes(d.proposal_type as AgentSelectionTuningProposalType)) {
    errors.push(`proposal_type must be one of: ${PROPOSAL_TYPES.join(", ")}`);
  }
  if (!d.target_selection_scope || !TARGET_SCOPES.includes(d.target_selection_scope as AgentSelectionTargetScope)) {
    errors.push(`target_selection_scope must be one of: ${TARGET_SCOPES.join(", ")}`);
  }
  if (typeof d.confidence === "number" && (d.confidence < 0 || d.confidence > 1)) {
    errors.push("confidence must be between 0 and 1");
  }
  if (!d.evidence_summary || typeof d.evidence_summary !== "string") errors.push("evidence_summary required");
  if (!d.rationale || typeof d.rationale !== "string") errors.push("rationale required");

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, proposal: d as unknown as AgentSelectionTuningProposalRecord };
}
