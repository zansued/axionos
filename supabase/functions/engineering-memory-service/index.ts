import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, AuthContext } from "../_shared/auth.ts";

/**
 * Engineering Memory Service — Sprint 15
 *
 * Endpoints (via action field):
 *   create_entry   — Create a memory entry
 *   create_link    — Link two memory entries
 *   search         — Search/filter memory entries
 *   metrics        — Memory observability metrics
 *
 * SAFETY: Read-only context infrastructure. Never mutates pipeline/governance/billing.
 */

const VALID_MEMORY_TYPES = [
  "ExecutionMemory",
  "ErrorMemory",
  "StrategyMemory",
  "DesignMemory",
  "DecisionMemory",
  "OutcomeMemory",
];

const VALID_LINK_TYPES = [
  "caused_by",
  "resolved_by",
  "recommended_by",
  "implemented_as",
  "similar_to",
  "superseded_by",
];

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = await authenticate(req);
    if (auth instanceof Response) return auth;
    const { user, serviceClient: sc } = auth as AuthContext;

    const body = await req.json();
    const { action } = body;

    // ─── CREATE ENTRY ───
    if (action === "create_entry") {
      const {
        organization_id,
        workspace_id,
        memory_type,
        memory_subtype,
        title,
        summary,
        source_type,
        source_id,
        related_component,
        related_stage,
        confidence_score,
        relevance_score,
        tags,
      } = body;

      if (!organization_id || !memory_type || !title) {
        return errorResponse("organization_id, memory_type, and title required", 400);
      }

      if (!VALID_MEMORY_TYPES.includes(memory_type)) {
        return errorResponse(`Invalid memory_type. Must be one of: ${VALID_MEMORY_TYPES.join(", ")}`, 400);
      }

      const { data, error } = await sc
        .from("engineering_memory_entries")
        .insert({
          organization_id,
          workspace_id: workspace_id || null,
          memory_type,
          memory_subtype: memory_subtype || "",
          title,
          summary: summary || "",
          source_type: source_type || "",
          source_id: source_id || null,
          related_component: related_component || null,
          related_stage: related_stage || null,
          confidence_score: confidence_score ?? 0.5,
          relevance_score: relevance_score ?? 0.5,
          tags: tags || [],
        })
        .select("id")
        .single();

      if (error) {
        console.error("Memory entry creation error:", error);
        return errorResponse("Failed to create memory entry", 500);
      }

      return jsonResponse({ id: data.id, created: true });
    }

    // ─── CREATE LINK ───
    if (action === "create_link") {
      const { organization_id, from_memory_id, to_memory_id, link_type } = body;

      if (!organization_id || !from_memory_id || !to_memory_id || !link_type) {
        return errorResponse("organization_id, from_memory_id, to_memory_id, and link_type required", 400);
      }

      if (!VALID_LINK_TYPES.includes(link_type)) {
        return errorResponse(`Invalid link_type. Must be one of: ${VALID_LINK_TYPES.join(", ")}`, 400);
      }

      // Idempotent — upsert via unique constraint
      const { data, error } = await sc
        .from("memory_links")
        .upsert(
          {
            organization_id,
            from_memory_id,
            to_memory_id,
            link_type,
          },
          { onConflict: "from_memory_id,to_memory_id,link_type" }
        )
        .select("id")
        .single();

      if (error) {
        console.error("Memory link creation error:", error);
        return errorResponse("Failed to create memory link", 500);
      }

      return jsonResponse({ id: data.id, created: true });
    }

    // ─── SEARCH ───
    if (action === "search") {
      const {
        organization_id,
        memory_type,
        memory_subtype,
        related_component,
        related_stage,
        tags,
        created_after,
        created_before,
        limit: queryLimit,
        offset: queryOffset,
      } = body;

      if (!organization_id) {
        return errorResponse("organization_id required", 400);
      }

      const startTime = Date.now();

      let query = sc
        .from("engineering_memory_entries")
        .select("*", { count: "exact" })
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false })
        .limit(Math.min(queryLimit || 50, 50))
        .range(queryOffset || 0, (queryOffset || 0) + Math.min(queryLimit || 50, 50) - 1);

      if (memory_type) query = query.eq("memory_type", memory_type);
      if (memory_subtype) query = query.eq("memory_subtype", memory_subtype);
      if (related_component) query = query.eq("related_component", related_component);
      if (related_stage) query = query.eq("related_stage", related_stage);
      if (created_after) query = query.gte("created_at", created_after);
      if (created_before) query = query.lte("created_at", created_before);
      if (tags && Array.isArray(tags) && tags.length > 0) {
        query = query.contains("tags", tags);
      }

      const { data, count, error } = await query;

      if (error) {
        console.error("Memory search error:", error);
        return errorResponse("Failed to search memory", 500);
      }

      const queryDuration = Date.now() - startTime;

      // Update access stats for retrieved entries
      if (data && data.length > 0) {
        const ids = data.map((e: any) => e.id);
        const now = new Date().toISOString();

        // Batch update access stats
        for (const id of ids) {
          await sc.rpc("", {}).catch(() => {}); // no-op, we do manual update
          await sc
            .from("engineering_memory_entries")
            .update({
              times_retrieved: (data.find((e: any) => e.id === id)?.times_retrieved || 0) + 1,
              last_accessed_at: now,
            })
            .eq("id", id);
        }

        // Log retrieval
        const retrievalLogs = ids.map((id: string) => ({
          organization_id,
          memory_id: id,
          retrieved_by_component: body.retrieved_by_component || "api",
          retrieval_context: body.retrieval_context || null,
          used_in_decision: false,
        }));

        await sc.from("memory_retrieval_log").insert(retrievalLogs);
      }

      return jsonResponse({
        memory_entries: data || [],
        total_count: count || 0,
        query_duration: queryDuration,
      });
    }

    // ─── METRICS ───
    if (action === "metrics") {
      const { organization_id } = body;

      if (!organization_id) {
        return errorResponse("organization_id required", 400);
      }

      // Total entries
      const { count: totalEntries } = await sc
        .from("engineering_memory_entries")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organization_id);

      // Entries by type
      const { data: allEntries } = await sc
        .from("engineering_memory_entries")
        .select("memory_type")
        .eq("organization_id", organization_id);

      const byType: Record<string, number> = {};
      (allEntries || []).forEach((e: any) => {
        byType[e.memory_type] = (byType[e.memory_type] || 0) + 1;
      });

      // Most accessed
      const { data: mostAccessed } = await sc
        .from("engineering_memory_entries")
        .select("id, title, memory_type, times_retrieved")
        .eq("organization_id", organization_id)
        .order("times_retrieved", { ascending: false })
        .limit(10);

      // Retrieval frequency (last 7 days)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: recentRetrievals } = await sc
        .from("memory_retrieval_log")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organization_id)
        .gte("created_at", weekAgo);

      // Total links
      const { count: totalLinks } = await sc
        .from("memory_links")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organization_id);

      return jsonResponse({
        total_entries: totalEntries || 0,
        entries_by_type: byType,
        most_accessed: mostAccessed || [],
        retrieval_frequency_7d: recentRetrievals || 0,
        total_links: totalLinks || 0,
      });
    }

    return errorResponse("Invalid action. Must be: create_entry, create_link, search, metrics", 400);
  } catch (e) {
    console.error("engineering-memory-service error:", e);
    return errorResponse(e.message || "Internal error", 500);
  }
});
