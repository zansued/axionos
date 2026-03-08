import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, AuthContext } from "../_shared/auth.ts";
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
    const { serviceClient: sc } = auth as AuthContext;

    const body = await req.json();
    const { action, organization_id } = body;
    if (!organization_id) return errorResponse("organization_id required", 400);

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

    return errorResponse(
      "Invalid action. Must be: overview, proposals, scope_profiles, outcomes, reviews, explain, recompute, link_recommendation, review_simulation, accept_simulation, reject_simulation, dismiss_simulation",
      400
    );
  } catch (e) {
    console.error("architecture-simulation error:", e);
    return errorResponse(e.message || "Internal error", 500);
  }
});
