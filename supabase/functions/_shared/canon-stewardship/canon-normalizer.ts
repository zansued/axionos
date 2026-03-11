/**
 * Canon Normalizer — Sprint 140
 * Normalizes canon entry data for consistency and searchability.
 */

export interface NormalizationInput {
  title: string;
  summary: string;
  body: string;
  topic?: string;
  subtopic?: string;
  practice_type?: string;
  tags?: string[];
  stack_scope?: string;
}

export interface NormalizationResult {
  title: string;
  slug: string;
  summary: string;
  body: string;
  topic: string;
  subtopic: string;
  practice_type: string;
  tags: string[];
  stack_scope: string;
  normalized: boolean;
  normalization_notes: string[];
}

const VALID_PRACTICE_TYPES = [
  "best_practice", "implementation_pattern", "architecture_pattern",
  "template", "checklist", "anti_pattern", "validation_rule",
  "methodology_guideline", "migration_note",
] as const;

export function normalizeCanonEntry(input: NormalizationInput): NormalizationResult {
  const notes: string[] = [];

  const title = input.title.trim();
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  let practiceType = input.practice_type || "best_practice";
  if (!VALID_PRACTICE_TYPES.includes(practiceType as any)) {
    notes.push(`Invalid practice_type "${practiceType}", defaulted to best_practice`);
    practiceType = "best_practice";
  }

  const tags = (input.tags || []).map(t => t.toLowerCase().trim()).filter(Boolean);
  const uniqueTags = [...new Set(tags)];
  if (tags.length !== uniqueTags.length) notes.push("Duplicate tags removed");

  return {
    title,
    slug,
    summary: input.summary.trim(),
    body: input.body.trim(),
    topic: (input.topic || "").trim(),
    subtopic: (input.subtopic || "").trim(),
    practice_type: practiceType,
    tags: uniqueTags,
    stack_scope: input.stack_scope || "general",
    normalized: true,
    normalization_notes: notes,
  };
}

export function getValidPracticeTypes(): string[] {
  return [...VALID_PRACTICE_TYPES];
}
