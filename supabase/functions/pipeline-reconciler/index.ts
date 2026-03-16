import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { validateTransition, isTerminalStatus } from "../_shared/initiative-state-machine.ts";

/**
 * Sprint 204 — Pipeline Reconciler
 * 
 * Detects and optionally corrects divergences between:
 * - stage_status vs execution_progress
 * - stage_status vs initiative_jobs
 * - stage_status vs repo_url / deploy_url
 * 
 * Modes:
 * - audit (default): report divergences only
 * - fix: auto-correct where safe
 */
serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return errorResponse("Unauthorized", 401);
  }

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return errorResponse("Unauthorized", 401);

  const body = await req.json();
  const { initiativeId, organizationId, mode = "audit" } = body;

  // Scope: single initiative or org-wide
  let query = serviceClient
    .from("initiatives")
    .select("id, title, stage_status, execution_progress, repo_url, deploy_url, organization_id");

  if (initiativeId) {
    query = query.eq("id", initiativeId);
  } else if (organizationId) {
    query = query.eq("organization_id", organizationId);
  } else {
    return errorResponse("initiativeId or organizationId required", 400);
  }

  const { data: initiatives, error: initErr } = await query;
  if (initErr) return errorResponse(initErr.message, 500);

  const divergences: any[] = [];
  const fixes: any[] = [];

  for (const init of (initiatives || [])) {
    const status = init.stage_status;
    const progress = init.execution_progress as any;
    const issues: string[] = [];

    // ── Rule 1: "published" without repo_url ──
    if (["published", "deploying", "deployed", "completed"].includes(status) && !init.repo_url) {
      issues.push(`stage_status="${status}" but repo_url is null`);
      if (mode === "fix" && status === "published") {
        // Revert to ready_to_publish
        const tr = validateTransition("ready_to_publish", status);
        // Reverse: we set it BACK
        await serviceClient.from("initiatives").update({ stage_status: "ready_to_publish" }).eq("id", init.id);
        fixes.push({ id: init.id, action: "reverted_to_ready_to_publish", reason: "published without repo_url" });
      }
    }

    // ── Rule 2: execution_progress 100% but status still "in_progress" ──
    if (progress?.percent === 100 && status === "in_progress") {
      issues.push(`execution_progress is 100% but stage_status is still "in_progress"`);
      if (mode === "fix") {
        await serviceClient.from("initiatives").update({ stage_status: "validating" }).eq("id", init.id);
        fixes.push({ id: init.id, action: "advanced_to_validating", reason: "progress 100% stuck in in_progress" });
      }
    }

    // ── Rule 3: planning status but execution_progress exists and > 0 ──
    if (["planning", "planned", "planning_ready"].includes(status) && progress?.percent && progress.percent > 0) {
      issues.push(`stage_status="${status}" but execution_progress shows ${progress.percent}% — possible stale status`);
    }

    // ── Rule 4: Terminal status with running jobs ──
    if (isTerminalStatus(status)) {
      const { count } = await serviceClient
        .from("initiative_jobs")
        .select("id", { count: "exact", head: true })
        .eq("initiative_id", init.id)
        .eq("status", "running");

      if (count && count > 0) {
        issues.push(`Terminal status "${status}" but ${count} jobs still running`);
        if (mode === "fix") {
          await serviceClient
            .from("initiative_jobs")
            .update({ status: "failed", error: "Reconciler: initiative already terminal", completed_at: new Date().toISOString() })
            .eq("initiative_id", init.id)
            .eq("status", "running");
          fixes.push({ id: init.id, action: "killed_orphan_jobs", count });
        }
      }
    }

    // ── Rule 5: deploy_url set but status not deployed/completed ──
    if (init.deploy_url && !["deployed", "completed", "observability_ready", "analytics_ready", "runtime_active"].includes(status)) {
      issues.push(`deploy_url is set but stage_status="${status}"`);
    }

    if (issues.length > 0) {
      divergences.push({ id: init.id, title: init.title, stage_status: status, issues });
    }
  }

  // Log reconciliation run
  const orgId = initiatives?.[0]?.organization_id || organizationId;
  if (orgId) {
    await serviceClient.from("audit_logs").insert({
      user_id: user.id,
      action: "pipeline_reconciliation",
      category: "pipeline",
      entity_type: "initiatives",
      entity_id: initiativeId || "org_wide",
      message: `Reconciler ran in "${mode}" mode. Found ${divergences.length} divergence(s), applied ${fixes.length} fix(es).`,
      severity: divergences.length > 0 ? "warning" : "info",
      organization_id: orgId,
      metadata: { mode, divergence_count: divergences.length, fix_count: fixes.length },
    });
  }

  return jsonResponse({
    mode,
    total_checked: initiatives?.length || 0,
    divergences,
    fixes_applied: fixes,
  });
});
