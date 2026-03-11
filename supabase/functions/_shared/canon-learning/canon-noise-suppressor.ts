/**
 * Canon Noise Suppressor — Sprint 142
 * Filters out low-confidence one-off events from candidate generation.
 */

export interface SuppressionInput {
  signal_count: number;
  confidence_score: number;
  occurrence_count: number;
  success_rate?: number;
  source_type: string;
}

export interface SuppressionResult {
  suppressed: boolean;
  reason: string | null;
}

const MIN_SIGNAL_COUNT = 3;
const MIN_CONFIDENCE = 30;
const MIN_OCCURRENCE_FOR_PATTERN = 2;

/**
 * Determines if a learning candidate or pattern should be suppressed.
 * Suppression prevents noisy one-off events from polluting the canon evolution queue.
 */
export function shouldSuppress(input: SuppressionInput): SuppressionResult {
  if (input.signal_count < MIN_SIGNAL_COUNT) {
    return { suppressed: true, reason: `Signal count (${input.signal_count}) below minimum threshold (${MIN_SIGNAL_COUNT})` };
  }

  if (input.confidence_score < MIN_CONFIDENCE) {
    return { suppressed: true, reason: `Confidence (${input.confidence_score}) below minimum threshold (${MIN_CONFIDENCE})` };
  }

  if (input.occurrence_count < MIN_OCCURRENCE_FOR_PATTERN) {
    return { suppressed: true, reason: `Occurrence count (${input.occurrence_count}) too low for pattern recognition` };
  }

  // Ambiguous outcomes: success rate between 40-60% with low confidence
  if (
    input.success_rate !== undefined &&
    input.success_rate >= 40 && input.success_rate <= 60 &&
    input.confidence_score < 50
  ) {
    return { suppressed: true, reason: `Ambiguous outcome (${input.success_rate}% success) with low confidence` };
  }

  return { suppressed: false, reason: null };
}
