import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";

serve(async (req) => {
  const result = await bootstrapPipeline(req, "observability-engine");
  if (result instanceof Response) return result;
  const { initiative, ctx, body, apiKey } = result;

  const jobId = await createJob(ctx, "observability", {
    title: initiative.title,
  });
  await updateInitiative(ctx, { stage_status: "observing" as any });
  await pipelineLog(ctx, "observability_start", "Starting Observability Engine...");

  try {
    // Gather all existing pipeline data for analysis
    const dp = initiative.discovery_payload || {};
    const ep = initiative.execution_progress || {};

    // Fetch jobs for this initiative to compute metrics
    const { data: jobs } = await ctx.supabase
      .from("initiative_jobs")
      .select("stage, status, duration_ms, cost_usd, created_at, completed_at")
      .eq("initiative_id", initiative.id)
      .order("created_at", { ascending: true });

    // Fetch agent outputs for quality metrics
    const { data: outputs } = await ctx.supabase
      .from("agent_outputs")
      .select("type, status, tokens_used, cost_estimate, created_at")
      .eq("initiative_id", initiative.id);

    // Fetch errors for reliability metrics
    const { data: errors } = await ctx.supabase
      .from("project_errors")
      .select("error_type, fixed, detected_at, fixed_at")
      .eq("initiative_id", initiative.id);

    const totalJobs = jobs?.length || 0;
    const completedJobs = jobs?.filter(j => j.status === "completed").length || 0;
    const failedJobs = jobs?.filter(j => j.status === "failed").length || 0;
    const totalDuration = jobs?.reduce((sum, j) => sum + (j.duration_ms || 0), 0) || 0;
    const totalCost = jobs?.reduce((sum, j) => sum + (j.cost_usd || 0), 0) || 0;
    const totalTokens = outputs?.reduce((sum, o) => sum + (o.tokens_used || 0), 0) || 0;
    const totalErrors = errors?.length || 0;
    const fixedErrors = errors?.filter(e => e.fixed).length || 0;

    const prompt = `You are an Observability Engine that generates real-time monitoring insights for a software product built by AI agents.

INITIATIVE: "${initiative.title}"
PIPELINE METRICS:
- Total jobs: ${totalJobs}, Completed: ${completedJobs}, Failed: ${failedJobs}
- Total duration: ${(totalDuration / 1000).toFixed(1)}s
- Total cost: $${totalCost.toFixed(4)}
- Total tokens: ${totalTokens}
- Total errors: ${totalErrors}, Fixed: ${fixedErrors}
- Artifacts produced: ${outputs?.length || 0}

EXECUTION PROGRESS: ${JSON.stringify(ep).slice(0, 1500)}

Generate an observability report as JSON:
{
  "health_score": number (0-100, overall product health),
  "metrics_collected": number (count of distinct metrics analyzed),
  "pipeline_performance": {
    "success_rate": number (0-100),
    "avg_stage_duration_ms": number,
    "bottleneck_stages": ["string array of slowest stages"],
    "cost_efficiency": "high" | "medium" | "low"
  },
  "quality_metrics": {
    "error_rate": number (0-100),
    "fix_rate": number (0-100),
    "artifact_quality_score": number (0-100)
  },
  "monitoring_recommendations": [
    { "metric": "string", "target": "string", "current": "string", "priority": "critical" | "high" | "medium" | "low" }
  ],
  "alerts": [
    { "type": "warning" | "critical" | "info", "message": "string" }
  ],
  "dashboards_suggested": ["string array of dashboard views to create"],
  "sla_compliance": {
    "on_time_percentage": number (0-100),
    "breaches": number
  }
}

Return ONLY valid JSON.`;

    const aiResponse = await callAI(apiKey, prompt, "observability-engine");
    let report: any;
    try {
      const cleaned = aiResponse.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
      report = JSON.parse(cleaned);
    } catch {
      report = {
        health_score: 75,
        metrics_collected: totalJobs + (outputs?.length || 0) + totalErrors,
        pipeline_performance: { success_rate: totalJobs ? (completedJobs / totalJobs * 100) : 0, avg_stage_duration_ms: totalJobs ? totalDuration / totalJobs : 0, bottleneck_stages: [], cost_efficiency: "medium" },
        quality_metrics: { error_rate: 0, fix_rate: 0, artifact_quality_score: 50 },
        monitoring_recommendations: [],
        alerts: [],
        dashboards_suggested: [],
        sla_compliance: { on_time_percentage: 100, breaches: 0 },
      };
    }

    const updatedProgress = {
      ...ep,
      observability_report: report,
      observed_at: new Date().toISOString(),
    };

    await updateInitiative(ctx, {
      stage_status: "product_observed" as any,
      execution_progress: updatedProgress,
    });

    try {
      await ctx.serviceClient.from("project_brain_nodes").insert({
        initiative_id: initiative.id,
        organization_id: ctx.organizationId,
        name: "observability_report",
        node_type: "observability",
        status: "generated",
        metadata: {
          health_score: report.health_score,
          metrics_collected: report.metrics_collected,
          alerts_count: report.alerts?.length || 0,
          success_rate: report.pipeline_performance?.success_rate,
        },
      });
    } catch (e) {
      console.warn("Brain node insert failed:", e.message);
    }

    await pipelineLog(ctx, "observability_complete",
      `Observability: health=${report.health_score}/100, ${report.metrics_collected} metrics, ${report.alerts?.length || 0} alerts`
    );

    const outputs_result = {
      success: true,
      health_score: report.health_score,
      metrics_collected: report.metrics_collected || 0,
      alerts_count: report.alerts?.length || 0,
      success_rate: report.pipeline_performance?.success_rate || 0,
    };

    await completeJob(ctx, jobId, outputs_result);
    return jsonResponse(outputs_result);
  } catch (e: any) {
    console.error("Observability Engine error:", e);
    await failJob(ctx, jobId, e.message);
    await updateInitiative(ctx, { stage_status: "published" as any });
    return errorResponse(e.message, 500);
  }
});
