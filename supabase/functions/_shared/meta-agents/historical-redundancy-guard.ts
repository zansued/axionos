/**
 * Historical Redundancy Guard — Sprint 18
 *
 * Suppresses or downgrades recommendations that are historically redundant
 * without new strong evidence.
 *
 * Rules are conservative and explainable.
 * Genuinely new strong signals are never suppressed.
 *
 * SAFETY: Read-only. Only filters/annotates recommendations, never mutates system.
 */

import { ContinuityScoreInputs, computeContinuityScores } from "./historical-continuity-scoring.ts";

export interface RedundancyCheckResult {
  suppress: boolean;
  downgrade: boolean;
  reason: string | null;
  confidence_adjustment: number; // negative = downgrade, 0 = no change
  novelty_flag: boolean;
}

export interface RedundancyInput {
  /** Current recommendation confidence */
  current_confidence: number;
  /** Current recommendation impact */
  current_impact: number;
  /** Number of times similar recommendation was previously rejected */
  prior_rejections: number;
  /** Number of times similar recommendation was previously accepted */
  prior_acceptances: number;
  /** Number of times similar recommendation was deferred */
  prior_deferrals: number;
  /** Days since last similar recommendation was created */
  days_since_last_similar: number | null;
  /** Count of related memory entries supporting this recommendation */
  supporting_memory_count: number;
  /** Whether there is materially new evidence not present in prior recommendations */
  has_new_evidence: boolean;
  /** Historical context score from continuity scoring */
  historical_context_score: number;
}

export function checkRedundancy(input: RedundancyInput): RedundancyCheckResult {
  // Rule 1: Recently and repeatedly rejected with no new evidence → suppress
  if (
    input.prior_rejections >= 2 &&
    !input.has_new_evidence &&
    input.days_since_last_similar !== null &&
    input.days_since_last_similar < 14
  ) {
    return {
      suppress: true,
      downgrade: false,
      reason: `Suppressed: rejected ${input.prior_rejections} times recently with no new evidence`,
      confidence_adjustment: 0,
      novelty_flag: false,
    };
  }

  // Rule 2: Previously rejected once, weak current evidence → downgrade confidence
  if (
    input.prior_rejections >= 1 &&
    input.current_confidence < 0.5 &&
    !input.has_new_evidence
  ) {
    return {
      suppress: false,
      downgrade: true,
      reason: `Downgraded: previously rejected with current confidence below threshold`,
      confidence_adjustment: -0.15,
      novelty_flag: false,
    };
  }

  // Rule 3: Deferred multiple times, no new evidence → downgrade
  if (
    input.prior_deferrals >= 2 &&
    !input.has_new_evidence &&
    input.current_confidence < 0.6
  ) {
    return {
      suppress: false,
      downgrade: true,
      reason: `Downgraded: deferred ${input.prior_deferrals} times with no strong new signal`,
      confidence_adjustment: -0.1,
      novelty_flag: false,
    };
  }

  // Rule 4: Very recent duplicate (< 3 days) with same target → suppress
  if (
    input.days_since_last_similar !== null &&
    input.days_since_last_similar < 3 &&
    !input.has_new_evidence
  ) {
    return {
      suppress: true,
      downgrade: false,
      reason: `Suppressed: near-duplicate within ${input.days_since_last_similar} days`,
      confidence_adjustment: 0,
      novelty_flag: false,
    };
  }

  // No redundancy detected
  const isNovel = input.prior_rejections === 0 &&
    input.prior_acceptances === 0 &&
    input.prior_deferrals === 0 &&
    input.supporting_memory_count === 0;

  return {
    suppress: false,
    downgrade: false,
    reason: null,
    confidence_adjustment: 0,
    novelty_flag: isNovel,
  };
}

/**
 * Determine whether there is materially new evidence.
 * Compares current evidence count against prior history.
 * Conservative: requires at least 30% more evidence than prior.
 */
export function hasNewEvidence(
  currentEvidenceCount: number,
  priorMaxEvidenceCount: number,
  currentConfidence: number,
  priorMaxConfidence: number,
): boolean {
  // More evidence items than before
  if (currentEvidenceCount > priorMaxEvidenceCount * 1.3) return true;
  // Substantially higher confidence
  if (currentConfidence > priorMaxConfidence + 0.15) return true;
  return false;
}
