/**
 * Proposal Quality Feedback Types — Sprint 19
 *
 * Defines the full taxonomy for proposal quality signals,
 * feedback tags, and scoring interfaces.
 *
 * SAFETY: Type definitions only. No side effects.
 */

// ─── Decision Signal Taxonomy ───

export const DECISION_SIGNALS = [
  "accepted",
  "rejected",
  "deferred",
  "approved",
  "implemented",
  "abandoned",
] as const;
export type DecisionSignal = typeof DECISION_SIGNALS[number];

// ─── Follow-Through Signal Taxonomy ───

export const FOLLOW_THROUGH_SIGNALS = [
  "implemented",
  "not_implemented",
  "partially_implemented",
  "unknown",
] as const;
export type FollowThroughSignal = typeof FOLLOW_THROUGH_SIGNALS[number];

// ─── Outcome Signal Taxonomy ───

export const OUTCOME_SIGNALS = [
  "positive",
  "neutral",
  "negative",
  "unknown",
] as const;
export type OutcomeSignal = typeof OUTCOME_SIGNALS[number];

// ─── Feedback Tags ───

export const FEEDBACK_TAGS = [
  "too_generic",
  "well_supported",
  "historically_redundant",
  "novel_but_useful",
  "unclear_impact",
  "high_value",
  "needs_more_evidence",
] as const;
export type FeedbackTag = typeof FEEDBACK_TAGS[number];

// ─── Audit Events ───

export const PROPOSAL_QUALITY_AUDIT_EVENTS = {
  PROPOSAL_FEEDBACK_CAPTURED: "PROPOSAL_FEEDBACK_CAPTURED",
  PROPOSAL_FEEDBACK_UPDATED: "PROPOSAL_FEEDBACK_UPDATED",
  PROPOSAL_QUALITY_SUMMARY_CREATED: "PROPOSAL_QUALITY_SUMMARY_CREATED",
  PROPOSAL_OUTCOME_RECORDED: "PROPOSAL_OUTCOME_RECORDED",
} as const;

// ─── Feedback Record ───

export interface ProposalQualityFeedbackInput {
  organization_id: string;
  workspace_id?: string | null;
  entity_type: "recommendation" | "artifact";
  entity_id: string;
  source_meta_agent_type?: string | null;
  artifact_type?: string | null;
  decision_signal: DecisionSignal;
  follow_through_signal?: FollowThroughSignal;
  outcome_signal?: OutcomeSignal;
  reviewer_feedback_score?: number | null;
  feedback_tags?: FeedbackTag[];
  notes?: string | null;
  evidence_refs?: Record<string, unknown>[];
  // Scoring context
  confidence_score?: number;
  impact_score?: number;
  priority_score?: number;
  historical_alignment?: string | null;
  was_memory_enriched?: boolean;
  created_at?: string;
  reviewed_at?: string;
}

// ─── Quality + Usefulness Scores ───

export interface FeedbackScores {
  quality_score: number;
  usefulness_score: number;
  historical_support_score: number | null;
  historical_conflict_score: number | null;
  confidence_in_feedback: number;
}

// ─── Summary Types ───

export const SUMMARY_TYPES = [
  "agent_quality",
  "artifact_usefulness",
  "outcome_patterns",
  "rejection_patterns",
  "historical_comparison",
] as const;
export type SummaryType = typeof SUMMARY_TYPES[number];

export interface AdvisorySignal {
  signal_type: string;
  description: string;
  meta_agent_type?: string;
  artifact_type?: string;
  confidence: number;
  supporting_data: Record<string, unknown>;
}
