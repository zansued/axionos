/**
 * implementation-pattern-library.ts
 * Core pattern library: manages the inventory of approved implementation patterns
 * available for retrieval by planning, execution, repair, and validation agents.
 */

export interface ImplementationPattern {
  id: string;
  canonEntryId: string;
  title: string;
  summary: string;
  canonType: string;
  lifecycleStatus: string;
  approvalStatus: string;
  confidenceScore: number;
  languageTags: string[];
  frameworkTags: string[];
  stackTags: string[];
  architectureScope: string;
  problemType: string;
  qualityLevel: string;
  compatibilityFlags: Record<string, unknown>;
  applicabilityConditions: Record<string, unknown>;
  antiPatternLinks: string[];
  usageConstraints: Record<string, unknown>;
  implementationGuidance?: string;
  body?: string;
}

export interface PatternLibraryQuery {
  organizationId: string;
  taskType?: string;
  stack?: string;
  language?: string;
  framework?: string;
  layer?: string;
  problemType?: string;
  artifactType?: string;
  maxResults?: number;
  minConfidence?: number;
  includeExperimental?: boolean;
}

export interface PatternLibraryResult {
  patterns: ImplementationPattern[];
  totalAvailable: number;
  queryContext: PatternLibraryQuery;
  retrievalTimestamp: string;
  filtersSummary: string;
}

export function buildPatternLibraryFilters(query: PatternLibraryQuery): string {
  const filters: string[] = [];
  if (query.stack) filters.push(`stack=${query.stack}`);
  if (query.language) filters.push(`lang=${query.language}`);
  if (query.framework) filters.push(`fw=${query.framework}`);
  if (query.problemType) filters.push(`problem=${query.problemType}`);
  if (query.taskType) filters.push(`task=${query.taskType}`);
  if (query.layer) filters.push(`layer=${query.layer}`);
  return filters.length > 0 ? filters.join(', ') : 'none';
}

export function isPatternRetrievable(pattern: {
  lifecycleStatus: string;
  approvalStatus: string;
  confidenceScore: number;
}, includeExperimental: boolean, minConfidence: number): boolean {
  // Deprecated and archived are never retrievable
  if (['deprecated', 'archived'].includes(pattern.lifecycleStatus)) return false;
  
  // Must be approved or (experimental if allowed)
  if (pattern.approvalStatus === 'approved') {
    return pattern.confidenceScore >= minConfidence;
  }
  
  if (includeExperimental && pattern.approvalStatus === 'experimental') {
    return pattern.confidenceScore >= minConfidence;
  }
  
  return false;
}

export function rankPatterns(patterns: ImplementationPattern[], query: PatternLibraryQuery): ImplementationPattern[] {
  return patterns.sort((a, b) => {
    // Primary: confidence score
    const confDiff = b.confidenceScore - a.confidenceScore;
    if (Math.abs(confDiff) > 0.1) return confDiff;

    // Secondary: tag match count
    const aMatches = countTagMatches(a, query);
    const bMatches = countTagMatches(b, query);
    if (aMatches !== bMatches) return bMatches - aMatches;

    // Tertiary: approved > experimental
    if (a.approvalStatus !== b.approvalStatus) {
      return a.approvalStatus === 'approved' ? -1 : 1;
    }

    return 0;
  });
}

function countTagMatches(pattern: ImplementationPattern, query: PatternLibraryQuery): number {
  let matches = 0;
  if (query.stack && pattern.stackTags.includes(query.stack)) matches++;
  if (query.language && pattern.languageTags.includes(query.language)) matches++;
  if (query.framework && pattern.frameworkTags.includes(query.framework)) matches++;
  if (query.problemType && pattern.problemType === query.problemType) matches++;
  return matches;
}
