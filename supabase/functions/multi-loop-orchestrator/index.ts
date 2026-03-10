import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LoopRecord {
  loop_id: string;
  organization_id: string;
  domain_id: string;
  loop_type: string;
  loop_status: string;
  loop_priority: number;
  loop_health: string;
  loop_metrics: Record<string, unknown>;
  last_activity: string;
}

const LOOP_TYPES = ["execution", "repair", "learning", "canon_evolution", "coordination"] as const;

const HEALTH_THRESHOLDS = {
  stale_minutes: 60,
  critical_stale_minutes: 180,
};

const PRIORITY_WEIGHTS: Record<string, number> = {
  execution: 0.3,
  repair: 0.25,
  learning: 0.2,
  canon_evolution: 0.15,
  coordination: 0.1,
};

function evaluateHealth(loop: LoopRecord): string {
  const now = Date.now();
  const lastMs = new Date(loop.last_activity).getTime();
  const minutesSince = (now - lastMs) / 60000;

  if (minutesSince > HEALTH_THRESHOLDS.critical_stale_minutes) return "critical";
  if (minutesSince > HEALTH_THRESHOLDS.stale_minutes) return "degraded";
  if (loop.loop_status === "paused") return "paused";
  return "healthy";
}

function detectImbalance(loops: LoopRecord[]): { imbalanced: boolean; dominant: string | null; starved: string[] } {
  if (loops.length === 0) return { imbalanced: false, dominant: null, starved: [] };

  const totalPriority = loops.reduce((s, l) => s + Number(l.loop_priority), 0);
  const avg = totalPriority / loops.length;

  let dominant: string | null = null;
  const starved: string[] = [];

  for (const loop of loops) {
    const p = Number(loop.loop_priority);
    if (p > avg * 1.8) dominant = loop.loop_type;
    if (p < avg * 0.3) starved.push(loop.loop_type);
  }

  return { imbalanced: !!dominant || starved.length > 0, dominant, starved };
}

function rebalancePriorities(loops: LoopRecord[]): { loop_type: string; old_priority: number; new_priority: number; reason: string }[] {
  const adjustments: { loop_type: string; old_priority: number; new_priority: number; reason: string }[] = [];
  const { imbalanced, dominant, starved } = detectImbalance(loops);

  if (!imbalanced) return adjustments;

  for (const loop of loops) {
    const baseWeight = PRIORITY_WEIGHTS[loop.loop_type] ?? 0.15;
    const health = evaluateHealth(loop);
    let newPriority = Number(loop.loop_priority);
    let reason = "";

    // Boost starved loops
    if (starved.includes(loop.loop_type)) {
      newPriority = Math.min(1, newPriority + 0.15);
      reason = "starved_boost";
    }

    // Dampen dominant loops
    if (loop.loop_type === dominant) {
      newPriority = Math.max(0.1, newPriority - 0.1);
      reason = "dominant_dampen";
    }

    // Health-based adjustments
    if (health === "critical") {
      newPriority = Math.min(1, newPriority + 0.2);
      reason = reason ? `${reason}+critical_boost` : "critical_boost";
    }

    // Clamp to base weight neighborhood
    newPriority = Math.max(baseWeight * 0.5, Math.min(baseWeight * 2, newPriority));
    newPriority = Math.round(newPriority * 100) / 100;

    if (newPriority !== Number(loop.loop_priority)) {
      adjustments.push({
        loop_type: loop.loop_type,
        old_priority: Number(loop.loop_priority),
        new_priority: newPriority,
        reason,
      });
    }
  }

  return adjustments;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { action, organization_id } = await req.json();

    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── list_loops ──
    if (action === "list_loops") {
      const { data, error } = await supabase
        .from("operational_loops")
        .select("*")
        .eq("organization_id", organization_id)
        .order("loop_priority", { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify({ loops: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── evaluate_loop_health ──
    if (action === "evaluate_loop_health") {
      const { data: loops, error } = await supabase
        .from("operational_loops")
        .select("*")
        .eq("organization_id", organization_id);

      if (error) throw error;

      // Ensure all loop types exist
      const existingTypes = new Set((loops || []).map((l: LoopRecord) => l.loop_type));
      const missing = LOOP_TYPES.filter((t) => !existingTypes.has(t));

      if (missing.length > 0) {
        const inserts = missing.map((t) => ({
          organization_id,
          loop_type: t,
          loop_status: "active",
          loop_priority: PRIORITY_WEIGHTS[t] ?? 0.15,
          loop_health: "healthy",
          loop_metrics: {},
        }));
        await supabase.from("operational_loops").insert(inserts);
      }

      const { data: allLoops } = await supabase
        .from("operational_loops")
        .select("*")
        .eq("organization_id", organization_id);

      const healthReport = (allLoops || []).map((loop: LoopRecord) => {
        const health = evaluateHealth(loop);
        return {
          loop_type: loop.loop_type,
          current_health: loop.loop_health,
          evaluated_health: health,
          priority: loop.loop_priority,
          last_activity: loop.last_activity,
          needs_update: health !== loop.loop_health,
        };
      });

      // Update health where changed
      for (const report of healthReport) {
        if (report.needs_update) {
          await supabase
            .from("operational_loops")
            .update({ loop_health: report.evaluated_health, updated_at: new Date().toISOString() })
            .eq("organization_id", organization_id)
            .eq("loop_type", report.loop_type);
        }
      }

      const imbalance = detectImbalance(allLoops || []);

      return new Response(
        JSON.stringify({ health_report: healthReport, imbalance }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── rebalance_loop_priorities ──
    if (action === "rebalance_loop_priorities") {
      const { data: loops, error } = await supabase
        .from("operational_loops")
        .select("*")
        .eq("organization_id", organization_id);

      if (error) throw error;

      const adjustments = rebalancePriorities(loops || []);

      for (const adj of adjustments) {
        await supabase
          .from("operational_loops")
          .update({
            loop_priority: adj.new_priority,
            loop_metrics: { last_rebalance: new Date().toISOString(), reason: adj.reason },
            updated_at: new Date().toISOString(),
          })
          .eq("organization_id", organization_id)
          .eq("loop_type", adj.loop_type);
      }

      return new Response(
        JSON.stringify({ adjustments, applied: adjustments.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── loop_metrics ──
    if (action === "loop_metrics") {
      const { data: loops } = await supabase
        .from("operational_loops")
        .select("*")
        .eq("organization_id", organization_id);

      const byHealth: Record<string, number> = {};
      const byType: Record<string, number> = {};

      for (const loop of loops || []) {
        byHealth[loop.loop_health] = (byHealth[loop.loop_health] || 0) + 1;
        byType[loop.loop_type] = Number(loop.loop_priority);
      }

      const totalPriority = (loops || []).reduce((s: number, l: LoopRecord) => s + Number(l.loop_priority), 0);
      const avgPriority = loops?.length ? totalPriority / loops.length : 0;

      return new Response(
        JSON.stringify({
          total_loops: loops?.length || 0,
          health_distribution: byHealth,
          priority_by_type: byType,
          average_priority: Math.round(avgPriority * 100) / 100,
          imbalance: detectImbalance(loops || []),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use: list_loops, evaluate_loop_health, rebalance_loop_priorities, loop_metrics" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
