/**
 * Convergence Memory Retriever
 * Retrieves semantically and structurally relevant convergence memory for advisory flows.
 */

export interface RetrievalQuery {
  organizationId: string;
  convergenceDomain?: string;
  actionType?: string;
  specializationType?: string;
  contextSignature?: string;
  minQualityScore?: number;
  limit?: number;
}

export interface RetrievalResult {
  entryId: string;
  title: string;
  summary: string;
  memoryType: string;
  actionType: string;
  convergenceDomain: string;
  relevanceScore: number;
  qualityScore: number;
  evidenceDensity: number;
  contextSignature: string;
}

export function buildRetrievalFilters(query: RetrievalQuery): Record<string, unknown> {
  const filters: Record<string, unknown> = {
    organization_id: query.organizationId,
  };
  if (query.convergenceDomain) filters.convergence_domain = query.convergenceDomain;
  if (query.actionType) filters.action_type = query.actionType;
  if (query.specializationType) filters.specialization_type = query.specializationType;
  return filters;
}

export function computeRelevanceScore(
  entry: Record<string, any>,
  query: RetrievalQuery
): number {
  let score = 0;

  // Domain match
  if (query.convergenceDomain && entry.convergence_domain === query.convergenceDomain) score += 0.3;

  // Action type match
  if (query.actionType && entry.action_type === query.actionType) score += 0.2;

  // Context signature similarity
  if (query.contextSignature && entry.context_signature) {
    const querySig = query.contextSignature.split('::');
    const entrySig = entry.context_signature.split('::');
    const overlap = querySig.filter(p => entrySig.includes(p)).length;
    const total = Math.max(querySig.length, entrySig.length);
    score += (overlap / total) * 0.25;
  }

  // Quality bonus
  score += (entry.memory_quality_score || 0) * 0.15;

  // Evidence density bonus
  score += (entry.evidence_density_score || 0) * 0.1;

  return Math.round(Math.min(score, 1) * 100) / 100;
}

export function rankResults(entries: Record<string, any>[], query: RetrievalQuery): RetrievalResult[] {
  return entries
    .map(entry => ({
      entryId: entry.id,
      title: entry.title,
      summary: entry.summary,
      memoryType: entry.memory_type,
      actionType: entry.action_type,
      convergenceDomain: entry.convergence_domain,
      relevanceScore: computeRelevanceScore(entry, query),
      qualityScore: entry.memory_quality_score,
      evidenceDensity: entry.evidence_density_score,
      contextSignature: entry.context_signature,
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, query.limit || 20);
}
