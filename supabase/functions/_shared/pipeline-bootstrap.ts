// Shared bootstrap for all pipeline stage functions
// Handles: CORS, auth, rate limiting, initiative fetch, context creation

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "./rate-limit.ts";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "./cors.ts";
import { PipelineContext } from "./pipeline-helpers.ts";
import { enforceUsageLimits } from "./usage-limit-enforcer.ts";

export interface PipelineRequest {
  user: { id: string; email?: string };
  initiative: Record<string, any>;
  ctx: PipelineContext;
  serviceClient: SupabaseClient;
  body: Record<string, any>;
  apiKey: string;
}

/**
 * Bootstrap a pipeline stage function.
 * Returns either a PipelineRequest (success) or a Response (error/CORS).
 * 
 * Usage in each stage function:
 * ```
 * const result = await bootstrapPipeline(req);
 * if (result instanceof Response) return result;
 * const { user, initiative, ctx, serviceClient, body, apiKey } = result;
 * ```
 */
export async function bootstrapPipeline(
  req: Request,
  functionName = "pipeline"
): Promise<PipelineRequest | Response> {
  // Handle CORS preflight
  const cors = handleCors(req);
  if (cors) return cors;

  // Auth check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return errorResponse("Unauthorized", 401);
  }

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    return errorResponse("Unauthorized", 401);
  }

  // Rate limiting
  const { allowed } = await checkRateLimit(user.id, functionName);
  if (!allowed) {
    return errorResponse("Rate limit exceeded", 429);
  }

  // Parse body
  const body = await req.json();
  const { initiativeId } = body;
  if (!initiativeId) {
    return errorResponse("initiativeId is required", 400);
  }

  // API Key
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return errorResponse("LOVABLE_API_KEY not configured", 500);
  }

  // Fetch initiative
  const { data: initiative, error: initErr } = await serviceClient
    .from("initiatives")
    .select("*")
    .eq("id", initiativeId)
    .single();
  if (initErr || !initiative) {
    return errorResponse("Initiative not found", 404);
  }

  // Build context
  const ctx: PipelineContext = {
    serviceClient,
    userId: user.id,
    initiativeId,
    organizationId: initiative.organization_id,
  };

  // ── Usage limit enforcement ──
  try {
    const usageCheck = await enforceUsageLimits(serviceClient, initiative.organization_id, functionName);
    if (!usageCheck.allowed) {
      // Record blocked attempt in audit_logs
      await serviceClient.from("audit_logs").insert({
        user_id: user.id,
        action: "usage_limit_blocked",
        category: "billing",
        entity_type: "initiatives",
        entity_id: initiativeId,
        message: usageCheck.reason || "Usage limit exceeded",
        severity: "warning",
        organization_id: initiative.organization_id,
        metadata: { error_code: usageCheck.error_code, current: usageCheck.current, limits: usageCheck.limits },
      });
      return errorResponse(
        JSON.stringify({ error: usageCheck.reason, error_code: usageCheck.error_code, current: usageCheck.current, limits: usageCheck.limits }),
        402
      );
    }
  } catch (e) {
    // Non-blocking: if enforcer fails, log but allow execution to continue
    console.warn("Usage limit check failed (non-blocking):", e);
  }

  return { user, initiative, ctx, serviceClient, body, apiKey };
}
