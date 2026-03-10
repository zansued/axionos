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

    const { action, organization_id } = await req.json();

    switch (action) {
      case "organism_overview":
        return json(await organismOverview(supabase, organization_id));
      case "organism_metrics":
        return json(await organismMetrics(supabase, organization_id));
      case "organism_activity":
        return json(await organismActivity(supabase, organization_id));
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

async function organismOverview(supabase: any, orgId: string) {
  const [healthRes, loopsRes, cyclesRes, routingRes, memoryRes, postureRes, attentionRes] =
    await Promise.all([
      supabase.from("system_health_metrics").select("*").eq("organization_id", orgId)
        .order("evaluated_at", { ascending: false }).limit(30),
      supabase.from("operational_loops").select("*").eq("organization_id", orgId),
      supabase.from("operational_cycles").select("*").eq("organization_id", orgId)
        .order("created_at", { ascending: false }).limit(5),
      supabase.from("adaptive_routing_profiles").select("*").eq("organization_id", orgId).limit(10),
      supabase.from("organism_memory").select("memory_type, confidence_score, created_at")
        .eq("organization_id", orgId),
      supabase.from("operational_posture_states").select("*").eq("organization_id", orgId)
        .order("created_at", { ascending: false }).limit(1),
      supabase.from("attention_allocation_states").select("*").eq("organization_id", orgId)
        .order("created_at", { ascending: false }).limit(5),
    ]);

  // Health summary
  const healthMetrics = healthRes.data || [];
  const latestHealth: Record<string, any> = {};
  for (const m of healthMetrics) {
    if (!latestHealth[m.metric_type]) latestHealth[m.metric_type] = m;
  }
  const healthValues = Object.values(latestHealth) as any[];
  const overallHealth = healthValues.length > 0
    ? Math.round((healthValues.reduce((s: number, m: any) => s + Number(m.metric_value), 0) / healthValues.length) * 1000) / 1000
    : 0;

  // Loops summary
  const loops = loopsRes.data || [];
  const activeLoops = loops.filter((l: any) => l.loop_status === "active").length;
  const healthyLoops = loops.filter((l: any) => l.loop_health === "healthy").length;

  // Active cycle
  const cycles = cyclesRes.data || [];
  const activeCycle = cycles.find((c: any) => !c.cycle_end) || null;

  // Routing
  const routing = routingRes.data || [];

  // Memory layers
  const memories = memoryRes.data || [];
  const memoryByType: Record<string, number> = {};
  for (const m of memories) {
    memoryByType[m.memory_type] = (memoryByType[m.memory_type] || 0) + 1;
  }

  // Posture
  const posture = postureRes.data?.[0] || null;

  // Attention
  const attention = attentionRes.data || [];

  return {
    health: {
      overall_score: overallHealth,
      grade: gradeFromScore(overallHealth),
      metrics: healthValues,
    },
    loops: {
      total: loops.length,
      active: activeLoops,
      healthy: healthyLoops,
      items: loops,
    },
    active_cycle: activeCycle,
    routing: {
      profiles_count: routing.length,
      profiles: routing,
    },
    memory: {
      total: memories.length,
      by_type: memoryByType,
    },
    posture: posture ? {
      current_posture: posture.posture_state,
      confidence: posture.confidence_score,
    } : null,
    attention: {
      allocations: attention,
    },
  };
}

async function organismMetrics(supabase: any, orgId: string) {
  const [healthRes, memoryRes, loopsRes] = await Promise.all([
    supabase.from("system_health_metrics").select("metric_type, metric_value, metric_trend, evaluated_at")
      .eq("organization_id", orgId).order("evaluated_at", { ascending: false }).limit(60),
    supabase.from("organism_memory").select("memory_type, confidence_score, created_at")
      .eq("organization_id", orgId),
    supabase.from("operational_loops").select("loop_type, loop_priority, loop_health")
      .eq("organization_id", orgId),
  ]);

  return {
    health_history: healthRes.data || [],
    memory_distribution: summarizeMemory(memoryRes.data || []),
    loop_priorities: (loopsRes.data || []).map((l: any) => ({
      type: l.loop_type,
      priority: Number(l.loop_priority),
      health: l.loop_health,
    })),
  };
}

async function organismActivity(supabase: any, orgId: string) {
  const [cyclesRes, routingRes, memoryRes] = await Promise.all([
    supabase.from("operational_cycles").select("*").eq("organization_id", orgId)
      .order("created_at", { ascending: false }).limit(10),
    supabase.from("adaptive_routing_profiles").select("domain_id, posture_state, attention_level, updated_at")
      .eq("organization_id", orgId).order("updated_at", { ascending: false }).limit(10),
    supabase.from("organism_memory").select("memory_type, memory_scope, confidence_score, created_at")
      .eq("organization_id", orgId).order("created_at", { ascending: false }).limit(10),
  ]);

  return {
    recent_cycles: cyclesRes.data || [],
    recent_routing: routingRes.data || [],
    recent_memories: memoryRes.data || [],
  };
}

function summarizeMemory(memories: any[]) {
  const byType: Record<string, { count: number; avgConf: number; total: number }> = {};
  for (const m of memories) {
    if (!byType[m.memory_type]) byType[m.memory_type] = { count: 0, avgConf: 0, total: 0 };
    byType[m.memory_type].count++;
    byType[m.memory_type].total += Number(m.confidence_score);
  }
  return Object.entries(byType).map(([type, v]) => ({
    type,
    count: v.count,
    avg_confidence: v.count > 0 ? Math.round((v.total / v.count) * 1000) / 1000 : 0,
  }));
}

function gradeFromScore(score: number): string {
  if (score >= 0.9) return "A";
  if (score >= 0.75) return "B";
  if (score >= 0.6) return "C";
  if (score >= 0.4) return "D";
  return "F";
}
