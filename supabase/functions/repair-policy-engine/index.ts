import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, AuthContext } from "../_shared/auth.ts";
import { selectRepairPolicy, type RepairContext } from "../_shared/repair/repair-policy-engine.ts";
import { retrieveRepairMemory, fetchPolicyProfile } from "../_shared/repair/repair-memory-retriever.ts";
import { computePolicyAdjustment, isAdjustmentBounded } from "../_shared/repair/repair-policy-updater.ts";
import { computeRetryAction, type RetryContext } from "../_shared/repair/retry-path-intelligence.ts";
import { explainRepairDecision } from "../_shared/repair/repair-policy-explainer.ts";

/**
 * Repair Policy Engine — Sprint 23
 *
 * Actions:
 *   overview — summary of repair policies
 *   profiles — list repair policy profiles
 *   decisions — list repair policy decisions
 *   adjustments — list repair policy adjustments
 *   explain — explain a specific decision
 *   select_strategy — compute best repair strategy for a failure context
 *   record_outcome — record repair outcome and adjust policy
 *   recompute — recompute a policy profile from evidence
 *   deprecate — deprecate a policy profile
 */
serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = await authenticate(req);
    if (auth instanceof Response) return auth;
    const { serviceClient: sc } = auth as AuthContext;

    const body = await req.json();
    const { action, organization_id } = body;

    if (!organization_id) return errorResponse("organization_id required", 400);

    // ─── OVERVIEW ───
    if (action === "overview") {
      const [profilesRes, decisionsRes, adjustmentsRes] = await Promise.all([
        sc.from("repair_policy_profiles").select("id, status, confidence, support_count, failure_count").eq("organization_id", organization_id),
        sc.from("repair_policy_decisions").select("id, outcome_status, confidence").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100),
        sc.from("repair_policy_adjustments").select("id, adjustment_type").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50),
      ]);

      const profiles = profilesRes.data || [];
      const decisions = decisionsRes.data || [];
      const adjustments = adjustmentsRes.data || [];

      const activeProfiles = profiles.filter((p: any) => p.status === "active").length;
      const watchProfiles = profiles.filter((p: any) => p.status === "watch").length;
      const resolvedDecisions = decisions.filter((d: any) => d.outcome_status === "resolved").length;
      const failedDecisions = decisions.filter((d: any) => d.outcome_status === "failed").length;
      const avgConfidence = profiles.length > 0 ? profiles.reduce((s: number, p: any) => s + (p.confidence || 0), 0) / profiles.length : 0;

      return jsonResponse({
        total_profiles: profiles.length,
        active_profiles: activeProfiles,
        watch_profiles: watchProfiles,
        total_decisions: decisions.length,
        resolved_decisions: resolvedDecisions,
        failed_decisions: failedDecisions,
        resolution_rate: decisions.length > 0 ? Math.round((resolvedDecisions / decisions.length) * 100) : 0,
        avg_confidence: Math.round(avgConfidence * 100) / 100,
        recent_adjustments: adjustments.length,
      });
    }

    // ─── PROFILES ───
    if (action === "profiles") {
      const { data, error } = await sc
        .from("repair_policy_profiles")
        .select("*")
        .eq("organization_id", organization_id)
        .order("confidence", { ascending: false })
        .limit(100);
      if (error) throw error;
      return jsonResponse({ profiles: data || [] });
    }

    // ─── DECISIONS ───
    if (action === "decisions") {
      const { data, error } = await sc
        .from("repair_policy_decisions")
        .select("*")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false })
        .limit(body.limit || 50);
      if (error) throw error;
      return jsonResponse({ decisions: data || [] });
    }

    // ─── ADJUSTMENTS ───
    if (action === "adjustments") {
      const { data, error } = await sc
        .from("repair_policy_adjustments")
        .select("*, repair_policy_profiles(stage_key, error_signature, preferred_strategy)")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false })
        .limit(body.limit || 50);
      if (error) throw error;
      return jsonResponse({ adjustments: data || [] });
    }

    // ─── EXPLAIN ───
    if (action === "explain") {
      if (!body.decision_id) return errorResponse("decision_id required", 400);
      const { data: decision, error } = await sc
        .from("repair_policy_decisions")
        .select("*")
        .eq("id", body.decision_id)
        .eq("organization_id", organization_id)
        .maybeSingle();
      if (error) throw error;
      if (!decision) return errorResponse("Decision not found", 404);

      const retryAction = computeRetryAction({
        retry_count: decision.retry_count || 0,
        last_outcome: decision.outcome_status as any,
        same_strategy_failures: decision.outcome_status === "failed" ? (decision.retry_count || 0) : 0,
        has_alternative_strategy: !!decision.fallback_strategy,
        has_prevention_candidate: false,
        error_is_novel: false,
      });

      const explanation = explainRepairDecision(
        {
          selected_strategy: decision.selected_strategy,
          fallback_strategy: decision.fallback_strategy,
          confidence: decision.confidence || 0,
          reason_codes: decision.reason_codes || [],
          evidence_refs: decision.evidence_refs || [],
          recommend_human_review: (decision.confidence || 0) < 0.3,
        },
        retryAction,
      );

      return jsonResponse({ decision, explanation, retry_action: retryAction });
    }

    // ─── SELECT STRATEGY ───
    if (action === "select_strategy") {
      const ctx: RepairContext = {
        organization_id,
        stage_key: body.stage_key || "",
        error_signature: body.error_signature || "",
        error_category: body.error_category || "unknown_error",
        error_message: body.error_message || "",
        agent_type: body.agent_type,
        model_provider: body.model_provider,
        model_name: body.model_name,
        recent_retry_count: body.recent_retry_count || 0,
      };

      const [profile, evidence] = await Promise.all([
        fetchPolicyProfile(sc, organization_id, ctx.stage_key, ctx.error_signature),
        retrieveRepairMemory(sc, organization_id, ctx.error_category, ctx.stage_key),
      ]);

      const decision = selectRepairPolicy(ctx, profile, evidence);

      // Record decision
      await sc.from("repair_policy_decisions").insert({
        organization_id,
        pipeline_job_id: body.pipeline_job_id || null,
        stage_key: ctx.stage_key,
        error_signature: ctx.error_signature,
        selected_strategy: decision.selected_strategy,
        fallback_strategy: decision.fallback_strategy,
        confidence: decision.confidence,
        reason_codes: decision.reason_codes,
        evidence_refs: decision.evidence_refs,
      });

      return jsonResponse(decision);
    }

    // ─── RECORD OUTCOME ───
    if (action === "record_outcome") {
      if (!body.decision_id || !body.outcome_status) return errorResponse("decision_id and outcome_status required", 400);

      // Update decision
      await sc.from("repair_policy_decisions").update({
        outcome_status: body.outcome_status,
        retry_count: body.retry_count || 0,
        cost_usd: body.cost_usd || 0,
        duration_ms: body.duration_ms || 0,
      }).eq("id", body.decision_id).eq("organization_id", organization_id);

      // Fetch decision to get context
      const { data: decision } = await sc.from("repair_policy_decisions")
        .select("*").eq("id", body.decision_id).maybeSingle();

      if (!decision) return jsonResponse({ adjusted: false });

      // Find or create policy profile
      let { data: profile } = await sc.from("repair_policy_profiles")
        .select("*")
        .eq("organization_id", organization_id)
        .eq("stage_key", decision.stage_key)
        .eq("error_signature", decision.error_signature)
        .maybeSingle();

      if (!profile) {
        const { data: newProfile } = await sc.from("repair_policy_profiles").insert({
          organization_id,
          stage_key: decision.stage_key,
          error_signature: decision.error_signature,
          preferred_strategy: decision.selected_strategy,
          fallback_strategy: decision.fallback_strategy,
          confidence: decision.confidence || 0.3,
        }).select("*").single();
        profile = newProfile;
      }

      if (!profile) return jsonResponse({ adjusted: false });

      // Compute adjustment
      const adjustment = computePolicyAdjustment({
        profile_id: profile.id,
        current_preferred: profile.preferred_strategy,
        current_fallback: profile.fallback_strategy,
        current_confidence: profile.confidence || 0,
        current_support: profile.support_count || 0,
        current_failures: profile.failure_count || 0,
        outcome: body.outcome_status,
        strategy_used: decision.selected_strategy,
        retry_count: body.retry_count || 0,
        cost_usd: body.cost_usd || 0,
        duration_ms: body.duration_ms || 0,
      });

      if (adjustment && isAdjustmentBounded(adjustment)) {
        // Record adjustment
        await sc.from("repair_policy_adjustments").insert({
          organization_id,
          repair_policy_profile_id: profile.id,
          adjustment_type: adjustment.adjustment_type,
          adjustment_reason: adjustment.adjustment_reason,
          previous_state: adjustment.previous_state,
          new_state: adjustment.new_state,
          bounded_delta: adjustment.bounded_delta,
        });

        // Apply to profile
        const newState = adjustment.new_state as any;
        await sc.from("repair_policy_profiles").update({
          confidence: newState.confidence ?? profile.confidence,
          support_count: newState.support_count ?? profile.support_count,
          failure_count: newState.failure_count ?? profile.failure_count,
          status: newState.status ?? profile.status,
          updated_at: new Date().toISOString(),
        }).eq("id", profile.id);

        return jsonResponse({ adjusted: true, adjustment_type: adjustment.adjustment_type });
      }

      return jsonResponse({ adjusted: false });
    }

    // ─── DEPRECATE ───
    if (action === "deprecate") {
      if (!body.profile_id) return errorResponse("profile_id required", 400);
      const { error } = await sc.from("repair_policy_profiles")
        .update({ status: "deprecated", updated_at: new Date().toISOString() })
        .eq("id", body.profile_id)
        .eq("organization_id", organization_id);
      if (error) throw error;
      return jsonResponse({ deprecated: true });
    }

    return errorResponse("Invalid action. Must be: overview, profiles, decisions, adjustments, explain, select_strategy, record_outcome, deprecate", 400);
  } catch (e) {
    console.error("repair-policy-engine error:", e);
    return errorResponse(e.message || "Internal error", 500);
  }
});
