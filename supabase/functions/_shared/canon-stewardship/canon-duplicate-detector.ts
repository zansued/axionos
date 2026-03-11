/**
 * Canon Duplicate Detector — Sprint 140
 * Detects potential duplicates among canon entries using title/topic similarity.
 */

export interface DuplicateCheckInput {
  title: string;
  topic: string;
  practice_type: string;
  stack_scope: string;
}

export interface ExistingEntry {
  id: string;
  title: string;
  topic: string;
  practice_type: string;
  stack_scope: string;
}

export interface DuplicateCheckResult {
  has_potential_duplicates: boolean;
  duplicates: Array<{
    entry_id: string;
    entry_title: string;
    similarity_score: number;
    reason: string;
  }>;
}

function tokenize(text: string): Set<string> {
  return new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  const intersection = new Set([...a].filter(x => b.has(x)));
  const union = new Set([...a, ...b]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

export function detectDuplicates(
  candidate: DuplicateCheckInput,
  existing: ExistingEntry[],
  threshold = 0.5
): DuplicateCheckResult {
  const candidateTokens = tokenize(candidate.title + " " + candidate.topic);
  const duplicates: DuplicateCheckResult["duplicates"] = [];

  for (const entry of existing) {
    const entryTokens = tokenize(entry.title + " " + entry.topic);
    const similarity = jaccardSimilarity(candidateTokens, entryTokens);

    const reasons: string[] = [];
    if (similarity >= threshold) reasons.push("high_title_topic_similarity");
    if (candidate.practice_type === entry.practice_type && similarity > 0.3) {
      reasons.push("same_practice_type");
    }
    if (candidate.stack_scope === entry.stack_scope && similarity > 0.3) {
      reasons.push("same_stack_scope");
    }

    const boosted = reasons.length > 1 ? Math.min(1, similarity + 0.1) : similarity;

    if (boosted >= threshold) {
      duplicates.push({
        entry_id: entry.id,
        entry_title: entry.title,
        similarity_score: Math.round(boosted * 100) / 100,
        reason: reasons.join(", "),
      });
    }
  }

  duplicates.sort((a, b) => b.similarity_score - a.similarity_score);

  return {
    has_potential_duplicates: duplicates.length > 0,
    duplicates: duplicates.slice(0, 5),
  };
}
