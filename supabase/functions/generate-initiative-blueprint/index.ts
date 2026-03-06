import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { callAI } from "../_shared/ai-client.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const auth = await authenticateWithRateLimit(req, "generate-initiative-blueprint");
  if (auth instanceof Response) return auth;

  try {
    const { idea, reference_url, competitor, additional_context } = await req.json();
    if (!idea?.trim()) return errorResponse("idea is required", 400);

    const systemPrompt = `You are AxionOS, an autonomous software engineering platform that transforms ideas into governed SaaS products and MVPs.

You receive a raw product idea from a user and must generate a structured Initiative Blueprint.

Your analysis must be practical, market-aware, and actionable. Think like a senior product strategist and technical architect combined.

Return a JSON object with this exact structure:
{
  "project_name": "string - concise product name",
  "short_description": "string - 1-2 sentence elevator pitch",
  "problem_statement": "string - the core problem being solved",
  "target_audience": "string - primary users and market segment",
  "market_opportunity": "string - 2-3 sentences about market size, timing, and opportunity",
  "competitor_insights": "string - brief competitive landscape analysis",
  "suggested_features": ["array of 4-6 core features as strings"],
  "suggested_integrations": ["array of relevant integrations from: auth, database, payments, email, analytics, external_api"],
  "product_type": "one of: saas, mvp, dashboard, crud, landing, custom",
  "estimated_complexity": "one of: low, medium, high",
  "recommended_depth": "one of: discovery, prd_architecture, prd_arch_stories, full_pipeline",
  "reasoning": "string - brief explanation of your analysis and recommendations"
}`;

    let userPrompt = `Analyze this product idea and generate a structured Initiative Blueprint:\n\n"${idea.trim()}"`;
    if (reference_url) userPrompt += `\n\nReference/inspiration URL: ${reference_url}`;
    if (competitor) userPrompt += `\n\nKnown competitor: ${competitor}`;
    if (additional_context) userPrompt += `\n\nAdditional context: ${additional_context}`;

    const result = await callAI(
      "",
      systemPrompt,
      userPrompt,
      true, // jsonMode
      3,
      false,
      "blueprint-generation",
      undefined,
      undefined,
      false,
    );

    let blueprint;
    try {
      blueprint = JSON.parse(result.content);
    } catch {
      // Try to extract JSON from the response
      const match = result.content.match(/\{[\s\S]*\}/);
      if (match) {
        blueprint = JSON.parse(match[0]);
      } else {
        throw new Error("Failed to parse AI response as JSON");
      }
    }

    return jsonResponse({
      blueprint,
      meta: {
        model: result.model,
        tokens: result.tokens,
        cost_usd: result.costUsd,
        duration_ms: result.durationMs,
      },
    });
  } catch (e) {
    console.error("generate-initiative-blueprint error:", e);
    return errorResponse(e instanceof Error ? e.message : "Unknown error", 500);
  }
});
