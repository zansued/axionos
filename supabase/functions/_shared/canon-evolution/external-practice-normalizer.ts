/**
 * External Practice Normalizer — Sprint 118
 * Normalizes external knowledge into canonical form.
 */

export interface RawPractice {
  title: string;
  summary: string;
  body: string;
  source_type: string;
  tags?: string[];
}

export interface NormalizedPractice {
  normalized_title: string;
  normalized_summary: string;
  normalized_body: string;
  inferred_knowledge_type: string;
  inferred_stack_scope: string;
  quality_score: number;
}

const KNOWLEDGE_TYPE_KEYWORDS: Record<string, string[]> = {
  pattern: ["pattern", "design pattern", "architectural pattern"],
  convention: ["convention", "naming", "style guide", "coding standard"],
  template: ["template", "boilerplate", "scaffold", "starter"],
  anti_pattern: ["anti-pattern", "antipattern", "bad practice", "avoid"],
  guideline: ["guideline", "best practice", "recommendation"],
};

const STACK_KEYWORDS: Record<string, string[]> = {
  react: ["react", "jsx", "tsx", "component"],
  typescript: ["typescript", "ts", "type safety"],
  supabase: ["supabase", "rls", "edge function"],
  tailwind: ["tailwind", "css utility"],
  postgres: ["postgres", "postgresql", "sql"],
};

export function normalizePractice(raw: RawPractice): NormalizedPractice {
  const combined = `${raw.title} ${raw.summary} ${raw.body}`.toLowerCase();

  let inferredType = "guideline";
  for (const [type, keywords] of Object.entries(KNOWLEDGE_TYPE_KEYWORDS)) {
    if (keywords.some(k => combined.includes(k))) { inferredType = type; break; }
  }

  let inferredStack = "";
  for (const [stack, keywords] of Object.entries(STACK_KEYWORDS)) {
    if (keywords.some(k => combined.includes(k))) { inferredStack = stack; break; }
  }

  let quality = 50;
  if (raw.summary.length > 50) quality += 10;
  if (raw.body.length > 200) quality += 15;
  if (raw.title.length > 10 && raw.title.length < 100) quality += 10;
  if (raw.source_type === "official_docs" || raw.source_type === "peer_reviewed") quality += 15;

  return {
    normalized_title: raw.title.trim(),
    normalized_summary: raw.summary.trim(),
    normalized_body: raw.body.trim(),
    inferred_knowledge_type: inferredType,
    inferred_stack_scope: inferredStack,
    quality_score: Math.min(100, quality),
  };
}
