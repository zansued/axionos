import { describe, it, expect } from "vitest";
import {
  scoreQualityRecord,
  computeAggregateQuality,
  computeFeedbackScores,
} from "../../supabase/functions/_shared/meta-agents/proposal-quality-scoring";

describe("Sprint 19 — Proposal Quality Scoring", () => {
  const baseInput = {
    entity_type: "recommendation" as const,
    entity_id: "test-id",
    meta_agent_type: "ARCHITECTURE_META_AGENT",
    recommendation_type: "PIPELINE_OPTIMIZATION",
    review_outcome: "accepted",
    created_at: "2026-02-01T10:00:00Z",
    reviewed_at: "2026-02-01T12:00:00Z",
    confidence_score: 0.8,
    impact_score: 0.7,
    priority_score: 0.75,
    historical_alignment: "reinforces_prior_direction",
    was_memory_enriched: true,
  };

  it("produces deterministic scores for same inputs", () => {
    const a = scoreQualityRecord(baseInput);
    const b = scoreQualityRecord(baseInput);
    expect(a).toEqual(b);
  });

  it("scores accepted high-confidence recommendations highly", () => {
    const scores = scoreQualityRecord(baseInput);
    expect(scores.acceptance_quality_score).toBeGreaterThan(0.7);
    expect(scores.overall_quality_score).toBeGreaterThan(0.5);
  });

  it("scores rejected high-confidence recommendations as overconfident", () => {
    const scores = scoreQualityRecord({ ...baseInput, review_outcome: "rejected", confidence_score: 0.9 });
    expect(scores.acceptance_quality_score).toBeLessThan(0.3);
    expect(scores.feedback_signals.confidence_calibration).toBe("overconfident");
  });

  it("scores accepted low-confidence as underconfident", () => {
    const scores = scoreQualityRecord({ ...baseInput, review_outcome: "accepted", confidence_score: 0.2 });
    expect(scores.feedback_signals.confidence_calibration).toBe("underconfident");
  });

  it("computes review latency correctly", () => {
    const scores = scoreQualityRecord(baseInput);
    expect(scores.review_latency_hours).toBeCloseTo(2, 1);
  });

  it("handles null reviewed_at gracefully", () => {
    const scores = scoreQualityRecord({ ...baseInput, reviewed_at: undefined });
    expect(scores.review_latency_hours).toBeNull();
  });

  it("alignment accuracy high when reinforces + accepted", () => {
    const scores = scoreQualityRecord(baseInput);
    expect(scores.historical_alignment_accuracy).toBeGreaterThan(0.8);
  });

  it("alignment accuracy low when reinforces + rejected", () => {
    const scores = scoreQualityRecord({
      ...baseInput,
      review_outcome: "rejected",
      historical_alignment: "reinforces_prior_direction",
    });
    expect(scores.historical_alignment_accuracy).toBeLessThan(0.3);
  });

  it("alignment accuracy high when diverges + rejected", () => {
    const scores = scoreQualityRecord({
      ...baseInput,
      review_outcome: "rejected",
      historical_alignment: "diverges_from_prior_direction",
    });
    expect(scores.historical_alignment_accuracy).toBeGreaterThan(0.7);
  });

  it("memory enrichment positive signal on accepted", () => {
    const scores = scoreQualityRecord(baseInput);
    expect(scores.feedback_signals.memory_effectiveness).toBe("positive");
  });

  it("memory enrichment negative signal on rejected", () => {
    const scores = scoreQualityRecord({ ...baseInput, review_outcome: "rejected" });
    expect(scores.feedback_signals.memory_effectiveness).toBe("negative");
  });

  it("non-memory items marked not_applicable", () => {
    const scores = scoreQualityRecord({ ...baseInput, was_memory_enriched: false });
    expect(scores.feedback_signals.memory_effectiveness).toBe("not_applicable");
  });

  it("all scores bounded 0-1", () => {
    const scores = scoreQualityRecord(baseInput);
    expect(scores.acceptance_quality_score).toBeGreaterThanOrEqual(0);
    expect(scores.acceptance_quality_score).toBeLessThanOrEqual(1);
    expect(scores.implementation_quality_score).toBeGreaterThanOrEqual(0);
    expect(scores.implementation_quality_score).toBeLessThanOrEqual(1);
    expect(scores.overall_quality_score).toBeGreaterThanOrEqual(0);
    expect(scores.overall_quality_score).toBeLessThanOrEqual(1);
  });

  it("suggested adjustments within bounds", () => {
    const scores = scoreQualityRecord({ ...baseInput, review_outcome: "rejected", confidence_score: 0.95 });
    expect(scores.feedback_signals.suggested_confidence_adjustment).toBeGreaterThanOrEqual(-0.2);
    expect(scores.feedback_signals.suggested_confidence_adjustment).toBeLessThanOrEqual(0.2);
  });

  it("aggregate quality computes trend correctly", () => {
    const improving = computeAggregateQuality({
      total_recommendations: 20, total_accepted: 14, total_rejected: 4, total_deferred: 2,
      total_artifacts_generated: 10, total_artifacts_approved: 8, total_artifacts_implemented: 5,
      avg_confidence_accepted: 0.8, avg_confidence_rejected: 0.6,
      memory_enriched_accepted: 8, memory_enriched_total: 12,
      non_memory_accepted: 6, non_memory_total: 8,
      recent_quality_scores: [0.7, 0.75, 0.8, 0.82],
      previous_avg_quality: 0.6,
    });
    expect(improving.quality_trend).toBe("improving");

    const declining = computeAggregateQuality({
      total_recommendations: 20, total_accepted: 5, total_rejected: 12, total_deferred: 3,
      total_artifacts_generated: 3, total_artifacts_approved: 2, total_artifacts_implemented: 1,
      avg_confidence_accepted: 0.5, avg_confidence_rejected: 0.8,
      memory_enriched_accepted: 2, memory_enriched_total: 10,
      non_memory_accepted: 3, non_memory_total: 10,
      recent_quality_scores: [0.3, 0.25, 0.2],
      previous_avg_quality: 0.6,
    });
    expect(declining.quality_trend).toBe("declining");
  });

  it("never produces NaN or Infinity", () => {
    const edge = scoreQualityRecord({
      ...baseInput,
      confidence_score: 0,
      impact_score: 0,
      priority_score: 0,
      historical_alignment: null,
      was_memory_enriched: false,
      reviewed_at: undefined,
    });
    const values = [
      edge.acceptance_quality_score,
      edge.implementation_quality_score,
      edge.historical_alignment_accuracy,
      edge.overall_quality_score,
    ];
    for (const v of values) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});

describe("Sprint 19 — Feedback Scoring (computeFeedbackScores)", () => {
  const baseFb = {
    organization_id: "org-1",
    entity_type: "recommendation" as const,
    entity_id: "rec-1",
    decision_signal: "accepted" as const,
    confidence_score: 0.8,
    impact_score: 0.7,
    priority_score: 0.75,
    historical_alignment: "reinforces_prior_direction",
    was_memory_enriched: true,
  };

  it("produces deterministic feedback scores", () => {
    const a = computeFeedbackScores(baseFb);
    const b = computeFeedbackScores(baseFb);
    expect(a).toEqual(b);
  });

  it("quality_score bounded 0-1", () => {
    const s = computeFeedbackScores(baseFb);
    expect(s.quality_score).toBeGreaterThanOrEqual(0);
    expect(s.quality_score).toBeLessThanOrEqual(1);
  });

  it("usefulness_score defaults to moderate for unknown follow-through", () => {
    const s = computeFeedbackScores(baseFb);
    expect(s.usefulness_score).toBeGreaterThanOrEqual(0.3);
    expect(s.usefulness_score).toBeLessThanOrEqual(0.5);
  });

  it("usefulness high when implemented + positive", () => {
    const s = computeFeedbackScores({
      ...baseFb,
      decision_signal: "implemented",
      follow_through_signal: "implemented",
      outcome_signal: "positive",
    });
    expect(s.usefulness_score).toBeGreaterThan(0.9);
  });

  it("usefulness low when not_implemented", () => {
    const s = computeFeedbackScores({
      ...baseFb,
      follow_through_signal: "not_implemented",
    });
    expect(s.usefulness_score).toBeLessThan(0.2);
  });

  it("historical support score high for reinforcing + accepted", () => {
    const s = computeFeedbackScores(baseFb);
    expect(s.historical_support_score).toBeGreaterThan(0.8);
  });

  it("historical conflict score high for reinforcing + rejected", () => {
    const s = computeFeedbackScores({
      ...baseFb,
      decision_signal: "rejected",
    });
    expect(s.historical_conflict_score).toBeGreaterThan(0.6);
  });

  it("null historical scores when no alignment", () => {
    const s = computeFeedbackScores({
      ...baseFb,
      historical_alignment: null,
    });
    expect(s.historical_support_score).toBeNull();
    expect(s.historical_conflict_score).toBeNull();
  });

  it("confidence_in_feedback increases with more signals", () => {
    const minimal = computeFeedbackScores({
      ...baseFb,
      historical_alignment: null,
      was_memory_enriched: false,
    });
    const rich = computeFeedbackScores({
      ...baseFb,
      outcome_signal: "positive",
      follow_through_signal: "implemented",
      reviewer_feedback_score: 4,
    });
    expect(rich.confidence_in_feedback).toBeGreaterThan(minimal.confidence_in_feedback);
  });

  it("reviewer_feedback_score adjusts quality", () => {
    const noReviewer = computeFeedbackScores(baseFb);
    const withHighReviewer = computeFeedbackScores({
      ...baseFb,
      reviewer_feedback_score: 5,
    });
    const withLowReviewer = computeFeedbackScores({
      ...baseFb,
      reviewer_feedback_score: 1,
    });
    expect(withHighReviewer.quality_score).toBeGreaterThan(withLowReviewer.quality_score);
  });

  it("rejected decision produces low quality", () => {
    const s = computeFeedbackScores({
      ...baseFb,
      decision_signal: "rejected",
      confidence_score: 0.9,
    });
    expect(s.quality_score).toBeLessThan(0.3);
  });

  it("artifact feedback works correctly", () => {
    const s = computeFeedbackScores({
      ...baseFb,
      entity_type: "artifact",
      artifact_type: "ADR_DRAFT",
      decision_signal: "approved",
    });
    expect(s.quality_score).toBeGreaterThan(0.5);
  });

  it("all feedback scores are finite", () => {
    const edge = computeFeedbackScores({
      organization_id: "org-1",
      entity_type: "recommendation",
      entity_id: "id-edge",
      decision_signal: "deferred",
      confidence_score: 0,
      impact_score: 0,
      priority_score: 0,
      historical_alignment: null,
      was_memory_enriched: false,
    });
    const values = [
      edge.quality_score,
      edge.usefulness_score,
      edge.confidence_in_feedback,
    ];
    for (const v of values) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it("graceful degradation: missing optional fields don't crash", () => {
    const s = computeFeedbackScores({
      organization_id: "org-1",
      entity_type: "recommendation",
      entity_id: "id-min",
      decision_signal: "accepted",
    });
    expect(s.quality_score).toBeGreaterThanOrEqual(0);
    expect(s.usefulness_score).toBeGreaterThanOrEqual(0);
  });

  it("feedback tags do not affect scores (structural only)", () => {
    const withTags = computeFeedbackScores({
      ...baseFb,
      feedback_tags: ["high_value", "well_supported"],
    } as any);
    const withoutTags = computeFeedbackScores(baseFb);
    expect(withTags.quality_score).toBe(withoutTags.quality_score);
  });
});
