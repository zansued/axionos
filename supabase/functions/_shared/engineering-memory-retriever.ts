/**
 * Engineering Memory Retriever — Sprint 16
 *
 * Structured, deterministic memory retrieval utilities.
 * All retrieval is read-only, scoped, explainable, and auditable.
 *
 * Ranking is rule-based using explicit signals:
 *   - exact match on memory_type
 *   - exact match on related_stage / related_component
 *   - matching tags
 *   - recency
 *   - relevance_score
 *   - confidence_score
 *
 * No opaque ML scoring.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Types ───

export interface RetrievalContext {
  organization_id: string;
  retrieval_surface: RetrievalSurface;
  retrieved_by_component: string;
}

export type RetrievalSurface =
  | "repair_surface"
  | "meta_agent_analysis"
  | "artifact_generation"
  | "recommendation_review"
  | "artifact_review";

export interface MemoryQuery {
  memory_types?: string[];
  memory_subtypes?: string[];
  related_stage?: string;
  related_component?: string;
  tags?: string[];
  source_type?: string;
  max_results?: number;
  min_confidence?: number;
  min_relevance?: number;
}

export interface MemoryEntry {
  id: string;
  memory_type: string;
  memory_subtype: string;
  title: string;
  summary: string;
  source_type: string;
  source_id: string | null;
  related_component: string | null;
  related_stage: string | null;
  confidence_score: number;
  relevance_score: number;
  tags: string[];
  created_at: string;
  times_retrieved: number;
  _rank_score?: number;
}

export interface RetrievalResult {
  entries: MemoryEntry[];
  query_context: string;
  total_found: number;
  retrieval_surface: RetrievalSurface;
}

// ─── Core Retrieval ───

async function queryMemory(
  sc: SupabaseClient,
  ctx: RetrievalContext,
  query: MemoryQuery
): Promise<RetrievalResult> {
  const limit = Math.min(query.max_results || 10, 50);

  let q = sc
    .from("engineering_memory_entries")
    .select("*")
    .eq("organization_id", ctx.organization_id)
    .order("created_at", { ascending: false })
    .limit(limit * 3); // fetch extra for ranking

  if (query.memory_types && query.memory_types.length > 0) {
    q = q.in("memory_type", query.memory_types);
  }
  if (query.memory_subtypes && query.memory_subtypes.length > 0) {
    q = q.in("memory_subtype", query.memory_subtypes);
  }
  if (query.related_stage) {
    q = q.eq("related_stage", query.related_stage);
  }
  if (query.related_component) {
    q = q.eq("related_component", query.related_component);
  }
  if (query.source_type) {
    q = q.eq("source_type", query.source_type);
  }
  if (query.min_confidence) {
    q = q.gte("confidence_score", query.min_confidence);
  }
  if (query.min_relevance) {
    q = q.gte("relevance_score", query.min_relevance);
  }
  if (query.tags && query.tags.length > 0) {
    q = q.contains("tags", query.tags);
  }

  const { data, error } = await q;

  if (error) {
    console.error("Memory query error:", error);
    return { entries: [], query_context: ctx.retrieval_surface, total_found: 0, retrieval_surface: ctx.retrieval_surface };
  }

  const entries = (data || []) as MemoryEntry[];
  const ranked = rankEntries(entries, query);
  const topEntries = ranked.slice(0, limit);

  // Log retrieval and update access stats (fire-and-forget)
  if (topEntries.length > 0) {
    logRetrieval(sc, ctx, topEntries).catch((e) => console.error("Retrieval log error:", e));
  }

  return {
    entries: topEntries,
    query_context: ctx.retrieval_surface,
    total_found: entries.length,
    retrieval_surface: ctx.retrieval_surface,
  };
}

// ─── Deterministic Ranking ───

function rankEntries(entries: MemoryEntry[], query: MemoryQuery): MemoryEntry[] {
  const now = Date.now();

  return entries
    .map((entry) => {
      let score = 0;

      // Confidence & relevance (weight: 0.3 each)
      score += (entry.confidence_score || 0) * 0.3;
      score += (entry.relevance_score || 0) * 0.3;

      // Recency: entries within 7 days get full bonus, decays linearly over 90 days
      const ageMs = now - new Date(entry.created_at).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      const recencyScore = ageDays <= 7 ? 1 : ageDays <= 90 ? 1 - (ageDays - 7) / 83 : 0;
      score += recencyScore * 0.2;

      // Tag overlap bonus (weight: 0.1)
      if (query.tags && query.tags.length > 0 && Array.isArray(entry.tags)) {
        const overlap = query.tags.filter((t) => entry.tags.includes(t)).length;
        score += Math.min(1, overlap / query.tags.length) * 0.1;
      }

      // Usage signal: entries previously found useful get small boost
      if (entry.times_retrieved > 0) {
        score += Math.min(0.1, entry.times_retrieved * 0.01);
      }

      entry._rank_score = Math.round(score * 1000) / 1000;
      return entry;
    })
    .sort((a, b) => (b._rank_score || 0) - (a._rank_score || 0));
}

// ─── Retrieval Logging ───

async function logRetrieval(
  sc: SupabaseClient,
  ctx: RetrievalContext,
  entries: MemoryEntry[]
): Promise<void> {
  const logs = entries.map((e) => ({
    organization_id: ctx.organization_id,
    memory_id: e.id,
    retrieved_by_component: ctx.retrieved_by_component,
    retrieval_context: ctx.retrieval_surface,
    used_in_decision: false,
  }));

  await sc.from("memory_retrieval_log").insert(logs);

  // Update access stats
  const now = new Date().toISOString();
  for (const e of entries) {
    await sc
      .from("engineering_memory_entries")
      .update({
        times_retrieved: (e.times_retrieved || 0) + 1,
        last_accessed_at: now,
      })
      .eq("id", e.id);
  }
}

// ─── Mark memory as used in decision ───

export async function markUsedInDecision(
  sc: SupabaseClient,
  organization_id: string,
  memory_ids: string[],
  retrieval_surface: RetrievalSurface
): Promise<void> {
  if (memory_ids.length === 0) return;
  await sc
    .from("memory_retrieval_log")
    .update({ used_in_decision: true })
    .eq("organization_id", organization_id)
    .eq("retrieval_context", retrieval_surface)
    .in("memory_id", memory_ids);
}

// ─── Surface-Specific Retrievers ───

/**
 * Repair Surface: Retrieve memory relevant to a failure being repaired.
 */
export async function retrieveForRepair(
  sc: SupabaseClient,
  organization_id: string,
  opts: {
    error_category?: string;
    affected_stage?: string;
    affected_component?: string;
    error_tags?: string[];
  }
): Promise<RetrievalResult> {
  const ctx: RetrievalContext = {
    organization_id,
    retrieval_surface: "repair_surface",
    retrieved_by_component: "repair_routing",
  };

  return queryMemory(sc, ctx, {
    memory_types: ["ErrorMemory", "StrategyMemory", "OutcomeMemory"],
    related_stage: opts.affected_stage,
    related_component: opts.affected_component,
    tags: opts.error_tags,
    max_results: 5,
    min_confidence: 0.3,
  });
}

/**
 * Meta-Agent Analysis Surface: Retrieve memory for recommendation generation.
 */
export async function retrieveForMetaAgent(
  sc: SupabaseClient,
  organization_id: string,
  opts: {
    meta_agent_type: string;
    target_component?: string;
    target_stage?: string;
    analysis_tags?: string[];
  }
): Promise<RetrievalResult> {
  const ctx: RetrievalContext = {
    organization_id,
    retrieval_surface: "meta_agent_analysis",
    retrieved_by_component: opts.meta_agent_type,
  };

  return queryMemory(sc, ctx, {
    memory_types: ["DesignMemory", "OutcomeMemory", "StrategyMemory", "DecisionMemory"],
    related_component: opts.target_component,
    related_stage: opts.target_stage,
    tags: opts.analysis_tags,
    max_results: 5,
    min_confidence: 0.4,
  });
}

/**
 * Artifact Generation Surface: Retrieve memory for enriching artifact content.
 */
export async function retrieveForArtifactGeneration(
  sc: SupabaseClient,
  organization_id: string,
  opts: {
    artifact_type: string;
    target_component?: string;
    recommendation_type?: string;
    meta_agent_type?: string;
  }
): Promise<RetrievalResult> {
  const ctx: RetrievalContext = {
    organization_id,
    retrieval_surface: "artifact_generation",
    retrieved_by_component: "meta_artifact_generator",
  };

  const tags = [opts.artifact_type, opts.recommendation_type, opts.meta_agent_type].filter(Boolean) as string[];

  return queryMemory(sc, ctx, {
    memory_types: ["DesignMemory", "DecisionMemory", "OutcomeMemory"],
    related_component: opts.target_component,
    tags: tags.length > 0 ? tags : undefined,
    max_results: 5,
    min_confidence: 0.3,
  });
}

/**
 * Human Review Surface: Retrieve related memory for recommendation/artifact review.
 */
export async function retrieveForReview(
  sc: SupabaseClient,
  organization_id: string,
  opts: {
    review_type: "recommendation_review" | "artifact_review";
    target_component?: string;
    related_stage?: string;
    tags?: string[];
  }
): Promise<RetrievalResult> {
  const ctx: RetrievalContext = {
    organization_id,
    retrieval_surface: opts.review_type,
    retrieved_by_component: "human_review_ui",
  };

  return queryMemory(sc, ctx, {
    memory_types: ["DesignMemory", "DecisionMemory", "OutcomeMemory", "StrategyMemory"],
    related_component: opts.target_component,
    related_stage: opts.related_stage,
    tags: opts.tags,
    max_results: 5,
    min_confidence: 0.3,
  });
}

/**
 * Retrieval Observability: Get retrieval-specific metrics.
 */
export async function getRetrievalMetrics(
  sc: SupabaseClient,
  organization_id: string
): Promise<Record<string, unknown>> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Retrieval count by context (7d)
  const { data: recentLogs } = await sc
    .from("memory_retrieval_log")
    .select("retrieval_context, used_in_decision")
    .eq("organization_id", organization_id)
    .gte("created_at", weekAgo);

  const byContext: Record<string, number> = {};
  let decisionAssisted = 0;
  (recentLogs || []).forEach((log: any) => {
    byContext[log.retrieval_context] = (byContext[log.retrieval_context] || 0) + 1;
    if (log.used_in_decision) decisionAssisted++;
  });

  // Most retrieved entries
  const { data: mostRetrieved } = await sc
    .from("engineering_memory_entries")
    .select("id, title, memory_type, times_retrieved")
    .eq("organization_id", organization_id)
    .gt("times_retrieved", 0)
    .order("times_retrieved", { ascending: false })
    .limit(10);

  return {
    total_retrievals_7d: recentLogs?.length || 0,
    by_context: byContext,
    decision_assisted_count: decisionAssisted,
    most_retrieved: mostRetrieved || [],
  };
}
