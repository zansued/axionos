import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";

serve(async (req) => {
  const result = await bootstrapPipeline(req, "product-validation-engine");
  if (result instanceof Response) return result;
  const { initiative, ctx, body, apiKey } = result;

  const jobId = await createJob(ctx, "product_validation", {
    title: initiative.title,
    idea_raw: initiative.idea_raw,
  });
  await updateInitiative(ctx, { stage_status: "product_validating" as any });
  await pipelineLog(ctx, "product_validation_start", "Starting Product Validation Engine...");

  try {
    const dp = initiative.discovery_payload || {};
    const opportunityReport = dp.opportunity_report || {};
    const marketSignals = dp.market_signals || {};

    const prompt = `You are a Product Validation Engine for a venture intelligence system.
You simulate pre-build validation to assess whether the product concept is viable before any code is written.

INITIATIVE: "${initiative.title}"
RAW IDEA: "${initiative.idea_raw || initiative.description || ""}"
TARGET USER: "${initiative.target_user || ""}"
BUSINESS MODEL: "${initiative.business_model || ""}"
OPPORTUNITY DATA: ${JSON.stringify(opportunityReport).slice(0, 2000)}
MARKET SIGNALS: ${JSON.stringify(marketSignals).slice(0, 2000)}

Run simulated validation across these dimensions and return a JSON object:
{
  "validation_score": number (0-100, overall product viability),
  "estimated_adoption": "viral" | "high" | "moderate" | "low" | "niche",
  "risk_level": "critical" | "high" | "medium" | "low",
  "dimensions": {
    "problem_clarity": { "score": number (0-100), "assessment": "string" },
    "solution_fit": { "score": number (0-100), "assessment": "string" },
    "market_timing": { "score": number (0-100), "assessment": "string" },
    "differentiation": { "score": number (0-100), "assessment": "string" },
    "monetization_potential": { "score": number (0-100), "assessment": "string" },
    "technical_feasibility": { "score": number (0-100), "assessment": "string" },
    "user_acquisition": { "score": number (0-100), "assessment": "string" }
  },
  "mvp_features": [
    { "feature": "string", "priority": "must_have" | "should_have" | "nice_to_have", "effort": "low" | "medium" | "high" }
  ],
  "validation_risks": [
    { "risk": "string", "impact": "high" | "medium" | "low", "mitigation": "string" }
  ],
  "simulated_user_personas": [
    { "name": "string", "pain_point": "string", "willingness_to_pay": "high" | "medium" | "low", "adoption_likelihood": "string" }
  ],
  "go_no_go": "go" | "conditional_go" | "pivot" | "no_go",
  "go_no_go_rationale": "string with detailed rationale",
  "pivot_suggestions": ["string array of alternative directions if applicable"]
}

Return ONLY valid JSON, no markdown fences.`;

    const aiResponse = await callAI(apiKey, prompt, "product-validation-engine");
    let analysis: any;
    try {
      const cleaned = aiResponse.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
      analysis = JSON.parse(cleaned);
    } catch {
      analysis = {
        validation_score: 50,
        estimated_adoption: "moderate",
        risk_level: "medium",
        dimensions: {},
        mvp_features: [],
        validation_risks: [],
        simulated_user_personas: [],
        go_no_go: "conditional_go",
        go_no_go_rationale: aiResponse.slice(0, 500),
        pivot_suggestions: [],
      };
    }

    const updatedPayload = {
      ...dp,
      product_validation: analysis,
      product_validated_at: new Date().toISOString(),
    };

    await updateInitiative(ctx, {
      stage_status: "product_validated" as any,
      discovery_payload: updatedPayload,
      risk_level: analysis.risk_level || "medium",
      mvp_scope: JSON.stringify(analysis.mvp_features || []).slice(0, 10000),
    });

    try {
      await ctx.serviceClient.from("project_brain_nodes").insert({
        initiative_id: initiative.id,
        organization_id: ctx.organizationId,
        name: "product_validation_report",
        node_type: "product_validation",
        status: "generated",
        metadata: {
          validation_score: analysis.validation_score,
          estimated_adoption: analysis.estimated_adoption,
          risk_level: analysis.risk_level,
          go_no_go: analysis.go_no_go,
          mvp_features_count: analysis.mvp_features?.length || 0,
          risks_count: analysis.validation_risks?.length || 0,
        },
      });
    } catch (e) {
      console.warn("Brain node insert failed:", e.message);
    }

    await pipelineLog(ctx, "product_validation_complete",
      `Product validated: score=${analysis.validation_score}/100, adoption=${analysis.estimated_adoption}, decision=${analysis.go_no_go}`
    );

    const outputs = {
      success: true,
      validation_score: analysis.validation_score || 50,
      estimated_adoption: analysis.estimated_adoption || "moderate",
      risk_level: analysis.risk_level || "medium",
      go_no_go: analysis.go_no_go,
      mvp_features_count: analysis.mvp_features?.length || 0,
      risks_count: analysis.validation_risks?.length || 0,
      personas_count: analysis.simulated_user_personas?.length || 0,
    };

    await completeJob(ctx, jobId, outputs);
    return jsonResponse(outputs);
  } catch (e: any) {
    console.error("Product Validation Engine error:", e);
    await failJob(ctx, jobId, e.message);
    await updateInitiative(ctx, { stage_status: "market_signals_analyzed" as any });
    return errorResponse(e.message, 500);
  }
});
