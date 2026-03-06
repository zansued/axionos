import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { callAI } from "../_shared/ai-client.ts";
import { INITIATIVE_SIMULATION_SYSTEM_PROMPT, buildSimulationPrompt } from "../_shared/prompts/initiative-simulation.prompt.ts";
import { validateSimulationReport } from "../_shared/contracts/initiative-simulation.schema.ts";
import type { InitiativeSimulation } from "../_shared/contracts/initiative-simulation.schema.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const auth = await authenticateWithRateLimit(req, "initiative-simulation-engine");
  if (auth instanceof Response) return auth;

  try {
    const { initiative_id, initiative_brief } = await req.json();

    if (!initiative_id) return errorResponse("initiative_id is required", 400);
    if (!initiative_brief || typeof initiative_brief !== "object") {
      return errorResponse("initiative_brief is required", 400);
    }

    // Run AI simulation
    const userPrompt = buildSimulationPrompt(initiative_brief);

    const aiResult = await callAI(
      "",
      INITIATIVE_SIMULATION_SYSTEM_PROMPT,
      userPrompt,
      true,  // jsonMode
      3,     // maxRetries
      false, // usePro — keep lightweight
      "initiative-simulation",
      undefined,
      initiative_id,
      false,
    );

    // Parse AI response
    let rawReport: unknown;
    try {
      rawReport = JSON.parse(aiResult.content);
    } catch {
      const cleaned = aiResult.content
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      const jsonStart = cleaned.search(/\{/);
      const jsonEnd = cleaned.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("AI response does not contain valid JSON");
      }
      let jsonStr = cleaned.substring(jsonStart, jsonEnd + 1);
      jsonStr = jsonStr
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .replace(/[\x00-\x1F\x7F]/g, "");
      rawReport = JSON.parse(jsonStr);
    }

    // Inject initiative_id (not part of AI output)
    (rawReport as Record<string, unknown>).initiative_id = initiative_id;

    // Validate
    const validation = validateSimulationReport(rawReport);
    let simulation: InitiativeSimulation;

    if (!validation.success) {
      console.warn("[simulation] Validation failed, applying defaults:", validation.error);
      const patched = applyDefaults(rawReport as Record<string, unknown>, initiative_id);
      const retry = validateSimulationReport(patched);
      if (!retry.success) {
        return errorResponse(`Simulation validation failed: ${retry.error}`, 422);
      }
      simulation = retry.data;
    } else {
      simulation = validation.data;
    }

    // Persist simulation report to initiative
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error: updateError } = await serviceClient
      .from("initiatives")
      .update({
        simulation_report: simulation,
        pipeline_recommendation: simulation.pipeline_recommendation,
        risk_flags: simulation.risk_flags,
        estimated_cost_min: simulation.estimated_cost_range.min_usd,
        estimated_cost_max: simulation.estimated_cost_range.max_usd,
        estimated_time_min: simulation.estimated_time_minutes.min,
        estimated_time_max: simulation.estimated_time_minutes.max,
        recommended_generation_depth: simulation.recommended_generation_depth,
      })
      .eq("id", initiative_id);

    if (updateError) {
      console.error("[simulation] Update error:", updateError);
      // Non-fatal — still return simulation report
    }

    return jsonResponse({
      simulation_report: simulation,
      meta: {
        model: aiResult.model,
        tokens: aiResult.tokens,
        cost_usd: aiResult.costUsd,
        duration_ms: aiResult.durationMs,
      },
    });
  } catch (e) {
    console.error("[initiative-simulation-engine] Error:", e);
    return errorResponse(e instanceof Error ? e.message : "Unknown error", 500);
  }
});

function applyDefaults(raw: Record<string, unknown>, initiativeId: string): Record<string, unknown> {
  return {
    initiative_id: initiativeId,
    technical_feasibility: ["high", "medium", "low"].includes(raw.technical_feasibility as string)
      ? raw.technical_feasibility : "medium",
    market_clarity: ["high", "medium", "low"].includes(raw.market_clarity as string)
      ? raw.market_clarity : "medium",
    execution_complexity: ["simple", "moderate", "complex"].includes(raw.execution_complexity as string)
      ? raw.execution_complexity : "moderate",
    estimated_token_range: (raw.estimated_token_range && typeof raw.estimated_token_range === "object")
      ? raw.estimated_token_range : { min: 100000, max: 300000 },
    estimated_cost_range: (raw.estimated_cost_range && typeof raw.estimated_cost_range === "object")
      ? raw.estimated_cost_range : { min_usd: 0.50, max_usd: 2.00 },
    estimated_time_minutes: (raw.estimated_time_minutes && typeof raw.estimated_time_minutes === "object")
      ? raw.estimated_time_minutes : { min: 5, max: 15 },
    recommended_generation_depth: ["mvp", "production", "enterprise"].includes(raw.recommended_generation_depth as string)
      ? raw.recommended_generation_depth : "mvp",
    recommended_stack: raw.recommended_stack || null,
    risk_flags: Array.isArray(raw.risk_flags) && raw.risk_flags.length > 0
      ? raw.risk_flags
      : [{ type: "product_scope_risk", severity: "low", message: "Default risk assessment — manual review recommended" }],
    pipeline_recommendation: ["go", "refine", "block"].includes(raw.pipeline_recommendation as string)
      ? raw.pipeline_recommendation : "refine",
    recommendation_reason: typeof raw.recommendation_reason === "string"
      ? raw.recommendation_reason : "Simulation completed with defaults — review recommended",
    suggested_refinements: Array.isArray(raw.suggested_refinements)
      ? raw.suggested_refinements : ["Review the initiative brief for completeness"],
  };
}
