import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";

serve(async (req) => {
  const result = await bootstrapPipeline(req, "system-evolution-engine");
  if (result instanceof Response) return result;
  const { initiative, ctx, body, apiKey } = result;

  const jobId = await createJob(ctx, "system_evolution", { title: initiative.title });
  await updateInitiative(ctx, { stage_status: "system_evolving" as any });
  await pipelineLog(ctx, "system_evolution_start", "Starting System Evolution Engine (Meta-Learning)...");

  try {
    const ep = initiative.execution_progress || {};

    // Fetch all knowledge base entries for org-wide learning
    const { data: knowledge } = await ctx.supabase
      .from("org_knowledge_base")
      .select("title, category, tags, content")
      .eq("organization_id", ctx.organizationId)
      .order("created_at", { ascending: false })
      .limit(30);

    // Fetch all prevention rules across org
    const { data: rules } = await ctx.supabase
      .from("project_prevention_rules")
      .select("error_pattern, prevention_rule, confidence_score, times_triggered, scope")
      .eq("organization_id", ctx.organizationId)
      .order("times_triggered", { ascending: false })
      .limit(30);

    // Fetch completed jobs across org for performance meta-analysis
    const { data: jobs } = await ctx.supabase
      .from("initiative_jobs")
      .select("stage, status, duration_ms, cost_usd, model")
      .eq("status", "completed")
      .limit(300);

    // Aggregate stage performance
    const stageStats: Record<string, { count: number; totalMs: number; totalCost: number }> = {};
    (jobs || []).forEach((j: any) => {
      if (!stageStats[j.stage]) stageStats[j.stage] = { count: 0, totalMs: 0, totalCost: 0 };
      stageStats[j.stage].count++;
      stageStats[j.stage].totalMs += j.duration_ms || 0;
      stageStats[j.stage].totalCost += j.cost_usd || 0;
    });

    // Fetch errors across org
    const { data: errors } = await ctx.supabase
      .from("project_errors")
      .select("error_type, fixed")
      .eq("organization_id", ctx.organizationId)
      .limit(200);

    const totalErrors = errors?.length || 0;
    const fixedErrors = errors?.filter((e: any) => e.fixed).length || 0;
    const errorTypes: Record<string, number> = {};
    (errors || []).forEach((e: any) => { errorTypes[e.error_type] = (errorTypes[e.error_type] || 0) + 1; });

    const prompt = `You are a System Evolution Engine performing META-LEARNING across the entire platform. Analyze all organizational data to improve the system itself.

INITIATIVE: "${initiative.title}"
KNOWLEDGE BASE ENTRIES: ${knowledge?.length || 0}
${JSON.stringify(knowledge?.map(k => ({ title: k.title, category: k.category, tags: k.tags })) || []).slice(0, 1200)}

PREVENTION RULES: ${rules?.length || 0}
${JSON.stringify(rules?.slice(0, 10) || []).slice(0, 800)}

STAGE PERFORMANCE:
${JSON.stringify(stageStats).slice(0, 1200)}

ERROR LANDSCAPE: ${totalErrors} total, ${fixedErrors} fixed
Error types: ${JSON.stringify(errorTypes).slice(0, 400)}

Return JSON:
{
  "improvements_applied": number,
  "platform_maturity": {
    "level": number (1-5),
    "label": "nascent" | "developing" | "established" | "optimized" | "autonomous",
    "score": number (0-100)
  },
  "meta_insights": [
    { "insight": "string", "category": "performance" | "quality" | "cost" | "reliability" | "developer_experience", "actionable": boolean, "impact": "high" | "medium" | "low" }
  ],
  "pipeline_optimizations": [
    { "stage": "string", "current_avg_ms": number, "optimization": "string", "expected_improvement": "string" }
  ],
  "model_recommendations": [
    { "stage": "string", "current_model": "string", "recommended_model": "string", "rationale": "string", "cost_savings": "string" }
  ],
  "new_prevention_rules": [
    { "error_pattern": "string", "prevention_rule": "string", "confidence": number (0-1), "scope": "global" | "initiative" }
  ],
  "knowledge_gaps": [
    { "area": "string", "description": "string", "recommended_action": "string" }
  ],
  "autonomous_capabilities": {
    "current": ["string array of what the system can do autonomously"],
    "next_milestone": "string",
    "blockers": ["string array"]
  },
  "system_health": {
    "reliability": number (0-100),
    "cost_efficiency": number (0-100),
    "speed": number (0-100),
    "quality": number (0-100)
  }
}

Return ONLY valid JSON.`;

    const aiResponse = await callAI(apiKey, prompt, "system-evolution-engine");
    let evolution: any;
    try {
      const cleaned = aiResponse.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
      evolution = JSON.parse(cleaned);
    } catch {
      evolution = {
        improvements_applied: 0,
        platform_maturity: { level: 2, label: "developing", score: 40 },
        meta_insights: [], pipeline_optimizations: [], model_recommendations: [],
        new_prevention_rules: [], knowledge_gaps: [],
        autonomous_capabilities: { current: [], next_milestone: "unknown", blockers: [] },
        system_health: { reliability: 50, cost_efficiency: 50, speed: 50, quality: 50 },
      };
    }

    // Persist new prevention rules if generated
    if (evolution.new_prevention_rules?.length) {
      try {
        const newRules = evolution.new_prevention_rules.slice(0, 5).map((r: any) => ({
          organization_id: ctx.organizationId,
          initiative_id: initiative.id,
          error_pattern: r.error_pattern,
          prevention_rule: r.prevention_rule,
          confidence_score: r.confidence || 0.5,
          scope: r.scope || "global",
        }));
        await ctx.supabase.from("project_prevention_rules").insert(newRules);
      } catch (e) { console.warn("Prevention rules insert failed:", e.message); }
    }

    // Persist meta insights to knowledge base
    if (evolution.meta_insights?.length) {
      try {
        const entries = evolution.meta_insights.filter((i: any) => i.impact === "high").slice(0, 3).map((i: any) => ({
          organization_id: ctx.organizationId,
          source_initiative_id: initiative.id,
          title: `Meta-Learning: ${i.insight.slice(0, 80)}`,
          category: "architectural_decision",
          content: `${i.insight}\n\nCategory: ${i.category}\nImpact: ${i.impact}`,
          tags: ["meta_learning", "system_evolution", i.category],
        }));
        if (entries.length) await ctx.supabase.from("org_knowledge_base").insert(entries);
      } catch (e) { console.warn("Knowledge base insert failed:", e.message); }
    }

    const updatedProgress = { ...ep, system_evolution: evolution, system_evolved_at: new Date().toISOString() };

    await updateInitiative(ctx, {
      stage_status: "system_evolved" as any,
      execution_progress: updatedProgress,
    });

    try {
      await ctx.supabase.from("project_brain_nodes").insert({
        initiative_id: initiative.id,
        organization_id: ctx.organizationId,
        name: "system_evolution_report",
        node_type: "system_evolution",
        status: "generated",
        metadata: {
          improvements_applied: evolution.improvements_applied,
          maturity_level: evolution.platform_maturity?.level,
          maturity_label: evolution.platform_maturity?.label,
          system_health: evolution.system_health,
        },
      });
    } catch (e) { console.warn("Brain node insert failed:", e.message); }

    await pipelineLog(ctx, "system_evolution_complete",
      `System Evolution: ${evolution.improvements_applied} improvements, maturity L${evolution.platform_maturity?.level} (${evolution.platform_maturity?.label})`
    );

    const outputs = {
      success: true,
      improvements_applied: evolution.improvements_applied || 0,
      maturity_level: evolution.platform_maturity?.level || 1,
      maturity_label: evolution.platform_maturity?.label || "nascent",
      insights_count: evolution.meta_insights?.length || 0,
      new_rules: evolution.new_prevention_rules?.length || 0,
    };

    await completeJob(ctx, jobId, outputs);
    return jsonResponse(outputs);
  } catch (e: any) {
    console.error("System Evolution Engine error:", e);
    await failJob(ctx, jobId, e.message);
    await updateInitiative(ctx, { stage_status: "portfolio_managed" as any });
    return errorResponse(e.message, 500);
  }
});
