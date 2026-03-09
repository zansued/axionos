import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit, requireOrgMembership } from "../_shared/auth.ts";
import { callAI } from "../_shared/ai-client.ts";
import { INITIATIVE_BLUEPRINT_SYSTEM_PROMPT, buildUserPrompt } from "../_shared/prompts/initiative-blueprint.prompt.ts";
import { validateInitiativeBrief } from "../_shared/contracts/initiative-brief.schema.ts";
import type { InitiativeBrief } from "../_shared/contracts/initiative-brief.schema.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const auth = await authenticateWithRateLimit(req, "initiative-intake-engine");
  if (auth instanceof Response) return auth;

  try {
    const { idea_text, organization_id, workspace_id, additional_context } = await req.json();

    if (!idea_text?.trim()) {
      return errorResponse("idea_text is required", 400);
    }
    if (!organization_id) {
      return errorResponse("organization_id is required", 400);
    }

    const memberCheck = await requireOrgMembership(auth.serviceClient, auth.user.id, organization_id);
    if (memberCheck instanceof Response) return memberCheck;

    // Step 1: Run AI analysis to generate structured blueprint
    const userPrompt = buildUserPrompt(idea_text, additional_context);

    const aiResult = await callAI(
      "",
      INITIATIVE_BLUEPRINT_SYSTEM_PROMPT,
      userPrompt,
      true, // jsonMode
      3,    // maxRetries
      false,
      "initiative-intake",
      organization_id,
      undefined,
      false,
    );

    // Step 2: Extract JSON from AI response
    let rawBlueprint: unknown;
    try {
      rawBlueprint = JSON.parse(aiResult.content);
    } catch {
      // Try to extract JSON from markdown or wrapped response
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
      // Fix common issues
      jsonStr = jsonStr
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .replace(/[\x00-\x1F\x7F]/g, "");
      rawBlueprint = JSON.parse(jsonStr);
    }

    // Step 3: Validate against InitiativeBriefSchema
    const validation = validateInitiativeBrief(rawBlueprint);
    
    let initiativeBrief: InitiativeBrief;
    if (!validation.success) {
      // If validation fails, apply defaults and retry validation
      console.warn("[intake] Initial validation failed, applying defaults:", validation.error);
      const patched = applyDefaults(rawBlueprint as Record<string, unknown>, idea_text);
      const retryValidation = validateInitiativeBrief(patched);
      if (!retryValidation.success) {
        return errorResponse(`Blueprint validation failed: ${retryValidation.error}`, 422);
      }
      initiativeBrief = retryValidation.data;
    } else {
      initiativeBrief = validation.data;
    }

    // Step 4: Store initiative record
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const complexityMap: Record<string, string> = {
      simple: "low",
      moderate: "medium",
      complex: "high",
    };

    const { data: initiative, error: insertError } = await serviceClient
      .from("initiatives")
      .insert({
        title: initiativeBrief.name,
        description: initiativeBrief.description,
        idea_raw: idea_text.trim(),
        organization_id,
        workspace_id: workspace_id || null,
        user_id: auth.user.id,
        stage_status: "draft",
        status: "idea",
        complexity: complexityMap[initiativeBrief.complexity_estimate] || "medium",
        target_user: initiativeBrief.target_users.join(", "),
        initiative_brief: initiativeBrief,
        blueprint: rawBlueprint,
        generation_depth: initiativeBrief.generation_depth,
        idea_analysis: {
          model: aiResult.model,
          tokens: aiResult.tokens,
          cost_usd: aiResult.costUsd,
          duration_ms: aiResult.durationMs,
          analyzed_at: new Date().toISOString(),
        },
        discovery_payload: {
          product_type: initiativeBrief.product_type,
          core_features: initiativeBrief.core_features,
          integrations: initiativeBrief.integrations || [],
          generation_depth: initiativeBrief.generation_depth,
          technical_preferences: initiativeBrief.tech_preferences || {},
          deployment_target: initiativeBrief.deployment_target,
          expected_outputs: initiativeBrief.expected_outputs,
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error("[intake] Insert error:", insertError);
      throw new Error(`Failed to store initiative: ${insertError.message}`);
    }

    return jsonResponse({
      initiative_id: initiative.id,
      initiative_brief: initiativeBrief,
      status: "created",
      meta: {
        model: aiResult.model,
        tokens: aiResult.tokens,
        cost_usd: aiResult.costUsd,
        duration_ms: aiResult.durationMs,
      },
    });
  } catch (e) {
    console.error("[initiative-intake-engine] Error:", e);
    return errorResponse(e instanceof Error ? e.message : "Unknown error", 500);
  }
});

/** Apply sensible defaults for missing/invalid fields */
function applyDefaults(raw: Record<string, unknown>, ideaText: string): Record<string, unknown> {
  return {
    name: raw.name || ideaText.substring(0, 50),
    description: raw.description || ideaText,
    problem: raw.problem || raw.problem_statement || "To be defined",
    target_users: Array.isArray(raw.target_users)
      ? raw.target_users
      : typeof raw.target_audience === "string"
        ? [raw.target_audience]
        : ["General users"],
    product_type: ["saas", "marketplace", "mobile_app", "internal_tool", "ai_product", "api_product"].includes(raw.product_type as string)
      ? raw.product_type
      : "saas",
    core_features: Array.isArray(raw.core_features)
      ? raw.core_features
      : Array.isArray(raw.suggested_features)
        ? raw.suggested_features
        : ["Core functionality"],
    integrations: Array.isArray(raw.integrations)
      ? raw.integrations
      : Array.isArray(raw.suggested_integrations)
        ? raw.suggested_integrations
        : [],
    tech_preferences: raw.tech_preferences || {},
    deployment_target: ["vercel", "netlify", "aws", "cloudflare", "docker", "unknown"].includes(raw.deployment_target as string)
      ? raw.deployment_target
      : "vercel",
    complexity_estimate: ["simple", "moderate", "complex"].includes(raw.complexity_estimate as string)
      ? raw.complexity_estimate
      : (raw.estimated_complexity === "low" ? "simple" : raw.estimated_complexity === "high" ? "complex" : "moderate"),
    generation_depth: ["mvp", "production", "enterprise"].includes(raw.generation_depth as string)
      ? raw.generation_depth
      : "mvp",
    expected_outputs: Array.isArray(raw.expected_outputs)
      ? raw.expected_outputs
      : ["repository", "prd"],
  };
}
