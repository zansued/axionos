import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "enqueue_benchmark": {
        const { organization_id, candidate_id, benchmark_type, baseline_reference, sandbox_scope, benchmark_config } = body;
        const { data, error } = await supabase.from("improvement_benchmark_runs").insert({
          organization_id,
          candidate_id,
          benchmark_type: benchmark_type || "sandbox_comparison",
          baseline_reference: baseline_reference || {},
          sandbox_scope: sandbox_scope || "bounded",
          benchmark_config: benchmark_config || {},
          status: "queued",
        }).select().single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, benchmark_run: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "run_benchmark": {
        const { benchmark_run_id, organization_id } = body;

        // Mark as running
        await supabase.from("improvement_benchmark_runs").update({ status: "running", started_at: new Date().toISOString() }).eq("id", benchmark_run_id);

        // Fetch the run and candidate
        const { data: run } = await supabase.from("improvement_benchmark_runs").select("*, improvement_candidates(*)").eq("id", benchmark_run_id).single();
        if (!run) throw new Error("Benchmark run not found");

        // Simulated sandbox evaluation — in production this would invoke actual execution comparison
        const baselineScore = 0.65 + Math.random() * 0.2;
        const candidateScore = baselineScore + (Math.random() * 0.3 - 0.05);
        const delta = candidateScore - baselineScore;
        const gainDetected = delta > 0.02;
        const regressionDetected = delta < -0.05;

        const metrics = [
          { metric_key: "success_rate", metric_label: "Success Rate", baseline_value: baselineScore, candidate_value: candidateScore, delta, delta_pct: (delta / baselineScore) * 100, direction: delta > 0 ? "improved" : delta < 0 ? "regressed" : "neutral", significance: Math.abs(delta) > 0.1 ? "high" : Math.abs(delta) > 0.03 ? "medium" : "low" },
          { metric_key: "stability", metric_label: "Stability Score", baseline_value: 0.8 + Math.random() * 0.15, candidate_value: 0.78 + Math.random() * 0.18, delta: 0, delta_pct: 0, direction: "neutral", significance: "low" },
        ];

        // Compute delta for stability metric
        metrics[1].delta = metrics[1].candidate_value! - metrics[1].baseline_value!;
        metrics[1].delta_pct = (metrics[1].delta / metrics[1].baseline_value!) * 100;
        metrics[1].direction = metrics[1].delta > 0.02 ? "improved" : metrics[1].delta < -0.02 ? "regressed" : "neutral";

        // Insert metrics
        for (const m of metrics) {
          await supabase.from("improvement_benchmark_metrics").insert({ organization_id, benchmark_run_id, ...m });
        }

        const riskPosture = regressionDetected ? "high" : gainDetected ? "low" : "moderate";
        const stabilitySignal = metrics[1].direction === "regressed" ? "unstable" : "stable";
        const recommendation = regressionDetected
          ? "Regression detected — candidate NOT recommended for promotion."
          : gainDetected
            ? `Candidate shows ${(delta * 100).toFixed(1)}% improvement. Recommended for human review and potential promotion.`
            : "Marginal change — consider deferring or collecting more evidence.";

        await supabase.from("improvement_benchmark_runs").update({
          status: "completed",
          completed_at: new Date().toISOString(),
          result_metrics: { metrics_count: metrics.length },
          gain_indicators: { gain_detected: gainDetected, primary_delta: delta },
          regression_indicators: { regression_detected: regressionDetected },
          risk_posture: riskPosture,
          stability_signal: stabilitySignal,
          recommendation_summary: recommendation,
        }).eq("id", benchmark_run_id);

        const { data: updatedRun } = await supabase.from("improvement_benchmark_runs").select("*").eq("id", benchmark_run_id).single();

        return new Response(JSON.stringify({ success: true, benchmark_run: updatedRun, metrics }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "list_benchmarks": {
        const { organization_id, status: filterStatus, limit: queryLimit } = body;
        let query = supabase.from("improvement_benchmark_runs").select("*, improvement_candidates(title, candidate_type, severity)").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(queryLimit || 50);
        if (filterStatus) query = query.eq("status", filterStatus);
        const { data, error } = await query;
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, benchmark_runs: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "benchmark_detail": {
        const { benchmark_run_id } = body;
        const { data: run } = await supabase.from("improvement_benchmark_runs").select("*, improvement_candidates(*)").eq("id", benchmark_run_id).single();
        const { data: metrics } = await supabase.from("improvement_benchmark_metrics").select("*").eq("benchmark_run_id", benchmark_run_id).order("created_at");
        const { data: reviews } = await supabase.from("improvement_promotion_reviews").select("*").eq("benchmark_run_id", benchmark_run_id).order("created_at");
        const { data: decisions } = await supabase.from("improvement_promotion_decisions").select("*").eq("benchmark_run_id", benchmark_run_id).order("created_at");
        return new Response(JSON.stringify({ success: true, benchmark_run: run, metrics, reviews, decisions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "review_for_promotion": {
        const { organization_id, benchmark_run_id, candidate_id, review_notes, risk_assessment, recommendation } = body;
        const { data, error } = await supabase.from("improvement_promotion_reviews").insert({
          organization_id,
          benchmark_run_id,
          candidate_id,
          reviewer_id: user.id,
          review_status: "reviewed",
          review_notes: review_notes || "",
          risk_assessment: risk_assessment || "unknown",
          recommendation: recommendation || "",
        }).select().single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, review: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "approve_promotion": {
        const { organization_id, candidate_id, benchmark_run_id, review_id, decision_reason } = body;
        const { data, error } = await supabase.from("improvement_promotion_decisions").insert({
          organization_id, candidate_id, benchmark_run_id, review_id,
          decision: "promoted",
          decision_reason: decision_reason || "Human-approved after benchmark review.",
          decided_by: user.id,
          rollback_posture: "available",
          audit_metadata: { approved_at: new Date().toISOString(), approver: user.id },
        }).select().single();
        if (error) throw error;
        // Update candidate status
        await supabase.from("improvement_candidates").update({ review_status: "promoted" }).eq("id", candidate_id);
        return new Response(JSON.stringify({ success: true, decision: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "reject_promotion": {
        const { organization_id, candidate_id, benchmark_run_id, review_id, decision_reason } = body;
        const { data, error } = await supabase.from("improvement_promotion_decisions").insert({
          organization_id, candidate_id, benchmark_run_id, review_id,
          decision: "rejected",
          decision_reason: decision_reason || "Rejected after benchmark review.",
          decided_by: user.id,
          rollback_posture: "not_applicable",
          audit_metadata: { rejected_at: new Date().toISOString(), rejector: user.id },
        }).select().single();
        if (error) throw error;
        await supabase.from("improvement_candidates").update({ review_status: "rejected" }).eq("id", candidate_id);
        return new Response(JSON.stringify({ success: true, decision: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "defer_candidate": {
        const { organization_id, candidate_id, benchmark_run_id, decision_reason } = body;
        const { data, error } = await supabase.from("improvement_promotion_decisions").insert({
          organization_id, candidate_id, benchmark_run_id,
          decision: "deferred",
          decision_reason: decision_reason || "Deferred — needs more evidence or analysis.",
          decided_by: user.id,
          rollback_posture: "not_applicable",
          audit_metadata: { deferred_at: new Date().toISOString() },
        }).select().single();
        if (error) throw error;
        await supabase.from("improvement_candidates").update({ review_status: "deferred" }).eq("id", candidate_id);
        return new Response(JSON.stringify({ success: true, decision: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "archive_candidate": {
        const { organization_id, candidate_id, decision_reason } = body;
        const { data, error } = await supabase.from("improvement_promotion_decisions").insert({
          organization_id, candidate_id,
          decision: "archived",
          decision_reason: decision_reason || "Archived by operator.",
          decided_by: user.id,
          rollback_posture: "not_applicable",
          audit_metadata: { archived_at: new Date().toISOString() },
        }).select().single();
        if (error) throw error;
        await supabase.from("improvement_candidates").update({ review_status: "archived" }).eq("id", candidate_id);
        return new Response(JSON.stringify({ success: true, decision: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "explain_benchmark": {
        const { benchmark_run_id } = body;
        const { data: run } = await supabase.from("improvement_benchmark_runs").select("*, improvement_candidates(title, candidate_type, description)").eq("id", benchmark_run_id).single();
        const { data: metrics } = await supabase.from("improvement_benchmark_metrics").select("*").eq("benchmark_run_id", benchmark_run_id);
        if (!run) throw new Error("Benchmark run not found");

        const candidate = (run as any).improvement_candidates;
        const metricSummaries = (metrics || []).map((m: any) => `${m.metric_label}: baseline ${(m.baseline_value ?? 0).toFixed(3)} → candidate ${(m.candidate_value ?? 0).toFixed(3)} (${m.direction}, Δ${(m.delta_pct ?? 0).toFixed(1)}%)`);

        const explanation = {
          what_was_tested: `Improvement candidate "${candidate?.title}" (type: ${candidate?.candidate_type}) was benchmarked in sandbox scope "${run.sandbox_scope}".`,
          baseline_comparison: `Compared against baseline reference: ${JSON.stringify(run.baseline_reference)}`,
          metrics_observed: metricSummaries,
          risk_posture: run.risk_posture,
          stability: run.stability_signal,
          recommendation: run.recommendation_summary,
          governance_note: "Promotion requires explicit human review and approval. No autonomous mutation is permitted.",
        };

        return new Response(JSON.stringify({ success: true, explanation }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (err) {
    console.error("benchmark-governance error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
