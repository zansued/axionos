/**
 * Historical Continuity Scoring — Sprint 18
 *
 * Calculates how strongly a recommendation or artifact is supported, conflicted,
 * or novel relative to prior history.
 *
 * All scoring is deterministic, rule-based, and bounded [0, 1].
 */

export interface ContinuityScoreInputs {
  /** Number of related memory entries found */
  related_memory_count: number;
  /** Number of related summaries found */
  related_summary_count: number;
  /** Number of prior accepted decisions on same component/type */
  accepted_decisions: number;
  /** Number of prior rejected decisions on same component/type */
  rejected_decisions: number;
  /** Number of prior deferred decisions on same component/type */
  deferred_decisions: number;
  /** Number of implemented outcomes linked to this component/type */
  implemented_outcomes: number;
  /** Average success signal from related outcomes (0-1) */
  outcome_success_rate: number;
  /** Number of distinct time windows where similar recommendations appeared */
  recurrence_across_windows: number;
}

export interface ContinuityScores {
  /** How strongly prior history supports this recommendation */
  historical_support_score: number;
  /** How strongly prior history conflicts with this recommendation */
  historical_conflict_score: number;
  /** Combined context score */
  historical_context_score: number;
}

export type HistoricalAlignment =
  | "reinforces_prior_direction"
  | "extends_prior_direction"
  | "reopens_unresolved_issue"
  | "diverges_from_prior_direction"
  | "historically_novel";

export function computeContinuityScores(inputs: ContinuityScoreInputs): ContinuityScores {
  // ── Support score ──
  // Based on: accepted decisions, implemented outcomes, memory count, success rate
  const acceptedSignal = Math.min(1, Math.log(inputs.accepted_decisions + 1) / Math.log(6));
  const outcomeSignal = Math.min(1, Math.log(inputs.implemented_outcomes + 1) / Math.log(6));
  const memorySignal = Math.min(1, Math.log(inputs.related_memory_count + 1) / Math.log(11));
  const successSignal = Math.min(1, Math.max(0, inputs.outcome_success_rate));

  const historical_support_score = clamp(
    acceptedSignal * 0.3 + outcomeSignal * 0.25 + memorySignal * 0.2 + successSignal * 0.25
  );

  // ── Conflict score ──
  // Based on: rejected decisions, low success rate, deferred decisions
  const rejectedSignal = Math.min(1, Math.log(inputs.rejected_decisions + 1) / Math.log(6));
  const deferredSignal = Math.min(1, Math.log(inputs.deferred_decisions + 1) / Math.log(6));
  const failureSignal = inputs.implemented_outcomes > 0
    ? Math.min(1, Math.max(0, 1 - inputs.outcome_success_rate)) : 0;

  const historical_conflict_score = clamp(
    rejectedSignal * 0.5 + deferredSignal * 0.2 + failureSignal * 0.3
  );

  // ── Context score: net historical value ──
  const historical_context_score = clamp(
    (historical_support_score * 0.6 + (1 - historical_conflict_score) * 0.2 + memorySignal * 0.2)
  );

  return {
    historical_support_score: round3(historical_support_score),
    historical_conflict_score: round3(historical_conflict_score),
    historical_context_score: round3(historical_context_score),
  };
}

/**
 * Determine historical alignment based on continuity scores and prior history.
 */
export function determineHistoricalAlignment(
  scores: ContinuityScores,
  inputs: ContinuityScoreInputs
): HistoricalAlignment {
  const totalDecisions = inputs.accepted_decisions + inputs.rejected_decisions + inputs.deferred_decisions;

  // No prior history at all → novel
  if (totalDecisions === 0 && inputs.related_memory_count === 0 && inputs.related_summary_count === 0) {
    return "historically_novel";
  }

  // Strong support, low conflict → reinforces
  if (scores.historical_support_score > 0.5 && scores.historical_conflict_score < 0.2) {
    return "reinforces_prior_direction";
  }

  // Moderate support, some conflict → extends
  if (scores.historical_support_score > 0.3 && scores.historical_conflict_score < 0.4) {
    return "extends_prior_direction";
  }

  // High conflict → check if re-attempt
  if (scores.historical_conflict_score > 0.5) {
    // Was previously deferred? → reopens
    if (inputs.deferred_decisions > 0) {
      return "reopens_unresolved_issue";
    }
    return "diverges_from_prior_direction";
  }

  // Some rejected, recurring → reopens
  if (inputs.rejected_decisions > 0 && inputs.recurrence_across_windows >= 2) {
    return "reopens_unresolved_issue";
  }

  // Low memory, some decisions → extends
  if (totalDecisions > 0) {
    return "extends_prior_direction";
  }

  return "historically_novel";
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
