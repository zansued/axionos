/**
 * Canon Learning Candidate Builder — Sprint 142
 * Converts clustered operational signals into structured learning candidates.
 */

export interface CandidateBuildInput {
  organization_id: string;
  title: string;
  summary: string;
  source_type: string;
  source_refs: Array<{ id: string; table: string; context?: string }>;
  proposed_practice_type: string;
  proposed_domain: string;
  proposed_stack_scope: string;
  signal_count: number;
  confidence_score: number;
}

export interface CandidateBuildResult {
  valid: boolean;
  errors: string[];
  candidate: Record<string, unknown> | null;
}

const VALID_SOURCE_TYPES = [
  "repair_loop", "validation_failure", "successful_fix",
  "recurring_anti_pattern", "architecture_refactor",
  "methodology_outcome", "coordination_improvement",
  "coordination_failure",
] as const;

const VALID_PRACTICE_TYPES = [
  "best_practice", "implementation_pattern", "architecture_pattern",
  "template", "checklist", "anti_pattern", "validation_rule",
  "methodology_guideline", "migration_note",
] as const;

export function buildLearningCandidate(input: CandidateBuildInput): CandidateBuildResult {
  const errors: string[] = [];

  if (!input.organization_id) errors.push("organization_id is required");
  if (!input.title || input.title.length < 3) errors.push("title must be at least 3 characters");
  if (!input.summary || input.summary.length < 10) errors.push("summary must be at least 10 characters");
  if (!VALID_SOURCE_TYPES.includes(input.source_type as any)) {
    errors.push(`source_type must be one of: ${VALID_SOURCE_TYPES.join(", ")}`);
  }
  if (!VALID_PRACTICE_TYPES.includes(input.proposed_practice_type as any)) {
    errors.push(`proposed_practice_type must be one of: ${VALID_PRACTICE_TYPES.join(", ")}`);
  }
  if (input.signal_count < 1) errors.push("signal_count must be >= 1");
  if (input.confidence_score < 0 || input.confidence_score > 100) errors.push("confidence_score must be 0-100");

  if (errors.length > 0) return { valid: false, errors, candidate: null };

  return {
    valid: true,
    errors: [],
    candidate: {
      organization_id: input.organization_id,
      title: input.title.trim(),
      summary: input.summary.trim(),
      candidate_source: "runtime_learning",
      source_type: input.source_type,
      source_refs: input.source_refs,
      proposed_practice_type: input.proposed_practice_type,
      proposed_domain: input.proposed_domain || "general",
      proposed_stack_scope: input.proposed_stack_scope || "general",
      signal_count: input.signal_count,
      confidence_score: input.confidence_score,
      noise_suppressed: false,
      review_status: "pending",
    },
  };
}
