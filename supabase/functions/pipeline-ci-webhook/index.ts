import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";
import { recordError, getNodeByPath, getNodeDependencies, generateBrainContext } from "../_shared/brain-helpers.ts";
import type { PipelineContext } from "../_shared/pipeline-helpers.ts";

/**
 * CI Webhook — receives GitHub Actions workflow results
 *
 * On CI failure:
 *   1. Records errors in project_errors
 *   2. Triggers Fix Orchestrator to auto-fix and create PR
 *   3. Updates initiative status
 *
 * Auth: SYNKRAIOS_WEBHOOK_SECRET
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
    const authHeader = req.headers.get("Authorization");
    const webhookSecret = Deno.env.get("SYNKRAIOS_WEBHOOK_SECRET");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!webhookSecret) {
      console.error("Missing SYNKRAIOS_WEBHOOK_SECRET");
      return errorResponse("Server configuration error", 500);
    }

    if (webhookSecret && authHeader === `Bearer ${webhookSecret}`) {
      // OK
    } else if (authHeader?.startsWith("Bearer ") && serviceRoleKey) {
      // OK — service role
    } else {
      return errorResponse("Unauthorized — invalid webhook secret", 401);
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey!
    );

    const payload: CIWebhookPayload = await req.json();

    if (!payload.initiative_id || !payload.organization_id) {
      return errorResponse("initiative_id and organization_id required", 400);
    }

    const ctx: PipelineContext = {
      serviceClient,
      userId: "system",
      initiativeId: payload.initiative_id,
      organizationId: payload.organization_id,
    };

    const jobId = await createJob(ctx, "ci_validation", {
      repo: `${payload.repo_owner}/${payload.repo_name}`,
      run_id: payload.run_id,
      commit_sha: payload.commit_sha,
    });

    if (payload.status === "success") {
      await pipelineLog(ctx, "ci_validation_passed",
        `CI passed: npm install + tsc + vite build OK (${payload.duration_ms}ms)`,
        { repo: `${payload.repo_owner}/${payload.repo_name}`, run_id: payload.run_id });

      // Mark initiative as fully validated
      await serviceClient.from("initiatives").update({
        execution_progress: { ci_status: "success", ci_run_id: payload.run_id, ci_passed_at: new Date().toISOString() },
      }).eq("id", payload.initiative_id);

      if (jobId) await completeJob(ctx, jobId, {
        status: "success", duration_ms: payload.duration_ms, errors_count: 0,
      }, { costUsd: 0, durationMs: payload.duration_ms });

      return jsonResponse({ success: true, status: "passed", message: "CI validation passed" });
    }

    // ❌ CI failed — record errors
    await pipelineLog(ctx, "ci_validation_failed",
      `CI failed: ${payload.errors.length} erros (${payload.duration_ms}ms). Triggering Fix Swarm...`,
      { errors_count: payload.errors.length, run_id: payload.run_id });

    for (const err of payload.errors.slice(0, 30)) {
      await recordError(ctx, err.message, err.category || "typescript", err.file,
        `CI ${err.category} error at ${err.file}:${err.line || "?"}`, `Fix: ${err.message}`);
    }

    // Store errors in initiative for Fix Orchestrator
    await serviceClient.from("initiatives").update({
      execution_progress: {
        ci_errors: payload.errors.slice(0, 50),
        ci_build_log: payload.build_log?.slice(0, 5000),
        ci_status: "failed",
        ci_run_id: payload.run_id,
        ci_failed_at: new Date().toISOString(),
      },
      stage_status: "validating",
    }).eq("id", payload.initiative_id);

    if (jobId) await completeJob(ctx, jobId, {
      status: "failure", errors_count: payload.errors.length,
      errors: payload.errors.slice(0, 30), duration_ms: payload.duration_ms,
    }, { costUsd: 0, durationMs: payload.duration_ms });

    // ── Trigger Fix Orchestrator ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    try {
      const orchResp = await fetch(`${supabaseUrl}/functions/v1/pipeline-fix-orchestrator`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${webhookSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          initiative_id: payload.initiative_id,
          organization_id: payload.organization_id,
          ci_run_id: payload.run_id,
          owner: payload.repo_owner,
          repo: payload.repo_name,
        }),
      });

      const orchResult = await orchResp.json();
      await pipelineLog(ctx, "fix_swarm_triggered",
        `Fix Orchestrator triggered: ${orchResult.files_fixed || 0} fixes, PR: ${orchResult.pr_url || "pending"}`,
        { orchestrator_result: orchResult });

      return jsonResponse({
        success: true,
        status: "failed",
        errors_count: payload.errors.length,
        fix_swarm_triggered: true,
        fix_result: orchResult,
        message: "CI errors recorded. Fix Swarm triggered.",
      });
    } catch (orchError) {
      console.error("Fix Orchestrator trigger failed:", orchError);
      await pipelineLog(ctx, "fix_swarm_trigger_failed",
        `Fix Orchestrator failed: ${orchError instanceof Error ? orchError.message : "Unknown"}`,
        { error: String(orchError) });

      return jsonResponse({
        success: true,
        status: "failed",
        errors_count: payload.errors.length,
        fix_swarm_triggered: false,
        message: "CI errors recorded. Fix Swarm trigger failed — manual intervention needed.",
      });
    }
  } catch (e) {
    console.error("CI webhook error:", e);
    return errorResponse(e instanceof Error ? e.message : "Unknown error", 500);
  }
});
