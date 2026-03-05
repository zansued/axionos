import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { pipelineLog, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";
import { recordError, generateBrainContext } from "../_shared/brain-helpers.ts";
import type { PipelineContext } from "../_shared/pipeline-helpers.ts";

/**
 * GitHub CI Webhook — receives native GitHub Actions webhook events
 *
 * Processes workflow_run and check_run events from GitHub.
 * On CI failure: records errors, triggers Fix Swarm.
 * On CI success: marks initiative as validated.
 *
 * Security: validates x-hub-signature-256 using SYNKRAIOS_WEBHOOK_SECRET
 */

async function verifyGitHubSignature(
  secret: string,
  body: string,
  signature: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const digest = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const expected = `sha256=${digest}`;

  // Constant-time comparison
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

interface CIError {
  file: string;
  line: number | null;
  column: number | null;
  message: string;
  category: "typescript" | "build" | "dependency" | "runtime";
}

function extractErrorsFromLogs(logs: string): CIError[] {
  const errors: CIError[] = [];
  const tsPattern = /^(.+?)\((\d+),(\d+)\):\s*error\s+TS\d+:\s*(.+)$/gm;
  const vitePattern = /^(?:error|ERROR).*?(?:in\s+)?([^\s:]+):(\d+)?(?::(\d+))?\s*[:\-]\s*(.+)$/gm;

  let match: RegExpExecArray | null;

  while ((match = tsPattern.exec(logs)) !== null) {
    errors.push({
      file: match[1].trim(),
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      message: match[4].trim(),
      category: "typescript",
    });
  }

  while ((match = vitePattern.exec(logs)) !== null) {
    errors.push({
      file: match[1].trim(),
      line: match[2] ? parseInt(match[2]) : null,
      column: match[3] ? parseInt(match[3]) : null,
      message: match[4].trim(),
      category: "build",
    });
  }

  return errors;
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const webhookSecret = Deno.env.get("SYNKRAIOS_WEBHOOK_SECRET");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!webhookSecret || !serviceRoleKey) {
      console.error("Missing SYNKRAIOS_WEBHOOK_SECRET or SUPABASE_SERVICE_ROLE_KEY");
      return errorResponse("Server configuration error", 500);
    }

    // ── Auth: GitHub signature OR Bearer token ──
    const rawBody = await req.text();
    const githubSignature = req.headers.get("x-hub-signature-256");
    const authHeader = req.headers.get("Authorization");
    const githubEvent = req.headers.get("x-github-event");

    let isGitHubNative = false;

    if (githubSignature) {
      // Native GitHub webhook with HMAC signature
      const valid = await verifyGitHubSignature(webhookSecret, rawBody, githubSignature);
      if (!valid) {
        console.error("GitHub webhook signature verification failed");
        return errorResponse("Invalid webhook signature", 401);
      }
      isGitHubNative = true;
    } else if (authHeader === `Bearer ${webhookSecret}`) {
      // Internal call with Bearer token (from CI workflow curl)
      isGitHubNative = false;
    } else {
      return errorResponse("Unauthorized — invalid signature or token", 401);
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey
    );

    // GitHub may send as application/x-www-form-urlencoded with payload=...
    let payload: any;
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(rawBody);
      const payloadStr = params.get("payload");
      if (!payloadStr) {
        return errorResponse("Missing 'payload' in form-encoded body", 400);
      }
      payload = JSON.parse(payloadStr);
    } else {
      payload = JSON.parse(rawBody);
    }

    // ── Handle GitHub native events ──
    if (isGitHubNative && githubEvent) {
      return await handleGitHubEvent(serviceClient, githubEvent, payload, webhookSecret);
    }

    // ── Handle internal CI webhook (existing format from pipeline-ci-webhook) ──
    return await handleInternalCIWebhook(serviceClient, payload, webhookSecret);
  } catch (e) {
    console.error("GitHub CI webhook error:", e);
    return errorResponse(e instanceof Error ? e.message : "Unknown error", 500);
  }
});

/**
 * Handle native GitHub webhook events (workflow_run, check_run)
 */
async function handleGitHubEvent(
  serviceClient: ReturnType<typeof createClient>,
  event: string,
  payload: any,
  webhookSecret: string
): Promise<Response> {
  console.log(`GitHub event received: ${event}`);

  if (event === "ping") {
    return jsonResponse({ success: true, message: "pong", hook_id: payload.hook_id });
  }

  if (event !== "workflow_run" && event !== "check_run") {
    return jsonResponse({ success: true, message: `Event '${event}' ignored` });
  }

  // Only process completed events
  const action = payload.action;
  if (action !== "completed") {
    return jsonResponse({ success: true, message: `Action '${action}' ignored, waiting for 'completed'` });
  }

  const repo = payload.repository;
  const repoOwner = repo?.owner?.login || "";
  const repoName = repo?.name || "";
  const repoFullName = `${repoOwner}/${repoName}`;

  let conclusion: string;
  let commitSha: string;
  let runId: string;
  let logsUrl: string;
  let workflowName: string;

  if (event === "workflow_run") {
    const wr = payload.workflow_run;
    conclusion = wr.conclusion; // success, failure, cancelled
    commitSha = wr.head_sha;
    runId = String(wr.id);
    logsUrl = wr.logs_url || wr.html_url || "";
    workflowName = wr.name || payload.workflow?.name || "unknown";
  } else {
    // check_run
    const cr = payload.check_run;
    conclusion = cr.conclusion; // success, failure, etc.
    commitSha = cr.head_sha;
    runId = String(cr.id);
    logsUrl = cr.html_url || "";
    workflowName = cr.name || "check_run";
  }

  console.log(`CI result: ${workflowName} → ${conclusion} (${repoFullName}@${commitSha.slice(0, 7)})`);

  // ── Find initiative linked to this repo ──
  const { data: gitConns } = await serviceClient
    .from("git_connections")
    .select("organization_id, workspace_id")
    .eq("repo_owner", repoOwner)
    .eq("repo_name", repoName)
    .eq("status", "active")
    .limit(1);

  if (!gitConns?.length) {
    console.log(`No git connection found for ${repoFullName}`);
    return jsonResponse({
      success: true,
      message: `No linked initiative for ${repoFullName}`,
      conclusion,
    });
  }

  const orgId = gitConns[0].organization_id;

  // Find most recent executing initiative for this org
  const { data: initiatives } = await serviceClient
    .from("initiatives")
    .select("id")
    .eq("organization_id", orgId)
    .in("stage_status", ["executing", "validating"])
    .order("updated_at", { ascending: false })
    .limit(1);

  if (!initiatives?.length) {
    console.log(`No active initiative for org ${orgId}`);
    return jsonResponse({
      success: true,
      message: "No active initiative found",
      conclusion,
    });
  }

  const initiativeId = initiatives[0].id;
  const ctx: PipelineContext = {
    serviceClient,
    userId: "system",
    initiativeId,
    organizationId: orgId,
  };

  const jobId = await createJob(ctx, "ci_webhook", {
    event,
    repo: repoFullName,
    run_id: runId,
    commit_sha: commitSha,
    workflow: workflowName,
  });

  // ── CI SUCCESS ──
  if (conclusion === "success") {
    await pipelineLog(ctx, "ci_build_success",
      `CI passed: ${workflowName} (${repoFullName}@${commitSha.slice(0, 7)})`,
      { run_id: runId, workflow: workflowName });

    await serviceClient.from("initiatives").update({
      execution_progress: {
        ci_status: "success",
        ci_run_id: runId,
        ci_passed_at: new Date().toISOString(),
        ci_workflow: workflowName,
        ci_commit_sha: commitSha,
      },
    }).eq("id", initiativeId);

    if (jobId) await completeJob(ctx, jobId, {
      status: "success",
      conclusion,
      workflow: workflowName,
    }, { costUsd: 0, durationMs: 0 });

    return jsonResponse({
      success: true,
      status: "passed",
      conclusion,
      initiative_id: initiativeId,
      message: "CI build success recorded",
    });
  }

  // ── CI FAILURE ──
  if (conclusion === "failure") {
    await pipelineLog(ctx, "ci_build_failure",
      `CI failed: ${workflowName} (${repoFullName}@${commitSha.slice(0, 7)}). Triggering Fix Swarm...`,
      { run_id: runId, workflow: workflowName, logs_url: logsUrl });

    // Try to fetch workflow logs for error extraction
    let extractedErrors: CIError[] = [];
    let buildLog = "";

    try {
      const { data: gitConn } = await serviceClient
        .from("git_connections")
        .select("github_token")
        .eq("repo_owner", repoOwner)
        .eq("repo_name", repoName)
        .eq("status", "active")
        .single();

      if (gitConn?.github_token && logsUrl) {
        const logResp = await fetch(logsUrl, {
          headers: {
            Authorization: `Bearer ${gitConn.github_token}`,
            Accept: "application/vnd.github.v3+json",
          },
        });
        if (logResp.ok) {
          buildLog = await logResp.text();
          extractedErrors = extractErrorsFromLogs(buildLog);
        }
      }
    } catch (e) {
      console.error("Failed to fetch CI logs:", e);
    }

    // Record errors in project_errors
    for (const err of extractedErrors.slice(0, 30)) {
      await recordError(ctx, err.message, err.category, err.file,
        `CI ${err.category} error at ${err.file}:${err.line || "?"}`,
        `Fix: ${err.message}`);
    }

    // Update initiative with CI failure data
    await serviceClient.from("initiatives").update({
      execution_progress: {
        ci_status: "failed",
        ci_run_id: runId,
        ci_failed_at: new Date().toISOString(),
        ci_workflow: workflowName,
        ci_commit_sha: commitSha,
        ci_logs_url: logsUrl,
        ci_errors: extractedErrors.slice(0, 50),
        ci_build_log: buildLog.slice(0, 5000),
      },
      stage_status: "validating",
    }).eq("id", initiativeId);

    if (jobId) await completeJob(ctx, jobId, {
      status: "failure",
      conclusion,
      errors_count: extractedErrors.length,
      workflow: workflowName,
    }, { costUsd: 0, durationMs: 0 });

    // ── Trigger Fix Swarm ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    try {
      const orchResp = await fetch(`${supabaseUrl}/functions/v1/pipeline-fix-orchestrator`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${webhookSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          initiative_id: initiativeId,
          organization_id: orgId,
          ci_run_id: runId,
          owner: repoOwner,
          repo: repoName,
        }),
      });

      const orchResult = await orchResp.json();
      await pipelineLog(ctx, "fix_swarm_triggered",
        `Fix Swarm triggered: ${orchResult.files_fixed || 0} fixes, PR: ${orchResult.pr_url || "pending"}`,
        { orchestrator_result: orchResult });

      return jsonResponse({
        success: true,
        status: "failed",
        conclusion,
        initiative_id: initiativeId,
        errors_count: extractedErrors.length,
        fix_swarm_triggered: true,
        fix_result: orchResult,
        message: "CI failure recorded. Fix Swarm triggered.",
      });
    } catch (orchError) {
      console.error("Fix Orchestrator trigger failed:", orchError);
      await pipelineLog(ctx, "fix_swarm_trigger_failed",
        `Fix Orchestrator failed: ${orchError instanceof Error ? orchError.message : "Unknown"}`,
        { error: String(orchError) });

      return jsonResponse({
        success: true,
        status: "failed",
        conclusion,
        initiative_id: initiativeId,
        errors_count: extractedErrors.length,
        fix_swarm_triggered: false,
        message: "CI failure recorded. Fix Swarm trigger failed.",
      });
    }
  }

  // ── Other conclusions (cancelled, timed_out, etc.) ──
  await pipelineLog(ctx, "ci_webhook_received",
    `CI event: ${workflowName} → ${conclusion} (${repoFullName})`,
    { run_id: runId, conclusion });

  if (jobId) await completeJob(ctx, jobId, { conclusion }, { costUsd: 0, durationMs: 0 });

  return jsonResponse({
    success: true,
    status: conclusion,
    initiative_id: initiativeId,
    message: `CI conclusion '${conclusion}' recorded`,
  });
}

/**
 * Handle internal CI webhook format (backward compatible with pipeline-ci-webhook)
 */
async function handleInternalCIWebhook(
  serviceClient: ReturnType<typeof createClient>,
  payload: any,
  webhookSecret: string
): Promise<Response> {
  const { initiative_id, organization_id, status, errors = [], build_log = "",
    duration_ms = 0, repo_owner, repo_name, run_id, commit_sha } = payload;

  if (!initiative_id || !organization_id) {
    return errorResponse("initiative_id and organization_id required", 400);
  }

  const ctx: PipelineContext = {
    serviceClient,
    userId: "system",
    initiativeId: initiative_id,
    organizationId: organization_id,
  };

  const jobId = await createJob(ctx, "ci_validation", {
    repo: `${repo_owner}/${repo_name}`,
    run_id,
    commit_sha,
  });

  if (status === "success") {
    await pipelineLog(ctx, "ci_build_success",
      `CI passed (${duration_ms}ms)`,
      { repo: `${repo_owner}/${repo_name}`, run_id });

    await serviceClient.from("initiatives").update({
      execution_progress: {
        ci_status: "success",
        ci_run_id: run_id,
        ci_passed_at: new Date().toISOString(),
      },
    }).eq("id", initiative_id);

    if (jobId) await completeJob(ctx, jobId, {
      status: "success", duration_ms, errors_count: 0,
    }, { costUsd: 0, durationMs: duration_ms });

    return jsonResponse({ success: true, status: "passed", message: "CI validation passed" });
  }

  // Failure
  await pipelineLog(ctx, "ci_build_failure",
    `CI failed: ${errors.length} errors (${duration_ms}ms). Triggering Fix Swarm...`,
    { errors_count: errors.length, run_id });

  for (const err of errors.slice(0, 30)) {
    await recordError(ctx, err.message, err.category || "typescript", err.file,
      `CI ${err.category} error at ${err.file}:${err.line || "?"}`, `Fix: ${err.message}`);
  }

  await serviceClient.from("initiatives").update({
    execution_progress: {
      ci_errors: errors.slice(0, 50),
      ci_build_log: build_log?.slice(0, 5000),
      ci_status: "failed",
      ci_run_id: run_id,
      ci_failed_at: new Date().toISOString(),
    },
    stage_status: "validating",
  }).eq("id", initiative_id);

  if (jobId) await completeJob(ctx, jobId, {
    status: "failure", errors_count: errors.length,
    errors: errors.slice(0, 30), duration_ms,
  }, { costUsd: 0, durationMs: duration_ms });

  // Trigger Fix Orchestrator
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  try {
    const orchResp = await fetch(`${supabaseUrl}/functions/v1/pipeline-fix-orchestrator`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${webhookSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        initiative_id,
        organization_id,
        ci_run_id: run_id,
        owner: repo_owner,
        repo: repo_name,
      }),
    });

    const orchResult = await orchResp.json();
    await pipelineLog(ctx, "fix_swarm_triggered",
      `Fix Swarm triggered: ${orchResult.files_fixed || 0} fixes`,
      { orchestrator_result: orchResult });

    return jsonResponse({
      success: true, status: "failed",
      errors_count: errors.length,
      fix_swarm_triggered: true,
      fix_result: orchResult,
    });
  } catch (orchError) {
    console.error("Fix Orchestrator trigger failed:", orchError);
    return jsonResponse({
      success: true, status: "failed",
      errors_count: errors.length,
      fix_swarm_triggered: false,
      message: "CI errors recorded. Fix Swarm trigger failed.",
    });
  }
}
