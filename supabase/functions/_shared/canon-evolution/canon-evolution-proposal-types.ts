/**
 * Canon Evolution Proposal Types — Sprint 156
 * Domain model for governed canon evolution proposals derived from operational learning signals.
 */

// ── Proposal types ──

export type CanonEvolutionProposalType =
  | "promote_pattern"
  | "enrich_pattern"
  | "revise_pattern"
  | "deprecate_pattern"
  | "split_pattern"
  | "merge_pattern"
  | "mark_stale"
  | "raise_review"
  | "anti_pattern_alert";

export type CanonEvolutionTargetType =
  | "canon_entry"
  | "pattern"
  | "rule"
  | "convention"
  | "playbook";

export type CanonEvolutionReviewStatus =
  | "proposed"
  | "under_review"
  | "accepted"
  | "rejected"
  | "deferred"
  | "superseded"
  | "expired";

export type CanonEvolutionSeverity = "critical" | "high" | "medium" | "low" | "info";

// ── Core proposal model ──

export interface CanonEvolutionProposalRecord {
  id?: string;
  organization_id: string;
  proposal_type: CanonEvolutionProposalType;
  target_type: CanonEvolutionTargetType;
  target_id: string | null;
  related_learning_signal_ids: string[];
  related_canon_entry_ids: string[];
  related_pattern_ids: string[];
  initiative_ids: string[];
  stage_scope: string;
  evidence_summary: string;
  rationale: string;
  confidence: number; // 0.0–1.0
  severity: CanonEvolutionSeverity;
  recommendation: string;
  review_status: CanonEvolutionReviewStatus;
  proposed_by_actor_type: string;
  aggregation_key: string | null;
  aggregation_count: number;
  metadata: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

// ── Review lifecycle ──

const ALLOWED_REVIEW_TRANSITIONS: Record<CanonEvolutionReviewStatus, CanonEvolutionReviewStatus[]> = {
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
  from: CanonEvolutionReviewStatus;
  to: CanonEvolutionReviewStatus;
  reason: string;
}

export function validateReviewTransition(
  from: CanonEvolutionReviewStatus,
  to: CanonEvolutionReviewStatus,
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

export function getAvailableReviewTransitions(current: CanonEvolutionReviewStatus): CanonEvolutionReviewStatus[] {
  return ALLOWED_REVIEW_TRANSITIONS[current] || [];
}

// ── Validation ──

const PROPOSAL_TYPES: CanonEvolutionProposalType[] = [
  "promote_pattern", "enrich_pattern", "revise_pattern", "deprecate_pattern",
  "split_pattern", "merge_pattern", "mark_stale", "raise_review", "anti_pattern_alert",
];

const TARGET_TYPES: CanonEvolutionTargetType[] = ["canon_entry", "pattern", "rule", "convention", "playbook"];

export function validateProposalRecord(
  data: unknown,
): { valid: true; proposal: CanonEvolutionProposalRecord } | { valid: false; errors: string[] } {
  if (!data || typeof data !== "object") return { valid: false, errors: ["Proposal must be an object"] };
  const d = data as Record<string, unknown>;
  const errors: string[] = [];

  if (!d.organization_id || typeof d.organization_id !== "string") errors.push("organization_id required");
  if (!d.proposal_type || !PROPOSAL_TYPES.includes(d.proposal_type as CanonEvolutionProposalType)) {
    errors.push(`proposal_type must be one of: ${PROPOSAL_TYPES.join(", ")}`);
  }
  if (!d.target_type || !TARGET_TYPES.includes(d.target_type as CanonEvolutionTargetType)) {
    errors.push(`target_type must be one of: ${TARGET_TYPES.join(", ")}`);
  }
  if (typeof d.confidence === "number" && (d.confidence < 0 || d.confidence > 1)) {
    errors.push("confidence must be between 0 and 1");
  }
  if (!d.evidence_summary || typeof d.evidence_summary !== "string") errors.push("evidence_summary required");
  if (!d.rationale || typeof d.rationale !== "string") errors.push("rationale required");

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, proposal: d as unknown as CanonEvolutionProposalRecord };
}
