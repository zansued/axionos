import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, AuthContext, requireOrgMembership } from "../_shared/auth.ts";
import { simulateArchitectureImpact } from "../_shared/architecture-simulation/architecture-impact-simulator.ts";
import { analyzeArchitectureBoundaries } from "../_shared/architecture-simulation/architecture-boundary-analyzer.ts";
import { evaluateGuardrails } from "../_shared/architecture-simulation/architecture-simulation-guardrails.ts";
import { linkRecommendationToProposal, isDuplicateProposal } from "../_shared/architecture-simulation/architecture-recommendation-linker.ts";
import { validateSimReviewTransition } from "../_shared/architecture-simulation/architecture-simulation-review-manager.ts";
import { explainSimulation } from "../_shared/architecture-simulation/architecture-simulation-explainer.ts";

/**
 * architecture-simulation — Sprint 38
 *
 * POST { action, organization_id, ...params }
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

    const memberCheck = await requireOrgMembership(sc, user.id, organization_id);
    if (memberCheck instanceof Response) return memberCheck;

    // ─── OVERVIEW ───
    if (action === "overview") {
      const [{ data: proposals }, { data: outcomes }, { data: reviews }] = await Promise.all([
        sc.from("architecture_change_proposals").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100),
        sc.from("architecture_simulation_outcomes").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100),
        sc.from("architecture_simulation_reviews").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50),
      ]);
      const openProposals = (proposals || []).filter((p: any) => !["rejected", "dismissed"].includes(p.status)).length;
      return jsonResponse({
        proposal_count: (proposals || []).length,
        open_proposals: openProposals,
        outcome_count: (outcomes || []).length,
        review_count: (reviews || []).length,
        recent_proposals: (proposals || []).slice(0, 5),
        recent_outcomes: (outcomes || []).slice(0, 5),
      });
    }

    // ─── PROPOSALS ───
    if (action === "proposals") {
      const { data } = await sc.from("architecture_change_proposals").select("*")
        .eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
      return jsonResponse({ proposals: data || [] });
    }

    // ─── SCOPE PROFILES ───
    if (action === "scope_profiles") {
      const { data } = await sc.from("architecture_simulation_scope_profiles").select("*")
        .eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50);
      return jsonResponse({ scope_profiles: data || [] });
    }

    // ─── OUTCOMES ───
    if (action === "outcomes") {
      const { data } = await sc.from("architecture_simulation_outcomes").select("*")
        .eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
      return jsonResponse({ outcomes: data || [] });
    }

    // ─── REVIEWS ───
    if (action === "reviews") {
      const { data } = await sc.from("architecture_simulation_reviews").select("*")
        .eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50);
      return jsonResponse({ reviews: data || [] });
    }

    // ─── EXPLAIN ───
    if (action === "explain") {
      if (!body.simulation_outcome_id) return errorResponse("simulation_outcome_id required", 400);
      const { data: outcome } = await sc.from("architecture_simulation_outcomes").select("*")
        .eq("id", body.simulation_outcome_id).eq("organization_id", organization_id).single();
      if (!outcome) return errorResponse("Simulation outcome not found", 404);

      const { data: proposal } = await sc.from("architecture_change_proposals").select("*")
        .eq("id", outcome.proposal_id).single();

      const explanation = explainSimulation({
        proposal_type: proposal?.proposal_type || "unknown",
        target_scope: proposal?.target_scope || "unknown",
        target_entities: (proposal?.target_entities as Record<string, any>) || {},
        affected_layers: (outcome.affected_layers as string[]) || [],
        expected_benefits: (outcome.expected_benefits as any[]) || [],
        expected_tradeoffs: (outcome.expected_tradeoffs as any[]) || [],
        risk_flags: (outcome.risk_flags as string[]) || [],
        confidence_score: outcome.confidence_score || 0,
        source_recommendation_id: proposal?.source_recommendation_id,
      });

      const { data: reviews } = await sc.from("architecture_simulation_reviews").select("*")
        .eq("simulation_outcome_id", body.simulation_outcome_id);

      return jsonResponse({ outcome, proposal, explanation, reviews: reviews || [] });
    }

    // ─── RECOMPUTE (simulate all approved proposals) ───
    if (action === "recompute") {
      const { data: proposals } = await sc.from("architecture_change_proposals").select("*")
        .eq("organization_id", organization_id)
        .in("status", ["draft", "approved_for_simulation"])
        .order("priority_score", { ascending: false }).limit(50);

      const { data: scopeProfiles } = await sc.from("architecture_simulation_scope_profiles").select("*")
        .eq("organization_id", organization_id).limit(50);

      const defaultScope = (scopeProfiles || [])[0];
      let simulated = 0;

      for (const proposal of (proposals || [])) {
        // Guardrail check
        const guardrailResult = evaluateGuardrails({
          proposal_type: proposal.proposal_type,
          target_scope: proposal.target_scope,
          target_entities: (proposal.target_entities as Record<string, any>) || {},
          proposal_payload: (proposal.proposal_payload as Record<string, any>) || {},
          safety_class: proposal.safety_class,
          scope_profile: defaultScope ? {
            forbidden_entities: (defaultScope.forbidden_entities as any[]) || [],
            max_scope_breadth: defaultScope.max_scope_breadth || undefined,
            simulation_mode: defaultScope.simulation_mode,
          } : undefined,
        });

        if (!guardrailResult.allowed) {
          await sc.from("architecture_change_proposals")
            .update({ status: "rejected" }).eq("id", proposal.id);
          continue;
        }

        // Impact simulation
        const simResult = simulateArchitectureImpact({
          proposal_type: proposal.proposal_type,
          target_scope: proposal.target_scope,
          target_entities: (proposal.target_entities as Record<string, any>) || {},
          proposal_payload: (proposal.proposal_payload as Record<string, any>) || {},
          confidence_score: proposal.confidence_score || 0.5,
        });

        // Boundary analysis
        const boundaryResult = analyzeArchitectureBoundaries({
          proposal_type: proposal.proposal_type,
          target_scope: proposal.target_scope,
          target_entities: (proposal.target_entities as Record<string, any>) || {},
          proposal_payload: (proposal.proposal_payload as Record<string, any>) || {},
        });

        // Merge risk flags
        const allRiskFlags = [
          ...simResult.risk_flags,
          ...boundaryResult.issues.filter(i => i.severity === "high").map(i => i.description),
        ];

        const { error } = await sc.from("architecture_simulation_outcomes").insert({
          organization_id,
          proposal_id: proposal.id,
          scope_profile_id: defaultScope?.id || proposal.id, // fallback
          affected_layers: simResult.affected_layers,
          expected_benefits: simResult.expected_benefits,
          expected_tradeoffs: simResult.expected_tradeoffs,
          risk_flags: allRiskFlags,
          confidence_score: simResult.confidence_score,
          simulation_summary: {
            ...simResult.simulation_summary,
            boundary_health: boundaryResult.boundary_health_score,
            boundary_issues: boundaryResult.issues.length,
            isolation_intact: boundaryResult.isolation_intact,
          },
          status: "generated",
        });

        if (!error) {
          await sc.from("architecture_change_proposals")
            .update({ status: "simulated" }).eq("id", proposal.id);
          simulated++;
        }
      }

      return jsonResponse({
        proposals_evaluated: (proposals || []).length,
        simulations_created: simulated,
      });
    }

    // ─── LINK RECOMMENDATION TO PROPOSAL ───
    if (action === "link_recommendation") {
      if (!body.recommendation_id) return errorResponse("recommendation_id required", 400);
      const { data: rec } = await sc.from("discovery_architecture_recommendations").select("*")
        .eq("id", body.recommendation_id).eq("organization_id", organization_id).single();
      if (!rec) return errorResponse("Recommendation not found", 404);

      const draft = linkRecommendationToProposal({
        recommendation_id: rec.id,
        recommendation_type: rec.recommendation_type,
        target_scope: rec.target_scope,
        target_entities: (rec.target_entities as Record<string, any>) || {},
        rationale_codes: Array.isArray(rec.rationale_codes) ? rec.rationale_codes as string[] : [],
        evidence_refs: Array.isArray(rec.evidence_refs) ? rec.evidence_refs as Record<string, any>[] : [],
        confidence_score: rec.confidence_score || 0,
        priority_score: rec.priority_score || 0,
        safety_class: rec.safety_class,
      });

      // Check duplicates
      const { data: existing } = await sc.from("architecture_change_proposals").select("proposal_type, target_scope, status")
        .eq("organization_id", organization_id);
      if (isDuplicateProposal(existing || [], draft)) {
        return errorResponse("Duplicate proposal already exists", 409);
      }

      const { data: inserted, error } = await sc.from("architecture_change_proposals").insert({
        organization_id,
        ...draft,
      }).select().single();
      if (error) return errorResponse(error.message, 500);

      return jsonResponse({ proposal: inserted });
    }

    // ─── REVIEW ACTIONS ───
    const REVIEW_ACTIONS: Record<string, string> = {
      review_simulation: "reviewed",
      accept_simulation: "accepted",
      reject_simulation: "rejected",
      dismiss_simulation: "dismissed",
    };

    if (REVIEW_ACTIONS[action]) {
      if (!body.simulation_outcome_id) return errorResponse("simulation_outcome_id required", 400);

      const { data: outcome } = await sc.from("architecture_simulation_outcomes").select("*")
        .eq("id", body.simulation_outcome_id).eq("organization_id", organization_id).single();
      if (!outcome) return errorResponse("Simulation outcome not found", 404);

      const result = validateSimReviewTransition({
        simulation_outcome_id: body.simulation_outcome_id,
        current_status: outcome.status as any,
        target_status: REVIEW_ACTIONS[action] as any,
        review_notes: body.review_notes,
        review_reason_codes: body.review_reason_codes,
        linked_changes: body.linked_changes,
      });

      if (!result.allowed) return errorResponse(result.rejection_reason || "Transition not allowed", 400);

      const { error: reviewErr } = await sc.from("architecture_simulation_reviews").insert({
        organization_id,
        simulation_outcome_id: body.simulation_outcome_id,
        reviewer_ref: body.reviewer_ref || null,
        review_status: REVIEW_ACTIONS[action],
        review_notes: body.review_notes || null,
        review_reason_codes: body.review_reason_codes || null,
        linked_changes: body.linked_changes || null,
      });
      if (reviewErr) return errorResponse(reviewErr.message, 500);

      await sc.from("architecture_simulation_outcomes")
        .update({ status: result.new_outcome_status }).eq("id", body.simulation_outcome_id);

      return jsonResponse({ success: true, new_status: result.new_outcome_status });
    }

    // ─── RECOVER ACTION (Action Center recovery simulation) ───
    if (action === "recover_action") {
      const { action_id, trigger_type, stage, risk_level, initiative_id, simulation_context } = body;

      if (!action_id) return errorResponse("action_id required for recovery simulation", 400);

      // 1. Write audit: simulation initiated
      await sc.from("action_audit_events").insert({
        action_id,
        organization_id,
        event_type: "recovery_simulation_initiated",
        new_status: "simulating",
        reason: `Recovery simulation requested. trigger=${trigger_type || "unknown"}, stage=${stage || "unknown"}, risk=${risk_level || "unknown"}`,
        actor_type: "human",
        actor_id: user.id,
        executor_type: "architecture_simulation",
      });

      // 2. Create a recovery-specific proposal
      const proposalPayload = {
        source: "action_center_recovery",
        action_id,
        trigger_type: trigger_type || "unknown",
        stage: stage || "unknown",
        risk_level: risk_level || "medium",
        ...(simulation_context || {}),
      };

      const { data: proposal, error: propErr } = await sc.from("architecture_change_proposals").insert({
        organization_id,
        initiative_id: initiative_id || null,
        proposal_type: "recovery",
        target_scope: stage || "execution",
        target_entities: { action_id, trigger_type },
        proposal_payload: proposalPayload,
        safety_class: risk_level === "critical" || risk_level === "high" ? "critical" : "standard",
        confidence_score: 0.5,
        priority_score: risk_level === "critical" ? 1.0 : risk_level === "high" ? 0.8 : 0.5,
        status: "draft",
        source_recommendation_id: null,
      }).select().single();

      if (propErr) {
        console.error("[recover_action] Proposal creation error:", propErr);
        return errorResponse(`Failed to create recovery proposal: ${propErr.message}`, 500);
      }

      // 3. Run simulation on the proposal
      const { data: scopeProfiles } = await sc.from("architecture_simulation_scope_profiles").select("*")
        .eq("organization_id", organization_id).limit(1);
      const defaultScope = (scopeProfiles || [])[0];

      const guardrailResult = evaluateGuardrails({
        proposal_type: "recovery",
        target_scope: stage || "execution",
        target_entities: { action_id, trigger_type },
        proposal_payload: proposalPayload,
        safety_class: proposal.safety_class,
        scope_profile: defaultScope ? {
          forbidden_entities: (defaultScope.forbidden_entities as any[]) || [],
          max_scope_breadth: defaultScope.max_scope_breadth || undefined,
          simulation_mode: defaultScope.simulation_mode,
        } : undefined,
      });

      if (!guardrailResult.allowed) {
        // Audit: guardrail blocked
        await sc.from("action_audit_events").insert({
          action_id,
          organization_id,
          event_type: "recovery_simulation_blocked",
          reason: `Guardrail blocked recovery simulation: ${guardrailResult.reasons?.join("; ") || "policy violation"}`,
          actor_type: "system",
          executor_type: "architecture_simulation",
        });

        await sc.from("architecture_change_proposals")
          .update({ status: "rejected" }).eq("id", proposal.id);

        return jsonResponse({
          success: false,
          reason: "Recovery simulation blocked by guardrails",
          guardrail_reasons: guardrailResult.reasons || [],
          proposal_id: proposal.id,
        });
      }

      const simResult = simulateArchitectureImpact({
        proposal_type: "recovery",
        target_scope: stage || "execution",
        target_entities: { action_id, trigger_type },
        proposal_payload: proposalPayload,
        confidence_score: 0.5,
      });

      const boundaryResult = analyzeArchitectureBoundaries({
        proposal_type: "recovery",
        target_scope: stage || "execution",
        target_entities: { action_id, trigger_type },
        proposal_payload: proposalPayload,
      });

      const allRiskFlags = [
        ...simResult.risk_flags,
        ...boundaryResult.issues.filter((i: any) => i.severity === "high").map((i: any) => i.description),
      ];

      const { data: outcome, error: outErr } = await sc.from("architecture_simulation_outcomes").insert({
        organization_id,
        proposal_id: proposal.id,
        scope_profile_id: defaultScope?.id || proposal.id,
        affected_layers: simResult.affected_layers,
        expected_benefits: simResult.expected_benefits,
        expected_tradeoffs: simResult.expected_tradeoffs,
        risk_flags: allRiskFlags,
        confidence_score: simResult.confidence_score,
        simulation_summary: {
          ...simResult.simulation_summary,
          boundary_health: boundaryResult.boundary_health_score,
          boundary_issues: boundaryResult.issues.length,
          isolation_intact: boundaryResult.isolation_intact,
          recovery_source: "action_center",
          source_action_id: action_id,
        },
        status: "generated",
      }).select().single();

      if (outErr) {
        console.error("[recover_action] Outcome insert error:", outErr);
        return errorResponse(`Simulation outcome failed: ${outErr.message}`, 500);
      }

      await sc.from("architecture_change_proposals")
        .update({ status: "simulated" }).eq("id", proposal.id);

      // 4. Write audit: simulation completed
      await sc.from("action_audit_events").insert({
        action_id,
        organization_id,
        event_type: "recovery_simulation_completed",
        reason: `Recovery simulation completed. ${simResult.affected_layers.length} layers affected, confidence=${simResult.confidence_score}, risks=${allRiskFlags.length}`,
        actor_type: "system",
        executor_type: "architecture_simulation",
      });

      return jsonResponse({
        success: true,
        proposal_id: proposal.id,
        outcome_id: outcome.id,
        affected_layers: simResult.affected_layers,
        risk_flags: allRiskFlags,
        confidence_score: simResult.confidence_score,
        boundary_health: boundaryResult.boundary_health_score,
        simulations_created: 1,
      });
    }

    return errorResponse(
      "Invalid action. Must be: overview, proposals, scope_profiles, outcomes, reviews, explain, recompute, recover_action, link_recommendation, review_simulation, accept_simulation, reject_simulation, dismiss_simulation",
      400
    );
  } catch (e) {
    console.error("architecture-simulation error:", e);
    return errorResponse(e.message || "Internal error", 500);
  }
});
