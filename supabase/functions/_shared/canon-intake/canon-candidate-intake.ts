/**
 * Canon Candidate Intake — Sprint 139
 * Validates and builds candidate knowledge entries from sources.
 */

export interface CandidateIntakeInput {
  source_id: string;
  title: string;
  summary: string;
  body?: string;
  knowledge_type: string;
  domain_scope?: string;
  source_type?: string;
  source_reference?: string;
  source_reliability_score?: number;
  submitted_by: string;
}

export interface CandidateIntakeResult {
  valid: boolean;
  errors: string[];
  candidate: Record<string, unknown> | null;
}

const VALID_KNOWLEDGE_TYPES = [
  "pattern", "anti_pattern", "template", "architectural_guideline",
  "implementation_recipe", "failure_memory", "external_knowledge",
  "methodology", "best_practice",
] as const;

export function buildCandidateEntry(input: CandidateIntakeInput): CandidateIntakeResult {
  const errors: string[] = [];

  if (!input.source_id) errors.push("source_id is required");
  if (!input.title || input.title.length < 5) errors.push("title must be at least 5 characters");
  if (!input.summary || input.summary.length < 10) errors.push("summary must be at least 10 characters");
  if (!input.submitted_by) errors.push("submitted_by is required");
  if (!VALID_KNOWLEDGE_TYPES.includes(input.knowledge_type as any)) {
    errors.push(`knowledge_type must be one of: ${VALID_KNOWLEDGE_TYPES.join(", ")}`);
  }

  if (errors.length > 0) return { valid: false, errors, candidate: null };

  return {
    valid: true,
    errors: [],
    candidate: {
      source_id: input.source_id,
      title: input.title,
      summary: input.summary,
      body: input.body || "",
      knowledge_type: input.knowledge_type,
      domain_scope: input.domain_scope || "general",
      source_type: input.source_type || "external_documentation",
      source_reference: input.source_reference || "",
      source_reliability_score: input.source_reliability_score ?? 0,
      novelty_score: 0,
      conflict_with_existing_canon: false,
      internal_validation_status: "pending",
      trial_status: "none",
      promotion_status: "pending",
      promotion_decision_reason: "",
      submitted_by: input.submitted_by,
    },
  };
}

export function getValidKnowledgeTypes(): string[] {
  return [...VALID_KNOWLEDGE_TYPES];
}
