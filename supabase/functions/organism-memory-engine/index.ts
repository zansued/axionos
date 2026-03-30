import { createClient } from "npm:@supabase/supabase-js@2";
import { assembleUnifiedMemory } from "../_shared/memory-evolution/unified-memory-assembler.ts";
import { runLifecycleSweep, applyEvictions, DEFAULT_LIFECYCLE_CONFIG } from "../_shared/memory-evolution/memory-lifecycle-engine.ts";
import { analyzeConsolidation } from "../_shared/memory-evolution/memory-consolidation-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, organization_id, ...params } = await req.json();

    switch (action) {
      case "store_memory":
        return json(await storeMemory(supabase, organization_id, params));
      case "retrieve_memory":
        return json(await retrieveMemory(supabase, organization_id, params));
      case "memory_metrics":
        return json(await memoryMetrics(supabase, organization_id));

      // ── Sprint 2: Memory Evolution actions ──
      case "unified_retrieve":
        return json(await unifiedRetrieve(supabase, organization_id, params));
      case "lifecycle_sweep":
        return json(await lifecycleSweep(supabase, organization_id, params));
      case "consolidate":
        return json(await consolidate(supabase, organization_id, params));
      case "memory_health":
        return json(await memoryHealth(supabase, organization_id));
      case "apply_evictions":
        return json(await executeEvictions(supabase, organization_id, params));

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Original Actions ───────────────────────────────────────────────

async function storeMemory(supabase: any, orgId: string, params: any) {
  const {
    memory_type = "episodic",
    memory_scope = "organization",
    memory_payload = {},
    source_refs = [],
    confidence_score = 0.5,
  } = params;

  const encoder = new TextEncoder();
  const signatureData = encoder.encode(
    `${orgId}:${memory_type}:${memory_scope}:${JSON.stringify(memory_payload)}`
  );
  const hashBuffer = await crypto.subtle.digest("SHA-256", signatureData);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const memory_signature = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 64);

  const { count } = await supabase
    .from("organism_memory")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("memory_type", memory_type);

  if ((count ?? 0) >= 500) {
    const { data: evictCandidates } = await supabase
      .from("organism_memory")
      .select("memory_id")
      .eq("organization_id", orgId)
      .eq("memory_type", memory_type)
      .order("confidence_score", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(10);

    if (evictCandidates?.length) {
      const ids = evictCandidates.map((e: any) => e.memory_id);
      await supabase.from("organism_memory").delete().in("memory_id", ids);
    }
  }

  const { data, error } = await supabase
    .from("organism_memory")
    .insert({
      organization_id: orgId,
      memory_type,
      memory_signature,
      memory_scope,
      memory_payload,
      source_refs,
      confidence_score: Math.max(0, Math.min(1, confidence_score)),
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { stored: true, memory: data };
}

async function retrieveMemory(supabase: any, orgId: string, params: any) {
  const { memory_type, memory_scope, limit = 20 } = params;

  let query = supabase
    .from("organism_memory")
    .select("*")
    .eq("organization_id", orgId)
    .order("confidence_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (memory_type) query = query.eq("memory_type", memory_type);
  if (memory_scope) query = query.eq("memory_scope", memory_scope);

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { memories: data || [] };
}

async function memoryMetrics(supabase: any, orgId: string) {
  const { data } = await supabase
    .from("organism_memory")
    .select("memory_type, confidence_score, created_at")
    .eq("organization_id", orgId);

  const memories = data || [];

  const byType: Record<string, { count: number; avgConfidence: number; total: number }> = {};
  const TYPES = ["episodic", "procedural", "doctrinal", "strategic"];

  for (const t of TYPES) {
    byType[t] = { count: 0, avgConfidence: 0, total: 0 };
  }

  for (const m of memories) {
    const t = m.memory_type;
    if (!byType[t]) byType[t] = { count: 0, avgConfidence: 0, total: 0 };
    byType[t].count++;
    byType[t].total += Number(m.confidence_score);
  }

  const layers = TYPES.map((t) => ({
    type: t,
    count: byType[t].count,
    avg_confidence: byType[t].count > 0
      ? Math.round((byType[t].total / byType[t].count) * 1000) / 1000
      : 0,
  }));

  const now = Date.now();
  const dayMs = 86400000;
  const growth = Array.from({ length: 7 }, (_, i) => {
    const dayStart = new Date(now - (6 - i) * dayMs).toISOString().slice(0, 10);
    const count = memories.filter(
      (m: any) => m.created_at?.slice(0, 10) === dayStart
    ).length;
    return { date: dayStart, count };
  });

  const strategic = memories
    .filter((m: any) => m.memory_type === "strategic")
    .sort((a: any, b: any) => Number(b.confidence_score) - Number(a.confidence_score))
    .slice(0, 5);

  return {
    total_memories: memories.length,
    layers,
    growth,
    strategic_patterns: strategic,
  };
}

// ── Sprint 2: Memory Evolution Actions ─────────────────────────────

async function unifiedRetrieve(supabase: any, orgId: string, params: any) {
  const bundle = await assembleUnifiedMemory(supabase, {
    organization_id: orgId,
    context_type: params.context_type,
    context_signature: params.context_signature,
    agent_type: params.agent_type,
    stage_key: params.stage_key,
    memory_types: params.memory_types,
    tiers: params.tiers,
    min_relevance: params.min_relevance,
    max_entries: params.max_entries,
    layers: params.layers,
  });
  return bundle;
}

async function lifecycleSweep(supabase: any, orgId: string, params: any) {
  const config = params.config || DEFAULT_LIFECYCLE_CONFIG;
  const result = await runLifecycleSweep(supabase, orgId, config);
  return result;
}

async function consolidate(supabase: any, orgId: string, params: any) {
  // First, assemble unified memory to get all entries
  const bundle = await assembleUnifiedMemory(supabase, {
    organization_id: orgId,
    max_entries: 100,
    layers: params.layers,
  });
  // Run consolidation analysis
  const report = analyzeConsolidation(bundle.entries);
  return report;
}

async function memoryHealth(supabase: any, orgId: string) {
  // Assemble unified memory for health check
  const bundle = await assembleUnifiedMemory(supabase, {
    organization_id: orgId,
    max_entries: 100,
  });

  // Run lifecycle sweep for decay analysis
  const sweep = await runLifecycleSweep(supabase, orgId);

  // Run consolidation for redundancy analysis
  const consolidation = analyzeConsolidation(bundle.entries);

  return {
    snapshot: bundle.health,
    layer_counts: bundle.layer_counts,
    lifecycle: {
      total_evaluated: sweep.total_evaluated,
      transitions_recommended: sweep.transitions.length,
      eviction_candidates: sweep.eviction_candidates.length,
      health_delta: sweep.health_delta,
    },
    consolidation: {
      duplicate_groups: consolidation.duplicate_groups,
      merge_candidates: consolidation.merge_candidates,
      prune_candidates: consolidation.prune_candidates,
      estimated_reduction: consolidation.estimated_reduction,
    },
    assessed_at: new Date().toISOString(),
  };
}

async function executeEvictions(supabase: any, orgId: string, params: any) {
  if (!params.candidates || !Array.isArray(params.candidates)) {
    return { error: "candidates array required" };
  }
  const result = await applyEvictions(supabase, orgId, params.candidates, params.max_evictions);
  return result;
}
