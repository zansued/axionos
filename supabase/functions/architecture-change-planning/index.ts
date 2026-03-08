import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, AuthContext } from "../_shared/auth.ts";
import { planDependencies } from "../_shared/architecture-planning/architecture-change-dependency-planner.ts";
import { assessReadiness } from "../_shared/architecture-planning/architecture-rollout-readiness-assessor.ts";
import { synthesizeValidationBlueprint } from "../_shared/architecture-planning/architecture-validation-blueprint-synthesizer.ts";
import { synthesizeRollbackBlueprint } from "../_shared/architecture-planning/architecture-rollback-blueprint-synthesizer.ts";
import { detectDuplicatePlan, identifyStalePlans } from "../_shared/architecture-planning/architecture-plan-clustering.ts";
import { validatePlanReviewTransition } from "../_shared/architecture-planning/architecture-change-plan-review-manager.ts";
import { explainPlan } from "../_shared/architecture-planning/architecture-change-plan-explainer.ts";

/**
 * architecture-change-planning — Sprint 39
 * POST { action, organization_id, ...params }
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
      const [{ data: plans }, { data: reviews }, { data: profiles }] = await Promise.all([
        sc.from("architecture_change_plans").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100),
        sc.from("architecture_change_plan_reviews").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50),
        sc.from("architecture_rollout_mode_profiles").select("*").eq("organization_id", organization_id).limit(50),
      ]);
      const activePlans = (plans || []).filter((p: any) => !["rejected", "archived"].includes(p.status));
      return jsonResponse({
        plan_count: (plans || []).length,
        active_plans: activePlans.length,
        review_count: (reviews || []).length,
        profile_count: (profiles || []).length,
        recent_plans: (plans || []).slice(0, 5),
        recent_reviews: (reviews || []).slice(0, 5),
      });
    }

    // ─── PLANS ───
    if (action === "plans") {
      const { data } = await sc.from("architecture_change_plans").select("*")
        .eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
      return jsonResponse({ plans: data || [] });
    }

    // ─── ROLLOUT MODE PROFILES ───
    if (action === "rollout_profiles") {
      const { data } = await sc.from("architecture_rollout_mode_profiles").select("*")
        .eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50);
      return jsonResponse({ profiles: data || [] });
    }

    // ─── REVIEWS ───
    if (action === "reviews") {
      const { data } = await sc.from("architecture_change_plan_reviews").select("*")
        .eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50);
      return jsonResponse({ reviews: data || [] });
    }

    // ─── EXPLAIN ───
    if (action === "explain") {
      if (!body.plan_id) return errorResponse("plan_id required", 400);
      const { data: plan } = await sc.from("architecture_change_plans").select("*")
        .eq("id", body.plan_id).eq("organization_id", organization_id).single();
      if (!plan) return errorResponse("Plan not found", 404);

      const { data: outcome } = await sc.from("architecture_simulation_outcomes").select("*")
        .eq("id", plan.simulation_outcome_id).single();
      const { data: proposal } = await sc.from("architecture_change_proposals").select("*")
        .eq("id", plan.proposal_id).single();

      const explanation = explainPlan({
        plan_name: plan.plan_name,
        proposal_type: proposal?.proposal_type || "unknown",
        target_scope: plan.target_scope,
        blast_radius: (plan.blast_radius as Record<string, any>) || {},
        dependency_graph: (plan.dependency_graph as any[]) || [],
        validation_requirements: (plan.validation_requirements as Record<string, any>) || {},
        rollback_blueprint: (plan.rollback_blueprint as Record<string, any>) || {},
        readiness_score: plan.readiness_score || 0,
        implementation_risk: plan.implementation_risk,
        affected_layers: (outcome?.affected_layers as string[]) || [],
        simulation_confidence: outcome?.confidence_score || 0,
        source_recommendation_id: proposal?.source_recommendation_id,
      });

      const { data: reviews } = await sc.from("architecture_change_plan_reviews").select("*")
        .eq("plan_id", body.plan_id);

      return jsonResponse({ plan, proposal, outcome, explanation, reviews: reviews || [] });
    }

    // ─── RECOMPUTE (generate plans from accepted outcomes) ───
    if (action === "recompute") {
      const { data: outcomes } = await sc.from("architecture_simulation_outcomes").select("*")
        .eq("organization_id", organization_id).eq("status", "accepted").limit(50);

      const { data: existingPlans } = await sc.from("architecture_change_plans").select("id, proposal_id, plan_name, target_scope, status, created_at, implementation_risk")
        .eq("organization_id", organization_id).limit(200);

      let created = 0;
      for (const outcome of (outcomes || [])) {
        const { data: proposal } = await sc.from("architecture_change_proposals").select("*")
          .eq("id", outcome.proposal_id).single();
        if (!proposal) continue;

        // Duplicate check
        const dupResult = detectDuplicatePlan(
          { target_scope: proposal.target_scope, proposal_id: proposal.id, plan_name: proposal.proposal_type },
          (existingPlans || []) as any[]
        );
        if (dupResult.is_duplicate) continue;

        // Dependency planning
        const depResult = planDependencies({
          proposal_type: proposal.proposal_type,
          target_scope: proposal.target_scope,
          target_entities: (proposal.target_entities as Record<string, any>) || {},
          affected_layers: (outcome.affected_layers as string[]) || [],
          simulation_summary: (outcome.simulation_summary as Record<string, any>) || {},
          plan_payload: (proposal.proposal_payload as Record<string, any>) || {},
        });

        // Validation blueprint
        const validationBp = synthesizeValidationBlueprint({
          proposal_type: proposal.proposal_type,
          target_scope: proposal.target_scope,
          affected_layers: (outcome.affected_layers as string[]) || [],
          blast_radius_size: depResult.blast_radius.size,
          tenant_impact: depResult.blast_radius.tenant_impact,
          high_risk_nodes: depResult.blast_radius.high_risk_nodes,
        });

        // Rollback blueprint
        const rollbackBp = synthesizeRollbackBlueprint({
          proposal_type: proposal.proposal_type,
          target_scope: proposal.target_scope,
          affected_layers: (outcome.affected_layers as string[]) || [],
          dependency_graph: depResult.dependency_graph,
          tenant_impact: depResult.blast_radius.tenant_impact,
          blast_radius_size: depResult.blast_radius.size,
        });

        // Readiness
        const readiness = assessReadiness({
          simulation_confidence: outcome.confidence_score || 0,
          blast_radius_size: depResult.blast_radius.size,
          dependency_completeness: depResult.blocked_dependencies.length === 0,
          rollback_blueprint_present: rollbackBp.steps.length > 0,
          validation_blueprint_present: validationBp.checkpoints.length > 0,
          tenant_scope_affected: depResult.blast_radius.tenant_impact,
          high_risk_node_count: depResult.blast_radius.high_risk_nodes.length,
          blocked_dependency_count: depResult.blocked_dependencies.length,
          plan_status: "draft",
        });

        // Risk classification
        let risk = "moderate";
        if (depResult.blast_radius.size === "critical") risk = "critical";
        else if (depResult.blast_radius.size === "large") risk = "high";
        else if (depResult.blast_radius.size === "small" && readiness.readiness_score >= 0.7) risk = "low";

        const { error } = await sc.from("architecture_change_plans").insert({
          organization_id,
          proposal_id: proposal.id,
          simulation_outcome_id: outcome.id,
          plan_name: `${proposal.proposal_type} — ${proposal.target_scope}`,
          target_scope: proposal.target_scope,
          plan_payload: proposal.proposal_payload || {},
          blast_radius: depResult.blast_radius,
          dependency_graph: depResult.dependency_graph,
          rollback_blueprint: rollbackBp,
          validation_requirements: validationBp,
          readiness_score: readiness.readiness_score,
          implementation_risk: risk,
          status: readiness.readiness_status === "blocked" ? "blocked" : "draft",
        });

        if (!error) created++;
      }

      // Mark stale plans
      const stalePlanIds = identifyStalePlans((existingPlans || []) as any[]);
      for (const staleId of stalePlanIds) {
        await sc.from("architecture_change_plans").update({ status: "archived" }).eq("id", staleId);
      }

      return jsonResponse({ outcomes_evaluated: (outcomes || []).length, plans_created: created, stale_archived: stalePlanIds.length });
    }

    // ─── REVIEW ACTIONS ───
    const REVIEW_ACTIONS: Record<string, string> = {
      review_plan: "reviewed",
      mark_ready: "ready_for_rollout",
      block_plan: "blocked",
      reject_plan: "rejected",
      archive_plan: "archived",
    };

    if (REVIEW_ACTIONS[action]) {
      if (!body.plan_id) return errorResponse("plan_id required", 400);

      const { data: plan } = await sc.from("architecture_change_plans").select("*")
        .eq("id", body.plan_id).eq("organization_id", organization_id).single();
      if (!plan) return errorResponse("Plan not found", 404);

      const result = validatePlanReviewTransition({
        plan_id: body.plan_id,
        current_status: plan.status as any,
        target_review_status: REVIEW_ACTIONS[action] as any,
        review_notes: body.review_notes,
        blocker_reasons: body.blocker_reasons,
        linked_changes: body.linked_changes,
      });

      if (!result.allowed) return errorResponse(result.rejection_reason || "Transition not allowed", 400);

      const { error: reviewErr } = await sc.from("architecture_change_plan_reviews").insert({
        organization_id,
        plan_id: body.plan_id,
        reviewer_ref: body.reviewer_ref || null,
        review_status: REVIEW_ACTIONS[action],
        review_notes: body.review_notes || null,
        blocker_reasons: body.blocker_reasons || null,
        linked_changes: body.linked_changes || null,
      });
      if (reviewErr) return errorResponse(reviewErr.message, 500);

      await sc.from("architecture_change_plans")
        .update({ status: result.new_plan_status }).eq("id", body.plan_id);

      return jsonResponse({ success: true, new_status: result.new_plan_status });
    }

    return errorResponse(
      "Invalid action. Must be: overview, plans, rollout_profiles, reviews, explain, recompute, review_plan, mark_ready, block_plan, reject_plan, archive_plan",
      400
    );
  } catch (e) {
    console.error("architecture-change-planning error:", e);
    return errorResponse(e.message || "Internal error", 500);
  }
});
