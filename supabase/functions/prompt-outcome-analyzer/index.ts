import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Prompt Outcome Analyzer — Sprint 12 Learning Agents v1
 *
 * Analyzes prompt outcomes across pipeline stages and persists
 * aggregated metrics into prompt_strategy_metrics.
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

    // Fetch initiative IDs for this org
    const { data: initiatives } = await sc.from("initiatives").select("id").eq("organization_id", organization_id);
    const initIds = (initiatives || []).map((i: any) => i.id);
    if (initIds.length === 0) {
      return new Response(JSON.stringify({ metrics_created: 0, message: "No initiatives found" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch jobs grouped by stage + model (prompt_signature proxy)
    const { data: jobs } = await sc
      .from("initiative_jobs")
      .select("stage, model, status, cost_usd, duration_ms, prompt_hash")
      .in("initiative_id", initIds.slice(0, 500))
      .gte("created_at", since)
      .limit(1000);

    // Aggregate by stage::model signature
    const agg = new Map<string, { runs: number; successes: number; totalCost: number; totalMs: number; retries: number; totalTokens: number }>();

    for (const j of jobs || []) {
      const sig = `${j.stage}::${j.model || "default"}`;
      const entry = agg.get(sig) || { runs: 0, successes: 0, totalCost: 0, totalMs: 0, retries: 0, totalTokens: 0 };
      entry.runs++;
      if (j.status === "success") entry.successes++;
      entry.totalCost += Number(j.cost_usd || 0);
      entry.totalMs += j.duration_ms || 0;
      agg.set(sig, entry);
    }

    // Count retries per stage (multiple jobs same stage for same initiative)
    const stageInitCount = new Map<string, Set<string>>();
    for (const j of jobs || []) {
      const key = j.stage;
      if (!stageInitCount.has(key)) stageInitCount.set(key, new Set());
    }

    // Upsert metrics
    let created = 0;
    for (const [sig, stats] of agg) {
      const [stageName] = sig.split("::");
      const successRate = stats.runs > 0 ? Math.round((stats.successes / stats.runs) * 10000) / 100 : 0;
      const avgCost = stats.runs > 0 ? Math.round((stats.totalCost / stats.runs) * 10000) / 10000 : 0;
      const avgQuality = successRate; // quality proxied by success rate
      const retryRate = stats.runs > 0 ? Math.round(((stats.runs - stats.successes) / stats.runs) * 10000) / 100 : 0;
      const tokenEff = stats.totalCost > 0 ? Math.round((stats.successes / stats.totalCost) * 100) / 100 : 0;

      // Delete existing for this org+signature, then insert fresh
      await sc.from("prompt_strategy_metrics")
        .delete()
        .eq("organization_id", organization_id)
        .eq("prompt_signature", sig);

      const { error } = await sc.from("prompt_strategy_metrics").insert({
        organization_id,
        stage_name: stageName,
        prompt_signature: sig,
        runs_count: stats.runs,
        success_rate: successRate,
        average_quality_score: avgQuality,
        average_cost: avgCost,
        retry_rate: retryRate,
        token_efficiency: tokenEff,
        last_updated: new Date().toISOString(),
      });
      if (!error) created++;
    }

    // Audit log
    await sc.from("audit_logs").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      action: "LEARNING_UPDATE",
      category: "learning",
      entity_type: "prompt_strategy_metrics",
      message: `Prompt outcome analysis: ${created} metrics updated`,
      severity: "info",
      organization_id,
      metadata: { component: "prompt", metrics_count: created, time_window_days },
    });

    return new Response(JSON.stringify({ metrics_created: created, signatures_analyzed: agg.size }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Prompt outcome analyzer error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
