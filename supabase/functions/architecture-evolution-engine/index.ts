import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";

serve(async (req) => {
  const result = await bootstrapPipeline(req, "architecture-evolution-engine");
  if (result instanceof Response) return result;
  const { initiative, ctx, body, apiKey } = result;

  const jobId = await createJob(ctx, "architecture_evolution", { title: initiative.title });
  await updateInitiative(ctx, { stage_status: "architecture_evolving" as any });
  await pipelineLog(ctx, "architecture_evolution_start", "Starting Architecture Evolution Engine...");

  try {
    const ep = initiative.execution_progress || {};
    const productEvolution = ep.product_evolution || {};

    const { data: brainNodes } = await ctx.serviceClient
      .from("project_brain_nodes")
      .select("name, node_type, status, metadata")
      .eq("initiative_id", initiative.id)
      .limit(80);

    const { data: brainEdges } = await ctx.serviceClient
      .from("project_brain_edges")
      .select("source_node_id, target_node_id, relation_type")
      .eq("initiative_id", initiative.id)
      .limit(100);

    const { data: rules } = await ctx.serviceClient
      .from("project_prevention_rules")
      .select("error_pattern, prevention_rule, confidence_score, times_triggered")
      .eq("initiative_id", initiative.id)
      .order("times_triggered", { ascending: false })
      .limit(20);

    const { data: errors } = await ctx.serviceClient
      .from("project_errors")
      .select("error_type, error_message, fixed, root_cause")
      .eq("initiative_id", initiative.id)
      .limit(30);

    const prompt = `You are an Architecture Evolution Engine. Analyze the project's architecture graph, error history, and prevention rules to extract successful architectural patterns and recommend evolution.

INITIATIVE: "${initiative.title}"
STACK: "${initiative.suggested_stack || "react-vite"}"
ARCHITECTURE: ${(initiative.architecture_content || "").slice(0, 1500)}
BRAIN NODES (${brainNodes?.length || 0}): ${JSON.stringify(brainNodes?.map(n => ({ name: n.name, type: n.node_type, status: n.status })) || []).slice(0, 1500)}
EDGES (${brainEdges?.length || 0}): ${JSON.stringify(brainEdges?.slice(0, 30) || []).slice(0, 800)}
PREVENTION RULES (${rules?.length || 0}): ${JSON.stringify(rules || []).slice(0, 1000)}
ERRORS (${errors?.length || 0} total, ${errors?.filter(e => e.fixed).length || 0} fixed)
PRODUCT EVOLUTION: ${JSON.stringify(productEvolution).slice(0, 800)}

Return JSON:
{
  "patterns_learned": number,
  "successful_patterns": [
    { "pattern": "string", "category": "structural" | "data" | "integration" | "resilience" | "performance", "confidence": number (0-1), "description": "string", "reusability": "high" | "medium" | "low" }
  ],
  "anti_patterns_detected": [
    { "pattern": "string", "occurrences": number, "impact": "string", "remediation": "string" }
  ],
  "architecture_health": {
    "score": number (0-100),
    "modularity": number (0-100),
    "coupling": "loose" | "moderate" | "tight",
    "cohesion": "high" | "medium" | "low",
    "scalability_readiness": "production" | "growth" | "mvp" | "prototype"
  },
  "evolution_recommendations": [
    { "recommendation": "string", "rationale": "string", "priority": "critical" | "high" | "medium" | "low", "breaking_change": boolean, "effort_estimate": "string" }
  ],
  "design_system_maturity": {
    "level": "ad-hoc" | "emerging" | "defined" | "managed" | "optimized",
    "gaps": ["string array"],
    "strengths": ["string array"]
  },
  "knowledge_base_entries": [
    { "title": "string", "category": "pattern" | "anti_pattern" | "best_practice", "content": "string" }
  ]
}

Return ONLY valid JSON.`;

    const aiResponse = await callAI(apiKey, prompt, "architecture-evolution-engine");
    let evolution: any;
    try {
      const cleaned = aiResponse.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
      evolution = JSON.parse(cleaned);
    } catch {
      evolution = {
        patterns_learned: 0, successful_patterns: [], anti_patterns_detected: [],
        architecture_health: { score: 50, modularity: 50, coupling: "moderate", cohesion: "medium", scalability_readiness: "mvp" },
        evolution_recommendations: [], design_system_maturity: { level: "emerging", gaps: [], strengths: [] },
        knowledge_base_entries: [],
      };
    }

    if (evolution.knowledge_base_entries?.length) {
      try {
        const entries = evolution.knowledge_base_entries.slice(0, 5).map((e: any) => ({
          organization_id: ctx.organizationId,
          source_initiative_id: initiative.id,
          title: e.title,
          category: "architectural_decision",
          content: e.content,
          tags: [e.category, "architecture_evolution"],
        }));
        await ctx.serviceClient.from("org_knowledge_base").insert(entries);
      } catch (e) { console.warn("Knowledge base insert failed:", e.message); }
    }

    const updatedProgress = { ...ep, architecture_evolution: evolution, architecture_evolved_at: new Date().toISOString() };

    await updateInitiative(ctx, {
      stage_status: "architecture_evolved" as any,
      execution_progress: updatedProgress,
    });

    try {
      await ctx.serviceClient.from("project_brain_nodes").insert({
        initiative_id: initiative.id,
        organization_id: ctx.organizationId,
        name: "architecture_evolution_report",
        node_type: "architecture_evolution",
        status: "generated",
        metadata: {
          patterns_learned: evolution.patterns_learned,
          health_score: evolution.architecture_health?.score,
          maturity: evolution.design_system_maturity?.level,
          anti_patterns: evolution.anti_patterns_detected?.length || 0,
        },
      });
    } catch (e) { console.warn("Brain node insert failed:", e.message); }

    await pipelineLog(ctx, "architecture_evolution_complete",
      `Architecture: ${evolution.patterns_learned} patterns, health ${evolution.architecture_health?.score}/100, maturity ${evolution.design_system_maturity?.level}`
    );

    const outputs = {
      success: true,
      patterns_learned: evolution.patterns_learned || 0,
      health_score: evolution.architecture_health?.score || 50,
      anti_patterns: evolution.anti_patterns_detected?.length || 0,
      maturity: evolution.design_system_maturity?.level || "emerging",
    };

    await completeJob(ctx, jobId, outputs);
    return jsonResponse(outputs);
  } catch (e: any) {
    console.error("Architecture Evolution Engine error:", e);
    await failJob(ctx, jobId, e.message);
    await updateInitiative(ctx, { stage_status: "product_evolved" as any });
    return errorResponse(e.message, 500);
  }
});
