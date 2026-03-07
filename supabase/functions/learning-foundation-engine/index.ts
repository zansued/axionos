import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sc = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { organization_id, initiative_id, time_window } = body;

    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const since = time_window
      ? new Date(Date.now() - time_window * 86400000).toISOString()
      : new Date(Date.now() - 30 * 86400000).toISOString();

    const records: any[] = [];
    const adjustments: any[] = [];

    // ─── 1. Learn from repair evidence ───
    let repairQuery = sc
      .from("repair_evidence")
      .select("*")
      .eq("organization_id", organization_id)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);
    if (initiative_id) repairQuery = repairQuery.eq("initiative_id", initiative_id);

    const { data: repairs } = await repairQuery;
    for (const r of repairs || []) {
      const success = r.repair_result === "fixed" ? 90 : r.repair_result === "partial" ? 50 : 10;
      const failure = 100 - success;
      records.push({
        organization_id,
        initiative_id: r.initiative_id,
        stage_name: r.stage_name || "build_repair",
        learning_type: "repair_outcome",
        source_type: "repair_evidence",
        source_id: r.id,
        input_signature: r.error_signature,
        decision_taken: r.repair_strategy || "unknown",
        outcome_summary: `${r.repair_result}: ${r.patch_summary || "no summary"}`,
        success_signal: success,
        failure_signal: failure,
        cost_signal: null,
        time_signal: r.duration_ms || null,
        recommended_adjustment: failure > 60 ? `Consider alternative to "${r.repair_strategy}"` : null,
        confidence_score: success > 70 ? 0.8 : 0.4,
      });
      if (failure > 60) {
        adjustments.push({
          type: "repair_strategy",
          source: r.error_signature,
          current: r.repair_strategy,
          suggestion: `Strategy "${r.repair_strategy}" has high failure rate for this signature`,
          confidence: 0.6,
        });
      }
    }

    // ─── 2. Learn from prevention events ───
    let prevQuery = sc
      .from("prevention_events")
      .select("*, active_prevention_rules(description, rule_type, confidence_score)")
      .eq("organization_id", organization_id)
      .gte("created_at", since)
      .limit(200);
    if (initiative_id) prevQuery = prevQuery.eq("initiative_id", initiative_id);

    const { data: prevEvents } = await prevQuery;
    for (const pe of prevEvents || []) {
      records.push({
        organization_id,
        initiative_id: pe.initiative_id,
        stage_name: pe.pipeline_stage,
        learning_type: "prevention_outcome",
        source_type: "prevention_rule",
        source_id: pe.rule_id,
        input_signature: null,
        decision_taken: pe.action_taken,
        outcome_summary: pe.prevented ? "Failure prevented" : "Warning issued",
        success_signal: pe.prevented ? 90 : 50,
        failure_signal: pe.prevented ? 10 : 50,
        cost_signal: null,
        time_signal: null,
        recommended_adjustment: null,
        confidence_score: pe.active_prevention_rules?.confidence_score || 0.5,
      });
    }

    // ─── 3. Learn from routing decisions ───
    let routingQuery = sc
      .from("repair_routing_log")
      .select("*")
      .eq("organization_id", organization_id)
      .gte("created_at", since)
      .limit(200);
    if (initiative_id) routingQuery = routingQuery.eq("initiative_id", initiative_id);

    const { data: routingLogs } = await routingQuery;
    for (const rl of routingLogs || []) {
      records.push({
        organization_id,
        initiative_id: rl.initiative_id,
        stage_name: "repair_routing",
        learning_type: "routing_outcome",
        source_type: "routing_decision",
        source_id: rl.id,
        input_signature: rl.error_signature,
        decision_taken: rl.selected_strategy,
        outcome_summary: `Routed via ${rl.decision_source} with confidence ${rl.confidence_score}`,
        success_signal: (rl.confidence_score || 0) * 100,
        failure_signal: 100 - (rl.confidence_score || 0) * 100,
        cost_signal: null,
        time_signal: null,
        recommended_adjustment: null,
        confidence_score: rl.confidence_score || 0.5,
      });
    }

    // ─── 4. Learn from stage executions (jobs) ───
    let jobsQuery = sc
      .from("initiative_jobs")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(300);
    if (initiative_id) jobsQuery = jobsQuery.eq("initiative_id", initiative_id);

    const { data: jobs } = await jobsQuery;
    // Aggregate by stage
    const stageStats = new Map<string, { success: number; fail: number; totalMs: number; totalCost: number }>();
    for (const j of jobs || []) {
      const s = stageStats.get(j.stage) || { success: 0, fail: 0, totalMs: 0, totalCost: 0 };
      if (j.status === "success") s.success++;
      else if (j.status === "failed") s.fail++;
      s.totalMs += j.duration_ms || 0;
      s.totalCost += Number(j.cost_usd || 0);
      stageStats.set(j.stage, s);
    }

    for (const [stage, stats] of stageStats) {
      const total = stats.success + stats.fail;
      if (total < 2) continue;
      const successRate = Math.round((stats.success / total) * 100);
      records.push({
        organization_id,
        initiative_id: initiative_id || null,
        stage_name: stage,
        learning_type: "generation_outcome",
        source_type: "stage_execution",
        source_id: null,
        input_signature: `stage::${stage}`,
        decision_taken: `${total} executions`,
        outcome_summary: `${successRate}% success, avg ${Math.round(stats.totalMs / total)}ms`,
        success_signal: successRate,
        failure_signal: 100 - successRate,
        cost_signal: stats.totalCost,
        time_signal: Math.round(stats.totalMs / total),
        recommended_adjustment: successRate < 50 ? `Stage "${stage}" needs investigation` : null,
        confidence_score: total > 5 ? 0.8 : 0.4,
      });
      if (successRate < 50) {
        adjustments.push({
          type: "stage_reliability",
          source: stage,
          current: `${successRate}% success`,
          suggestion: `Stage "${stage}" fails >50% of the time`,
          confidence: total > 5 ? 0.8 : 0.4,
        });
      }
    }

    // ─── Persist learning records ───
    let created = 0;
    if (records.length > 0) {
      const rows = records.map((r) => ({
        organization_id: r.organization_id,
        initiative_id: r.initiative_id,
        stage_name: r.stage_name,
        learning_type: r.learning_type,
        source_type: r.source_type,
        source_id: r.source_id,
        input_signature: r.input_signature,
        decision_taken: r.decision_taken,
        outcome_summary: r.outcome_summary,
        success_signal: r.success_signal,
        failure_signal: r.failure_signal,
        cost_signal: r.cost_signal,
        time_signal: r.time_signal,
        recommended_adjustment: r.recommended_adjustment,
        confidence_score: r.confidence_score,
      }));

      // Batch insert in chunks
      const chunkSize = 50;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await sc.from("learning_records").insert(chunk);
        if (!error) created += chunk.length;
      }
    }

    // Build summary
    const typeCounts: Record<string, number> = {};
    records.forEach((r) => {
      typeCounts[r.learning_type] = (typeCounts[r.learning_type] || 0) + 1;
    });

    return new Response(JSON.stringify({
      learning_records_created: created,
      learning_summary: {
        total_signals: records.length,
        by_type: typeCounts,
        time_window_days: time_window || 30,
      },
      high_confidence_adjustments: adjustments.filter((a) => a.confidence >= 0.6),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Learning foundation engine error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
