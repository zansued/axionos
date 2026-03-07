import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Learning Recommendation Engine — Sprint 12 Learning Agents v1
 *
 * Consumes all Sprint 12 analytics tables and generates structured,
 * human-readable improvement recommendations.
 */
type RecommendationType = "PROMPT_OPTIMIZATION" | "STRATEGY_RANKING_ADJUSTMENT" | "NEW_PREVENTION_RULE" | "PIPELINE_CONFIGURATION_HINT";

interface Recommendation {
  recommendation_type: RecommendationType;
  target_component: string;
  description: string;
  confidence_score: number;
  supporting_evidence: any[];
  metrics_summary: Record<string, any>;
  expected_improvement: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "No authorization" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { organization_id } = await req.json();
    if (!organization_id) return new Response(JSON.stringify({ error: "organization_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const recommendations: Recommendation[] = [];

    // 1. Prompt optimization recommendations
    const { data: promptMetrics } = await sc
      .from("prompt_strategy_metrics")
      .select("*")
      .eq("organization_id", organization_id)
      .order("success_rate", { ascending: true })
      .limit(50);

    for (const pm of promptMetrics || []) {
      if (Number(pm.success_rate) < 60 && pm.runs_count >= 5) {
        recommendations.push({
          recommendation_type: "PROMPT_OPTIMIZATION",
          target_component: pm.stage_name,
          description: `Stage "${pm.stage_name}" (signature: ${pm.prompt_signature}) has ${pm.success_rate}% success rate across ${pm.runs_count} runs. Consider prompt refinement or model change.`,
          confidence_score: Math.min(0.9, pm.runs_count / 20),
          supporting_evidence: [{ type: "prompt_strategy_metrics", id: pm.id, success_rate: pm.success_rate, runs: pm.runs_count }],
          metrics_summary: { success_rate: pm.success_rate, avg_cost: pm.average_cost, retry_rate: pm.retry_rate },
          expected_improvement: `Improving prompt could raise success rate from ${pm.success_rate}% to ~${Math.min(95, Number(pm.success_rate) + 20)}%`,
        });
      }
    }

    // 2. Strategy ranking adjustments
    const { data: strategyMetrics } = await sc
      .from("strategy_effectiveness_metrics")
      .select("*")
      .eq("organization_id", organization_id)
      .limit(50);

    for (const sm of strategyMetrics || []) {
      if (Number(sm.success_rate) < 40 && sm.runs_count >= 3) {
        recommendations.push({
          recommendation_type: "STRATEGY_RANKING_ADJUSTMENT",
          target_component: sm.strategy_name,
          description: `Repair strategy "${sm.strategy_name}" for "${sm.error_type}" errors has only ${sm.success_rate}% success. Demote in routing ranking.`,
          confidence_score: Math.min(0.85, sm.runs_count / 15),
          supporting_evidence: [{ type: "strategy_effectiveness_metrics", id: sm.id, success_rate: sm.success_rate }],
          metrics_summary: { success_rate: sm.success_rate, avg_time: sm.avg_resolution_time, recurrence: sm.error_recurrence_rate },
          expected_improvement: `Routing away from this strategy could reduce MTTR by ~${Math.round(Number(sm.avg_resolution_time) * 0.3)}ms`,
        });
      }
    }

    // 3. New prevention rules from predictions
    const { data: predictions } = await sc
      .from("predictive_error_patterns")
      .select("*")
      .eq("organization_id", organization_id)
      .gte("probability_score", 0.6)
      .order("probability_score", { ascending: false })
      .limit(20);

    for (const pred of predictions || []) {
      if (pred.recommended_prevention_rule) {
        recommendations.push({
          recommendation_type: "NEW_PREVENTION_RULE",
          target_component: pred.stage_name,
          description: `Predicted failure pattern "${pred.error_signature.slice(0, 60)}" (${Math.round(Number(pred.probability_score) * 100)}% probability, ${pred.observations_count} observations). ${pred.recommended_prevention_rule}`,
          confidence_score: Number(pred.probability_score),
          supporting_evidence: [{ type: "predictive_error_patterns", id: pred.id, probability: pred.probability_score, observations: pred.observations_count }],
          metrics_summary: { probability: pred.probability_score, observations: pred.observations_count },
          expected_improvement: `Proactive guard could prevent ~${Math.round(Number(pred.probability_score) * pred.observations_count)} failures`,
        });
      }
    }

    // 4. Pipeline configuration hints from learning records
    const { data: learningRecords } = await sc
      .from("learning_records")
      .select("stage_name, success_signal, failure_signal, recommended_adjustment, confidence_score")
      .eq("organization_id", organization_id)
      .not("recommended_adjustment", "is", null)
      .gte("confidence_score", 0.6)
      .order("confidence_score", { ascending: false })
      .limit(10);

    for (const lr of learningRecords || []) {
      recommendations.push({
        recommendation_type: "PIPELINE_CONFIGURATION_HINT",
        target_component: lr.stage_name,
        description: lr.recommended_adjustment!,
        confidence_score: Number(lr.confidence_score),
        supporting_evidence: [{ type: "learning_records", stage: lr.stage_name }],
        metrics_summary: { success_signal: lr.success_signal, failure_signal: lr.failure_signal },
        expected_improvement: `Addressing this could improve stage success by ~${Math.round(Number(lr.failure_signal) * 0.4)}%`,
      });
    }

    // Deduplicate by description similarity
    const seen = new Set<string>();
    const uniqueRecs = recommendations.filter((r) => {
      const key = `${r.recommendation_type}::${r.target_component}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by confidence
    uniqueRecs.sort((a, b) => b.confidence_score - a.confidence_score);

    // Persist (clear old, insert new)
    await sc.from("learning_recommendations").delete().eq("organization_id", organization_id);

    let created = 0;
    for (const rec of uniqueRecs.slice(0, 50)) {
      const { error } = await sc.from("learning_recommendations").insert({
        organization_id,
        recommendation_type: rec.recommendation_type,
        target_component: rec.target_component,
        description: rec.description,
        confidence_score: rec.confidence_score,
        supporting_evidence: rec.supporting_evidence,
        metrics_summary: rec.metrics_summary,
        expected_improvement: rec.expected_improvement,
        status: "pending",
      });
      if (!error) created++;
    }

    // Audit
    await sc.from("audit_logs").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      action: "LEARNING_UPDATE",
      category: "learning",
      entity_type: "learning_recommendations",
      message: `Learning recommendations: ${created} generated`,
      severity: "info",
      organization_id,
      metadata: { component: "recommendations", count: created, types: Object.fromEntries([...new Set(uniqueRecs.map((r) => r.recommendation_type))].map((t) => [t, uniqueRecs.filter((r) => r.recommendation_type === t).length])) },
    });

    return new Response(JSON.stringify({
      recommendations_created: created,
      by_type: {
        PROMPT_OPTIMIZATION: uniqueRecs.filter((r) => r.recommendation_type === "PROMPT_OPTIMIZATION").length,
        STRATEGY_RANKING_ADJUSTMENT: uniqueRecs.filter((r) => r.recommendation_type === "STRATEGY_RANKING_ADJUSTMENT").length,
        NEW_PREVENTION_RULE: uniqueRecs.filter((r) => r.recommendation_type === "NEW_PREVENTION_RULE").length,
        PIPELINE_CONFIGURATION_HINT: uniqueRecs.filter((r) => r.recommendation_type === "PIPELINE_CONFIGURATION_HINT").length,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Learning recommendation engine error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
