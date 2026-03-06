import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";

serve(async (req) => {
  const result = await bootstrapPipeline(req, "growth-optimization-engine");
  if (result instanceof Response) return result;
  const { initiative, ctx, body, apiKey } = result;

  const jobId = await createJob(ctx, "growth_optimization", { title: initiative.title });
  await updateInitiative(ctx, { stage_status: "growth_optimizing" as any });
  await pipelineLog(ctx, "growth_optimization_start", "Starting Growth Optimization Engine...");

  try {
    const dp = initiative.discovery_payload || {};
    const ep = initiative.execution_progress || {};
    const revenueStrategy = dp.revenue_strategy || {};
    const productAnalytics = ep.product_analytics || {};
    const userBehavior = ep.user_behavior || {};

    const prompt = `You are a Growth Optimization Engine. Generate actionable optimizations for landing pages, onboarding flows, and conversion funnels.

INITIATIVE: "${initiative.title}"
DESCRIPTION: "${initiative.description || initiative.idea_raw || ""}"
TARGET USER: "${initiative.target_user || ""}"
PRICING MODEL: "${revenueStrategy.pricing_model || "unknown"}"
UX SCORE: ${userBehavior.ux_score || "N/A"}/100
FRICTION POINTS: ${JSON.stringify(userBehavior.friction_analysis || []).slice(0, 1000)}
ANALYTICS PLAN: ${JSON.stringify(productAnalytics).slice(0, 1000)}
USER JOURNEYS: ${JSON.stringify(userBehavior.user_journeys || []).slice(0, 1000)}

Return JSON:
{
  "optimizations_suggested": number,
  "landing_page": {
    "headline_variants": [{ "variant": "string", "target_emotion": "string", "expected_ctr_lift": "string" }],
    "hero_cta_variants": [{ "text": "string", "color_strategy": "string", "placement": "string" }],
    "social_proof_strategy": "string",
    "above_fold_elements": ["string array"],
    "page_speed_targets": { "lcp_ms": number, "fid_ms": number, "cls": number }
  },
  "onboarding": {
    "flow_type": "progressive" | "wizard" | "checklist" | "interactive_tour",
    "steps": [{ "step": "string", "goal": "string", "aha_moment": boolean, "drop_off_mitigation": "string" }],
    "time_to_value_target": "string",
    "activation_metric": "string",
    "gamification_elements": ["string array"]
  },
  "conversion_optimizations": [
    { "funnel_stage": "string", "current_issue": "string", "optimization": "string", "expected_lift": "string", "effort": "low" | "medium" | "high" }
  ],
  "growth_loops": [
    { "loop_name": "string", "trigger": "string", "action": "string", "reward": "string", "viral_coefficient": "string" }
  ],
  "email_sequences": [
    { "trigger": "string", "delay": "string", "subject": "string", "goal": "string" }
  ],
  "prioritized_experiments": [
    { "name": "string", "hypothesis": "string", "metric": "string", "ice_score": number }
  ]
}

Return ONLY valid JSON.`;

    const aiResponse = await callAI(apiKey, prompt, "growth-optimization-engine");
    let optimizations: any;
    try {
      const cleaned = aiResponse.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
      optimizations = JSON.parse(cleaned);
    } catch {
      optimizations = {
        optimizations_suggested: 0, landing_page: {}, onboarding: {},
        conversion_optimizations: [], growth_loops: [], email_sequences: [], prioritized_experiments: [],
      };
    }

    const updatedProgress = { ...ep, growth_optimization: optimizations, growth_optimized_at: new Date().toISOString() };

    await updateInitiative(ctx, {
      stage_status: "growth_optimized" as any,
      execution_progress: updatedProgress,
    });

    try {
      await ctx.serviceClient.from("project_brain_nodes").insert({
        initiative_id: initiative.id,
        organization_id: ctx.organizationId,
        name: "growth_optimization_plan",
        node_type: "growth_optimization",
        status: "generated",
        metadata: {
          optimizations_suggested: optimizations.optimizations_suggested,
          growth_loops: optimizations.growth_loops?.length || 0,
          experiments: optimizations.prioritized_experiments?.length || 0,
        },
      });
    } catch (e) { console.warn("Brain node insert failed:", e.message); }

    await pipelineLog(ctx, "growth_optimization_complete",
      `Growth: ${optimizations.optimizations_suggested} optimizations, ${optimizations.growth_loops?.length || 0} loops, ${optimizations.prioritized_experiments?.length || 0} experiments`
    );

    const outputs = {
      success: true,
      optimizations_suggested: optimizations.optimizations_suggested || 0,
      growth_loops: optimizations.growth_loops?.length || 0,
      experiments: optimizations.prioritized_experiments?.length || 0,
      onboarding_steps: optimizations.onboarding?.steps?.length || 0,
    };

    await completeJob(ctx, jobId, outputs);
    return jsonResponse(outputs);
  } catch (e: any) {
    console.error("Growth Optimization Engine error:", e);
    await failJob(ctx, jobId, e.message);
    await updateInitiative(ctx, { stage_status: "user_behavior_analyzed" as any });
    return errorResponse(e.message, 500);
  }
});
