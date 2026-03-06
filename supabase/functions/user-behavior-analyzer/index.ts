import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";

serve(async (req) => {
  const result = await bootstrapPipeline(req, "user-behavior-analyzer");
  if (result instanceof Response) return result;
  const { initiative, ctx, body, apiKey } = result;

  const jobId = await createJob(ctx, "user_behavior_analysis", { title: initiative.title });
  await updateInitiative(ctx, { stage_status: "user_behavior_analyzing" as any });
  await pipelineLog(ctx, "user_behavior_start", "Starting User Behavior Analyzer...");

  try {
    const dp = initiative.discovery_payload || {};
    const ep = initiative.execution_progress || {};
    const productValidation = dp.product_validation || {};
    const productAnalytics = ep.product_analytics || {};

    const { data: brainNodes } = await ctx.serviceClient
      .from("project_brain_nodes")
      .select("name, node_type, metadata")
      .eq("initiative_id", initiative.id)
      .in("node_type", ["page", "component", "ui_component", "file"])
      .limit(40);

    const prompt = `You are a User Behavior Analyzer. Simulate user interaction patterns and identify friction points for a product built by AI agents.

INITIATIVE: "${initiative.title}"
DESCRIPTION: "${initiative.description || initiative.idea_raw || ""}"
TARGET USER: "${initiative.target_user || ""}"
USER PERSONAS: ${JSON.stringify(productValidation.simulated_user_personas || []).slice(0, 1000)}
ANALYTICS PLAN: ${JSON.stringify(productAnalytics).slice(0, 1500)}
UI COMPONENTS: ${JSON.stringify(brainNodes?.map(n => n.name) || []).slice(0, 800)}

Analyze simulated user behavior and return JSON:
{
  "patterns_detected": number,
  "friction_points": number,
  "user_journeys": [
    {
      "persona": "string",
      "journey_name": "string",
      "steps": [{ "action": "string", "page": "string", "emotion": "positive" | "neutral" | "frustrated", "drop_off_risk": "high" | "medium" | "low" }],
      "completion_rate_estimate": "string"
    }
  ],
  "friction_analysis": [
    { "location": "string (page/component)", "issue": "string", "severity": "critical" | "high" | "medium" | "low", "impact": "string", "fix_suggestion": "string" }
  ],
  "interaction_patterns": [
    { "pattern": "string", "frequency": "common" | "occasional" | "rare", "sentiment": "positive" | "neutral" | "negative" }
  ],
  "engagement_hotspots": [{ "area": "string", "engagement_level": "high" | "medium" | "low", "reason": "string" }],
  "ux_score": number (0-100),
  "accessibility_issues": [{ "issue": "string", "wcag_level": "A" | "AA" | "AAA", "fix": "string" }],
  "optimization_priorities": [
    { "area": "string", "current_state": "string", "target_state": "string", "expected_impact": "string", "effort": "low" | "medium" | "high" }
  ]
}

Return ONLY valid JSON.`;

    const aiResponse = await callAI(apiKey, prompt, "user-behavior-analyzer");
    let analysis: any;
    try {
      const cleaned = aiResponse.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
      analysis = JSON.parse(cleaned);
    } catch {
      analysis = {
        patterns_detected: 0, friction_points: 0, user_journeys: [], friction_analysis: [],
        interaction_patterns: [], engagement_hotspots: [], ux_score: 50,
        accessibility_issues: [], optimization_priorities: [],
      };
    }

    const updatedProgress = { ...ep, user_behavior: analysis, user_behavior_at: new Date().toISOString() };

    await updateInitiative(ctx, {
      stage_status: "user_behavior_analyzed" as any,
      execution_progress: updatedProgress,
    });

    try {
      await ctx.serviceClient.from("project_brain_nodes").insert({
        initiative_id: initiative.id,
        organization_id: ctx.organizationId,
        name: "user_behavior_report",
        node_type: "user_behavior",
        status: "generated",
        metadata: {
          patterns_detected: analysis.patterns_detected,
          friction_points: analysis.friction_points,
          ux_score: analysis.ux_score,
          journeys_count: analysis.user_journeys?.length || 0,
        },
      });
    } catch (e) { console.warn("Brain node insert failed:", e.message); }

    await pipelineLog(ctx, "user_behavior_complete",
      `Behavior: ${analysis.patterns_detected} patterns, ${analysis.friction_points} friction points, UX score ${analysis.ux_score}/100`
    );

    const outputs = {
      success: true,
      patterns_detected: analysis.patterns_detected || 0,
      friction_points: analysis.friction_points || 0,
      ux_score: analysis.ux_score || 50,
      journeys_count: analysis.user_journeys?.length || 0,
    };

    await completeJob(ctx, jobId, outputs);
    return jsonResponse(outputs);
  } catch (e: any) {
    console.error("User Behavior Analyzer error:", e);
    await failJob(ctx, jobId, e.message);
    await updateInitiative(ctx, { stage_status: "product_metrics_analyzed" as any });
    return errorResponse(e.message, 500);
  }
});
