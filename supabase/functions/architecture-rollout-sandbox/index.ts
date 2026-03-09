import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, AuthContext, requireOrgMembership } from "../_shared/auth.ts";
import { rehearseMigrationSequence } from "../_shared/architecture-rollout/architecture-migration-sequence-rehearsal.ts";
import { analyzeFragility } from "../_shared/architecture-rollout/architecture-rollout-fragility-analyzer.ts";
import { assessMigrationReadiness } from "../_shared/architecture-rollout/architecture-migration-readiness-assessor.ts";
import { rehearseRollbackViability } from "../_shared/architecture-rollout/architecture-rollback-viability-rehearsal.ts";
import { validateSandboxGuardrails } from "../_shared/architecture-rollout/architecture-rollout-sandbox-guardrails.ts";
import { validateSandboxReviewTransition } from "../_shared/architecture-rollout/architecture-rollout-sandbox-review-manager.ts";
import { explainSandbox } from "../_shared/architecture-rollout/architecture-rollout-sandbox-explainer.ts";

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

    const memberCheck = await requireOrgMembership(sc, user.id, organization_id);
    if (memberCheck instanceof Response) return memberCheck;

    // ─── OVERVIEW ───
    if (action === "overview") {
      const [{ data: sandboxes }, { data: outcomes }, { data: reviews }, { data: profiles }, { data: hooks }] = await Promise.all([
        sc.from("architecture_rollout_sandboxes").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100),
        sc.from("architecture_rollout_sandbox_outcomes").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50),
        sc.from("architecture_rollout_sandbox_reviews").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50),
        sc.from("architecture_rollout_governance_profiles").select("*").eq("organization_id", organization_id).limit(50),
        sc.from("architecture_validation_hooks").select("*").eq("organization_id", organization_id).limit(50),
      ]);
      const active = (sandboxes || []).filter((s: any) => !["archived", "expired"].includes(s.status));
      return jsonResponse({
        sandbox_count: (sandboxes || []).length,
        active_sandboxes: active.length,
        outcome_count: (outcomes || []).length,
        review_count: (reviews || []).length,
        profile_count: (profiles || []).length,
        hook_count: (hooks || []).length,
        recent_sandboxes: (sandboxes || []).slice(0, 5),
        recent_outcomes: (outcomes || []).slice(0, 5),
      });
    }

    // ─── LIST ENDPOINTS ───
    if (action === "sandboxes") {
      const { data } = await sc.from("architecture_rollout_sandboxes").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
      return jsonResponse({ sandboxes: data || [] });
    }
    if (action === "outcomes") {
      const { data } = await sc.from("architecture_rollout_sandbox_outcomes").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50);
      return jsonResponse({ outcomes: data || [] });
    }
    if (action === "governance_profiles") {
      const { data } = await sc.from("architecture_rollout_governance_profiles").select("*").eq("organization_id", organization_id).limit(50);
      return jsonResponse({ profiles: data || [] });
    }
    if (action === "validation_hooks") {
      const { data } = await sc.from("architecture_validation_hooks").select("*").eq("organization_id", organization_id).limit(50);
      return jsonResponse({ hooks: data || [] });
    }
    if (action === "reviews") {
      const { data } = await sc.from("architecture_rollout_sandbox_reviews").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50);
      return jsonResponse({ reviews: data || [] });
    }

    // ─── EXPLAIN ───
    if (action === "explain") {
      if (!body.sandbox_id) return errorResponse("sandbox_id required", 400);
      const { data: sandbox } = await sc.from("architecture_rollout_sandboxes").select("*").eq("id", body.sandbox_id).eq("organization_id", organization_id).single();
      if (!sandbox) return errorResponse("Sandbox not found", 404);

      const { data: outcome } = await sc.from("architecture_rollout_sandbox_outcomes").select("*").eq("sandbox_id", body.sandbox_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      const { data: plan } = await sc.from("architecture_change_plans").select("*").eq("id", sandbox.plan_id).single();
      const { data: hooks } = await sc.from("architecture_validation_hooks").select("*").eq("organization_id", organization_id).eq("status", "active");

      const explanation = explainSandbox({
        sandbox_name: sandbox.sandbox_name,
        plan_name: plan?.plan_name || "unknown",
        target_scope: sandbox.sandbox_scope,
        rehearsal_mode: sandbox.rehearsal_mode,
        rehearsal_summary: (outcome?.rehearsal_summary as Record<string, any>) || {},
        fragility_findings: (outcome?.fragility_findings as any[]) || [],
        readiness_summary: (outcome?.readiness_summary as Record<string, any>) || {},
        rollback_viability_summary: (outcome?.rollback_viability_summary as Record<string, any>) || {},
        blocked_steps: (outcome?.blocked_steps as any[]) || [],
        validation_hooks_count: (hooks || []).length,
        rollback_hooks_count: (sandbox.rollback_hooks as any[])?.length || 0,
      });

      const { data: reviews } = await sc.from("architecture_rollout_sandbox_reviews").select("*").eq("sandbox_outcome_id", outcome?.id || "");

      return jsonResponse({ sandbox, plan, outcome, explanation, reviews: reviews || [] });
    }

    // ─── RECOMPUTE (create sandboxes from ready_for_rollout plans) ───
    if (action === "recompute") {
      const { data: plans } = await sc.from("architecture_change_plans").select("*").eq("organization_id", organization_id).eq("status", "ready_for_rollout").limit(50);

      const { data: existing } = await sc.from("architecture_rollout_sandboxes").select("plan_id, status").eq("organization_id", organization_id).limit(200);
      const existingPlanIds = new Set((existing || []).filter((s: any) => !["archived", "expired"].includes(s.status)).map((s: any) => s.plan_id));

      let created = 0;
      for (const plan of (plans || [])) {
        if (existingPlanIds.has(plan.id)) continue;

        const depGraph = (plan.dependency_graph as any[]) || [];
        const blastRadius = (plan.blast_radius as Record<string, any>) || {};
        const rollbackBp = (plan.rollback_blueprint as Record<string, any>) || {};
        const validationReqs = (plan.validation_requirements as Record<string, any>) || {};
        const affectedLayers = depGraph.map((n: any) => n.layer).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);

        // Guardrails
        const { data: proposal } = await sc.from("architecture_change_proposals").select("*").eq("id", plan.proposal_id).single();
        const guardrailResult = validateSandboxGuardrails({
          target_scope: plan.target_scope,
          target_entities: (proposal?.target_entities as Record<string, any>) || {},
          rehearsal_mode: "dry_run",
          blast_radius_size: blastRadius.size || "small",
          affected_layers: affectedLayers,
          validation_hooks_defined: (validationReqs.checkpoints as any[])?.length > 0,
          rollback_hooks_defined: (rollbackBp.steps as any[])?.length > 0,
        });

        if (!guardrailResult.allowed) continue;

        const rehearsalMode = guardrailResult.downgraded_mode || "dry_run";

        // Rehearsal
        const seqResult = rehearseMigrationSequence({ dependency_graph: depGraph, blast_radius: blastRadius, rollback_blueprint: rollbackBp, target_scope: plan.target_scope });
        const fragilityResult = analyzeFragility({ blast_radius: blastRadius, dependency_graph: depGraph, rollback_blueprint: rollbackBp, validation_requirements: validationReqs, target_scope: plan.target_scope, tenant_impact: blastRadius.tenant_impact || false, affected_layers: affectedLayers });
        const rollbackViability = rehearseRollbackViability({ rollback_blueprint: rollbackBp, dependency_graph: depGraph, tenant_impact: blastRadius.tenant_impact || false, blast_radius_size: blastRadius.size || "small", affected_layers: affectedLayers });
        const readiness = assessMigrationReadiness({
          sequencing_confidence: seqResult.sequencing_confidence,
          blocked_step_count: seqResult.blocked_steps.length,
          rollback_hook_present: (rollbackBp.steps as any[])?.length > 0,
          validation_hook_present: (validationReqs.checkpoints as any[])?.length > 0,
          fragility_score: fragilityResult.fragility_score,
          target_scope_size: depGraph.length,
          tenant_sensitivity: blastRadius.tenant_impact || false,
          cross_layer_coupling_count: affectedLayers.length,
          hidden_coupling_count: seqResult.hidden_coupling.length,
        });

        const sandboxStatus = readiness.migration_readiness_status === "blocked" ? "blocked" : "prepared";

        const { data: sandbox, error: sbErr } = await sc.from("architecture_rollout_sandboxes").insert({
          organization_id, plan_id: plan.id, sandbox_name: `Sandbox: ${plan.plan_name}`,
          sandbox_scope: plan.target_scope, sandbox_payload: plan.plan_payload || {},
          rehearsal_mode: rehearsalMode, rollout_constraints: {}, validation_hooks: validationReqs,
          rollback_hooks: rollbackBp, status: sandboxStatus,
        }).select().single();

        if (sbErr || !sandbox) continue;

        const outcomeStatus = readiness.migration_readiness_status === "ready" ? "helpful" : readiness.migration_readiness_status === "blocked" ? "harmful" : "inconclusive";

        await sc.from("architecture_rollout_sandbox_outcomes").insert({
          organization_id, sandbox_id: sandbox.id,
          rehearsal_summary: seqResult, blocked_steps: seqResult.blocked_steps,
          fragility_findings: fragilityResult.findings,
          readiness_summary: { ...readiness, fragility_score: fragilityResult.fragility_score },
          rollback_viability_summary: rollbackViability, outcome_status: outcomeStatus,
        });

        created++;
      }

      return jsonResponse({ plans_evaluated: (plans || []).length, sandboxes_created: created });
    }

    // ─── REVIEW ACTIONS ───
    const REVIEW_ACTIONS: Record<string, string> = {
      review_sandbox: "reviewed",
      mark_migration_ready: "migration_ready",
      block_sandbox: "blocked",
      reject_sandbox: "rejected",
      archive_sandbox: "archived",
    };

    if (REVIEW_ACTIONS[action]) {
      if (!body.sandbox_id) return errorResponse("sandbox_id required", 400);

      const { data: sandbox } = await sc.from("architecture_rollout_sandboxes").select("*").eq("id", body.sandbox_id).eq("organization_id", organization_id).single();
      if (!sandbox) return errorResponse("Sandbox not found", 404);

      const { data: outcome } = await sc.from("architecture_rollout_sandbox_outcomes").select("*").eq("sandbox_id", body.sandbox_id).order("created_at", { ascending: false }).limit(1).maybeSingle();

      const result = validateSandboxReviewTransition({
        sandbox_id: body.sandbox_id,
        current_status: sandbox.status as any,
        target_review_status: REVIEW_ACTIONS[action] as any,
        review_notes: body.review_notes,
        blocker_reasons: body.blocker_reasons,
      });

      if (!result.allowed) return errorResponse(result.rejection_reason || "Transition not allowed", 400);

      if (outcome) {
        await sc.from("architecture_rollout_sandbox_reviews").insert({
          organization_id, sandbox_outcome_id: outcome.id,
          reviewer_ref: body.reviewer_ref || null, review_status: REVIEW_ACTIONS[action],
          review_notes: body.review_notes || null, blocker_reasons: body.blocker_reasons || null,
          linked_changes: body.linked_changes || null,
        });
      }

      await sc.from("architecture_rollout_sandboxes").update({ status: result.new_sandbox_status }).eq("id", body.sandbox_id);

      return jsonResponse({ success: true, new_status: result.new_sandbox_status });
    }

    return errorResponse("Invalid action. Must be: overview, sandboxes, outcomes, governance_profiles, validation_hooks, reviews, explain, recompute, review_sandbox, mark_migration_ready, block_sandbox, reject_sandbox, archive_sandbox", 400);
  } catch (e) {
    console.error("architecture-rollout-sandbox error:", e);
    return errorResponse(e.message || "Internal error", 500);
  }
});
