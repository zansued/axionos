import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, AuthContext } from "../_shared/auth.ts";
import { detectDrift } from "../_shared/platform-stabilization/platform-drift-detector.ts";
import { detectOscillation } from "../_shared/platform-stabilization/platform-oscillation-detector.ts";
import { generateStabilizationProposals, validateStabilizationTarget } from "../_shared/platform-stabilization/platform-stability-guard.ts";
import { buildStabilizationAction } from "../_shared/platform-stabilization/platform-stabilization-action-engine.ts";
import { getDefaultSafeModeProfiles, selectSafeModeProfile } from "../_shared/platform-stabilization/platform-safe-mode-manager.ts";
import { buildOutcome, evaluateOutcome } from "../_shared/platform-stabilization/platform-stabilization-outcome-tracker.ts";
import { buildStabilizationRollback, shouldRollback } from "../_shared/platform-stabilization/platform-stabilization-rollback-engine.ts";
import { computeStabilityScores } from "../_shared/platform-stabilization/platform-stability-model.ts";

/**
 * platform-self-stabilization — Sprint 34
 *
 * Actions:
 *   overview                          — Stability overview
 *   get_signals                       — List stability signals
 *   get_actions                       — List stabilization actions
 *   get_safe_mode_profiles            — List safe mode profiles
 *   get_outcomes                      — List stabilization outcomes
 *   get_rollbacks                     — List stabilization rollbacks
 *   explain                           — Explain a stability signal
 *   recompute                         — Recompute stability signals
 *   review_action                     — Mark action as reviewed
 *   apply_stabilization               — Apply a stabilization action
 *   rollback_stabilization            — Rollback a stabilization
 *   reject_action                     — Reject a stabilization action
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

    const orgFilter = `organization_id.is.null,organization_id.eq.${organization_id}`;

    // ─── OVERVIEW ───
    if (action === "overview") {
      const [{ data: signals }, { data: actions }, { data: outcomes }, { data: rollbacks }, { data: profiles }] = await Promise.all([
        sc.from("platform_stability_signals").select("*").or(orgFilter),
        sc.from("platform_stabilization_actions").select("*").or(orgFilter).order("created_at", { ascending: false }).limit(20),
        sc.from("platform_stabilization_outcomes").select("*").or(orgFilter).order("created_at", { ascending: false }).limit(20),
        sc.from("platform_stabilization_rollbacks").select("*").or(orgFilter).order("created_at", { ascending: false }).limit(10),
        sc.from("platform_safe_mode_profiles").select("*").or(orgFilter),
      ]);

      const allSignals = signals || [];
      const allActions = actions || [];
      const allOutcomes = outcomes || [];

      const scores = computeStabilityScores({
        healthy_signals: allSignals.filter((s: any) => s.status === "healthy").length,
        watch_signals: allSignals.filter((s: any) => s.status === "watch").length,
        unstable_signals: allSignals.filter((s: any) => s.status === "unstable").length,
        critical_signals: allSignals.filter((s: any) => s.status === "critical").length,
        total_signals: Math.max(allSignals.length, 1),
        policy_transitions: 0,
        strategy_transitions: 0,
        calibration_proposals: 0,
        total_adaptive_events: 1,
        oscillation_count: 0,
        oscillation_entities: 0,
        helpful_outcomes: allOutcomes.filter((o: any) => o.outcome_status === "helpful").length,
        harmful_outcomes: allOutcomes.filter((o: any) => o.outcome_status === "harmful").length,
        total_outcomes: allOutcomes.length,
        successful_rollbacks: (rollbacks || []).length,
        total_rollbacks: (rollbacks || []).length,
        stabilization_applied: allActions.filter((a: any) => a.status === "applied").length,
        stabilization_helpful: allOutcomes.filter((o: any) => o.outcome_status === "helpful").length,
      });

      return jsonResponse({
        total_signals: allSignals.length,
        healthy_signals: allSignals.filter((s: any) => s.status === "healthy").length,
        watch_signals: allSignals.filter((s: any) => s.status === "watch").length,
        unstable_signals: allSignals.filter((s: any) => s.status === "unstable").length,
        critical_signals: allSignals.filter((s: any) => s.status === "critical").length,
        open_actions: allActions.filter((a: any) => a.status === "open").length,
        applied_actions: allActions.filter((a: any) => a.status === "applied").length,
        total_outcomes: allOutcomes.length,
        total_rollbacks: (rollbacks || []).length,
        safe_mode_profiles: (profiles || []).length,
        scores,
        recent_actions: allActions.slice(0, 5),
        recent_outcomes: allOutcomes.slice(0, 5),
        recent_rollbacks: (rollbacks || []).slice(0, 3),
      });
    }

    // ─── GET SIGNALS ───
    if (action === "get_signals") {
      let query = sc.from("platform_stability_signals").select("*").or(orgFilter);
      if (body.status) query = query.eq("status", body.status);
      if (body.signal_family) query = query.eq("signal_family", body.signal_family);
      const { data } = await query.order("signal_key");
      return jsonResponse({ signals: data || [] });
    }

    // ─── GET ACTIONS ───
    if (action === "get_actions") {
      let query = sc.from("platform_stabilization_actions").select("*").or(orgFilter);
      if (body.status) query = query.eq("status", body.status);
      const { data } = await query.order("created_at", { ascending: false }).limit(body.limit || 50);
      return jsonResponse({ actions: data || [] });
    }

    // ─── GET SAFE MODE PROFILES ───
    if (action === "get_safe_mode_profiles") {
      const { data } = await sc.from("platform_safe_mode_profiles").select("*").or(orgFilter).order("profile_key");
      return jsonResponse({ profiles: data || [] });
    }

    // ─── GET OUTCOMES ───
    if (action === "get_outcomes") {
      const { data } = await sc.from("platform_stabilization_outcomes").select("*").or(orgFilter).order("created_at", { ascending: false }).limit(body.limit || 50);
      return jsonResponse({ outcomes: data || [] });
    }

    // ─── GET ROLLBACKS ───
    if (action === "get_rollbacks") {
      const { data } = await sc.from("platform_stabilization_rollbacks").select("*").or(orgFilter).order("created_at", { ascending: false }).limit(body.limit || 20);
      return jsonResponse({ rollbacks: data || [] });
    }

    // ─── EXPLAIN ───
    if (action === "explain") {
      if (!body.signal_key) return errorResponse("signal_key required", 400);
      const { data: signal } = await sc.from("platform_stability_signals").select("*").eq("signal_key", body.signal_key).maybeSingle();
      const { data: actions } = await sc.from("platform_stabilization_actions").select("*").or(orgFilter).order("created_at", { ascending: false }).limit(5);
      return jsonResponse({ signal, related_actions: actions || [] });
    }

    // ─── RECOMPUTE ───
    if (action === "recompute") {
      const driftInput = {
        policy_lifecycle_churn: body.policy_lifecycle_churn || 0,
        strategy_lifecycle_churn: body.strategy_lifecycle_churn || 0,
        calibration_proposal_volatility: body.calibration_proposal_volatility || 0,
        harmful_outcome_rate: body.harmful_outcome_rate || 0,
        recommendation_queue_size: body.recommendation_queue_size || 0,
        tenant_tuning_divergence: body.tenant_tuning_divergence || 0,
        retry_burden_shift: body.retry_burden_shift || 0,
        health_index_volatility: body.health_index_volatility || 0,
        portfolio_conflict_rate: body.portfolio_conflict_rate || 0,
        context_performance_variance: body.context_performance_variance || 0,
      };

      const driftSignals = detectDrift(driftInput);
      const oscillationSignals = detectOscillation(body.oscillation_events || []);
      const proposals = generateStabilizationProposals(driftSignals, oscillationSignals);

      // Persist actions
      let created = 0;
      for (const p of proposals) {
        const act = buildStabilizationAction(p);
        await sc.from("platform_stabilization_actions").insert({ ...act, organization_id });
        created++;
      }

      return jsonResponse({
        drift_signals: driftSignals.length,
        oscillation_signals: oscillationSignals.length,
        actions_created: created,
        recomputed_at: new Date().toISOString(),
      });
    }

    // ─── REVIEW ACTION ───
    if (action === "review_action") {
      if (!body.action_id) return errorResponse("action_id required", 400);
      await sc.from("platform_stabilization_actions").update({ status: "reviewed" }).eq("id", body.action_id);
      return jsonResponse({ success: true });
    }

    // ─── REJECT ACTION ───
    if (action === "reject_action") {
      if (!body.action_id) return errorResponse("action_id required", 400);
      await sc.from("platform_stabilization_actions").update({ status: "rejected" }).eq("id", body.action_id);
      return jsonResponse({ success: true });
    }

    // ─── APPLY STABILIZATION ───
    if (action === "apply_stabilization") {
      if (!body.action_id) return errorResponse("action_id required", 400);
      const { data: act } = await sc.from("platform_stabilization_actions").select("*").eq("id", body.action_id).maybeSingle();
      if (!act) return errorResponse("Action not found", 404);
      if (act.status !== "open" && act.status !== "reviewed") return errorResponse("Action not in applicable state", 400);

      await sc.from("platform_stabilization_actions").update({ status: "applied" }).eq("id", body.action_id);
      return jsonResponse({ success: true, applied: act });
    }

    // ─── ROLLBACK STABILIZATION ───
    if (action === "rollback_stabilization") {
      if (!body.action_id) return errorResponse("action_id required", 400);
      const { data: act } = await sc.from("platform_stabilization_actions").select("*").eq("id", body.action_id).maybeSingle();
      if (!act) return errorResponse("Action not found", 404);

      const rollback = buildStabilizationRollback({
        stabilization_action_id: body.action_id,
        restored_state: body.restored_state || {},
        rollback_reason: body.reason || { manual: true },
        rollback_mode: body.rollback_mode || "manual",
      });

      await sc.from("platform_stabilization_rollbacks").insert({ ...rollback, organization_id });
      await sc.from("platform_stabilization_actions").update({ status: "rolled_back" }).eq("id", body.action_id);

      return jsonResponse({ success: true, rollback });
    }

    return errorResponse("Invalid action", 400);
  } catch (e) {
    console.error("platform-self-stabilization error:", e);
    return errorResponse(e.message || "Internal error", 500);
  }
});
