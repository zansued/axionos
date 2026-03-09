import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Learning Dashboard API — Sprint 12 Learning Agents v1
 *
 * Endpoints: overview, recommendations, strategies, errors
 * Determined by `view` parameter.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "No authorization" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { organization_id, view = "overview" } = await req.json();
    if (!organization_id) return new Response(JSON.stringify({ error: "organization_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: _member } = await sc.from("organization_members").select("role").eq("organization_id", organization_id).eq("user_id", user.id).single();
    if (!_member) return new Response(JSON.stringify({ error: "Not a member of this organization" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let result: any = {};

    if (view === "overview") {
      const [
        { count: learningCount },
        { count: recsCount },
        { data: weights },
        { data: predictions },
        { data: promptMetrics },
      ] = await Promise.all([
        sc.from("learning_records").select("*", { count: "exact", head: true }).eq("organization_id", organization_id),
        sc.from("learning_recommendations").select("*", { count: "exact", head: true }).eq("organization_id", organization_id),
        sc.from("repair_strategy_weights").select("strategy_name, current_weight, previous_weight, adjustment_reason, adjusted_at").eq("organization_id", organization_id).order("adjusted_at", { ascending: false }).limit(10),
        sc.from("predictive_error_patterns").select("error_signature, probability_score, observations_count, stage_name").eq("organization_id", organization_id).gte("probability_score", 0.5).order("probability_score", { ascending: false }).limit(10),
        sc.from("prompt_strategy_metrics").select("stage_name, prompt_signature, success_rate, runs_count, average_cost").eq("organization_id", organization_id).order("runs_count", { ascending: false }).limit(10),
      ]);

      // Compute improvement rate from weights
      let improvementRate = 0;
      if (weights && weights.length > 0) {
        const improved = weights.filter((w: any) => Number(w.current_weight) > Number(w.previous_weight)).length;
        improvementRate = Math.round((improved / weights.length) * 100);
      }

      // Prompt success trend
      const avgPromptSuccess = promptMetrics && promptMetrics.length > 0
        ? Math.round(promptMetrics.reduce((sum: number, m: any) => sum + Number(m.success_rate), 0) / promptMetrics.length)
        : 0;

      result = {
        learning_records_count: learningCount || 0,
        recommendations_count: recsCount || 0,
        repair_improvement_rate: improvementRate,
        prompt_success_trend: avgPromptSuccess,
        error_prediction_accuracy: predictions && predictions.length > 0
          ? Math.round(predictions.reduce((s: number, p: any) => s + Number(p.probability_score), 0) / predictions.length * 100)
          : 0,
        recent_weight_adjustments: weights || [],
        top_predictions: predictions || [],
        top_prompt_metrics: promptMetrics || [],
      };
    } else if (view === "recommendations") {
      const { data } = await sc
        .from("learning_recommendations")
        .select("*")
        .eq("organization_id", organization_id)
        .order("confidence_score", { ascending: false })
        .limit(50);
      result = { recommendations: data || [] };
    } else if (view === "strategies") {
      const { data } = await sc
        .from("strategy_effectiveness_metrics")
        .select("*")
        .eq("organization_id", organization_id)
        .order("runs_count", { ascending: false })
        .limit(50);
      result = { strategies: data || [] };
    } else if (view === "errors") {
      const { data } = await sc
        .from("predictive_error_patterns")
        .select("*")
        .eq("organization_id", organization_id)
        .order("probability_score", { ascending: false })
        .limit(50);
      result = { predictions: data || [] };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Learning dashboard error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
