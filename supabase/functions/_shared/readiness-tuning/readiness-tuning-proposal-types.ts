/**
 * Readiness Tuning Proposal Types — Sprint 159
 * Domain model for governed readiness tuning proposals derived from operational learning signals.
 */

// ── Proposal types ──

export type ReadinessTuningProposalType =
  | "relax_readiness_check"
  | "tighten_readiness_check"
  | "promote_warning_to_blocker"
  | "demote_blocker_to_warning"
  | "adjust_threshold"
  | "split_rule_by_environment"
  | "split_rule_by_stage"
  | "remove_low_value_check"
  | "add_review_for_check"
  | "request_readiness_review";

export type ReadinessTuningTargetScope =
  | "global"
  | "stage"
  | "check"
  | "threshold"
  | "environment";

export type ReadinessTuningReviewStatus =
  | "proposed"
  | "under_review"
  | "accepted"
  | "rejected"
  | "deferred"
  | "superseded"
  | "expired";

export type ReadinessTuningSeverity = "critical" | "high" | "medium" | "low" | "info";

// ── Core proposal model ──

export interface ReadinessTuningProposalRecord {
  id?: string;
  organization_id: string;
  proposal_type: ReadinessTuningProposalType;
  target_stage_scope: string | null;
  target_readiness_check_id: string | null;
  target_threshold_id: string | null;
  target_rule_scope: ReadinessTuningTargetScope;
  related_learning_signal_ids: string[];
  related_readiness_result_ids: string[];
  related_action_ids: string[];
  related_outcome_ids: string[];
  related_recovery_hook_ids: string[];
  initiative_ids: string[];
  environment_scope: string | null;
  evidence_summary: string;
  rationale: string;
  confidence: number; // 0.0–1.0
  severity: ReadinessTuningSeverity;
  recommendation: string;
  review_status: ReadinessTuningReviewStatus;
  proposed_by_actor_type: string;
  aggregation_key: string | null;
  aggregation_count: number;
  metadata: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

// ── Review lifecycle ──

const ALLOWED_REVIEW_TRANSITIONS: Record<ReadinessTuningReviewStatus, ReadinessTuningReviewStatus[]> = {
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
  from: ReadinessTuningReviewStatus;
  to: ReadinessTuningReviewStatus;
  reason: string;
}

export function validateReviewTransition(
  from: ReadinessTuningReviewStatus,
  to: ReadinessTuningReviewStatus,
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

export function getAvailableReviewTransitions(current: ReadinessTuningReviewStatus): ReadinessTuningReviewStatus[] {
  return ALLOWED_REVIEW_TRANSITIONS[current] || [];
}

// ── Validation ──

const PROPOSAL_TYPES: ReadinessTuningProposalType[] = [
  "relax_readiness_check", "tighten_readiness_check", "promote_warning_to_blocker",
  "demote_blocker_to_warning", "adjust_threshold", "split_rule_by_environment",
  "split_rule_by_stage", "remove_low_value_check", "add_review_for_check",
  "request_readiness_review",
];

const TARGET_SCOPES: ReadinessTuningTargetScope[] = [
  "global", "stage", "check", "threshold", "environment",
];

export function validateProposalRecord(
  data: unknown,
): { valid: true; proposal: ReadinessTuningProposalRecord } | { valid: false; errors: string[] } {
  if (!data || typeof data !== "object") return { valid: false, errors: ["Proposal must be an object"] };
  const d = data as Record<string, unknown>;
  const errors: string[] = [];

  if (!d.organization_id || typeof d.organization_id !== "string") errors.push("organization_id required");
  if (!d.proposal_type || !PROPOSAL_TYPES.includes(d.proposal_type as ReadinessTuningProposalType)) {
    errors.push(`proposal_type must be one of: ${PROPOSAL_TYPES.join(", ")}`);
  }
  if (!d.target_rule_scope || !TARGET_SCOPES.includes(d.target_rule_scope as ReadinessTuningTargetScope)) {
    errors.push(`target_rule_scope must be one of: ${TARGET_SCOPES.join(", ")}`);
  }
  if (typeof d.confidence === "number" && (d.confidence < 0 || d.confidence > 1)) {
    errors.push("confidence must be between 0 and 1");
  }
  if (!d.evidence_summary || typeof d.evidence_summary !== "string") errors.push("evidence_summary required");
  if (!d.rationale || typeof d.rationale !== "string") errors.push("rationale required");

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, proposal: d as unknown as ReadinessTuningProposalRecord };
}
