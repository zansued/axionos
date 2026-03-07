import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Strategy Performance Engine — Sprint 12 Learning Agents v1
 *
 * Evaluates repair strategy effectiveness from repair_evidence,
 * repair_routing_log, error_patterns, and prevention_events.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "No authorization" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { organization_id, time_window_days = 30 } = await req.json();
    if (!organization_id) return new Response(JSON.stringify({ error: "organization_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const since = new Date(Date.now() - time_window_days * 86400000).toISOString();

    // Fetch repair evidence
    const { data: repairs } = await sc
      .from("repair_evidence")
      .select("repair_strategy, error_category, repair_result, duration_ms")
      .eq("organization_id", organization_id)
      .gte("created_at", since)
      .limit(1000);

    // Aggregate by strategy + error_type
    const agg = new Map<string, { runs: number; successes: number; totalMs: number; totalCost: number }>();

    for (const r of repairs || []) {
      const key = `${r.repair_strategy}::${r.error_category}`;
      const entry = agg.get(key) || { runs: 0, successes: 0, totalMs: 0, totalCost: 0 };
      entry.runs++;
      if (r.repair_result === "fixed") entry.successes++;
      entry.totalMs += r.duration_ms || 0;
      agg.set(key, entry);
    }

    // Check error recurrence from error_patterns
    const { data: patterns } = await sc
      .from("error_patterns")
      .select("error_category, frequency, success_rate")
      .eq("organization_id", organization_id)
      .limit(200);

    const recurrenceMap = new Map<string, number>();
    for (const p of patterns || []) {
      recurrenceMap.set(p.error_category, (recurrenceMap.get(p.error_category) || 0) + p.frequency);
    }

    // Upsert strategy effectiveness metrics
    let created = 0;
    for (const [key, stats] of agg) {
      const [strategyName, errorType] = key.split("::");
      const successRate = stats.runs > 0 ? Math.round((stats.successes / stats.runs) * 10000) / 100 : 0;
      const avgTime = stats.runs > 0 ? Math.round(stats.totalMs / stats.runs) : 0;
      const recurrence = recurrenceMap.get(errorType) || 0;
      const recurrenceRate = recurrence > 0 ? Math.round((recurrence / (recurrence + stats.successes)) * 10000) / 100 : 0;

      await sc.from("strategy_effectiveness_metrics")
        .delete()
        .eq("organization_id", organization_id)
        .eq("strategy_name", strategyName)
        .eq("error_type", errorType);

      const { error } = await sc.from("strategy_effectiveness_metrics").insert({
        organization_id,
        strategy_name: strategyName,
        error_type: errorType,
        runs_count: stats.runs,
        success_rate: successRate,
        avg_resolution_time: avgTime,
        avg_cost: stats.runs > 0 ? Math.round((stats.totalCost / stats.runs) * 10000) / 10000 : 0,
        error_recurrence_rate: recurrenceRate,
        last_updated: new Date().toISOString(),
      });
      if (!error) created++;
    }

    // Audit
    await sc.from("audit_logs").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      action: "LEARNING_UPDATE",
      category: "learning",
      entity_type: "strategy_effectiveness_metrics",
      message: `Strategy performance analysis: ${created} metrics updated`,
      severity: "info",
      organization_id,
      metadata: { component: "repair", metrics_count: created },
    });

    return new Response(JSON.stringify({ metrics_created: created, strategies_analyzed: agg.size }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Strategy performance engine error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
