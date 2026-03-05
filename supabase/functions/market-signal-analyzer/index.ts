import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";

serve(async (req) => {
  const result = await bootstrapPipeline(req, "market-signal-analyzer");
  if (result instanceof Response) return result;
  const { initiative, ctx, body, apiKey } = result;

  const jobId = await createJob(ctx, "market_signal_analysis", {
    title: initiative.title,
    idea_raw: initiative.idea_raw,
  });
  await updateInitiative(ctx, { stage_status: "market_signals_analyzing" as any });
  await pipelineLog(ctx, "market_signal_analysis_start", "Starting Market Signal Analyzer...");

  try {
    // Gather existing opportunity data
    const dp = initiative.discovery_payload || {};
    const opportunityReport = dp.opportunity_report || {};
    const productType = dp.product_type || "";
    const targetMarket = dp.target_market || "";

    // Scrape competitor/market URLs if available
    let marketContent = "";
    const referenceUrl = initiative.reference_url;
    if (referenceUrl) {
      const selfHostedUrl = Deno.env.get("FIRECRAWL_SELF_HOSTED_URL");
      const selfHostedKey = Deno.env.get("FIRECRAWL_SELF_HOSTED_KEY");
      const cloudKey = Deno.env.get("FIRECRAWL_API_KEY");
      const firecrawlBaseUrl = selfHostedUrl || "https://api.firecrawl.dev";
      const firecrawlApiKey = selfHostedUrl ? selfHostedKey : cloudKey;

      if (firecrawlApiKey) {
        try {
          console.log("Scraping market reference:", referenceUrl);
          const scrapeResp = await fetch(`${firecrawlBaseUrl}/v1/scrape`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${firecrawlApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: referenceUrl,
              formats: ["markdown"],
              onlyMainContent: true,
            }),
          });
          if (scrapeResp.ok) {
            const scrapeData = await scrapeResp.json();
            marketContent = (scrapeData.data?.markdown || scrapeData.markdown || "").slice(0, 4000);
          } else {
            await scrapeResp.text();
          }
        } catch (e) {
          console.warn("Firecrawl scrape failed:", e.message);
        }
      }
    }

    // AI Market Signal Analysis
    const prompt = `You are a Market Signal Analyzer for a venture intelligence system.

INITIATIVE: "${initiative.title}"
RAW IDEA: "${initiative.idea_raw || initiative.description || ""}"
PRODUCT TYPE: "${productType}"
TARGET MARKET: "${targetMarket}"
OPPORTUNITY DATA: ${JSON.stringify(opportunityReport).slice(0, 2000)}
${marketContent ? `\nMARKET REFERENCE CONTENT:\n${marketContent}` : ""}

Analyze market signals and return a JSON object with this exact structure:
{
  "demand_level": "high" | "medium" | "low",
  "demand_justification": "string explaining demand assessment",
  "competition_level": "saturated" | "competitive" | "moderate" | "low" | "blue_ocean",
  "competition_analysis": "string with top 3-5 competitors and their positioning",
  "viability_index": number (0-100),
  "market_size_estimate": {
    "tam": "string (Total Addressable Market estimate)",
    "sam": "string (Serviceable Addressable Market)",
    "som": "string (Serviceable Obtainable Market)"
  },
  "trends": ["string array of 3-5 relevant market trends"],
  "risks": ["string array of 2-4 market risks"],
  "opportunities": ["string array of 2-4 market opportunities"],
  "timing_assessment": "early" | "perfect" | "late" | "too_late",
  "timing_justification": "string explaining market timing",
  "target_segments": [
    { "name": "string", "size": "string", "willingness_to_pay": "high" | "medium" | "low" }
  ],
  "recommendation": "proceed" | "pivot" | "wait" | "abandon",
  "recommendation_rationale": "string with detailed rationale"
}

Return ONLY valid JSON, no markdown fences.`;

    const aiResponse = await callAI(apiKey, prompt, "market-signal-analyzer");
    let analysis: any;
    try {
      const cleaned = aiResponse.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
      analysis = JSON.parse(cleaned);
    } catch {
      analysis = {
        demand_level: "medium",
        demand_justification: aiResponse.slice(0, 500),
        competition_level: "moderate",
        competition_analysis: "Analysis could not be fully parsed.",
        viability_index: 50,
        market_size_estimate: { tam: "Unknown", sam: "Unknown", som: "Unknown" },
        trends: [],
        risks: [],
        opportunities: [],
        timing_assessment: "perfect",
        timing_justification: "Default assessment.",
        target_segments: [],
        recommendation: "proceed",
        recommendation_rationale: aiResponse.slice(0, 500),
      };
    }

    // Persist to discovery_payload
    const updatedPayload = {
      ...dp,
      market_signals: analysis,
      market_signals_analyzed_at: new Date().toISOString(),
    };

    // Update initiative with market analysis data
    await updateInitiative(ctx, {
      stage_status: "market_signals_analyzed" as any,
      discovery_payload: updatedPayload,
      market_analysis: JSON.stringify(analysis).slice(0, 10000),
    });

    // Store brain node
    try {
      await ctx.supabase.from("project_brain_nodes").insert({
        initiative_id: initiative.id,
        organization_id: ctx.organizationId,
        name: "market_signal_report",
        node_type: "market_analysis",
        status: "generated",
        metadata: {
          demand_level: analysis.demand_level,
          competition_level: analysis.competition_level,
          viability_index: analysis.viability_index,
          recommendation: analysis.recommendation,
          timing: analysis.timing_assessment,
          segments_count: analysis.target_segments?.length || 0,
        },
      });
    } catch (e) {
      console.warn("Brain node insert failed:", e.message);
    }

    await pipelineLog(ctx, "market_signal_analysis_complete",
      `Market signals analyzed: demand=${analysis.demand_level}, competition=${analysis.competition_level}, viability=${analysis.viability_index}/100`
    );

    const outputs = {
      success: true,
      demand_level: analysis.demand_level,
      competition_level: analysis.competition_level,
      viability_index: analysis.viability_index || 50,
      recommendation: analysis.recommendation,
      timing: analysis.timing_assessment,
      trends_count: analysis.trends?.length || 0,
      risks_count: analysis.risks?.length || 0,
      segments_count: analysis.target_segments?.length || 0,
    };

    await completeJob(ctx, jobId, outputs);
    return jsonResponse(outputs);
  } catch (e: any) {
    console.error("Market Signal Analyzer error:", e);
    await failJob(ctx, jobId, e.message);
    await updateInitiative(ctx, { stage_status: "opportunity_discovered" as any });
    return errorResponse(e.message, 500);
  }
});
