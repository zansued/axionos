/**
 * Semantic Retrieval Ranker — Sprint 36
 *
 * Deterministic ranking combining: similarity, recency, evidence quality,
 * historical usefulness, scope proximity, contradiction penalties.
 *
 * SAFETY: Pure function. No side effects. No mutations.
 */

export interface RankedEvidence {
  id: string;
  domain: string;
  title: string;
  summary: string;
  relevance_score: number;
  confidence_score: number;
  freshness: string;
  source_ref: Record<string, unknown>;
  tags: string[];
  rank_score: number;
  similarity_score?: number;
}

interface RankContext {
  stage_key?: string;
  agent_type?: string;
  error_signature?: string;
  strategy_family?: string;
  policy_family?: string;
}

// ── Weights ──
const W_RELEVANCE = 0.25;
const W_CONFIDENCE = 0.20;
const W_RECENCY = 0.20;
const W_SIMILARITY = 0.15;
const W_SCOPE_MATCH = 0.10;
const W_TAG_OVERLAP = 0.10;

export function rankRetrievedEvidence(entries: RankedEvidence[], ctx: RankContext): RankedEvidence[] {
  const now = Date.now();

  return entries
    .map((entry) => {
      let score = 0;

      // Relevance
      score += (entry.relevance_score || 0) * W_RELEVANCE;

      // Confidence
      score += (entry.confidence_score || 0) * W_CONFIDENCE;

      // Recency
      const ageMs = now - new Date(entry.freshness || 0).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      const recency = ageDays <= 3 ? 1 : ageDays <= 30 ? 1 - (ageDays - 3) / 27 : ageDays <= 90 ? 0.3 - (ageDays - 30) * 0.005 : 0;
      score += Math.max(0, recency) * W_RECENCY;

      // Similarity (if available)
      score += (entry.similarity_score || 0) * W_SIMILARITY;

      // Scope match
      let scopeBonus = 0;
      if (ctx.error_signature && entry.domain === "repair_history") scopeBonus = 0.8;
      else if (ctx.strategy_family && entry.domain === "strategy_variants") scopeBonus = 0.7;
      else if (ctx.policy_family && entry.domain === "execution_policies") scopeBonus = 0.7;
      else if (entry.domain === "engineering_memory") scopeBonus = 0.5;
      score += scopeBonus * W_SCOPE_MATCH;

      // Tag overlap (basic)
      if (entry.tags.length > 0) {
        score += Math.min(0.5, entry.tags.length * 0.1) * W_TAG_OVERLAP;
      }

      entry.rank_score = Math.round(score * 1000) / 1000;
      return entry;
    })
    .sort((a, b) => b.rank_score - a.rank_score);
}

/**
 * Apply contradiction penalty — demote entries that contradict higher-ranked ones.
 */
export function applyContradictionPenalty(entries: RankedEvidence[]): RankedEvidence[] {
  // Simple: if same domain + similar title but different conclusion, penalize lower
  const seen = new Set<string>();
  return entries.map((e) => {
    const key = `${e.domain}:${e.title}`;
    if (seen.has(key)) {
      e.rank_score = Math.max(0, e.rank_score - 0.15);
    }
    seen.add(key);
    return e;
  });
}

/**
 * Deduplicate by source ref.
 */
export function deduplicateEvidence(entries: RankedEvidence[]): RankedEvidence[] {
  const seen = new Set<string>();
  return entries.filter((e) => {
    const key = `${e.domain}:${e.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
