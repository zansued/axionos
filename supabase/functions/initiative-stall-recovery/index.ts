/**
 * Initiative Stall Recovery — Auto-Recovery Engine
 *
 * Detects initiatives stuck in transitional states for 48+ hours
 * and automatically retries them by re-triggering the pipeline.
 *
 * Designed to run via pg_cron once per day.
 *
 * Governance:
 * - Only retries initiatives in known "processing" states (not terminal/completed)
 * - Max 2 auto-retries per initiative before escalating to audit log
 * - Full audit trail in audit_logs
 * - Does NOT retry initiatives in terminal states (completed, archived, failed, draft)
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

const STALL_THRESHOLD_HOURS = 48;
const MAX_AUTO_RETRIES = 2;

// States that indicate "work in progress" — if stuck here, something went wrong
const TRANSITIONAL_STATES = [
  "discovering", "architecting", "architecture_simulating", "preventive_validating",
  "bootstrap_planning", "foundation_scaffolding", "simulating_modules",
  "analyzing_dependencies", "bootstrapping_schema", "provisioning_db",
  "analyzing_domain", "generating_data_model", "synthesizing_logic",
  "generating_api", "generating_ui", "forming_squad", "planning",
  "in_progress", "validating", "publishing", "deploying",
  "observing_product", "analyzing_product_metrics", "analyzing_user_behavior",
  "optimizing_growth", "learning_system", "managing_portfolio",
];

// States where the initiative completed a phase and is waiting for approval/next action
// These can also stall if auto-chaining didn't trigger
const WAITING_STATES = [
  "opportunity_discovered", "market_signals_analyzed", "product_validated",
  "revenue_strategized", "discovered", "architected", "architecture_simulated",
  "preventive_validated", "bootstrap_planned", "foundation_scaffolded",
  "scaffolded", "modules_simulated", "dependencies_analyzed",
  "schema_bootstrapped", "db_provisioned", "domain_analyzed",
  "data_model_generated", "logic_synthesized", "api_generated",
  "ui_generated", "squad_formed", "squad_ready", "planned",
  "ready_to_publish", "published", "deployed",
  "observability_ready", "analytics_ready", "behavior_analyzed",
  "growth_optimized", "product_evolved", "architecture_evolved",
  "portfolio_managed",
];

const ALL_RECOVERABLE_STATES = [...TRANSITIONAL_STATES, ...WAITING_STATES];

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    // Auth: accept cron secret or service role key
    const authHeader = req.headers.get("Authorization");
    const cronSecret = Deno.env.get("CRON_SECRET");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    // Validate caller
    const token = authHeader?.replace("Bearer ", "") || "";
    const isCron = req.headers.get("x-cron-secret") === cronSecret;
    const isServiceRole = token === serviceRoleKey;
    const isApiKey = authHeader?.includes(Deno.env.get("SUPABASE_ANON_KEY") || "__none__");

    if (!isCron && !isServiceRole && !isApiKey) {
      return errorResponse("Unauthorized", 401);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Find stalled initiatives
    const thresholdDate = new Date(Date.now() - STALL_THRESHOLD_HOURS * 60 * 60 * 1000).toISOString();

    const { data: stalledInitiatives, error: queryErr } = await serviceClient
      .from("initiatives")
      .select("id, title, stage_status, updated_at, organization_id, user_id, metadata")
      .in("stage_status", ALL_RECOVERABLE_STATES)
      .lt("updated_at", thresholdDate)
      .order("updated_at", { ascending: true })
      .limit(20);

    if (queryErr) {
      console.error("[StallRecovery] Query error:", queryErr);
      return errorResponse("Failed to query stalled initiatives", 500);
    }

    if (!stalledInitiatives || stalledInitiatives.length === 0) {
      return jsonResponse({ message: "No stalled initiatives found", recovered: 0 });
    }

    console.log(`[StallRecovery] Found ${stalledInitiatives.length} stalled initiatives`);

    const results: Array<{ id: string; title: string; status: string; action: string }> = [];

    for (const initiative of stalledInitiatives) {
      const metadata = (initiative.metadata as Record<string, any>) || {};
      const autoRetryCount = metadata.auto_retry_count || 0;

      // Check retry limit
      if (autoRetryCount >= MAX_AUTO_RETRIES) {
        // Escalate — log and skip
        await serviceClient.from("audit_logs").insert({
          user_id: initiative.user_id,
          action: "stall_recovery_escalated",
          category: "pipeline",
          entity_type: "initiatives",
          entity_id: initiative.id,
          severity: "warning",
          organization_id: initiative.organization_id,
          message: `Iniciativa "${initiative.title}" estagnada em "${initiative.stage_status}" por ${STALL_THRESHOLD_HOURS}h+. Max retries (${MAX_AUTO_RETRIES}) atingido. Requer intervenção manual.`,
          metadata: { stage_status: initiative.stage_status, auto_retry_count: autoRetryCount, updated_at: initiative.updated_at },
        });

        results.push({ id: initiative.id, title: initiative.title, status: initiative.stage_status, action: "escalated" });
        continue;
      }

      // Determine recovery action
      const isTransitional = TRANSITIONAL_STATES.includes(initiative.stage_status);

      try {
        if (isTransitional) {
          // Re-trigger the pipeline for this initiative via run-initiative-pipeline
          const pipelineRes = await fetch(`${supabaseUrl}/functions/v1/run-initiative-pipeline`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              initiativeId: initiative.id,
              action: "run_stage",
              stage: initiative.stage_status,
            }),
          });

          const retryResult = pipelineRes.ok ? "retried" : `retry_failed_${pipelineRes.status}`;

          // Update retry counter
          await serviceClient
            .from("initiatives")
            .update({
              metadata: { ...metadata, auto_retry_count: autoRetryCount + 1, last_auto_retry: new Date().toISOString() },
              updated_at: new Date().toISOString(),
            })
            .eq("id", initiative.id);

          // Audit log
          await serviceClient.from("audit_logs").insert({
            user_id: initiative.user_id,
            action: "stall_recovery_retry",
            category: "pipeline",
            entity_type: "initiatives",
            entity_id: initiative.id,
            severity: "info",
            organization_id: initiative.organization_id,
            message: `Auto-retry #${autoRetryCount + 1} para "${initiative.title}" em estado "${initiative.stage_status}".`,
            metadata: { stage_status: initiative.stage_status, retry_number: autoRetryCount + 1, result: retryResult },
          });

          results.push({ id: initiative.id, title: initiative.title, status: initiative.stage_status, action: retryResult });

        } else {
          // Waiting state — try to approve/advance via pipeline-approve
          const approveRes = await fetch(`${supabaseUrl}/functions/v1/pipeline-approve`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({ initiativeId: initiative.id }),
          });

          const approveResult = approveRes.ok ? "auto_approved" : `approve_failed_${approveRes.status}`;

          // Update retry counter
          await serviceClient
            .from("initiatives")
            .update({
              metadata: { ...metadata, auto_retry_count: autoRetryCount + 1, last_auto_retry: new Date().toISOString() },
              updated_at: new Date().toISOString(),
            })
            .eq("id", initiative.id);

          // Audit log
          await serviceClient.from("audit_logs").insert({
            user_id: initiative.user_id,
            action: "stall_recovery_auto_approve",
            category: "pipeline",
            entity_type: "initiatives",
            entity_id: initiative.id,
            severity: "info",
            organization_id: initiative.organization_id,
            message: `Auto-approve #${autoRetryCount + 1} para "${initiative.title}" em estado "${initiative.stage_status}" (parado ${STALL_THRESHOLD_HOURS}h+).`,
            metadata: { stage_status: initiative.stage_status, retry_number: autoRetryCount + 1, result: approveResult },
          });

          results.push({ id: initiative.id, title: initiative.title, status: initiative.stage_status, action: approveResult });
        }
      } catch (err) {
        console.error(`[StallRecovery] Error recovering initiative ${initiative.id}:`, err);
        results.push({ id: initiative.id, title: initiative.title, status: initiative.stage_status, action: "error" });
      }
    }

    const recovered = results.filter(r => r.action === "retried" || r.action === "auto_approved").length;
    const escalated = results.filter(r => r.action === "escalated").length;

    console.log(`[StallRecovery] Done: ${recovered} recovered, ${escalated} escalated, ${results.length} total`);

    return jsonResponse({
      message: `Stall recovery complete`,
      total_found: stalledInitiatives.length,
      recovered,
      escalated,
      results,
    });

  } catch (error) {
    console.error("[StallRecovery] Critical error:", error);
    return errorResponse("Internal error", 500);
  }
});
