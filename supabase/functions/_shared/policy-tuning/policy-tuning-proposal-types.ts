/**
 * Policy Tuning Proposal Types — Sprint 157
 * Domain model for governed policy tuning proposals derived from operational learning signals.
 */

// ── Proposal types ──

export type PolicyTuningProposalType =
  | "relax_policy_rule"
  | "tighten_policy_rule"
  | "adjust_risk_threshold"
  | "adjust_execution_mode_rule"
  | "adjust_approval_requirement"
  | "flag_policy_friction"
  | "flag_policy_leniency"
  | "request_policy_review";

export type PolicyTuningTargetScope =
  | "global"
  | "stage"
  | "initiative"
  | "action_type"
  | "environment"
  | "risk_level";

export type PolicyTuningReviewStatus =
  | "proposed"
  | "under_review"
  | "accepted"
  | "rejected"
  | "deferred"
  | "superseded"
  | "expired";

export type PolicyTuningSeverity = "critical" | "high" | "medium" | "low" | "info";

// ── Core proposal model ──

export interface PolicyTuningProposalRecord {
  id?: string;
  organization_id: string;
  proposal_type: PolicyTuningProposalType;
  target_policy_scope: PolicyTuningTargetScope;
  target_policy_object_id: string | null;
  related_learning_signal_ids: string[];
  related_action_ids: string[];
  related_outcome_ids: string[];
  related_policy_decision_ids: string[];
  related_approval_request_ids: string[];
  initiative_ids: string[];
  stage_scope: string;
  evidence_summary: string;
  rationale: string;
  confidence: number; // 0.0–1.0
  severity: PolicyTuningSeverity;
  recommendation: string;
  review_status: PolicyTuningReviewStatus;
  proposed_by_actor_type: string;
  aggregation_key: string | null;
  aggregation_count: number;
  metadata: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

// ── Review lifecycle ──

const ALLOWED_REVIEW_TRANSITIONS: Record<PolicyTuningReviewStatus, PolicyTuningReviewStatus[]> = {
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
  from: PolicyTuningReviewStatus;
  to: PolicyTuningReviewStatus;
  reason: string;
}

export function validateReviewTransition(
  from: PolicyTuningReviewStatus,
  to: PolicyTuningReviewStatus,
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

export function getAvailableReviewTransitions(current: PolicyTuningReviewStatus): PolicyTuningReviewStatus[] {
  return ALLOWED_REVIEW_TRANSITIONS[current] || [];
}

// ── Validation ──

const PROPOSAL_TYPES: PolicyTuningProposalType[] = [
  "relax_policy_rule", "tighten_policy_rule", "adjust_risk_threshold",
  "adjust_execution_mode_rule", "adjust_approval_requirement",
  "flag_policy_friction", "flag_policy_leniency", "request_policy_review",
];

const TARGET_SCOPES: PolicyTuningTargetScope[] = [
  "global", "stage", "initiative", "action_type", "environment", "risk_level",
];

export function validateProposalRecord(
  data: unknown,
): { valid: true; proposal: PolicyTuningProposalRecord } | { valid: false; errors: string[] } {
  if (!data || typeof data !== "object") return { valid: false, errors: ["Proposal must be an object"] };
  const d = data as Record<string, unknown>;
  const errors: string[] = [];

  if (!d.organization_id || typeof d.organization_id !== "string") errors.push("organization_id required");
  if (!d.proposal_type || !PROPOSAL_TYPES.includes(d.proposal_type as PolicyTuningProposalType)) {
    errors.push(`proposal_type must be one of: ${PROPOSAL_TYPES.join(", ")}`);
  }
  if (!d.target_policy_scope || !TARGET_SCOPES.includes(d.target_policy_scope as PolicyTuningTargetScope)) {
    errors.push(`target_policy_scope must be one of: ${TARGET_SCOPES.join(", ")}`);
  }
  if (typeof d.confidence === "number" && (d.confidence < 0 || d.confidence > 1)) {
    errors.push("confidence must be between 0 and 1");
  }
  if (!d.evidence_summary || typeof d.evidence_summary !== "string") errors.push("evidence_summary required");
  if (!d.rationale || typeof d.rationale !== "string") errors.push("rationale required");

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, proposal: d as unknown as PolicyTuningProposalRecord };
}
