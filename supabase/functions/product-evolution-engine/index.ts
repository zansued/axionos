import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";

serve(async (req) => {
  const result = await bootstrapPipeline(req, "product-evolution-engine");
  if (result instanceof Response) return result;
  const { initiative, ctx, body, apiKey } = result;

  const jobId = await createJob(ctx, "product_evolution", { title: initiative.title });
  await updateInitiative(ctx, { stage_status: "product_evolving" as any });
  await pipelineLog(ctx, "product_evolution_start", "Starting Product Evolution Engine...");

  try {
    const dp = initiative.discovery_payload || {};
    const ep = initiative.execution_progress || {};
    const growthOpt = ep.growth_optimization || {};
    const userBehavior = ep.user_behavior || {};
    const productAnalytics = ep.product_analytics || {};
    const revenueStrategy = dp.revenue_strategy || {};

    // Fetch current features (stories)
    const { data: stories } = await ctx.supabase
      .from("stories")
      .select("title, status, priority, description")
      .eq("initiative_id", initiative.id)
      .limit(30);

    // Fetch brain nodes for architecture awareness
    const { data: brainNodes } = await ctx.supabase
      .from("project_brain_nodes")
      .select("name, node_type, status")
      .eq("initiative_id", initiative.id)
      .limit(50);

    const prompt = `You are a Product Evolution Engine. Based on analytics, user behavior, and growth data, propose the next evolution of the product.

INITIATIVE: "${initiative.title}"
DESCRIPTION: "${initiative.description || initiative.idea_raw || ""}"
TARGET USER: "${initiative.target_user || ""}"
CURRENT FEATURES: ${JSON.stringify(stories?.map(s => ({ title: s.title, status: s.status, priority: s.priority })) || []).slice(0, 1200)}
UX SCORE: ${userBehavior.ux_score || "N/A"}/100
FRICTION POINTS: ${userBehavior.friction_points || 0}
GROWTH LOOPS: ${JSON.stringify(growthOpt.growth_loops || []).slice(0, 600)}
PRICING: "${revenueStrategy.pricing_model || "unknown"}"
COMPONENTS: ${brainNodes?.length || 0}

Return JSON:
{
  "features_added": number,
  "modules_removed": number,
  "evolution_version": "string (e.g. v1.1, v2.0)",
  "evolution_type": "incremental" | "major" | "pivot",
  "new_features": [
    { "name": "string", "rationale": "string", "priority": "critical" | "high" | "medium" | "low", "effort_days": number, "expected_impact": "string" }
  ],
  "features_to_deprecate": [
    { "name": "string", "reason": "string", "migration_plan": "string" }
  ],
  "architecture_changes": [
    { "change": "string", "reason": "string", "breaking": boolean }
  ],
  "ux_improvements": [
    { "area": "string", "improvement": "string", "expected_ux_lift": number }
  ],
  "new_integrations": [
    { "service": "string", "purpose": "string", "priority": "high" | "medium" | "low" }
  ],
  "roadmap_phases": [
    { "phase": "string", "duration": "string", "deliverables": ["string array"], "success_metric": "string" }
  ],
  "technical_debt_items": [
    { "item": "string", "severity": "high" | "medium" | "low", "fix_approach": "string" }
  ]
}

Return ONLY valid JSON.`;

    const aiResponse = await callAI(apiKey, prompt, "product-evolution-engine");
    let evolution: any;
    try {
      const cleaned = aiResponse.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
      evolution = JSON.parse(cleaned);
    } catch {
      evolution = {
        features_added: 0, modules_removed: 0, evolution_version: "v1.1",
        evolution_type: "incremental", new_features: [], features_to_deprecate: [],
        architecture_changes: [], ux_improvements: [], new_integrations: [],
        roadmap_phases: [], technical_debt_items: [],
      };
    }

    const updatedProgress = { ...ep, product_evolution: evolution, product_evolved_at: new Date().toISOString() };

    await updateInitiative(ctx, {
      stage_status: "product_evolved" as any,
      execution_progress: updatedProgress,
    });

    try {
      await ctx.supabase.from("project_brain_nodes").insert({
        initiative_id: initiative.id,
        organization_id: ctx.organizationId,
        name: "product_evolution_plan",
        node_type: "product_evolution",
        status: "generated",
        metadata: {
          features_added: evolution.features_added,
          modules_removed: evolution.modules_removed,
          evolution_version: evolution.evolution_version,
          evolution_type: evolution.evolution_type,
          roadmap_phases: evolution.roadmap_phases?.length || 0,
        },
      });
    } catch (e) { console.warn("Brain node insert failed:", e.message); }

    await pipelineLog(ctx, "product_evolution_complete",
      `Evolution ${evolution.evolution_version}: +${evolution.features_added} features, -${evolution.modules_removed} removed, ${evolution.roadmap_phases?.length || 0} phases`
    );

    const outputs = {
      success: true,
      features_added: evolution.features_added || 0,
      modules_removed: evolution.modules_removed || 0,
      evolution_version: evolution.evolution_version || "v1.1",
      roadmap_phases: evolution.roadmap_phases?.length || 0,
    };

    await completeJob(ctx, jobId, outputs);
    return jsonResponse(outputs);
  } catch (e: any) {
    console.error("Product Evolution Engine error:", e);
    await failJob(ctx, jobId, e.message);
    await updateInitiative(ctx, { stage_status: "system_learned" as any });
    return errorResponse(e.message, 500);
  }
});
