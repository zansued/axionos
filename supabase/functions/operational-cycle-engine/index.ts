import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();
    const { action, organization_id, ...params } = body;

    if (!organization_id) return json({ error: "organization_id required" }, corsHeaders, 400);

    switch (action) {
      case "start_cycle": return json(await startCycle(supabase, organization_id, params), corsHeaders);
      case "evaluate_cycle": return json(await evaluateCycle(supabase, organization_id, params), corsHeaders);
      case "end_cycle": return json(await endCycle(supabase, organization_id, params), corsHeaders);
      case "cycle_metrics": return json(await cycleMetrics(supabase, organization_id), corsHeaders);
      case "list_cycles": return json(await listCycles(supabase, organization_id), corsHeaders);
      default: return json({ error: `Unknown action: ${action}` }, corsHeaders, 400);
    }
  } catch (e) { return json({ error: e.message }, corsHeaders, 500); }
});

function json(data: any, headers: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, "Content-Type": "application/json" } });
}

// ── Posture-to-cycle mapping ──
const POSTURE_CYCLE_MAP: Record<string, string> = {
  exploratory: "exploration_window",
  accelerated: "exploration_window",
  stabilizing: "stabilization_window",
  recovery: "recovery_window",
  constrained: "hardening_cycle",
  observation_heavy: "stabilization_window",
};

const CYCLE_EFFECTS: Record<string, { posture_bias: string; attention_boost: number; routing_aggressiveness: string; learning_sensitivity: string }> = {
  exploration_window: { posture_bias: "exploratory", attention_boost: -0.1, routing_aggressiveness: "relaxed", learning_sensitivity: "high" },
  stabilization_window: { posture_bias: "stabilizing", attention_boost: 0.05, routing_aggressiveness: "standard", learning_sensitivity: "standard" },
  recovery_window: { posture_bias: "recovery", attention_boost: 0.2, routing_aggressiveness: "conservative", learning_sensitivity: "maximum" },
  hardening_cycle: { posture_bias: "constrained", attention_boost: 0.15, routing_aggressiveness: "conservative", learning_sensitivity: "standard" },
};

// ── Actions ──

async function startCycle(supabase: any, orgId: string, params: any) {
  // End any active cycle first
  const { data: active } = await supabase
    .from("operational_cycles")
    .select("cycle_id")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .limit(1);

  if (active && active.length > 0) {
    await supabase.from("operational_cycles")
      .update({ status: "completed", cycle_end: new Date().toISOString() })
      .eq("cycle_id", active[0].cycle_id);
  }

  // Determine cycle type from current posture or explicit param
  let cycleType = params.cycle_type;
  if (!cycleType) {
    const { data: postures } = await supabase
      .from("operational_posture_state")
      .select("current_posture")
      .eq("organization_id", orgId)
      .order("activated_at", { ascending: false })
      .limit(1);
    const posture = postures?.[0]?.current_posture || "stabilizing";
    cycleType = POSTURE_CYCLE_MAP[posture] || "stabilization_window";
  }

  const effects = CYCLE_EFFECTS[cycleType] || CYCLE_EFFECTS.stabilization_window;

  const { data, error } = await supabase.from("operational_cycles").insert({
    organization_id: orgId,
    cycle_type: cycleType,
    active_posture: effects.posture_bias,
    cycle_metrics: { effects, started_reason: params.reason || "automatic" },
    status: "active",
  }).select().single();

  if (error) throw error;
  return { cycle: data, effects };
}

async function evaluateCycle(supabase: any, orgId: string, _params: any) {
  const { data: activeCycle } = await supabase
    .from("operational_cycles")
    .select("*")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .maybeSingle();

  if (!activeCycle) return { evaluation: null, message: "No active cycle" };

  const startTime = new Date(activeCycle.cycle_start).getTime();
  const elapsed = Date.now() - startTime;
  const elapsedHours = elapsed / (1000 * 60 * 60);

  // Collect signals for evaluation
  const { data: attention } = await supabase
    .from("attention_allocation_map")
    .select("attention_score")
    .eq("organization_id", orgId);

  const avgAttention = attention && attention.length > 0
    ? attention.reduce((s: number, a: any) => s + Number(a.attention_score), 0) / attention.length
    : 0.5;

  const { data: routing } = await supabase
    .from("adaptive_routing_profiles")
    .select("repair_priority, validation_depth")
    .eq("organization_id", orgId);

  const highRepair = routing ? routing.filter((r: any) => r.repair_priority === "critical" || r.repair_priority === "high").length : 0;

  const cycleHealth = avgAttention < 0.5 ? "healthy" : avgAttention < 0.7 ? "moderate" : "stressed";
  const shouldTransition = (
    (activeCycle.cycle_type === "recovery_window" && avgAttention < 0.4 && elapsedHours > 1) ||
    (activeCycle.cycle_type === "exploration_window" && avgAttention > 0.7) ||
    (activeCycle.cycle_type === "stabilization_window" && highRepair === 0 && elapsedHours > 2)
  );

  const suggestedNext = shouldTransition
    ? (avgAttention < 0.3 ? "exploration_window" : avgAttention > 0.6 ? "recovery_window" : "stabilization_window")
    : null;

  // Update cycle metrics
  const updatedMetrics = {
    ...activeCycle.cycle_metrics,
    last_evaluation: new Date().toISOString(),
    avg_attention: Math.round(avgAttention * 1000) / 1000,
    high_repair_domains: highRepair,
    cycle_health: cycleHealth,
    elapsed_hours: Math.round(elapsedHours * 10) / 10,
  };

  await supabase.from("operational_cycles")
    .update({ cycle_metrics: updatedMetrics })
    .eq("cycle_id", activeCycle.cycle_id);

  return {
    evaluation: {
      cycle_id: activeCycle.cycle_id,
      cycle_type: activeCycle.cycle_type,
      cycle_health: cycleHealth,
      elapsed_hours: Math.round(elapsedHours * 10) / 10,
      avg_attention: Math.round(avgAttention * 1000) / 1000,
      high_repair_domains: highRepair,
      should_transition: shouldTransition,
      suggested_next: suggestedNext,
    },
  };
}

async function endCycle(supabase: any, orgId: string, params: any) {
  const cycleId = params.cycle_id;

  const query = cycleId
    ? supabase.from("operational_cycles").update({ status: "completed", cycle_end: new Date().toISOString() }).eq("cycle_id", cycleId)
    : supabase.from("operational_cycles").update({ status: "completed", cycle_end: new Date().toISOString() }).eq("organization_id", orgId).eq("status", "active");

  const { error } = await query;
  if (error) throw error;
  return { ended: true };
}

async function listCycles(supabase: any, orgId: string) {
  const { data, error } = await supabase
    .from("operational_cycles")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return { cycles: data || [] };
}

async function cycleMetrics(supabase: any, orgId: string) {
  const { data } = await supabase
    .from("operational_cycles")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100);

  const cycles = data || [];
  const active = cycles.find((c: any) => c.status === "active");
  const completed = cycles.filter((c: any) => c.status === "completed");

  const typeDist: Record<string, number> = {};
  for (const c of cycles) {
    typeDist[c.cycle_type] = (typeDist[c.cycle_type] || 0) + 1;
  }

  const avgDuration = completed.length > 0
    ? completed.reduce((s: number, c: any) => {
        const dur = c.cycle_end ? (new Date(c.cycle_end).getTime() - new Date(c.cycle_start).getTime()) / (1000 * 60 * 60) : 0;
        return s + dur;
      }, 0) / completed.length
    : 0;

  return {
    total_cycles: cycles.length,
    active_cycle: active || null,
    completed_count: completed.length,
    cycle_type_distribution: typeDist,
    average_duration_hours: Math.round(avgDuration * 10) / 10,
  };
}
