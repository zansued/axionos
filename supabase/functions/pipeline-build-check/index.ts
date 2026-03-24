/**
 * Sprint 211 — pipeline-build-check
 * 
 * Synthetic build validation edge function (dry-run).
 * Receives generated file artifacts and validates they would produce
 * a successful Vite build without actually running one.
 * 
 * Called pre-publish to gate deployment on build readiness.
 * 
 * POST /pipeline-build-check
 * Body: { initiativeId, organizationId } — fetches artifacts from DB
 *   OR: { files: [{ filePath, content }] } — direct file validation
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { validateBuildHealth, type FileArtifact } from "../_shared/build-health-validator.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("Unauthorized", 401);
    }
    const token = authHeader.replace("Bearer ", "");

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    let files: FileArtifact[] = [];

    // Mode 1: Direct file validation
    if (body.files && Array.isArray(body.files)) {
      files = body.files.filter((f: any) => f.filePath && f.content);
    }
    // Mode 2: Fetch from DB by initiative
    else if (body.initiativeId) {
      const { data: artifacts } = await serviceClient
        .from("agent_outputs")
        .select("raw_output, subtask_id")
        .eq("initiative_id", body.initiativeId)
        .eq("type", "code")
        .order("created_at", { ascending: true });

      if (!artifacts || artifacts.length === 0) {
        return jsonResponse({
          success: false,
          error: "No artifacts found for initiative",
          deployable: false,
        });
      }

      // Also fetch subtask file paths for mapping
      const subtaskIds = artifacts.map((a: any) => a.subtask_id).filter(Boolean);
      const { data: subtasks } = subtaskIds.length > 0
        ? await serviceClient
            .from("story_subtasks")
            .select("id, file_path")
            .in("id", subtaskIds)
        : { data: [] };

      const subtaskMap = new Map<string, string>();
      for (const st of subtasks || []) {
        if (st.file_path) subtaskMap.set(st.id, st.file_path);
      }

      // Deduplicate: keep latest version per file path
      const fileVersions = new Map<string, string>();
      for (const art of artifacts) {
        const raw = art.raw_output as any;
        const filePath = raw?.file_path || (art.subtask_id ? subtaskMap.get(art.subtask_id) : null);
        const content = raw?.content || raw?.text || "";
        if (filePath && content) {
          fileVersions.set(filePath, content); // last write wins
        }
      }

      files = [...fileVersions.entries()].map(([filePath, content]) => ({ filePath, content }));
    } else {
      return errorResponse("Missing 'files' array or 'initiativeId'", 400);
    }

    if (files.length === 0) {
      return jsonResponse({
        success: false,
        error: "No valid files to validate",
        deployable: false,
      });
    }

    // Run synthetic build validation
    const report = validateBuildHealth(files);

    // Log result if we have an initiative
    if (body.initiativeId && body.organizationId) {
      serviceClient.from("audit_logs").insert({
        user_id: body.userId || null,
        action: "sprint211_build_check",
        category: "pipeline",
        entity_type: "initiatives",
        entity_id: body.initiativeId,
        message: `Sprint 211 Build Check: score=${report.summary.score}%, deployable=${report.deployable}, files=${files.length}`,
        severity: report.deployable ? "info" : "warning",
        organization_id: body.organizationId,
        metadata: {
          summary: report.summary,
          deployable: report.deployable,
          filesChecked: files.length,
          importValidation: report.importValidation,
          failedChecks: report.checks.filter(c => c.status === "fail").map(c => ({ id: c.id, label: c.label, detail: c.detail })),
        },
      }).then(() => {}).catch(() => {});
    }

    return jsonResponse({
      success: true,
      deployable: report.deployable,
      score: report.summary.score,
      summary: report.summary,
      checks: report.checks,
      issues: report.issues,
      importValidation: report.importValidation,
      filesAnalyzed: files.length,
    });
  } catch (e) {
    console.error("[pipeline-build-check] Error:", e);
    return errorResponse(e instanceof Error ? e.message : "Internal error", 500);
  }
});
