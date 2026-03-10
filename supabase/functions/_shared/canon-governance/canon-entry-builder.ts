/**
 * Canon Entry Builder — Sprint 115
 * Validates and constructs canon entries with required governance fields.
 */

export interface CanonEntryInput {
  title: string;
  slug?: string;
  canon_type: string;
  category_id?: string;
  stack_scope?: string;
  layer_scope?: string;
  problem_scope?: string;
  summary: string;
  body: string;
  implementation_guidance?: string;
  source_type?: string;
  source_reference?: string;
  tags?: string[];
  created_by?: string;
}

export interface CanonEntryBuilt {
  title: string;
  slug: string;
  canon_type: string;
  category_id: string | null;
  stack_scope: string;
  layer_scope: string;
  problem_scope: string;
  summary: string;
  body: string;
  implementation_guidance: string;
  source_type: string;
  source_reference: string;
  tags: string[];
  created_by: string | null;
  confidence_score: number;
  approval_status: string;
  lifecycle_status: string;
  current_version: number;
  validation_errors: string[];
}

export function buildCanonEntry(input: CanonEntryInput): CanonEntryBuilt {
  const errors: string[] = [];
  if (!input.title || input.title.trim().length < 3) errors.push("Title must be at least 3 characters");
  if (!input.summary || input.summary.trim().length < 10) errors.push("Summary must be at least 10 characters");
  if (!input.body || input.body.trim().length < 20) errors.push("Body must be at least 20 characters");

  const slug = input.slug || input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return {
    title: input.title.trim(),
    slug,
    canon_type: input.canon_type || "pattern",
    category_id: input.category_id || null,
    stack_scope: input.stack_scope || "general",
    layer_scope: input.layer_scope || "any",
    problem_scope: input.problem_scope || "",
    summary: input.summary.trim(),
    body: input.body.trim(),
    implementation_guidance: input.implementation_guidance || "",
    source_type: input.source_type || "internal",
    source_reference: input.source_reference || "",
    tags: input.tags || [],
    created_by: input.created_by || null,
    confidence_score: 0,
    approval_status: "pending",
    lifecycle_status: "draft",
    current_version: 1,
    validation_errors: errors,
  };
}
