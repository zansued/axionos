/**
 * Canon Stewardship Engine — Sprint 140
 * Core stewardship logic: review decisions, approval workflow, deprecation.
 */

export interface StewardshipReviewInput {
  entry_id: string;
  reviewer_id: string;
  verdict: "approve" | "reject" | "request_changes" | "defer";
  confidence_assessment: number;
  strengths: string[];
  weaknesses: string[];
  review_notes: string;
  review_type?: string;
}

export interface StewardshipReviewResult {
  valid: boolean;
  errors: string[];
  review: Record<string, unknown> | null;
}

export function buildStewardshipReview(input: StewardshipReviewInput): StewardshipReviewResult {
  const errors: string[] = [];

  if (!input.entry_id) errors.push("entry_id is required");
  if (!input.reviewer_id) errors.push("reviewer_id is required");
  if (!["approve", "reject", "request_changes", "defer"].includes(input.verdict)) {
    errors.push("verdict must be approve, reject, request_changes, or defer");
  }
  if (input.confidence_assessment < 0 || input.confidence_assessment > 100) {
    errors.push("confidence_assessment must be 0-100");
  }

  if (errors.length > 0) return { valid: false, errors, review: null };

  return {
    valid: true,
    errors: [],
    review: {
      entry_id: input.entry_id,
      reviewer_id: input.reviewer_id,
      verdict: input.verdict,
      confidence_assessment: input.confidence_assessment,
      strengths: input.strengths || [],
      weaknesses: input.weaknesses || [],
      review_notes: input.review_notes || "",
      review_type: input.review_type || "stewardship",
    },
  };
}

export interface DeprecationInput {
  entry_id: string;
  reason: string;
  deprecated_by: string;
  replacement_entry_id?: string;
}

export interface DeprecationResult {
  valid: boolean;
  errors: string[];
  safe_to_deprecate: boolean;
  recommendation: string;
}

export function assessDeprecation(input: DeprecationInput): DeprecationResult {
  const errors: string[] = [];
  if (!input.entry_id) errors.push("entry_id is required");
  if (!input.reason || input.reason.length < 5) errors.push("reason must be at least 5 characters");
  if (!input.deprecated_by) errors.push("deprecated_by is required");

  if (errors.length > 0) {
    return { valid: false, errors, safe_to_deprecate: false, recommendation: "fix_errors" };
  }

  return {
    valid: true,
    errors: [],
    safe_to_deprecate: true,
    recommendation: input.replacement_entry_id ? "deprecate_with_replacement" : "deprecate_standalone",
  };
}
