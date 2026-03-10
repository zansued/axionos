/**
 * canon-retrieval-engine.ts
 * Core retrieval engine: fetches approved canon entries from the database
 * based on query parameters, applies filters, and returns ranked results.
 */

import { type ImplementationPattern, type PatternLibraryQuery, type PatternLibraryResult, isPatternRetrievable, rankPatterns, buildPatternLibraryFilters } from "./implementation-pattern-library.ts";

export interface RetrievalEngineConfig {
  defaultMaxResults: number;
  defaultMinConfidence: number;
  includeExperimental: boolean;
}

export const DEFAULT_RETRIEVAL_CONFIG: RetrievalEngineConfig = {
  defaultMaxResults: 5,
  defaultMinConfidence: 0.5,
  includeExperimental: false,
};

export async function retrieveCanonPatterns(
  supabaseClient: any,
  query: PatternLibraryQuery,
  config: RetrievalEngineConfig = DEFAULT_RETRIEVAL_CONFIG
): Promise<PatternLibraryResult> {
  const maxResults = query.maxResults ?? config.defaultMaxResults;
  const minConfidence = query.minConfidence ?? config.defaultMinConfidence;
  const includeExperimental = query.includeExperimental ?? config.includeExperimental;

  // Fetch canon entries with their embeddings
  let dbQuery = supabaseClient
    .from('canon_entries')
    .select(`
      id, title, summary, body, implementation_guidance,
      canon_type, lifecycle_status, approval_status, confidence_score,
      canon_pattern_embeddings (
        id, language_tags, framework_tags, stack_tags,
        architecture_scope, problem_type, quality_level,
        compatibility_flags, applicability_conditions,
        anti_pattern_links, usage_constraints
      )
    `)
    .eq('organization_id', query.organizationId)
    .not('lifecycle_status', 'in', '("deprecated","archived")')
    .gte('confidence_score', minConfidence);

  const { data: entries, error } = await dbQuery;
  if (error) throw new Error(`Canon retrieval failed: ${error.message}`);

  // Transform and filter
  const patterns: ImplementationPattern[] = (entries || [])
    .map((entry: any) => {
      const emb = entry.canon_pattern_embeddings?.[0] || {};
      return {
        id: emb.id || entry.id,
        canonEntryId: entry.id,
        title: entry.title,
        summary: entry.summary,
        canonType: entry.canon_type,
        lifecycleStatus: entry.lifecycle_status,
        approvalStatus: entry.approval_status,
        confidenceScore: entry.confidence_score ?? 0,
        languageTags: emb.language_tags || [],
        frameworkTags: emb.framework_tags || [],
        stackTags: emb.stack_tags || [],
        architectureScope: emb.architecture_scope || 'general',
        problemType: emb.problem_type || 'general',
        qualityLevel: emb.quality_level || 'standard',
        compatibilityFlags: emb.compatibility_flags || {},
        applicabilityConditions: emb.applicability_conditions || {},
        antiPatternLinks: emb.anti_pattern_links || [],
        usageConstraints: emb.usage_constraints || {},
        implementationGuidance: entry.implementation_guidance,
        body: entry.body,
      };
    })
    .filter((p: ImplementationPattern) => isPatternRetrievable(p, includeExperimental, minConfidence));

  // Apply tag-based filtering
  const filtered = applyTagFilters(patterns, query);

  // Rank and limit
  const ranked = rankPatterns(filtered, query);
  const limited = ranked.slice(0, maxResults);

  return {
    patterns: limited,
    totalAvailable: filtered.length,
    queryContext: query,
    retrievalTimestamp: new Date().toISOString(),
    filtersSummary: buildPatternLibraryFilters(query),
  };
}

function applyTagFilters(patterns: ImplementationPattern[], query: PatternLibraryQuery): ImplementationPattern[] {
  return patterns.filter(p => {
    if (query.stack && !p.stackTags.includes(query.stack) && p.stackTags.length > 0) return false;
    if (query.language && !p.languageTags.includes(query.language) && p.languageTags.length > 0) return false;
    if (query.framework && !p.frameworkTags.includes(query.framework) && p.frameworkTags.length > 0) return false;
    if (query.problemType && p.problemType !== query.problemType && p.problemType !== 'general') return false;
    return true;
  });
}
