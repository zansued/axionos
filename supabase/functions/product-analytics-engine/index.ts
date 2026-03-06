import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";

serve(async (req) => {
  const result = await bootstrapPipeline(req, "product-analytics-engine");
  if (result instanceof Response) return result;
  const { initiative, ctx, body, apiKey } = result;

  const jobId = await createJob(ctx, "product_analytics", { title: initiative.title });
  await updateInitiative(ctx, { stage_status: "product_metrics_analyzing" as any });
  await pipelineLog(ctx, "product_analytics_start", "Starting Product Analytics Engine...");

  try {
    const dp = initiative.discovery_payload || {};
    const ep = initiative.execution_progress || {};
    const revenueStrategy = dp.revenue_strategy || {};
    const observabilityReport = ep.observability_report || {};

    const { data: brainNodes } = await ctx.serviceClient
      .from("project_brain_nodes")
      .select("name, node_type, metadata")
      .eq("initiative_id", initiative.id)
      .limit(50);

    const { data: stories } = await ctx.serviceClient
      .from("stories")
      .select("title, status, priority")
      .eq("initiative_id", initiative.id)
      .limit(30);

    const prompt = `You are a Product Analytics Engine. Design a comprehensive analytics strategy for a product built by AI agents.

INITIATIVE: "${initiative.title}"
DESCRIPTION: "${initiative.description || initiative.idea_raw || ""}"
TARGET USER: "${initiative.target_user || ""}"
PRICING MODEL: "${revenueStrategy.pricing_model || "unknown"}"
TIERS: ${JSON.stringify(revenueStrategy.tiers || []).slice(0, 800)}
PRODUCT HEALTH: ${observabilityReport.health_score || "N/A"}/100
FEATURES BUILT: ${stories?.length || 0} stories
BRAIN NODES: ${brainNodes?.length || 0} components

Generate a product analytics plan as JSON:
{
  "users_tracked": number (estimated trackable user touchpoints),
  "events_analyzed": number (total event types defined),
  "acquisition_metrics": {
    "channels": [{ "name": "string", "tracking_method": "string", "kpi": "string" }],
    "funnel_stages": [{ "stage": "string", "expected_conversion": "string" }]
  },
  "retention_metrics": {
    "cohort_analysis_plan": "string",
    "churn_indicators": ["string array"],
    "engagement_signals": ["string array"],
    "target_retention_d7": "string (percentage)",
    "target_retention_d30": "string (percentage)"
  },
  "conversion_metrics": {
    "free_to_paid_funnel": [{ "step": "string", "target_rate": "string" }],
    "revenue_events": ["string array of monetization touchpoints"],
    "ltv_model": "string describing LTV calculation approach"
  },
  "feature_analytics": [
    { "feature": "string", "metric": "string", "success_criteria": "string" }
  ],
  "dashboards": [
    { "name": "string", "widgets": ["string array"], "audience": "string" }
  ],
  "instrumentation_plan": {
    "sdk": "string (recommended analytics SDK)",
    "events_to_track": [{ "event": "string", "properties": ["string array"], "trigger": "string" }],
    "custom_dimensions": ["string array"]
  },
  "ab_testing_opportunities": [
    { "hypothesis": "string", "metric": "string", "variant": "string" }
  ]
}

Return ONLY valid JSON.`;

    const aiResponse = await callAI(apiKey, prompt, "product-analytics-engine");
    let analytics: any;
    try {
      const cleaned = aiResponse.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
      analytics = JSON.parse(cleaned);
    } catch {
      analytics = {
        users_tracked: 0, events_analyzed: 0,
        acquisition_metrics: { channels: [], funnel_stages: [] },
        retention_metrics: { cohort_analysis_plan: aiResponse.slice(0, 300), churn_indicators: [], engagement_signals: [], target_retention_d7: "N/A", target_retention_d30: "N/A" },
        conversion_metrics: { free_to_paid_funnel: [], revenue_events: [], ltv_model: "N/A" },
        feature_analytics: [], dashboards: [],
        instrumentation_plan: { sdk: "unknown", events_to_track: [], custom_dimensions: [] },
        ab_testing_opportunities: [],
      };
    }

    const updatedProgress = { ...ep, product_analytics: analytics, product_analytics_at: new Date().toISOString() };

    await updateInitiative(ctx, {
      stage_status: "product_metrics_analyzed" as any,
      execution_progress: updatedProgress,
    });

    try {
      await ctx.serviceClient.from("project_brain_nodes").insert({
        initiative_id: initiative.id,
        organization_id: ctx.organizationId,
        name: "product_analytics_plan",
        node_type: "product_analytics",
        status: "generated",
        metadata: {
          users_tracked: analytics.users_tracked,
          events_analyzed: analytics.events_analyzed,
          dashboards_count: analytics.dashboards?.length || 0,
          ab_tests: analytics.ab_testing_opportunities?.length || 0,
        },
      });
    } catch (e) { console.warn("Brain node insert failed:", e.message); }

    await pipelineLog(ctx, "product_analytics_complete",
      `Analytics: ${analytics.users_tracked} users, ${analytics.events_analyzed} events, ${analytics.dashboards?.length || 0} dashboards`
    );

    const outputs = {
      success: true,
      users_tracked: analytics.users_tracked || 0,
      events_analyzed: analytics.events_analyzed || 0,
      dashboards_count: analytics.dashboards?.length || 0,
      ab_tests_count: analytics.ab_testing_opportunities?.length || 0,
    };

    await completeJob(ctx, jobId, outputs);
    return jsonResponse(outputs);
  } catch (e: any) {
    console.error("Product Analytics Engine error:", e);
    await failJob(ctx, jobId, e.message);
    await updateInitiative(ctx, { stage_status: "product_observed" as any });
    return errorResponse(e.message, 500);
  }
});
