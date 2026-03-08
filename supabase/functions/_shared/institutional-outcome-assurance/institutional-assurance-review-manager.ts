/**
 * Institutional Assurance Review Manager — Sprint 63
 * Manages review states: stable, monitor, needs_review, high_variance, remediation_candidate.
 */

export interface ReviewInput {
  variance_score: number;
  drift_score: number;
  fragility_score: number;
  current_status: string;
}

export interface ReviewResult {
  recommended_review_status: string;
  assurance_review_quality_score: number;
  rationale: string[];
}

export function evaluateReviewState(input: ReviewInput): ReviewResult {
  const rationale: string[] = [];
  const severity = input.variance_score * 0.4 + input.drift_score * 0.3 + input.fragility_score * 0.3;

  let status: string;
  if (severity >= 0.6) { status = 'high_variance'; rationale.push('exceeds_variance_threshold'); }
  else if (severity >= 0.4) { status = 'needs_review'; rationale.push('moderate_concern'); }
  else if (severity >= 0.2) { status = 'monitor'; rationale.push('minor_drift'); }
  else { status = 'stable'; rationale.push('within_bounds'); }

  const quality = 1 - severity * 0.5;

  return {
    recommended_review_status: status,
    assurance_review_quality_score: Math.round(Math.max(0, quality) * 10000) / 10000,
    rationale,
  };
}
