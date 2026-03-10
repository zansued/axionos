import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// ── Store Memory ───────────────────────────────────────────────────────

async function storeMemory(supabase: any, orgId: string, params: any) {
  const {
    memory_type = "episodic",
    memory_scope = "organization",
    memory_payload = {},
    source_refs = [],
    confidence_score = 0.5,
  } = params;

  // Generate signature using Web Crypto API
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

  // Bounded storage: cap at 500 memories per type per org
  const { count } = await supabase
    .from("organism_memory")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("memory_type", memory_type);

  if ((count ?? 0) >= 500) {
    // Evict oldest low-confidence entries
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

// ── Retrieve Memory ────────────────────────────────────────────────────

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

// ── Memory Metrics ─────────────────────────────────────────────────────

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

  // Growth: memories per day over last 7 days
  const now = Date.now();
  const dayMs = 86400000;
  const growth = Array.from({ length: 7 }, (_, i) => {
    const dayStart = new Date(now - (6 - i) * dayMs).toISOString().slice(0, 10);
    const count = memories.filter(
      (m: any) => m.created_at?.slice(0, 10) === dayStart
    ).length;
    return { date: dayStart, count };
  });

  // Strategic patterns: top strategic memories by confidence
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
