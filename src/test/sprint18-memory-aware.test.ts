/**
 * Sprint 18 — Memory-Aware Meta-Agents Tests
 *
 * Tests continuity scoring, redundancy guard, historical alignment,
 * and graceful degradation.
 */

import { describe, it, expect } from "vitest";

// ── Inline mirrors of Sprint 18 modules ──

function clamp(v: number): number { return Math.max(0, Math.min(1, v)); }
function round3(v: number): number { return Math.round(v * 1000) / 1000; }

// Historical Continuity Scoring
interface ContinuityScoreInputs {
  related_memory_count: number;
  related_summary_count: number;
  accepted_decisions: number;
  rejected_decisions: number;
  deferred_decisions: number;
  implemented_outcomes: number;
  outcome_success_rate: number;
  recurrence_across_windows: number;
}

interface ContinuityScores {
  historical_support_score: number;
  historical_conflict_score: number;
  historical_context_score: number;
}

type HistoricalAlignment =
  | "reinforces_prior_direction"
  | "extends_prior_direction"
  | "reopens_unresolved_issue"
  | "diverges_from_prior_direction"
  | "historically_novel";

function computeContinuityScores(inputs: ContinuityScoreInputs): ContinuityScores {
  const acceptedSignal = Math.min(1, Math.log(inputs.accepted_decisions + 1) / Math.log(6));
  const outcomeSignal = Math.min(1, Math.log(inputs.implemented_outcomes + 1) / Math.log(6));
  const memorySignal = Math.min(1, Math.log(inputs.related_memory_count + 1) / Math.log(11));
  const successSignal = Math.min(1, Math.max(0, inputs.outcome_success_rate));
  const historical_support_score = clamp(acceptedSignal * 0.3 + outcomeSignal * 0.25 + memorySignal * 0.2 + successSignal * 0.25);

  const rejectedSignal = Math.min(1, Math.log(inputs.rejected_decisions + 1) / Math.log(6));
  const deferredSignal = Math.min(1, Math.log(inputs.deferred_decisions + 1) / Math.log(6));
  const failureSignal = inputs.implemented_outcomes > 0 ? Math.min(1, Math.max(0, 1 - inputs.outcome_success_rate)) : 0;
  const historical_conflict_score = clamp(rejectedSignal * 0.5 + deferredSignal * 0.2 + failureSignal * 0.3);

  const historical_context_score = clamp(historical_support_score * 0.6 + (1 - historical_conflict_score) * 0.2 + memorySignal * 0.2);

  return {
    historical_support_score: round3(historical_support_score),
    historical_conflict_score: round3(historical_conflict_score),
    historical_context_score: round3(historical_context_score),
  };
}

function determineHistoricalAlignment(scores: ContinuityScores, inputs: ContinuityScoreInputs): HistoricalAlignment {
  const totalDecisions = inputs.accepted_decisions + inputs.rejected_decisions + inputs.deferred_decisions;
  if (totalDecisions === 0 && inputs.related_memory_count === 0 && inputs.related_summary_count === 0) return "historically_novel";
  if (scores.historical_support_score > 0.5 && scores.historical_conflict_score < 0.2) return "reinforces_prior_direction";
  if (scores.historical_support_score > 0.3 && scores.historical_conflict_score < 0.4) return "extends_prior_direction";
  if (scores.historical_conflict_score > 0.5) {
    if (inputs.deferred_decisions > 0) return "reopens_unresolved_issue";
    return "diverges_from_prior_direction";
  }
  if (inputs.rejected_decisions > 0 && inputs.recurrence_across_windows >= 2) return "reopens_unresolved_issue";
  if (totalDecisions > 0) return "extends_prior_direction";
  return "historically_novel";
}

// Redundancy Guard
interface RedundancyInput {
  current_confidence: number;
  current_impact: number;
  prior_rejections: number;
  prior_acceptances: number;
  prior_deferrals: number;
  days_since_last_similar: number | null;
  supporting_memory_count: number;
  has_new_evidence: boolean;
  historical_context_score: number;
}

interface RedundancyCheckResult {
  suppress: boolean;
  downgrade: boolean;
  reason: string | null;
  confidence_adjustment: number;
  novelty_flag: boolean;
}

function checkRedundancy(input: RedundancyInput): RedundancyCheckResult {
  if (input.prior_rejections >= 2 && !input.has_new_evidence && input.days_since_last_similar !== null && input.days_since_last_similar < 14) {
    return { suppress: true, downgrade: false, reason: `Suppressed: rejected ${input.prior_rejections} times recently with no new evidence`, confidence_adjustment: 0, novelty_flag: false };
  }
  if (input.prior_rejections >= 1 && input.current_confidence < 0.5 && !input.has_new_evidence) {
    return { suppress: false, downgrade: true, reason: "Downgraded: previously rejected with current confidence below threshold", confidence_adjustment: -0.15, novelty_flag: false };
  }
  if (input.prior_deferrals >= 2 && !input.has_new_evidence && input.current_confidence < 0.6) {
    return { suppress: false, downgrade: true, reason: `Downgraded: deferred ${input.prior_deferrals} times with no strong new signal`, confidence_adjustment: -0.1, novelty_flag: false };
  }
  if (input.days_since_last_similar !== null && input.days_since_last_similar < 3 && !input.has_new_evidence) {
    return { suppress: true, downgrade: false, reason: `Suppressed: near-duplicate within ${input.days_since_last_similar} days`, confidence_adjustment: 0, novelty_flag: false };
  }
  const isNovel = input.prior_rejections === 0 && input.prior_acceptances === 0 && input.prior_deferrals === 0 && input.supporting_memory_count === 0;
  return { suppress: false, downgrade: false, reason: null, confidence_adjustment: 0, novelty_flag: isNovel };
}

// ═══════ TESTS ═══════

describe("Sprint 18 — Historical Continuity Scoring", () => {
  it("produces bounded scores (0-1)", () => {
    const cases: ContinuityScoreInputs[] = [
      { related_memory_count: 0, related_summary_count: 0, accepted_decisions: 0, rejected_decisions: 0, deferred_decisions: 0, implemented_outcomes: 0, outcome_success_rate: 0, recurrence_across_windows: 0 },
      { related_memory_count: 50, related_summary_count: 10, accepted_decisions: 10, rejected_decisions: 5, deferred_decisions: 3, implemented_outcomes: 8, outcome_success_rate: 1, recurrence_across_windows: 5 },
    ];
    for (const c of cases) {
      const scores = computeContinuityScores(c);
      expect(scores.historical_support_score).toBeGreaterThanOrEqual(0);
      expect(scores.historical_support_score).toBeLessThanOrEqual(1);
      expect(scores.historical_conflict_score).toBeGreaterThanOrEqual(0);
      expect(scores.historical_conflict_score).toBeLessThanOrEqual(1);
      expect(scores.historical_context_score).toBeGreaterThanOrEqual(0);
      expect(scores.historical_context_score).toBeLessThanOrEqual(1);
    }
  });

  it("is deterministic for same inputs", () => {
    const input: ContinuityScoreInputs = { related_memory_count: 5, related_summary_count: 2, accepted_decisions: 3, rejected_decisions: 1, deferred_decisions: 0, implemented_outcomes: 2, outcome_success_rate: 0.8, recurrence_across_windows: 2 };
    expect(computeContinuityScores(input)).toEqual(computeContinuityScores(input));
  });

  it("returns zero scores for zero inputs", () => {
    const scores = computeContinuityScores({ related_memory_count: 0, related_summary_count: 0, accepted_decisions: 0, rejected_decisions: 0, deferred_decisions: 0, implemented_outcomes: 0, outcome_success_rate: 0, recurrence_across_windows: 0 });
    expect(scores.historical_support_score).toBe(0);
    expect(scores.historical_conflict_score).toBe(0);
  });

  it("high accepted + outcomes → high support", () => {
    const scores = computeContinuityScores({ related_memory_count: 10, related_summary_count: 3, accepted_decisions: 5, rejected_decisions: 0, deferred_decisions: 0, implemented_outcomes: 5, outcome_success_rate: 0.9, recurrence_across_windows: 3 });
    expect(scores.historical_support_score).toBeGreaterThan(0.5);
    expect(scores.historical_conflict_score).toBeLessThan(0.1);
  });

  it("high rejected → high conflict", () => {
    const scores = computeContinuityScores({ related_memory_count: 5, related_summary_count: 1, accepted_decisions: 0, rejected_decisions: 5, deferred_decisions: 2, implemented_outcomes: 1, outcome_success_rate: 0.2, recurrence_across_windows: 1 });
    expect(scores.historical_conflict_score).toBeGreaterThan(0.3);
  });
});

describe("Sprint 18 — Historical Alignment", () => {
  it("returns historically_novel when no prior history", () => {
    const inputs: ContinuityScoreInputs = { related_memory_count: 0, related_summary_count: 0, accepted_decisions: 0, rejected_decisions: 0, deferred_decisions: 0, implemented_outcomes: 0, outcome_success_rate: 0, recurrence_across_windows: 0 };
    const scores = computeContinuityScores(inputs);
    expect(determineHistoricalAlignment(scores, inputs)).toBe("historically_novel");
  });

  it("returns reinforces_prior_direction for strong support", () => {
    const inputs: ContinuityScoreInputs = { related_memory_count: 10, related_summary_count: 3, accepted_decisions: 5, rejected_decisions: 0, deferred_decisions: 0, implemented_outcomes: 5, outcome_success_rate: 0.9, recurrence_across_windows: 3 };
    const scores = computeContinuityScores(inputs);
    expect(determineHistoricalAlignment(scores, inputs)).toBe("reinforces_prior_direction");
  });

  it("returns diverges_from_prior_direction for high conflict", () => {
    const inputs: ContinuityScoreInputs = { related_memory_count: 5, related_summary_count: 1, accepted_decisions: 0, rejected_decisions: 5, deferred_decisions: 0, implemented_outcomes: 1, outcome_success_rate: 0.1, recurrence_across_windows: 1 };
    const scores = computeContinuityScores(inputs);
    expect(determineHistoricalAlignment(scores, inputs)).toBe("diverges_from_prior_direction");
  });

  it("returns reopens_unresolved_issue for deferred + high conflict", () => {
    const inputs: ContinuityScoreInputs = { related_memory_count: 5, related_summary_count: 1, accepted_decisions: 0, rejected_decisions: 5, deferred_decisions: 2, implemented_outcomes: 1, outcome_success_rate: 0.1, recurrence_across_windows: 1 };
    const scores = computeContinuityScores(inputs);
    expect(determineHistoricalAlignment(scores, inputs)).toBe("reopens_unresolved_issue");
  });

  it("valid alignment values only", () => {
    const validAlignments = ["reinforces_prior_direction", "extends_prior_direction", "reopens_unresolved_issue", "diverges_from_prior_direction", "historically_novel"];
    const testCases: ContinuityScoreInputs[] = [
      { related_memory_count: 0, related_summary_count: 0, accepted_decisions: 0, rejected_decisions: 0, deferred_decisions: 0, implemented_outcomes: 0, outcome_success_rate: 0, recurrence_across_windows: 0 },
      { related_memory_count: 10, related_summary_count: 3, accepted_decisions: 5, rejected_decisions: 0, deferred_decisions: 0, implemented_outcomes: 5, outcome_success_rate: 0.9, recurrence_across_windows: 3 },
      { related_memory_count: 3, related_summary_count: 1, accepted_decisions: 1, rejected_decisions: 1, deferred_decisions: 1, implemented_outcomes: 1, outcome_success_rate: 0.5, recurrence_across_windows: 1 },
    ];
    for (const inputs of testCases) {
      const scores = computeContinuityScores(inputs);
      const alignment = determineHistoricalAlignment(scores, inputs);
      expect(validAlignments).toContain(alignment);
    }
  });
});

describe("Sprint 18 — Redundancy Guard", () => {
  it("suppresses repeatedly rejected with no new evidence", () => {
    const result = checkRedundancy({
      current_confidence: 0.4, current_impact: 0.3, prior_rejections: 3, prior_acceptances: 0,
      prior_deferrals: 0, days_since_last_similar: 5, supporting_memory_count: 2,
      has_new_evidence: false, historical_context_score: 0.3,
    });
    expect(result.suppress).toBe(true);
  });

  it("does NOT suppress rejected with new evidence", () => {
    const result = checkRedundancy({
      current_confidence: 0.7, current_impact: 0.6, prior_rejections: 3, prior_acceptances: 0,
      prior_deferrals: 0, days_since_last_similar: 5, supporting_memory_count: 5,
      has_new_evidence: true, historical_context_score: 0.5,
    });
    expect(result.suppress).toBe(false);
  });

  it("downgrades weak previously-rejected recommendation", () => {
    const result = checkRedundancy({
      current_confidence: 0.3, current_impact: 0.2, prior_rejections: 1, prior_acceptances: 0,
      prior_deferrals: 0, days_since_last_similar: 20, supporting_memory_count: 1,
      has_new_evidence: false, historical_context_score: 0.2,
    });
    expect(result.downgrade).toBe(true);
    expect(result.confidence_adjustment).toBeLessThan(0);
  });

  it("flags novel recommendations", () => {
    const result = checkRedundancy({
      current_confidence: 0.6, current_impact: 0.5, prior_rejections: 0, prior_acceptances: 0,
      prior_deferrals: 0, days_since_last_similar: null, supporting_memory_count: 0,
      has_new_evidence: false, historical_context_score: 0,
    });
    expect(result.novelty_flag).toBe(true);
    expect(result.suppress).toBe(false);
  });

  it("suppresses near-duplicates within 3 days", () => {
    const result = checkRedundancy({
      current_confidence: 0.5, current_impact: 0.4, prior_rejections: 0, prior_acceptances: 0,
      prior_deferrals: 0, days_since_last_similar: 1, supporting_memory_count: 0,
      has_new_evidence: false, historical_context_score: 0.3,
    });
    expect(result.suppress).toBe(true);
  });

  it("does NOT suppress strong novel signals", () => {
    const result = checkRedundancy({
      current_confidence: 0.8, current_impact: 0.7, prior_rejections: 0, prior_acceptances: 0,
      prior_deferrals: 0, days_since_last_similar: null, supporting_memory_count: 0,
      has_new_evidence: false, historical_context_score: 0,
    });
    expect(result.suppress).toBe(false);
    expect(result.downgrade).toBe(false);
  });
});

describe("Sprint 18 — Forbidden Mutation Regression", () => {
  it("historical alignment values are informational only", () => {
    const alignments = ["reinforces_prior_direction", "extends_prior_direction", "reopens_unresolved_issue", "diverges_from_prior_direction", "historically_novel"];
    const forbidden = ["execute", "deploy", "apply_change", "mutate", "force_update"];
    for (const a of alignments) {
      for (const f of forbidden) {
        expect(a).not.toContain(f);
      }
    }
  });

  it("redundancy guard never produces mutation actions", () => {
    const result = checkRedundancy({
      current_confidence: 0.5, current_impact: 0.5, prior_rejections: 5, prior_acceptances: 0,
      prior_deferrals: 3, days_since_last_similar: 1, supporting_memory_count: 0,
      has_new_evidence: false, historical_context_score: 0,
    });
    // Result only contains suppress/downgrade/reason — no mutation fields
    expect(result).not.toHaveProperty("execute");
    expect(result).not.toHaveProperty("deploy");
    expect(result).not.toHaveProperty("apply_change");
  });
});

describe("Sprint 18 — Graceful Degradation", () => {
  it("empty historical context produces zero scores", () => {
    const scores = computeContinuityScores({
      related_memory_count: 0, related_summary_count: 0, accepted_decisions: 0,
      rejected_decisions: 0, deferred_decisions: 0, implemented_outcomes: 0,
      outcome_success_rate: 0, recurrence_across_windows: 0,
    });
    expect(scores.historical_support_score).toBe(0);
    expect(scores.historical_context_score).toBeGreaterThanOrEqual(0);
  });

  it("novel recommendation with no history passes through cleanly", () => {
    const result = checkRedundancy({
      current_confidence: 0.6, current_impact: 0.5, prior_rejections: 0, prior_acceptances: 0,
      prior_deferrals: 0, days_since_last_similar: null, supporting_memory_count: 0,
      has_new_evidence: false, historical_context_score: 0,
    });
    expect(result.suppress).toBe(false);
    expect(result.downgrade).toBe(false);
    expect(result.confidence_adjustment).toBe(0);
  });
});
