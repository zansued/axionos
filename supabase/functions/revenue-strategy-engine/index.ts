import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";

serve(async (req) => {
  const result = await bootstrapPipeline(req, "revenue-strategy-engine");
  if (result instanceof Response) return result;
  const { initiative, ctx, body, apiKey } = result;

  const jobId = await createJob(ctx, "revenue_strategy", {
    title: initiative.title,
    idea_raw: initiative.idea_raw,
  });
  await updateInitiative(ctx, { stage_status: "revenue_strategizing" as any });
  await pipelineLog(ctx, "revenue_strategy_start", "Starting Revenue Strategy Engine...");

  try {
    const dp = initiative.discovery_payload || {};
    const opportunityReport = dp.opportunity_report || {};
    const marketSignals = dp.market_signals || {};
    const productValidation = dp.product_validation || {};

    const prompt = `You are a Revenue Strategy Engine for a venture intelligence system.
Design a complete monetization strategy based on the product validation and market signals.

INITIATIVE: "${initiative.title}"
RAW IDEA: "${initiative.idea_raw || initiative.description || ""}"
TARGET USER: "${initiative.target_user || ""}"
BUSINESS MODEL HINT: "${initiative.business_model || ""}"
MARKET SIGNALS: ${JSON.stringify(marketSignals).slice(0, 1500)}
PRODUCT VALIDATION: ${JSON.stringify(productValidation).slice(0, 1500)}

Return a JSON object with this exact structure:
{
  "pricing_model": "freemium" | "subscription" | "usage_based" | "one_time" | "marketplace" | "hybrid",
  "pricing_rationale": "string explaining why this model fits",
  "tiers": [
    {
      "name": "string",
      "price_monthly_usd": number,
      "price_yearly_usd": number,
      "target_segment": "string",
      "features": ["string array"],
      "limits": { "key": "value pairs of usage limits" }
    }
  ],
  "revenue_projections": {
    "month_6": { "users": number, "mrr_usd": number, "arr_usd": number },
    "month_12": { "users": number, "mrr_usd": number, "arr_usd": number },
    "month_24": { "users": number, "mrr_usd": number, "arr_usd": number }
  },
  "acquisition_channels": [
    { "channel": "string", "cost_per_acquisition": number, "expected_conversion": "string" }
  ],
  "monetization_risks": [
    { "risk": "string", "impact": "high" | "medium" | "low", "mitigation": "string" }
  ],
  "key_metrics": ["string array of 4-6 KPIs to track"],
  "payment_infrastructure": {
    "provider": "stripe" | "paddle" | "lemon_squeezy" | "other",
    "features_needed": ["string array: subscriptions, invoicing, usage_metering, etc."]
  },
  "upsell_strategy": "string describing expansion revenue approach",
  "break_even_estimate": "string (e.g. '8-12 months at current projections')"
}

Return ONLY valid JSON, no markdown fences.`;

    const aiResponse = await callAI(apiKey, prompt, "revenue-strategy-engine");
    let strategy: any;
    try {
      const cleaned = aiResponse.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
      strategy = JSON.parse(cleaned);
    } catch {
      strategy = {
        pricing_model: "freemium",
        pricing_rationale: aiResponse.slice(0, 500),
        tiers: [],
        revenue_projections: {},
        acquisition_channels: [],
        monetization_risks: [],
        key_metrics: [],
        payment_infrastructure: { provider: "stripe", features_needed: ["subscriptions"] },
        upsell_strategy: "Not parsed",
        break_even_estimate: "Unknown",
      };
    }

    const updatedPayload = {
      ...dp,
      revenue_strategy: strategy,
      revenue_strategized_at: new Date().toISOString(),
    };

    await updateInitiative(ctx, {
      stage_status: "revenue_strategized" as any,
      discovery_payload: updatedPayload,
      business_model: strategy.pricing_model || "freemium",
    });

    try {
      await ctx.serviceClient.from("project_brain_nodes").insert({
        initiative_id: initiative.id,
        organization_id: ctx.organizationId,
        name: "revenue_strategy_report",
        node_type: "revenue_strategy",
        status: "generated",
        metadata: {
          pricing_model: strategy.pricing_model,
          tiers_count: strategy.tiers?.length || 0,
          payment_provider: strategy.payment_infrastructure?.provider,
          break_even: strategy.break_even_estimate,
        },
      });
    } catch (e) {
      console.warn("Brain node insert failed:", e.message);
    }

    await pipelineLog(ctx, "revenue_strategy_complete",
      `Revenue strategy defined: ${strategy.pricing_model}, ${strategy.tiers?.length || 0} tiers`
    );

    const outputs = {
      success: true,
      pricing_model: strategy.pricing_model || "freemium",
      tiers_count: strategy.tiers?.length || 0,
      channels_count: strategy.acquisition_channels?.length || 0,
      risks_count: strategy.monetization_risks?.length || 0,
      break_even: strategy.break_even_estimate || "unknown",
    };

    await completeJob(ctx, jobId, outputs);
    return jsonResponse(outputs);
  } catch (e: any) {
    console.error("Revenue Strategy Engine error:", e);
    await failJob(ctx, jobId, e.message);
    await updateInitiative(ctx, { stage_status: "product_validated" as any });
    return errorResponse(e.message, 500);
  }
});
