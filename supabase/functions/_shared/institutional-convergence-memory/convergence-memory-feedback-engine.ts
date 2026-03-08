/**
 * Convergence Memory Feedback Engine
 * Captures whether retrieved memory improved future recommendations.
 */

export interface FeedbackInput {
  organizationId: string;
  retrievalId?: string;
  memoryEntryId?: string;
  usefulnessStatus: 'helpful' | 'neutral' | 'harmful' | 'misleading';
  feedbackNotes: string;
  reviewerRef: Record<string, unknown>;
}

export function buildFeedbackRecord(input: FeedbackInput) {
  return {
    organization_id: input.organizationId,
    retrieval_id: input.retrievalId || null,
    memory_entry_id: input.memoryEntryId || null,
    usefulness_status: input.usefulnessStatus,
    feedback_notes: input.feedbackNotes,
    reviewer_ref: input.reviewerRef,
  };
}

export interface FeedbackSummary {
  totalFeedback: number;
  helpfulCount: number;
  neutralCount: number;
  harmfulCount: number;
  misleadingCount: number;
  usefulnessRate: number;
}

export function summarizeFeedback(feedbackRecords: Array<{ usefulness_status: string }>): FeedbackSummary {
  const total = feedbackRecords.length;
  const helpful = feedbackRecords.filter(f => f.usefulness_status === 'helpful').length;
  const neutral = feedbackRecords.filter(f => f.usefulness_status === 'neutral').length;
  const harmful = feedbackRecords.filter(f => f.usefulness_status === 'harmful').length;
  const misleading = feedbackRecords.filter(f => f.usefulness_status === 'misleading').length;

  return {
    totalFeedback: total,
    helpfulCount: helpful,
    neutralCount: neutral,
    harmfulCount: harmful,
    misleadingCount: misleading,
    usefulnessRate: total > 0 ? Math.round((helpful / total) * 100) / 100 : 0,
  };
}

export function shouldDowngradeMemory(feedback: FeedbackSummary): boolean {
  if (feedback.totalFeedback < 3) return false;
  return feedback.usefulnessRate < 0.3 || feedback.misleadingCount > feedback.helpfulCount;
}
