/**
 * Convergence Memory Ranker
 * Ranks memory by relevance, evidence density, confidence, and recency.
 */

export interface RankableEntry {
  id: string;
  relevanceScore: number;
  evidenceDensity: number;
  qualityScore: number;
  reuseConfidence: number;
  createdAt: string;
  memoryType: string;
}

export interface RankingWeights {
  relevance: number;
  evidenceDensity: number;
  quality: number;
  recency: number;
  reuseConfidence: number;
}

const DEFAULT_WEIGHTS: RankingWeights = {
  relevance: 0.30,
  evidenceDensity: 0.20,
  quality: 0.20,
  recency: 0.15,
  reuseConfidence: 0.15,
};

export function computeRecencyScore(createdAt: string): number {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  // Exponential decay: half-life of 90 days
  return Math.exp(-0.693 * ageDays / 90);
}

export function rankEntries(entries: RankableEntry[], weights: RankingWeights = DEFAULT_WEIGHTS): RankableEntry[] {
  const scored = entries.map(entry => {
    const recency = computeRecencyScore(entry.createdAt);
    const compositeScore =
      entry.relevanceScore * weights.relevance +
      entry.evidenceDensity * weights.evidenceDensity +
      entry.qualityScore * weights.quality +
      recency * weights.recency +
      entry.reuseConfidence * weights.reuseConfidence;

    return { ...entry, relevanceScore: Math.round(compositeScore * 100) / 100 };
  });

  return scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

export function penalizeStaleMemory(entries: RankableEntry[], staleDays: number = 180): RankableEntry[] {
  return entries.map(entry => {
    const ageMs = Date.now() - new Date(entry.createdAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays > staleDays) {
      const penalty = Math.min((ageDays - staleDays) / staleDays, 0.5);
      return { ...entry, relevanceScore: Math.round((entry.relevanceScore * (1 - penalty)) * 100) / 100 };
    }
    return entry;
  });
}
