/**
 * Canon Runtime Retriever — Sprint 141
 * Core retrieval logic for querying canon entries at runtime.
 */

export interface RetrievalQuery {
  domain?: string;
  stack?: string;
  practice_type?: string;
  task_type?: string;
  topic?: string;
  exclude_deprecated?: boolean;
  exclude_anti_patterns?: boolean;
  min_confidence?: number;
  max_results?: number;
}

export interface RetrievalFilter {
  field: string;
  value: string;
  operator: string;
}

export function buildRetrievalFilters(query: RetrievalQuery): RetrievalFilter[] {
  const filters: RetrievalFilter[] = [];

  if (query.domain) filters.push({ field: "stack_scope", value: query.domain, operator: "eq" });
  if (query.stack) filters.push({ field: "stack_scope", value: query.stack, operator: "eq" });
  if (query.practice_type) filters.push({ field: "practice_type", value: query.practice_type, operator: "eq" });
  if (query.topic) filters.push({ field: "topic", value: query.topic, operator: "eq" });

  if (query.exclude_deprecated !== false) {
    filters.push({ field: "lifecycle_status", value: "deprecated", operator: "neq" });
    filters.push({ field: "lifecycle_status", value: "superseded", operator: "neq" });
  }

  if (query.exclude_anti_patterns) {
    filters.push({ field: "anti_pattern_flag", value: "false", operator: "eq" });
  }

  return filters;
}

export function defaultRetrievalQuery(): RetrievalQuery {
  return {
    exclude_deprecated: true,
    exclude_anti_patterns: false,
    min_confidence: 0,
    max_results: 10,
  };
}
