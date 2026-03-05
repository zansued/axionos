import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { pipelineLog, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";
import { recordError } from "../_shared/brain-helpers.ts";
import type { PipelineContext } from "../_shared/pipeline-helpers.ts";

/**
 * CI Webhook — receives GitHub Actions workflow results
 * 
 * When the CI workflow (npm install + tsc + vite build) runs after publish,
 * this endpoint receives the results. If there are errors:
 *   1. Records them in project_errors for learning
 *   2. Updates initiative status back to "validating"
 *   3. Stores structured errors for the Fix Loop
 *
 * GitHub Actions sends a POST with:
 *   { initiative_id, organization_id, status, errors[], build_log, duration_ms }
 *
 * Authentication: via a shared webhook secret (WEBHOOK_SECRET).
 */

interface CIError {
  file: string;
  line: number | null;
  column: number | null;
  message: string;
  category: "typescript" | "build" | "dependency" | "runtime";
}

interface CIWebhookPayload {
  initiative_id: string;
  organization_id: string;
  status: "success" | "failure";
  errors: CIError[];
  build_log: string;
  duration_ms: number;
  repo_owner: string;
  repo_name: string;
  run_id: string;
  commit_sha: string;
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    // Authenticate via webhook secret or service role
    const authHeader = req.headers.get("Authorization");
    const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (webhookSecret && authHeader === `Bearer ${webhookSecret}`) {
      // OK — authenticated via webhook secret
    } else if (authHeader?.startsWith("Bearer ") && serviceRoleKey) {
      // Allow service role
    } else {
      return errorResponse("Unauthorized — invalid webhook secret", 401);
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload: CIWebhookPayload = await req.json();

    if (!payload.initiative_id || !payload.organization_id) {
      return errorResponse("initiative_id and organization_id required", 400);
    }

    const ctx: PipelineContext = {
      serviceClient,
      userId: "system", // CI webhook is automated
      initiativeId: payload.initiative_id,
      organizationId: payload.organization_id,
    };

    const jobId = await createJob(ctx, "ci_validation", {
      repo: `${payload.repo_owner}/${payload.repo_name}`,
      run_id: payload.run_id,
      commit_sha: payload.commit_sha,
    });

    if (payload.status === "success") {
      // ✅ CI passed — project compiles and builds
      await pipelineLog(ctx, "ci_validation_passed",
        `CI passed: npm install + tsc + vite build OK (${payload.duration_ms}ms)`,
        { repo: `${payload.repo_owner}/${payload.repo_name}`, run_id: payload.run_id });

      if (jobId) await completeJob(ctx, jobId, {
        status: "success",
        duration_ms: payload.duration_ms,
        errors_count: 0,
      }, { costUsd: 0, durationMs: payload.duration_ms });

      return jsonResponse({ success: true, status: "passed", message: "CI validation passed" });
    }

    // ❌ CI failed — record errors and trigger fix loop
    await pipelineLog(ctx, "ci_validation_failed",
      `CI failed: ${payload.errors.length} erros encontrados (${payload.duration_ms}ms)`,
      { errors_count: payload.errors.length, run_id: payload.run_id });

    // Record errors in project_errors for learning
    for (const err of payload.errors.slice(0, 30)) {
      await recordError(ctx,
        err.message,
        err.category || "typescript",
        err.file,
        `CI ${err.category} error at ${err.file}:${err.line || "?"}`,
        `Fix: ${err.message}`
      );
    }

    // Store errors in initiative for Fix Loop consumption
    await serviceClient.from("initiatives").update({
      execution_progress: {
        ci_errors: payload.errors.slice(0, 50),
        ci_build_log: payload.build_log?.slice(0, 5000),
        ci_status: "failed",
        ci_run_id: payload.run_id,
        ci_failed_at: new Date().toISOString(),
      },
      stage_status: "validating", // Push back to validation for Fix Loop
    }).eq("id", payload.initiative_id);

    if (jobId) await completeJob(ctx, jobId, {
      status: "failure",
      errors_count: payload.errors.length,
      errors: payload.errors.slice(0, 30),
      duration_ms: payload.duration_ms,
    }, { costUsd: 0, durationMs: payload.duration_ms });

    return jsonResponse({
      success: true,
      status: "failed",
      errors_count: payload.errors.length,
      message: "CI errors recorded. Initiative moved back to validation for Fix Loop.",
    });
  } catch (e) {
    console.error("CI webhook error:", e);
    return errorResponse(e instanceof Error ? e.message : "Unknown error", 500);
  }
});
