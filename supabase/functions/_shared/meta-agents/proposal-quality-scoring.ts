/**
 * Proposal Quality Scoring — Sprint 19
 *
 * Deterministic, rule-based quality scoring for recommendations and artifacts.
 * Computes quality signals from review outcomes, historical alignment accuracy,
 * and memory enrichment effectiveness.
 *
 * SAFETY: Read-only scoring utility. Never mutates system state.
 */

// ─── Types ───

export interface QualityRecordInput {
  entity_type: "recommendation" | "artifact";
  entity_id: string;
  meta_agent_type: string;
  recommendation_type: string;
  artifact_type?: string;
  review_outcome: string;
  created_at: string;
  reviewed_at?: string;
  confidence_score: number;
  impact_score: number;
  priority_score: number;
  historical_alignment?: string | null;
  was_memory_enriched: boolean;
  reviewer_notes?: string;
}

export interface QualityScores {
  acceptance_quality_score: number;
  implementation_quality_score: number;
  historical_alignment_accuracy: number;
  overall_quality_score: number;
  review_latency_hours: number | null;
  feedback_signals: FeedbackSignals;
}

export interface FeedbackSignals {
  confidence_calibration: "overconfident" | "well_calibrated" | "underconfident";
  memory_effectiveness: "positive" | "neutral" | "negative" | "not_applicable";
  alignment_prediction_correct: boolean | null;
  suggested_confidence_adjustment: number; // -0.2 to +0.2
  suggested_priority_adjustment: number;   // -0.2 to +0.2
}

export interface AggregateInput {
  total_recommendations: number;
  total_accepted: number;
  total_rejected: number;
  total_deferred: number;
  total_artifacts_generated: number;
  total_artifacts_approved: number;
  total_artifacts_implemented: number;
  avg_confidence_accepted: number;
  avg_confidence_rejected: number;
  memory_enriched_accepted: number;
  memory_enriched_total: number;
  non_memory_accepted: number;
  non_memory_total: number;
  recent_quality_scores: number[];
  previous_avg_quality: number;
}

export interface AggregateResult {
  avg_acceptance_rate: number;
  avg_implementation_rate: number;
  avg_review_latency_hours: number;
  avg_overall_quality: number;
  memory_enriched_acceptance_rate: number;
  non_memory_acceptance_rate: number;
  quality_trend: "improving" | "stable" | "declining";
}

// ─── Quality Scoring ───

/**
 * Score an individual review outcome.
 * Deterministic: same inputs always produce same outputs.
 */
export function scoreQualityRecord(input: QualityRecordInput): QualityScores {
  // Review latency
  const reviewLatency = computeReviewLatency(input.created_at, input.reviewed_at);

  // Acceptance quality: based on whether accepted outcomes correlate with high confidence
  const acceptanceScore = computeAcceptanceQuality(input.review_outcome, input.confidence_score);

  // Implementation quality: artifacts that reach "implemented" score higher
  const implementationScore = computeImplementationQuality(input.entity_type, input.review_outcome);

  // Historical alignment accuracy: did the alignment prediction match the outcome?
  const alignmentAccuracy = computeAlignmentAccuracy(input.historical_alignment, input.review_outcome);

  // Feedback signals for future generation improvement
  const feedbackSignals = computeFeedbackSignals(input);

  // Overall composite
  const overall = clamp(
    acceptanceScore * 0.35 +
    implementationScore * 0.25 +
    alignmentAccuracy * 0.2 +
    (reviewLatency !== null ? clamp(1 - reviewLatency / 168) : 0.5) * 0.1 + // faster review = better
    (input.was_memory_enriched ? 0.1 : 0.05) // slight bonus for memory-enriched
  );

  return {
    acceptance_quality_score: round3(acceptanceScore),
    implementation_quality_score: round3(implementationScore),
    historical_alignment_accuracy: round3(alignmentAccuracy),
    overall_quality_score: round3(overall),
    review_latency_hours: reviewLatency !== null ? round3(reviewLatency) : null,
    feedback_signals: feedbackSignals,
  };
}

/**
 * Compute aggregate quality metrics for a meta-agent type.
 */
export function computeAggregateQuality(input: AggregateInput): AggregateResult {
  const acceptanceRate = input.total_recommendations > 0
    ? input.total_accepted / input.total_recommendations : 0;

  const implementationRate = input.total_artifacts_approved > 0
    ? input.total_artifacts_implemented / input.total_artifacts_approved : 0;

  const memoryAcceptance = input.memory_enriched_total > 0
    ? input.memory_enriched_accepted / input.memory_enriched_total : 0;

  const nonMemoryAcceptance = input.non_memory_total > 0
    ? input.non_memory_accepted / input.non_memory_total : 0;

  const avgQuality = input.recent_quality_scores.length > 0
    ? input.recent_quality_scores.reduce((a, b) => a + b, 0) / input.recent_quality_scores.length : 0;

  // Trend: compare recent avg to historical avg
  let trend: "improving" | "stable" | "declining" = "stable";
  if (input.previous_avg_quality > 0 && input.recent_quality_scores.length >= 3) {
    const diff = avgQuality - input.previous_avg_quality;
    if (diff > 0.05) trend = "improving";
    else if (diff < -0.05) trend = "declining";
  }

  return {
    avg_acceptance_rate: round3(acceptanceRate),
    avg_implementation_rate: round3(implementationRate),
    avg_review_latency_hours: 0, // computed separately from records
    avg_overall_quality: round3(avgQuality),
    memory_enriched_acceptance_rate: round3(memoryAcceptance),
    non_memory_acceptance_rate: round3(nonMemoryAcceptance),
    quality_trend: trend,
  };
}

// ─── Internal Scoring Functions ───

function computeReviewLatency(createdAt: string, reviewedAt?: string): number | null {
  if (!reviewedAt) return null;
  const created = new Date(createdAt).getTime();
  const reviewed = new Date(reviewedAt).getTime();
  if (isNaN(created) || isNaN(reviewed)) return null;
  return Math.max(0, (reviewed - created) / (1000 * 60 * 60)); // hours
}

/**
 * Acceptance quality: accepted with high confidence = well calibrated,
 * rejected with high confidence = overconfident (lower quality),
 * accepted with low confidence = underconfident (moderate quality).
 */
function computeAcceptanceQuality(outcome: string, confidence: number): number {
  if (outcome === "accepted" || outcome === "approved" || outcome === "implemented") {
    // Accepted: quality correlates with confidence (well calibrated)
    return clamp(0.5 + confidence * 0.5);
  }
  if (outcome === "rejected") {
    // Rejected: inverse — high confidence on rejected = bad quality signal
    return clamp(0.3 - confidence * 0.2);
  }
  if (outcome === "deferred") {
    // Deferred: neutral, slightly below average
    return 0.4;
  }
  return 0.5; // pending or unknown
}

function computeImplementationQuality(entityType: string, outcome: string): number {
  if (entityType === "artifact") {
    if (outcome === "implemented") return 1.0;
    if (outcome === "approved") return 0.7;
    if (outcome === "reviewed") return 0.4;
    if (outcome === "rejected") return 0.1;
    return 0.3; // draft
  }
  // Recommendations: implemented via artifact chain
  if (outcome === "accepted") return 0.6;
  if (outcome === "rejected") return 0.1;
  if (outcome === "deferred") return 0.3;
  return 0.3;
}

/**
 * Historical alignment accuracy: did the alignment classification
 * predict the review outcome correctly?
 *
 * reinforces_prior_direction + accepted = correct prediction (high)
 * diverges_from_prior_direction + rejected = correct prediction (high)
 * reinforces_prior_direction + rejected = wrong prediction (low)
 */
function computeAlignmentAccuracy(alignment: string | null | undefined, outcome: string): number {
  if (!alignment) return 0.5; // no prediction made

  const accepted = outcome === "accepted" || outcome === "approved" || outcome === "implemented";
  const rejected = outcome === "rejected";

  switch (alignment) {
    case "reinforces_prior_direction":
    case "extends_prior_direction":
      return accepted ? 0.9 : (rejected ? 0.2 : 0.5);
    case "diverges_from_prior_direction":
      return rejected ? 0.8 : (accepted ? 0.3 : 0.5);
    case "reopens_unresolved_issue":
      return 0.5; // ambiguous — could go either way
    case "historically_novel":
      return 0.5; // no prediction implied
    default:
      return 0.5;
  }
}

function computeFeedbackSignals(input: QualityRecordInput): FeedbackSignals {
  const accepted = input.review_outcome === "accepted" || input.review_outcome === "approved" || input.review_outcome === "implemented";
  const rejected = input.review_outcome === "rejected";

  // Confidence calibration
  let calibration: FeedbackSignals["confidence_calibration"] = "well_calibrated";
  if (rejected && input.confidence_score > 0.7) calibration = "overconfident";
  else if (accepted && input.confidence_score < 0.4) calibration = "underconfident";

  // Memory effectiveness
  let memEffect: FeedbackSignals["memory_effectiveness"] = "not_applicable";
  if (input.was_memory_enriched) {
    memEffect = accepted ? "positive" : (rejected ? "negative" : "neutral");
  }

  // Alignment prediction
  let alignmentCorrect: boolean | null = null;
  if (input.historical_alignment) {
    const supportive = input.historical_alignment === "reinforces_prior_direction" || input.historical_alignment === "extends_prior_direction";
    alignmentCorrect = (supportive && accepted) || (!supportive && rejected);
  }

  // Suggested adjustments (conservative: max ±0.15)
  let confAdj = 0;
  if (calibration === "overconfident") confAdj = -0.1;
  else if (calibration === "underconfident") confAdj = 0.1;

  let priAdj = 0;
  if (rejected && input.priority_score > 0.7) priAdj = -0.1;
  else if (accepted && input.priority_score < 0.3) priAdj = 0.1;

  return {
    confidence_calibration: calibration,
    memory_effectiveness: memEffect,
    alignment_prediction_correct: alignmentCorrect,
    suggested_confidence_adjustment: round3(confAdj),
    suggested_priority_adjustment: round3(priAdj),
  };
}

// ─── Sprint 19 Expansion: Full Feedback Scoring ───

import type { ProposalQualityFeedbackInput, FeedbackScores } from "./proposal-quality-types.ts";

/**
 * Compute quality + usefulness scores for a feedback record.
 * Deterministic, rule-based, bounded [0,1].
 */
export function computeFeedbackScores(input: ProposalQualityFeedbackInput): FeedbackScores {
  const decision = input.decision_signal;
  const outcome = input.outcome_signal || "unknown";
  const followThrough = input.follow_through_signal || "unknown";
  const confidence = input.confidence_score || 0;
  const impact = input.impact_score || 0;
  const reviewerScore = input.reviewer_feedback_score;

  // Quality score: combines decision correctness + confidence calibration
  let quality = 0.5;
  if (["accepted", "approved", "implemented"].includes(decision)) {
    quality = clamp(0.5 + confidence * 0.3 + impact * 0.2);
  } else if (decision === "rejected") {
    quality = clamp(0.3 - confidence * 0.15);
  } else if (decision === "deferred") {
    quality = 0.4;
  }
  // Reviewer score adjustment
  if (reviewerScore != null) {
    quality = clamp(quality * 0.7 + (reviewerScore / 5) * 0.3);
  }

  // Usefulness score: combines follow-through + outcome
  let usefulness = 0.3;
  if (followThrough === "implemented") {
    usefulness = outcome === "positive" ? 0.95 : outcome === "neutral" ? 0.6 : outcome === "negative" ? 0.2 : 0.5;
  } else if (followThrough === "partially_implemented") {
    usefulness = outcome === "positive" ? 0.7 : 0.4;
  } else if (followThrough === "not_implemented") {
    usefulness = 0.1;
  }
  // Bump for accepted but not yet implemented
  if (["accepted", "approved"].includes(decision) && followThrough === "unknown") {
    usefulness = 0.4;
  }

  // Historical support/conflict scores
  const alignment = input.historical_alignment;
  let historicalSupport: number | null = null;
  let historicalConflict: number | null = null;
  if (alignment) {
    const accepted = ["accepted", "approved", "implemented"].includes(decision);
    switch (alignment) {
      case "reinforces_prior_direction":
      case "extends_prior_direction":
        historicalSupport = accepted ? 0.9 : 0.3;
        historicalConflict = accepted ? 0.1 : 0.7;
        break;
      case "diverges_from_prior_direction":
        historicalSupport = 0.2;
        historicalConflict = accepted ? 0.3 : 0.8;
        break;
      case "reopens_unresolved_issue":
        historicalSupport = 0.4;
        historicalConflict = 0.4;
        break;
      default:
        historicalSupport = 0.5;
        historicalConflict = 0.2;
    }
  }

  // Confidence in feedback: higher when we have more signals
  let feedbackConfidence = 0.5;
  if (outcome !== "unknown") feedbackConfidence += 0.2;
  if (followThrough !== "unknown") feedbackConfidence += 0.15;
  if (reviewerScore != null) feedbackConfidence += 0.1;
  if (alignment) feedbackConfidence += 0.05;
  feedbackConfidence = clamp(feedbackConfidence);

  return {
    quality_score: round3(quality),
    usefulness_score: round3(usefulness),
    historical_support_score: historicalSupport !== null ? round3(historicalSupport) : null,
    historical_conflict_score: historicalConflict !== null ? round3(historicalConflict) : null,
    confidence_in_feedback: round3(feedbackConfidence),
  };
}

// ─── Helpers ───

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
