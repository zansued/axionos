import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";

serve(async (req) => {
  const result = await bootstrapPipeline(req, "startup-portfolio-manager");
  if (result instanceof Response) return result;
  const { initiative, ctx, body, apiKey } = result;

  const jobId = await createJob(ctx, "portfolio_management", { title: initiative.title });
  await updateInitiative(ctx, { stage_status: "portfolio_managing" as any });
  await pipelineLog(ctx, "portfolio_management_start", "Starting Startup Portfolio Manager...");

  try {
    const dp = initiative.discovery_payload || {};
    const ep = initiative.execution_progress || {};
    const revenueStrategy = dp.revenue_strategy || {};
    const archEvolution = ep.architecture_evolution || {};

    const { data: orgInitiatives } = await ctx.serviceClient
      .from("initiatives")
      .select("id, title, stage_status, status, complexity, risk_level, created_at, execution_progress")
      .eq("organization_id", ctx.organizationId)
      .limit(50);

    const { data: jobs } = await ctx.serviceClient
      .from("initiative_jobs")
      .select("initiative_id, stage, cost_usd, duration_ms, status")
      .eq("status", "completed")
      .limit(200);

    // Aggregate costs per initiative
    const costMap: Record<string, number> = {};
    const durationMap: Record<string, number> = {};
    (jobs || []).forEach((j: any) => {
      costMap[j.initiative_id] = (costMap[j.initiative_id] || 0) + (j.cost_usd || 0);
      durationMap[j.initiative_id] = (durationMap[j.initiative_id] || 0) + (j.duration_ms || 0);
    });

    const portfolioSummary = (orgInitiatives || []).map((i: any) => ({
      id: i.id,
      title: i.title,
      stage: i.stage_status,
      status: i.status,
      complexity: i.complexity,
      risk: i.risk_level,
      cost_usd: (costMap[i.id] || 0).toFixed(4),
      duration_hours: ((durationMap[i.id] || 0) / 3600000).toFixed(1),
    }));

    const prompt = `You are a Startup Portfolio Manager. Analyze all products in the organization and recommend resource allocation, prioritization, and strategic decisions.

CURRENT INITIATIVE: "${initiative.title}"
ORGANIZATION PORTFOLIO (${portfolioSummary.length} products):
${JSON.stringify(portfolioSummary).slice(0, 2500)}

REVENUE STRATEGY (current product): ${JSON.stringify(revenueStrategy).slice(0, 800)}
ARCHITECTURE HEALTH: ${archEvolution.architecture_health?.score || "N/A"}/100

Return JSON:
{
  "products_managed": number,
  "portfolio_health": number (0-100),
  "resource_allocation": [
    { "product": "string", "allocation_pct": number, "rationale": "string", "priority": "star" | "cash_cow" | "question_mark" | "dog" }
  ],
  "strategic_recommendations": [
    { "product": "string", "action": "scale" | "maintain" | "pivot" | "sunset" | "merge", "rationale": "string", "timeline": "string" }
  ],
  "synergies": [
    { "products": ["string array"], "synergy_type": "shared_infra" | "shared_users" | "cross_sell" | "data_sharing", "description": "string", "value": "high" | "medium" | "low" }
  ],
  "risk_matrix": [
    { "product": "string", "risk": "string", "probability": "high" | "medium" | "low", "impact": "high" | "medium" | "low", "mitigation": "string" }
  ],
  "budget_optimization": {
    "total_spend_usd": number,
    "recommended_budget_usd": number,
    "savings_opportunities": ["string array"],
    "investment_priorities": ["string array"]
  },
  "team_recommendations": {
    "total_agents_needed": number,
    "skill_gaps": ["string array"],
    "hiring_priorities": ["string array"]
  },
  "quarterly_okrs": [
    { "objective": "string", "key_results": ["string array"], "owner_product": "string" }
  ]
}

Return ONLY valid JSON.`;

    const aiResponse = await callAI(apiKey, prompt, "startup-portfolio-manager");
    let portfolio: any;
    try {
      const cleaned = aiResponse.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
      portfolio = JSON.parse(cleaned);
    } catch {
      portfolio = {
        products_managed: portfolioSummary.length, portfolio_health: 50,
        resource_allocation: [], strategic_recommendations: [], synergies: [],
        risk_matrix: [], budget_optimization: { total_spend_usd: 0, recommended_budget_usd: 0, savings_opportunities: [], investment_priorities: [] },
        team_recommendations: { total_agents_needed: 0, skill_gaps: [], hiring_priorities: [] },
        quarterly_okrs: [],
      };
    }

    const updatedProgress = { ...ep, portfolio_management: portfolio, portfolio_managed_at: new Date().toISOString() };

    await updateInitiative(ctx, {
      stage_status: "portfolio_managed" as any,
      execution_progress: updatedProgress,
    });

    try {
      await ctx.serviceClient.from("project_brain_nodes").insert({
        initiative_id: initiative.id,
        organization_id: ctx.organizationId,
        name: "portfolio_management_report",
        node_type: "portfolio_management",
        status: "generated",
        metadata: {
          products_managed: portfolio.products_managed,
          portfolio_health: portfolio.portfolio_health,
          synergies: portfolio.synergies?.length || 0,
          okrs: portfolio.quarterly_okrs?.length || 0,
        },
      });
    } catch (e) { console.warn("Brain node insert failed:", e.message); }

    await pipelineLog(ctx, "portfolio_management_complete",
      `Portfolio: ${portfolio.products_managed} products, health ${portfolio.portfolio_health}/100, ${portfolio.synergies?.length || 0} synergies`
    );

    const outputs = {
      success: true,
      products_managed: portfolio.products_managed || 0,
      portfolio_health: portfolio.portfolio_health || 50,
      synergies: portfolio.synergies?.length || 0,
      okrs: portfolio.quarterly_okrs?.length || 0,
    };

    await completeJob(ctx, jobId, outputs);
    return jsonResponse(outputs);
  } catch (e: any) {
    console.error("Startup Portfolio Manager error:", e);
    await failJob(ctx, jobId, e.message);
    await updateInitiative(ctx, { stage_status: "architecture_evolved" as any });
    return errorResponse(e.message, 500);
  }
});
