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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { action, organization_id, ...params } = body;

    if (!organization_id)
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // ── Record a new harness run ──
    if (action === "record_run") {
      const { data, error } = await sb
        .from("execution_validation_runs")
        .insert({
          organization_id,
          tenant_id: params.tenant_id || null,
          stack_id: params.stack_id || "default",
          execution_path: params.execution_path || "idea→discovery→architecture→engineering→validation→publish",
          validation_success: params.validation_success ?? false,
          rollback_triggered: params.rollback_triggered ?? false,
          guardrail_breach_attempts: params.guardrail_breach_attempts ?? 0,
          repair_actions: params.repair_actions ?? 0,
          repair_success: params.repair_success ?? null,
          repair_latency_ms: params.repair_latency_ms ?? null,
          execution_duration_ms: params.execution_duration_ms ?? 0,
          execution_cost_usd: params.execution_cost_usd ?? 0,
          publish_success: params.publish_success ?? false,
          telemetry: params.telemetry || {},
        })
        .select("id")
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ run_id: data.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Compute aggregated metrics ──
    if (action === "compute_runtime_validation_metrics") {
      const { data: runs, error } = await sb
        .from("execution_validation_runs")
        .select("*")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      const total = runs?.length || 0;
      if (total === 0) {
        return new Response(
          JSON.stringify({
            total_runs: 0,
            system_validation_success_rate: 0,
            rollback_rate: 0,
            repair_success_rate: 0,
            guardrail_breach_rate: 0,
            publish_reliability: 0,
            avg_execution_duration_ms: 0,
            avg_execution_cost_usd: 0,
            runs: [],
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const validationSuccesses = runs!.filter((r: any) => r.validation_success).length;
      const rollbacks = runs!.filter((r: any) => r.rollback_triggered).length;
      const totalBreaches = runs!.reduce((s: number, r: any) => s + (r.guardrail_breach_attempts || 0), 0);
      const repairRuns = runs!.filter((r: any) => r.repair_actions > 0);
      const repairSuccesses = repairRuns.filter((r: any) => r.repair_success).length;
      const publishes = runs!.filter((r: any) => r.publish_success).length;
      const avgDuration = runs!.reduce((s: number, r: any) => s + (r.execution_duration_ms || 0), 0) / total;
      const avgCost = runs!.reduce((s: number, r: any) => s + parseFloat(r.execution_cost_usd || "0"), 0) / total;

      return new Response(
        JSON.stringify({
          total_runs: total,
          system_validation_success_rate: validationSuccesses / total,
          rollback_rate: rollbacks / total,
          repair_success_rate: repairRuns.length > 0 ? repairSuccesses / repairRuns.length : 0,
          guardrail_breach_rate: totalBreaches / total,
          publish_reliability: publishes / total,
          avg_execution_duration_ms: Math.round(avgDuration),
          avg_execution_cost_usd: parseFloat(avgCost.toFixed(4)),
          runs: runs!.slice(0, 50),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── List recent runs ──
    if (action === "list_runs") {
      const limit = params.limit || 50;
      const { data, error } = await sb
        .from("execution_validation_runs")
        .select("*")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return new Response(JSON.stringify({ runs: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
