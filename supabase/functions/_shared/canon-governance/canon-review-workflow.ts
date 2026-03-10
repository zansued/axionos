/**
 * Canon Review Workflow — Sprint 115
 * Routes entries through review and manages verdict aggregation.
 */

export interface ReviewInput {
  entry_id: string;
  reviewer_id: string;
  review_type: string;
  verdict: "approve" | "reject" | "revise" | "contest";
  confidence_assessment: number;
  strengths: string[];
  weaknesses: string[];
  review_notes: string;
}

export interface ReviewAggregation {
  total_reviews: number;
  approve_count: number;
  reject_count: number;
  revise_count: number;
  contest_count: number;
  avg_confidence: number;
  recommendation: "approve" | "reject" | "needs_revision" | "contest" | "insufficient_reviews";
}

export function aggregateReviews(verdicts: Array<{ verdict: string; confidence_assessment: number }>): ReviewAggregation {
  if (verdicts.length === 0) {
    return { total_reviews: 0, approve_count: 0, reject_count: 0, revise_count: 0, contest_count: 0, avg_confidence: 0, recommendation: "insufficient_reviews" };
  }

  const counts = { approve: 0, reject: 0, revise: 0, contest: 0 };
  let totalConf = 0;

  for (const v of verdicts) {
    if (v.verdict in counts) counts[v.verdict as keyof typeof counts]++;
    totalConf += v.confidence_assessment;
  }

  const avg = totalConf / verdicts.length;
  let rec: ReviewAggregation["recommendation"] = "insufficient_reviews";

  if (verdicts.length < 2) rec = "insufficient_reviews";
  else if (counts.contest > 0) rec = "contest";
  else if (counts.reject > counts.approve) rec = "reject";
  else if (counts.revise > 0 && counts.revise >= counts.approve) rec = "needs_revision";
  else if (counts.approve > counts.reject) rec = "approve";

  return {
    total_reviews: verdicts.length,
    approve_count: counts.approve,
    reject_count: counts.reject,
    revise_count: counts.revise,
    contest_count: counts.contest,
    avg_confidence: Math.round(avg * 10000) / 10000,
    recommendation: rec,
  };
}
