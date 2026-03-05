import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";

serve(async (req) => {
  const result = await bootstrapPipeline(req, "opportunity-discovery-engine");
  if (result instanceof Response) return result;
  const { initiative, ctx, body, apiKey } = result;

  const jobId = await createJob(ctx, "opportunity_discovery", {
    title: initiative.title,
    description: initiative.description,
    idea_raw: initiative.idea_raw,
  });
  await updateInitiative(ctx, { stage_status: "opportunity_discovering" });
  await pipelineLog(ctx, "opportunity_discovery_start", "Starting Opportunity Discovery Engine...");

  try {
    // Extract venture intelligence hints from discovery_payload
    const dp = initiative.discovery_payload || {};
    const productType = dp.product_type || "";
    const targetMarket = dp.target_market || "";
    const problemStatement = dp.problem_statement || "";

    // Scrape reference URL if provided (reuse Firecrawl)
    let referenceContent = "";
    if (initiative.reference_url) {
      const selfHostedUrl = Deno.env.get("FIRECRAWL_SELF_HOSTED_URL");
      const selfHostedKey = Deno.env.get("FIRECRAWL_SELF_HOSTED_KEY");
      const cloudKey = Deno.env.get("FIRECRAWL_API_KEY");
      const firecrawlBaseUrl = selfHostedUrl || "https://api.firecrawl.dev";
      const firecrawlApiKey = selfHostedUrl ? selfHostedKey : cloudKey;

      if (firecrawlApiKey) {
        try {
          console.log("Scraping reference URL:", initiative.reference_url);
          const scrapeResp = await fetch(`${firecrawlBaseUrl}/v1/scrape`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${firecrawlApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: initiative.reference_url,
              formats: ["markdown"],
              onlyMainContent: true,
            }),
          });
          if (scrapeResp.ok) {
            const scrapeData = await scrapeResp.json();
            const md = scrapeData?.data?.markdown || scrapeData?.markdown || "";
            referenceContent = md.slice(0, 8000);
            console.log(`Scraped ${referenceContent.length} chars from reference URL`);
          } else {
            console.warn("Firecrawl scrape failed:", scrapeResp.status);
          }
        } catch (scrapeErr) {
          console.warn("Firecrawl scrape error:", scrapeErr);
        }
      }
    }

    const referenceBlock = referenceContent
      ? `\n\nREFERENCE SITE (${initiative.reference_url}):\n---\n${referenceContent}\n---\nUse this site as inspiration. Identify features, structure, target audience, and business model.`
      : "";

    const ventureContext = [
      productType ? `Product Type: ${productType}` : "",
      targetMarket ? `Target Market: ${targetMarket}` : "",
      problemStatement ? `Problem to Solve: ${problemStatement}` : "",
    ].filter(Boolean).join("\n");

    const systemPrompt = `You are the Opportunity Discovery Engine of AxionOS v3, an autonomous startup factory.

Your role is to analyze a raw product idea and generate a structured opportunity report.

You must evaluate:
1. PROBLEM CLARITY — Is the problem well-defined? Who experiences it?
2. MARKET OPPORTUNITY — Size, growth trajectory, unmet demand signals
3. COMPETITIVE LANDSCAPE — Existing solutions, gaps, differentiation potential
4. PRODUCT-MARKET FIT POTENTIAL — How likely is this to achieve traction?
5. MONETIZATION VIABILITY — Can this sustain a business? What pricing models apply?
6. TECHNICAL FEASIBILITY — Can this be built as a SaaS/web product?
7. RECOMMENDED PRODUCT TYPE — SaaS, Marketplace, Tool, Platform, etc.

Return a JSON object with this exact structure:
{
  "opportunity_score": <number 0-100>,
  "problem_statement": "<refined problem statement>",
  "target_audience": {
    "primary": "<primary user segment>",
    "secondary": "<secondary segment>",
    "estimated_tam": "<total addressable market estimate>"
  },
  "market_signals": {
    "demand_level": "low|medium|high|very_high",
    "competition_level": "none|low|moderate|high|saturated",
    "trend_direction": "declining|stable|growing|accelerating",
    "viability_index": <number 0-100>
  },
  "competitive_analysis": {
    "existing_solutions": ["<solution 1>", "<solution 2>"],
    "gaps_identified": ["<gap 1>", "<gap 2>"],
    "differentiation_potential": "<how to differentiate>"
  },
  "product_recommendation": {
    "type": "saas|marketplace|tool|platform|api",
    "core_features": ["<feature 1>", "<feature 2>", "<feature 3>"],
    "mvp_scope": "<minimal viable product definition>",
    "suggested_stack": "<tech stack recommendation>"
  },
  "monetization": {
    "model": "subscription|freemium|usage_based|marketplace_fee|one_time",
    "pricing_tiers": ["<tier 1>", "<tier 2>"],
    "estimated_arpu": "<average revenue per user estimate>"
  },
  "risks": ["<risk 1>", "<risk 2>"],
  "recommendation": "proceed|pivot|abandon",
  "recommendation_reason": "<brief justification>",
  "refined_idea": "<optimized version of the original idea>"
}`;

    const userPrompt = `IDEA: ${initiative.title}

DESCRIPTION: ${initiative.idea_raw || initiative.description || "No description provided"}

${ventureContext ? `VENTURE CONTEXT:\n${ventureContext}` : ""}${referenceBlock}

Analyze this opportunity thoroughly and return the JSON report.`;

    const aiResult = await callAI(apiKey, systemPrompt, userPrompt, true, 3, true);

    let report: Record<string, unknown>;
    try {
      report = JSON.parse(aiResult.content);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = aiResult.content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        report = JSON.parse(jsonMatch[1].trim());
      } else {
        throw new Error("Failed to parse AI response as JSON");
      }
    }

    // Update initiative with opportunity data
    const discoveryPayload = {
      ...dp,
      opportunity_report: report,
      opportunity_score: report.opportunity_score,
      opportunity_analyzed_at: new Date().toISOString(),
    };

    await updateInitiative(ctx, {
      stage_status: "opportunity_discovered",
      discovery_payload: discoveryPayload,
      refined_idea: report.refined_idea || initiative.refined_idea,
      target_user: (report.target_audience as any)?.primary || initiative.target_user,
      suggested_stack: (report.product_recommendation as any)?.suggested_stack || initiative.suggested_stack,
      mvp_scope: (report.product_recommendation as any)?.mvp_scope || initiative.mvp_scope,
      risk_level: (report.recommendation === "abandon" ? "high" : report.recommendation === "pivot" ? "medium" : "low"),
    });

    // Store in Project Brain
    await ctx.serviceClient.from("project_brain_nodes").insert({
      initiative_id: ctx.initiativeId,
      organization_id: ctx.organizationId,
      name: "Opportunity Report",
      node_type: "opportunity_report",
      status: "generated",
      metadata: {
        score: report.opportunity_score,
        recommendation: report.recommendation,
        market_signals: report.market_signals,
        product_type: (report.product_recommendation as any)?.type,
      },
    });

    // Record agent output
    await ctx.serviceClient.from("agent_outputs").insert({
      organization_id: ctx.organizationId,
      initiative_id: ctx.initiativeId,
      type: "analysis",
      status: "approved",
      raw_output: report,
      summary: `Opportunity Score: ${report.opportunity_score}/100 — ${report.recommendation}`,
      model_used: aiResult.model,
      tokens_used: aiResult.tokens,
      cost_estimate: aiResult.costUsd,
    });

    if (jobId) {
      await completeJob(ctx, jobId, report as Record<string, unknown>, {
        model: aiResult.model,
        costUsd: aiResult.costUsd,
        durationMs: aiResult.durationMs,
      });
    }

    await pipelineLog(ctx, "opportunity_discovery_complete",
      `Opportunity Discovery complete — Score: ${report.opportunity_score}/100, Recommendation: ${report.recommendation}`,
      { score: report.opportunity_score, recommendation: report.recommendation }
    );

    return jsonResponse({
      success: true,
      stage: "opportunity_discovered",
      opportunity_score: report.opportunity_score,
      recommendation: report.recommendation,
      report,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Opportunity Discovery Engine error:", msg);

    if (jobId) await failJob(ctx, jobId, msg);
    await updateInitiative(ctx, { stage_status: "draft" });
    await pipelineLog(ctx, "opportunity_discovery_error", `Opportunity Discovery failed: ${msg}`);

    return errorResponse(msg);
  }
});
