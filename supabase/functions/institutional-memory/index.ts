/**
 * Sprint 95 — Institutional Memory Consolidation
 * Block T: Governed Intelligence OS
 *
 * Edge function for managing institutional memory:
 * - list: Query memories with filters
 * - detail: Get single memory with sources and lineage
 * - explain: Generate human-readable explanation of a memory
 * - consolidate: Consolidate repeated patterns into memory
 * - review: Submit review for a memory
 * - archive: Archive a memory
 * - mark_reusable: Mark memory as reusable
 *
 * Invariants:
 * - advisory-first
 * - tenant isolation (organization_id scoped)
 * - no autonomous structural mutation
 * - all changes auditable
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RequestBody {
  action: string;
  organization_id: string;
  workspace_id?: string;
  memory_id?: string;
  filters?: {
    memory_type?: string;
    memory_scope?: string;
    lifecycle_status?: string;
    min_confidence?: number;
    reuse_potential?: string;
    limit?: number;
    offset?: number;
  };
  consolidation_input?: {
    source_type: string;
    source_ids: string[];
    memory_type: string;
    memory_title: string;
    memory_description: string;
  };
  review_input?: {
    review_type: string;
    review_status: string;
    review_notes?: string;
    confidence_adjustment?: number;
    reuse_recommendation?: string;
    lifecycle_recommendation?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: RequestBody = await req.json();
    const { action, organization_id, workspace_id, memory_id, filters, consolidation_input, review_input } = body;

    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── LIST MEMORIES ────────────────────────────────────────────────
    if (action === "list") {
      let query = supabase
        .from("institutional_memories")
        .select("*")
        .eq("organization_id", organization_id)
        .order("confidence_score", { ascending: false })
        .order("recurrence_count", { ascending: false });

      if (workspace_id) {
        query = query.eq("workspace_id", workspace_id);
      }
      if (filters?.memory_type) {
        query = query.eq("memory_type", filters.memory_type);
      }
      if (filters?.memory_scope) {
        query = query.eq("memory_scope", filters.memory_scope);
      }
      if (filters?.lifecycle_status) {
        query = query.eq("lifecycle_status", filters.lifecycle_status);
      }
      if (filters?.min_confidence) {
        query = query.gte("confidence_score", filters.min_confidence);
      }
      if (filters?.reuse_potential) {
        query = query.eq("reuse_potential", filters.reuse_potential);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ memories: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── MEMORY DETAIL ────────────────────────────────────────────────
    if (action === "detail") {
      if (!memory_id) {
        return new Response(JSON.stringify({ error: "memory_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const [memoryRes, sourcesRes, lineageFromRes, lineageToRes, reviewsRes] = await Promise.all([
        supabase
          .from("institutional_memories")
          .select("*")
          .eq("id", memory_id)
          .eq("organization_id", organization_id)
          .single(),
        supabase
          .from("institutional_memory_sources")
          .select("*")
          .eq("memory_id", memory_id)
          .eq("organization_id", organization_id),
        supabase
          .from("institutional_memory_lineage")
          .select("*, to_memory:to_memory_id(id, memory_title, memory_type)")
          .eq("from_memory_id", memory_id)
          .eq("organization_id", organization_id),
        supabase
          .from("institutional_memory_lineage")
          .select("*, from_memory:from_memory_id(id, memory_title, memory_type)")
          .eq("to_memory_id", memory_id)
          .eq("organization_id", organization_id),
        supabase
          .from("institutional_memory_reviews")
          .select("*")
          .eq("memory_id", memory_id)
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false }),
      ]);

      if (memoryRes.error) throw memoryRes.error;

      return new Response(
        JSON.stringify({
          memory: memoryRes.data,
          sources: sourcesRes.data || [],
          lineage_outgoing: lineageFromRes.data || [],
          lineage_incoming: lineageToRes.data || [],
          reviews: reviewsRes.data || [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── EXPLAIN MEMORY ───────────────────────────────────────────────
    if (action === "explain") {
      if (!memory_id) {
        return new Response(JSON.stringify({ error: "memory_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: memory, error: memError } = await supabase
        .from("institutional_memories")
        .select("*")
        .eq("id", memory_id)
        .eq("organization_id", organization_id)
        .single();

      if (memError) throw memError;

      const { data: sources } = await supabase
        .from("institutional_memory_sources")
        .select("*")
        .eq("memory_id", memory_id)
        .eq("organization_id", organization_id);

      // Generate structured explanation
      const explanation = {
        summary: `This ${memory.memory_type.replace(/_/g, " ")} represents ${memory.memory_title}.`,
        what_it_represents: memory.memory_description || "No description provided.",
        contributing_sources: (sources || []).map((s: any) => ({
          type: s.source_type,
          contribution: `${(s.contribution_weight * 100).toFixed(0)}%`,
          notes: s.contribution_notes,
        })),
        why_durable: generateDurabilityReason(memory),
        where_relevant: generateRelevanceContext(memory),
        uncertainties: memory.uncertainty_notes || "No explicit uncertainties documented.",
        confidence: {
          score: memory.confidence_score,
          interpretation: interpretConfidence(memory.confidence_score),
        },
        recurrence: {
          count: memory.recurrence_count,
          interpretation: memory.recurrence_count > 5 ? "Highly recurring pattern" : memory.recurrence_count > 2 ? "Moderately recurring" : "Emerging pattern",
        },
        reuse_potential: memory.reuse_potential,
      };

      return new Response(JSON.stringify({ explanation }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── CONSOLIDATE MEMORY ───────────────────────────────────────────
    if (action === "consolidate") {
      if (!consolidation_input) {
        return new Response(JSON.stringify({ error: "consolidation_input required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { source_type, source_ids, memory_type, memory_title, memory_description } = consolidation_input;

      // Generate a unique memory key
      const memoryKey = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      // Create the institutional memory
      const { data: newMemory, error: createError } = await supabase
        .from("institutional_memories")
        .insert({
          organization_id,
          workspace_id: workspace_id || null,
          memory_key: memoryKey,
          memory_title,
          memory_description,
          memory_type,
          memory_scope: workspace_id ? "workspace" : "organization",
          confidence_score: 0.5,
          recurrence_count: source_ids.length,
          reuse_potential: source_ids.length >= 5 ? "high" : source_ids.length >= 3 ? "medium" : "low",
          lifecycle_status: "candidate",
          review_status: "pending",
          contributing_signals: source_ids.map((id) => ({ source_type, source_id: id })),
        })
        .select()
        .single();

      if (createError) throw createError;

      // Create source links
      const sourceInserts = source_ids.map((sourceId) => ({
        memory_id: newMemory.id,
        organization_id,
        source_type,
        source_id: sourceId,
        contribution_weight: 1 / source_ids.length,
      }));

      await supabase.from("institutional_memory_sources").insert(sourceInserts);

      return new Response(JSON.stringify({ memory: newMemory, sources_linked: source_ids.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── REVIEW MEMORY ────────────────────────────────────────────────
    if (action === "review") {
      if (!memory_id || !review_input) {
        return new Response(JSON.stringify({ error: "memory_id and review_input required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create review record
      const { data: review, error: reviewError } = await supabase
        .from("institutional_memory_reviews")
        .insert({
          memory_id,
          organization_id,
          review_type: review_input.review_type,
          review_status: review_input.review_status,
          review_notes: review_input.review_notes,
          confidence_adjustment: review_input.confidence_adjustment,
          reuse_recommendation: review_input.reuse_recommendation,
          lifecycle_recommendation: review_input.lifecycle_recommendation,
          resolved_at: review_input.review_status !== "pending" ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (reviewError) throw reviewError;

      // If approved, apply recommendations
      if (review_input.review_status === "approved") {
        const updates: Record<string, any> = {
          review_status: "approved",
          last_reviewed_at: new Date().toISOString(),
        };

        if (review_input.confidence_adjustment !== undefined) {
          updates.confidence_score = Math.max(0, Math.min(1, review_input.confidence_adjustment));
        }
        if (review_input.reuse_recommendation) {
          updates.reuse_potential = review_input.reuse_recommendation;
        }
        if (review_input.lifecycle_recommendation) {
          updates.lifecycle_status = review_input.lifecycle_recommendation;
        }

        await supabase.from("institutional_memories").update(updates).eq("id", memory_id).eq("organization_id", organization_id);
      }

      return new Response(JSON.stringify({ review }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ARCHIVE MEMORY ───────────────────────────────────────────────
    if (action === "archive") {
      if (!memory_id) {
        return new Response(JSON.stringify({ error: "memory_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("institutional_memories")
        .update({ lifecycle_status: "archived" })
        .eq("id", memory_id)
        .eq("organization_id", organization_id);

      if (error) throw error;

      return new Response(JSON.stringify({ archived: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── MARK REUSABLE ────────────────────────────────────────────────
    if (action === "mark_reusable") {
      if (!memory_id) {
        return new Response(JSON.stringify({ error: "memory_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("institutional_memories")
        .update({
          reuse_potential: "canonical",
          lifecycle_status: "active",
        })
        .eq("id", memory_id)
        .eq("organization_id", organization_id);

      if (error) throw error;

      return new Response(JSON.stringify({ marked_reusable: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── STATS ────────────────────────────────────────────────────────
    if (action === "stats") {
      const { data: memories } = await supabase
        .from("institutional_memories")
        .select("memory_type, lifecycle_status, reuse_potential, confidence_score, recurrence_count")
        .eq("organization_id", organization_id);

      const stats = {
        total: memories?.length || 0,
        by_type: {} as Record<string, number>,
        by_lifecycle: {} as Record<string, number>,
        by_reuse: {} as Record<string, number>,
        high_confidence: memories?.filter((m: any) => m.confidence_score >= 0.8).length || 0,
        recurring: memories?.filter((m: any) => m.recurrence_count >= 3).length || 0,
        reusable: memories?.filter((m: any) => ["high", "canonical"].includes(m.reuse_potential)).length || 0,
      };

      memories?.forEach((m: any) => {
        stats.by_type[m.memory_type] = (stats.by_type[m.memory_type] || 0) + 1;
        stats.by_lifecycle[m.lifecycle_status] = (stats.by_lifecycle[m.lifecycle_status] || 0) + 1;
        stats.by_reuse[m.reuse_potential] = (stats.by_reuse[m.reuse_potential] || 0) + 1;
      });

      return new Response(JSON.stringify({ stats }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("institutional-memory error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────

function generateDurabilityReason(memory: any): string {
  const reasons: string[] = [];

  if (memory.recurrence_count >= 5) {
    reasons.push(`Observed ${memory.recurrence_count} times across system operations`);
  } else if (memory.recurrence_count >= 2) {
    reasons.push(`Observed ${memory.recurrence_count} times`);
  }

  if (memory.confidence_score >= 0.8) {
    reasons.push("High confidence based on consistent outcomes");
  } else if (memory.confidence_score >= 0.6) {
    reasons.push("Moderate confidence with supporting evidence");
  }

  if (memory.review_status === "approved") {
    reasons.push("Reviewed and approved by operator");
  }

  if (reasons.length === 0) {
    reasons.push("Candidate memory pending further observation and review");
  }

  return reasons.join(". ") + ".";
}

function generateRelevanceContext(memory: any): string {
  const contexts: string[] = [];

  switch (memory.memory_scope) {
    case "workspace":
      contexts.push("Relevant within the current workspace context");
      break;
    case "organization":
      contexts.push("Relevant across all workspaces in this organization");
      break;
    case "platform":
      contexts.push("Platform-wide lesson (cross-tenant synthesis)");
      break;
    case "bounded_cross_context":
      contexts.push("Relevant in specific bounded contexts");
      break;
  }

  switch (memory.memory_type) {
    case "operational_lesson":
      contexts.push("Applies to general platform operations");
      break;
    case "governance_lesson":
      contexts.push("Applies to governance decisions and review workflows");
      break;
    case "routing_lesson":
      contexts.push("Applies to agent routing and capability selection");
      break;
    case "delivery_lesson":
      contexts.push("Applies to delivery and deployment operations");
      break;
    case "failure_pattern":
      contexts.push("Represents a recurring failure pattern to avoid");
      break;
    case "recovery_memory":
      contexts.push("Represents successful recovery strategies");
      break;
  }

  return contexts.join(". ") + ".";
}

function interpretConfidence(score: number): string {
  if (score >= 0.9) return "Very high confidence — well-established pattern";
  if (score >= 0.8) return "High confidence — strong supporting evidence";
  if (score >= 0.6) return "Moderate confidence — reasonable support";
  if (score >= 0.4) return "Low confidence — limited evidence";
  return "Very low confidence — emerging or uncertain";
}
