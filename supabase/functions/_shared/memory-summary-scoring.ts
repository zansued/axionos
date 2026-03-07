/**
 * Memory Summary Signal Strength Scoring — Sprint 17
 *
 * Deterministic, rule-based scoring for memory summaries.
 * Bounded between 0 and 1.
 *
 * Factors:
 *   - recurrence_frequency: how many source entries (normalized)
 *   - breadth: spread across components/stages
 *   - linked_outcomes: entries with linked decisions/outcomes
 *   - evidence_density: quality of source memory entries (avg confidence)
 *   - retrieval_reuse: how often source entries have been retrieved
 */

export interface SignalStrengthInputs {
  /** Number of source memory entries */
  entry_count: number;
  /** Number of distinct components or stages affected */
  breadth: number;
  /** Number of entries that have linked outcomes/decisions */
  linked_outcome_count: number;
  /** Average confidence_score of source entries */
  avg_confidence: number;
  /** Average times_retrieved of source entries */
  avg_retrieval_count: number;
}

export function computeSignalStrength(inputs: SignalStrengthInputs): number {
  // Recurrence: log scale, max at ~20 entries
  const recurrence = Math.min(1, Math.log(inputs.entry_count + 1) / Math.log(21));

  // Breadth: normalized to max 5 distinct components/stages
  const breadth = Math.min(1, inputs.breadth / 5);

  // Linked outcomes: ratio of entries with outcomes, capped
  const outcomeRatio = inputs.entry_count > 0
    ? Math.min(1, inputs.linked_outcome_count / inputs.entry_count)
    : 0;

  // Evidence density: direct from avg confidence (already 0-1)
  const evidence = Math.min(1, Math.max(0, inputs.avg_confidence));

  // Retrieval reuse: log scale, entries accessed frequently
  const reuse = Math.min(1, Math.log(inputs.avg_retrieval_count + 1) / Math.log(11));

  const score =
    recurrence * 0.3 +
    breadth * 0.15 +
    outcomeRatio * 0.2 +
    evidence * 0.2 +
    reuse * 0.15;

  return Math.round(Math.min(1, Math.max(0, score)) * 1000) / 1000;
}
