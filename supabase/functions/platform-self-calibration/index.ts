import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, AuthContext, requireOrgMembership } from "../_shared/auth.ts";
import { interpretCalibrationSignals } from "../_shared/platform-calibration/platform-calibration-signal-interpreter.ts";
import { generateProposals } from "../_shared/platform-calibration/platform-calibration-proposal-engine.ts";
import { validateProposal } from "../_shared/platform-calibration/platform-calibration-guardrails.ts";
import { buildApplication, computeParameterUpdate } from "../_shared/platform-calibration/platform-calibration-runner.ts";
import { buildRollback } from "../_shared/platform-calibration/platform-calibration-rollback-engine.ts";

/**
 * platform-self-calibration — Sprint 31
 *
 * Actions:
 *   overview           — Calibration overview
 *   get_parameters     — List calibration parameters
 *   get_proposals      — List calibration proposals
 *   get_applications   — List calibration applications
 *   get_rollbacks      — List calibration rollbacks
 *   explain            — Explain a specific calibration
 *   recompute          — Recompute calibration signals and generate proposals
 *   review_proposal    — Mark proposal as reviewed
 *   apply_calibration  — Apply a calibration proposal
 *   rollback           — Rollback a calibration
 *   reject_proposal    — Reject a proposal
 */

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = await authenticate(req);
    if (auth instanceof Response) return auth;
    const { user, serviceClient: sc } = auth as AuthContext;

    const body = await req.json();
    const { action, organization_id } = body;

    if (!organization_id) return errorResponse("organization_id required", 400);

    // ─── OVERVIEW ───
    if (action === "overview") {
      const [{ data: params }, { data: proposals }, { data: applications }, { data: rollbacks }] = await Promise.all([
        sc.from("platform_calibration_parameters").select("*").or(`organization_id.is.null,organization_id.eq.${organization_id}`),
        sc.from("platform_calibration_proposals").select("*").or(`organization_id.is.null,organization_id.eq.${organization_id}`).order("created_at", { ascending: false }).limit(20),
        sc.from("platform_calibration_applications").select("*").or(`organization_id.is.null,organization_id.eq.${organization_id}`).order("created_at", { ascending: false }).limit(20),
        sc.from("platform_calibration_rollbacks").select("*").or(`organization_id.is.null,organization_id.eq.${organization_id}`).order("created_at", { ascending: false }).limit(10),
      ]);

      const allParams = params || [];
      const allProposals = proposals || [];
      const allApps = applications || [];

      return jsonResponse({
        total_parameters: allParams.length,
        active_parameters: allParams.filter((p: any) => p.status === "active").length,
        frozen_parameters: allParams.filter((p: any) => p.status === "frozen").length,
        open_proposals: allProposals.filter((p: any) => p.status === "open").length,
        applied_calibrations: allApps.filter((a: any) => a.outcome_status !== "rolled_back").length,
        pending_outcomes: allApps.filter((a: any) => a.outcome_status === "pending").length,
        helpful_outcomes: allApps.filter((a: any) => a.outcome_status === "helpful").length,
        harmful_outcomes: allApps.filter((a: any) => a.outcome_status === "harmful").length,
        total_rollbacks: (rollbacks || []).length,
        recent_proposals: allProposals.slice(0, 5),
        recent_applications: allApps.slice(0, 5),
        recent_rollbacks: (rollbacks || []).slice(0, 5),
      });
    }

    // ─── GET PARAMETERS ───
    if (action === "get_parameters") {
      let query = sc.from("platform_calibration_parameters").select("*").or(`organization_id.is.null,organization_id.eq.${organization_id}`);
      if (body.status) query = query.eq("status", body.status);
      if (body.parameter_family) query = query.eq("parameter_family", body.parameter_family);
      const { data } = await query.order("parameter_key");
      return jsonResponse({ parameters: data || [] });
    }

    // ─── GET PROPOSALS ───
    if (action === "get_proposals") {
      let query = sc.from("platform_calibration_proposals").select("*").or(`organization_id.is.null,organization_id.eq.${organization_id}`);
      if (body.status) query = query.eq("status", body.status);
      const { data } = await query.order("created_at", { ascending: false }).limit(body.limit || 50);
      return jsonResponse({ proposals: data || [] });
    }

    // ─── GET APPLICATIONS ───
    if (action === "get_applications") {
      let query = sc.from("platform_calibration_applications").select("*").or(`organization_id.is.null,organization_id.eq.${organization_id}`);
      if (body.outcome_status) query = query.eq("outcome_status", body.outcome_status);
      const { data } = await query.order("created_at", { ascending: false }).limit(body.limit || 50);
      return jsonResponse({ applications: data || [] });
    }

    // ─── GET ROLLBACKS ───
    if (action === "get_rollbacks") {
      const { data } = await sc.from("platform_calibration_rollbacks").select("*").or(`organization_id.is.null,organization_id.eq.${organization_id}`).order("created_at", { ascending: false }).limit(body.limit || 20);
      return jsonResponse({ rollbacks: data || [] });
    }

    // ─── EXPLAIN ───
    if (action === "explain") {
      if (!body.parameter_key) return errorResponse("parameter_key required", 400);
      const { data: param } = await sc.from("platform_calibration_parameters").select("*").eq("parameter_key", body.parameter_key).maybeSingle();
      const { data: proposals } = await sc.from("platform_calibration_proposals").select("*").eq("parameter_key", body.parameter_key).order("created_at", { ascending: false }).limit(5);
      const { data: applications } = await sc.from("platform_calibration_applications").select("*").eq("parameter_key", body.parameter_key).order("created_at", { ascending: false }).limit(5);
      return jsonResponse({ parameter: param, proposals: proposals || [], applications: applications || [] });
    }

    // ─── RECOMPUTE ───
    if (action === "recompute") {
      // Gather platform intelligence signals
      const { data: insights } = await sc.from("platform_insights").select("*").or(`organization_id.is.null,organization_id.eq.${organization_id}`).order("created_at", { ascending: false }).limit(100);
      const { data: recs } = await sc.from("platform_recommendations").select("*").or(`organization_id.is.null,organization_id.eq.${organization_id}`);

      const allInsights = insights || [];
      const allRecs = recs || [];
      const accepted = allRecs.filter((r: any) => r.status === "accepted").length;
      const rejected = allRecs.filter((r: any) => r.status === "rejected").length;
      const total = allRecs.length || 1;

      const signalInput = {
        bottleneck_false_positive_rate: body.bottleneck_false_positive_rate || 0,
        bottleneck_false_negative_rate: body.bottleneck_false_negative_rate || 0,
        insight_confidence_drift: body.insight_confidence_drift || 0,
        recommendation_acceptance_rate: accepted / total,
        recommendation_rejection_rate: rejected / total,
        health_metric_changes: body.health_metric_changes || {},
        policy_effectiveness_drift: body.policy_effectiveness_drift || 0,
        predictive_warning_miss_rate: body.predictive_warning_miss_rate || 0,
        tenant_drift_instability: body.tenant_drift_instability || 0,
        recommendation_queue_size: allRecs.filter((r: any) => r.status === "open").length,
        sample_size: allInsights.length,
      };

      const opportunities = interpretCalibrationSignals(signalInput);

      // Get parameters for proposal generation
      const { data: params } = await sc.from("platform_calibration_parameters").select("*").or(`organization_id.is.null,organization_id.eq.${organization_id}`);
      const proposals = generateProposals(opportunities, (params || []) as any);

      // Persist proposals
      let created = 0;
      for (const p of proposals) {
        await sc.from("platform_calibration_proposals").insert({
          parameter_key: p.parameter_key,
          scope_ref: p.scope_ref,
          current_value: p.current_value,
          proposed_value: p.proposed_value,
          expected_impact: p.expected_impact,
          rationale_codes: p.rationale_codes,
          evidence_refs: p.evidence_refs,
          confidence_score: p.confidence_score,
          proposal_mode: p.proposal_mode,
          organization_id,
          status: "open",
        });
        created++;
      }

      return jsonResponse({ opportunities: opportunities.length, proposals_created: created, recomputed_at: new Date().toISOString() });
    }

    // ─── REVIEW PROPOSAL ───
    if (action === "review_proposal") {
      if (!body.proposal_id) return errorResponse("proposal_id required", 400);
      await sc.from("platform_calibration_proposals").update({ status: "reviewed" }).eq("id", body.proposal_id);
      return jsonResponse({ success: true });
    }

    // ─── REJECT PROPOSAL ───
    if (action === "reject_proposal") {
      if (!body.proposal_id) return errorResponse("proposal_id required", 400);
      await sc.from("platform_calibration_proposals").update({ status: "rejected" }).eq("id", body.proposal_id);
      return jsonResponse({ success: true });
    }

    // ─── APPLY CALIBRATION ───
    if (action === "apply_calibration") {
      if (!body.proposal_id) return errorResponse("proposal_id required", 400);

      const { data: proposal } = await sc.from("platform_calibration_proposals").select("*").eq("id", body.proposal_id).maybeSingle();
      if (!proposal) return errorResponse("Proposal not found", 404);
      if (proposal.status !== "open" && proposal.status !== "reviewed" && proposal.status !== "accepted") {
        return errorResponse("Proposal not in applicable state", 400);
      }

      const { data: param } = await sc.from("platform_calibration_parameters").select("*").eq("parameter_key", proposal.parameter_key).maybeSingle();
      const guardrailResult = validateProposal(proposal as any, param as any);
      if (!guardrailResult.allowed) {
        return jsonResponse({ success: false, violations: guardrailResult.violations, warnings: guardrailResult.warnings }, 422);
      }

      const applyMode = body.apply_mode || "manual";
      const app = buildApplication(body.proposal_id, proposal as any, applyMode);

      const { data: appRecord } = await sc.from("platform_calibration_applications").insert({
        ...app,
        organization_id,
      }).select().maybeSingle();

      // Update parameter current_value
      const update = computeParameterUpdate(proposal as any);
      await sc.from("platform_calibration_parameters").update({ current_value: update.new_value, updated_at: new Date().toISOString() }).eq("parameter_key", update.parameter_key);

      // Mark proposal as applied
      await sc.from("platform_calibration_proposals").update({ status: "applied" }).eq("id", body.proposal_id);

      return jsonResponse({ success: true, application: appRecord, warnings: guardrailResult.warnings });
    }

    // ─── ROLLBACK ───
    if (action === "rollback") {
      if (!body.application_id) return errorResponse("application_id required", 400);

      const { data: app } = await sc.from("platform_calibration_applications").select("*").eq("id", body.application_id).maybeSingle();
      if (!app) return errorResponse("Application not found", 404);

      const rollback = buildRollback({
        application_id: body.application_id,
        parameter_key: app.parameter_key,
        previous_value: app.previous_value as any,
        rollback_reason: body.reason || { manual: true },
        rollback_mode: body.rollback_mode || "manual",
      });

      await sc.from("platform_calibration_rollbacks").insert({ ...rollback, organization_id });
      await sc.from("platform_calibration_parameters").update({ current_value: app.previous_value, updated_at: new Date().toISOString() }).eq("parameter_key", app.parameter_key);
      await sc.from("platform_calibration_applications").update({ outcome_status: "rolled_back" }).eq("id", body.application_id);
      await sc.from("platform_calibration_proposals").update({ status: "rolled_back" }).eq("id", app.proposal_id);

      return jsonResponse({ success: true, rollback });
    }

    return errorResponse("Invalid action", 400);
  } catch (e) {
    console.error("platform-self-calibration error:", e);
    return errorResponse(e.message || "Internal error", 500);
  }
});
