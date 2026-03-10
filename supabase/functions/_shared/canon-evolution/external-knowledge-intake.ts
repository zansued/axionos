/**
 * External Knowledge Intake — Sprint 118
 * Governs ingestion of external knowledge candidates into the canon pipeline.
 */

export interface ExternalKnowledgeInput {
  organization_id: string;
  source_type: string;
  source_reference: string;
  source_reliability_score: number;
  knowledge_type: string;
  title: string;
  summary: string;
  body: string;
  claimed_applicability: string;
  stack_scope: string;
  submitted_by: string;
}

export interface IntakeResult {
  valid: boolean;
  errors: string[];
  candidate: Record<string, unknown> | null;
}

export function buildExternalCandidate(input: ExternalKnowledgeInput): IntakeResult {
  const errors: string[] = [];

  if (!input.organization_id) errors.push("organization_id is required");
  if (!input.title || input.title.length < 5) errors.push("title must be at least 5 characters");
  if (!input.summary || input.summary.length < 10) errors.push("summary must be at least 10 characters");
  if (!input.knowledge_type) errors.push("knowledge_type is required");
  if (!input.submitted_by) errors.push("submitted_by is required");
  if (input.source_reliability_score < 0 || input.source_reliability_score > 100) {
    errors.push("source_reliability_score must be 0-100");
  }

  if (errors.length > 0) return { valid: false, errors, candidate: null };

  return {
    valid: true,
    errors: [],
    candidate: {
      organization_id: input.organization_id,
      source_type: input.source_type || "community",
      source_reference: input.source_reference || "",
      source_reliability_score: input.source_reliability_score,
      knowledge_type: input.knowledge_type,
      title: input.title,
      summary: input.summary,
      body: input.body || "",
      claimed_applicability: input.claimed_applicability || "",
      stack_scope: input.stack_scope || "",
      novelty_score: 0,
      conflict_with_existing_canon: false,
      internal_validation_status: "pending",
      trial_status: "none",
      promotion_status: "pending",
      submitted_by: input.submitted_by,
    },
  };
}
