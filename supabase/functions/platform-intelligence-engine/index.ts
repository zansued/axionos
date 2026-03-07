// Sprint 30 — Platform Intelligence Engine (Edge Function)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aggregatePlatformBehavior, type ExecutionRecord } from "../_shared/platform-intelligence/platform-behavior-aggregator.ts";
import { detectBottlenecks } from "../_shared/platform-intelligence/platform-bottleneck-detector.ts";
import { analyzePlatformPatterns } from "../_shared/platform-intelligence/platform-pattern-analyzer.ts";
import { generateInsights } from "../_shared/platform-intelligence/platform-insight-generator.ts";
import { generateRecommendations } from "../_shared/platform-intelligence/platform-recommendation-engine.ts";
import { computePlatformHealth } from "../_shared/platform-intelligence/platform-health-model.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { action, organization_id, insight_id, recommendation_id } = await req.json();

    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    switch (action) {
      case "overview": {
        const [insightsRes, recsRes] = await Promise.all([
          supabase.from("platform_insights").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50),
          supabase.from("platform_recommendations").select("*").eq("organization_id", organization_id).order("priority_score", { ascending: false }).limit(50),
        ]);

        return json({
          insights: insightsRes.data || [],
          recommendations: recsRes.data || [],
          insight_count: insightsRes.data?.length || 0,
          recommendation_count: recsRes.data?.length || 0,
        });
      }

      case "insights": {
        const { data } = await supabase.from("platform_insights").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
        return json({ insights: data || [] });
      }

      case "recommendations": {
        const { data } = await supabase.from("platform_recommendations").select("*").eq("organization_id", organization_id).order("priority_score", { ascending: false }).limit(100);
        return json({ recommendations: data || [] });
      }

      case "health_metrics": {
        const records = await fetchExecutionRecords(supabase, organization_id);
        const snapshot = aggregatePlatformBehavior(records);
        const bottleneckReport = detectBottlenecks(snapshot);
        const health = computePlatformHealth(snapshot, bottleneckReport);
        return json({ health, snapshot_summary: snapshot.global_metrics });
      }

      case "pattern_analysis": {
        const records = await fetchExecutionRecords(supabase, organization_id);
        const patterns = analyzePlatformPatterns(records);
        return json(patterns);
      }

      case "bottlenecks": {
        const records = await fetchExecutionRecords(supabase, organization_id);
        const snapshot = aggregatePlatformBehavior(records);
        const report = detectBottlenecks(snapshot);
        return json(report);
      }

      case "recompute": {
        const records = await fetchExecutionRecords(supabase, organization_id);
        const snapshot = aggregatePlatformBehavior(records);
        const bottleneckReport = detectBottlenecks(snapshot);
        const patternReport = analyzePlatformPatterns(records);
        const insights = generateInsights(snapshot, bottleneckReport, patternReport);
        const recommendations = generateRecommendations(insights);
        const health = computePlatformHealth(snapshot, bottleneckReport);

        // Persist insights
        if (insights.length > 0) {
          const insightRows = insights.slice(0, 50).map(i => ({
            organization_id,
            insight_type: i.insight_type,
            affected_scope: i.affected_scope,
            severity: i.severity,
            evidence_refs: i.evidence_refs,
            supporting_metrics: i.supporting_metrics,
            recommendation: i.recommendation,
            confidence_score: i.confidence_score,
            status: "new",
          }));
          await supabase.from("platform_insights").insert(insightRows);
        }

        // Persist recommendations
        if (recommendations.length > 0) {
          const recRows = recommendations.slice(0, 30).map(r => ({
            organization_id,
            recommendation_type: r.recommendation_type,
            target_scope: r.target_scope,
            target_entity: r.target_entity,
            recommendation_reason: r.recommendation_reason,
            confidence_score: r.confidence_score,
            priority_score: r.priority_score,
            status: "open",
          }));
          await supabase.from("platform_recommendations").insert(recRows);
        }

        return json({
          health,
          insights_generated: insights.length,
          recommendations_generated: recommendations.length,
          bottlenecks: bottleneckReport.bottlenecks.length,
          patterns: patternReport.pattern_count,
        });
      }

      case "mark_insight_reviewed": {
        if (!insight_id) return json({ error: "insight_id required" }, 400);
        await supabase.from("platform_insights").update({ status: "reviewed" }).eq("id", insight_id).eq("organization_id", organization_id);
        return json({ success: true });
      }

      case "accept_recommendation": {
        if (!recommendation_id) return json({ error: "recommendation_id required" }, 400);
        await supabase.from("platform_recommendations").update({ status: "accepted" }).eq("id", recommendation_id).eq("organization_id", organization_id);
        return json({ success: true });
      }

      case "reject_recommendation": {
        if (!recommendation_id) return json({ error: "recommendation_id required" }, 400);
        await supabase.from("platform_recommendations").update({ status: "rejected" }).eq("id", recommendation_id).eq("organization_id", organization_id);
        return json({ success: true });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

async function fetchExecutionRecords(supabase: any, organizationId: string): Promise<ExecutionRecord[]> {
  const { data: jobs } = await supabase
    .from("initiative_jobs")
    .select("stage, status, cost_usd, duration_ms, created_at")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(500);

  if (!jobs || jobs.length === 0) return [];

  return jobs.map((j: any) => ({
    stage: j.stage || "unknown",
    status: j.status === "completed" ? "success" : "failed",
    cost_usd: Number(j.cost_usd || 0),
    duration_ms: j.duration_ms || 0,
    context_class: "general",
    policy_mode: "balanced_default",
    organization_id: organizationId,
    had_retry: false,
    had_repair: false,
    had_validation_failure: false,
    had_human_review: false,
    deploy_attempted: j.stage?.includes("deploy") || false,
    deploy_succeeded: j.stage?.includes("deploy") && j.status === "completed",
  }));
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
