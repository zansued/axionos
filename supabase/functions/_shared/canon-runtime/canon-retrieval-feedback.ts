/**
 * Canon Retrieval Feedback — Sprint 141
 * Captures feedback on canon retrieval quality for learning.
 */

export interface FeedbackInput {
  session_id: string;
  entry_id: string;
  feedback_type: string;
  feedback_score: number;
  feedback_notes: string;
  submitted_by: string;
}

export interface FeedbackResult {
  valid: boolean;
  errors: string[];
  record: Record<string, unknown> | null;
}

const VALID_FEEDBACK_TYPES = ["relevance", "applicability", "accuracy", "freshness", "completeness"] as const;

export function buildRetrievalFeedback(input: FeedbackInput): FeedbackResult {
  const errors: string[] = [];

  if (!input.session_id) errors.push("session_id is required");
  if (!input.entry_id) errors.push("entry_id is required");
  if (!VALID_FEEDBACK_TYPES.includes(input.feedback_type as any)) {
    errors.push(`feedback_type must be one of: ${VALID_FEEDBACK_TYPES.join(", ")}`);
  }
  if (input.feedback_score < 0 || input.feedback_score > 100) {
    errors.push("feedback_score must be 0-100");
  }
  if (!input.submitted_by) errors.push("submitted_by is required");

  if (errors.length > 0) return { valid: false, errors, record: null };

  return {
    valid: true,
    errors: [],
    record: {
      session_id: input.session_id,
      entry_id: input.entry_id,
      feedback_type: input.feedback_type,
      feedback_score: input.feedback_score,
      feedback_notes: input.feedback_notes || "",
      submitted_by: input.submitted_by,
    },
  };
}
