import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, AuthContext } from "../_shared/auth.ts";
import { aggregateDiscoverySignals } from "../_shared/discovery-architecture/discovery-signal-aggregator.ts";
import { synthesizeArchitectureOpportunities } from "../_shared/discovery-architecture/discovery-architecture-opportunity-synthesizer.ts";
import { generateArchitectureRecommendations } from "../_shared/discovery-architecture/discovery-architecture-recommendation-engine.ts";
import { computeArchitectureStressMap } from "../_shared/discovery-architecture/architecture-stress-map.ts";
import { clusterRecommendations } from "../_shared/discovery-architecture/discovery-architecture-clustering.ts";
import { explainRecommendation } from "../_shared/discovery-architecture/discovery-architecture-explainer.ts";
import { validateReviewTransition } from "../_shared/discovery-architecture/discovery-architecture-review-manager.ts";

/**
 * discovery-architecture — Sprint 37
 *
 * POST { action, organization_id, ...params }
 *
 * Actions:
 *   overview, signals, recommendations, reviews, stress_map, explain,
 *   recompute, review_recommendation, accept_recommendation,
 *   reject_recommendation, dismiss_recommendation
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
      const [{ data: signals }, { data: recs }, { data: reviews }] = await Promise.all([
        sc.from("discovery_architecture_signals").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(200),
        sc.from("discovery_architecture_recommendations").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100),
        sc.from("discovery_architecture_reviews").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50),
      ]);

      const aggregated = aggregateDiscoverySignals(signals || []);
      const stressMap = computeArchitectureStressMap(aggregated);
      const openRecs = (recs || []).filter((r: any) => r.status === "open").length;

      return jsonResponse({
        signal_count: (signals || []).length,
        recommendation_count: (recs || []).length,
        open_recommendations: openRecs,
        review_count: (reviews || []).length,
        stress_map: stressMap,
        top_signals: aggregated.slice(0, 5),
      });
    }

    // ─── SIGNALS ───
    if (action === "signals") {
      const { data } = await sc.from("discovery_architecture_signals").select("*")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false })
        .limit(100);
      const aggregated = aggregateDiscoverySignals(data || []);
      return jsonResponse({ signals: data || [], aggregated });
    }

    // ─── RECOMMENDATIONS ───
    if (action === "recommendations") {
      const { data } = await sc.from("discovery_architecture_recommendations").select("*")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false })
        .limit(100);
      const clusters = clusterRecommendations((data || []).map((d: any) => ({
        recommendation_type: d.recommendation_type,
        target_scope: d.target_scope,
        target_entities: d.target_entities,
        rationale_codes: Array.isArray(d.rationale_codes) ? d.rationale_codes : [],
        evidence_refs: Array.isArray(d.evidence_refs) ? d.evidence_refs : [],
        expected_impact: d.expected_impact || {},
        confidence_score: d.confidence_score || 0,
        priority_score: d.priority_score || 0,
        safety_class: d.safety_class,
      })));
      return jsonResponse({ recommendations: data || [], clusters });
    }

    // ─── REVIEWS ───
    if (action === "reviews") {
      const { data } = await sc.from("discovery_architecture_reviews").select("*")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false })
        .limit(50);
      return jsonResponse({ reviews: data || [] });
    }

    // ─── STRESS MAP ───
    if (action === "stress_map") {
      const { data: signals } = await sc.from("discovery_architecture_signals").select("*")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false })
        .limit(200);
      const aggregated = aggregateDiscoverySignals(signals || []);
      const stressMap = computeArchitectureStressMap(aggregated);
      return jsonResponse({ stress_map: stressMap });
    }

    // ─── EXPLAIN ───
    if (action === "explain") {
      if (!body.recommendation_id) return errorResponse("recommendation_id required", 400);
      const { data: rec } = await sc.from("discovery_architecture_recommendations").select("*")
        .eq("id", body.recommendation_id)
        .eq("organization_id", organization_id)
        .single();
      if (!rec) return errorResponse("Recommendation not found", 404);

      const explanation = explainRecommendation({
        recommendation_type: rec.recommendation_type,
        target_scope: rec.target_scope,
        target_entities: rec.target_entities as Record<string, any>,
        rationale_codes: Array.isArray(rec.rationale_codes) ? rec.rationale_codes as string[] : [],
        evidence_refs: Array.isArray(rec.evidence_refs) ? rec.evidence_refs as Record<string, any>[] : [],
        expected_impact: rec.expected_impact as Record<string, any> || {},
        confidence_score: rec.confidence_score || 0,
        priority_score: rec.priority_score || 0,
        safety_class: rec.safety_class as any,
      });

      const { data: reviews } = await sc.from("discovery_architecture_reviews").select("*")
        .eq("recommendation_id", body.recommendation_id);

      return jsonResponse({ recommendation: rec, explanation, reviews: reviews || [] });
    }

    // ─── RECOMPUTE ───
    if (action === "recompute") {
      const { data: signals } = await sc.from("discovery_architecture_signals").select("*")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false })
        .limit(500);

      const aggregated = aggregateDiscoverySignals(signals || []);
      const opportunities = synthesizeArchitectureOpportunities(aggregated);
      const recommendations = generateArchitectureRecommendations(opportunities);
      const stressMap = computeArchitectureStressMap(aggregated);

      // Persist recommendations
      let inserted = 0;
      for (const rec of recommendations) {
        const { error } = await sc.from("discovery_architecture_recommendations").insert({
          organization_id,
          recommendation_type: rec.recommendation_type,
          target_scope: rec.target_scope,
          target_entities: rec.target_entities,
          rationale_codes: rec.rationale_codes,
          evidence_refs: rec.evidence_refs,
          expected_impact: rec.expected_impact,
          confidence_score: rec.confidence_score,
          priority_score: rec.priority_score,
          safety_class: rec.safety_class,
          status: "open",
        });
        if (!error) inserted++;
      }

      return jsonResponse({
        signals_analyzed: (signals || []).length,
        aggregated_count: aggregated.length,
        opportunities_found: opportunities.length,
        recommendations_created: inserted,
        stress_map: stressMap,
      });
    }

    // ─── REVIEW / ACCEPT / REJECT / DISMISS ───
    const REVIEW_ACTIONS: Record<string, string> = {
      review_recommendation: "reviewed",
      accept_recommendation: "accepted",
      reject_recommendation: "rejected",
      dismiss_recommendation: "dismissed",
    };

    if (REVIEW_ACTIONS[action]) {
      if (!body.recommendation_id) return errorResponse("recommendation_id required", 400);

      const { data: rec } = await sc.from("discovery_architecture_recommendations").select("*")
        .eq("id", body.recommendation_id)
        .eq("organization_id", organization_id)
        .single();
      if (!rec) return errorResponse("Recommendation not found", 404);

      const result = validateReviewTransition({
        recommendation_id: body.recommendation_id,
        current_status: rec.status as any,
        target_status: REVIEW_ACTIONS[action] as any,
        review_notes: body.review_notes,
        review_reason_codes: body.review_reason_codes,
        linked_changes: body.linked_changes,
      });

      if (!result.allowed) return errorResponse(result.rejection_reason || "Transition not allowed", 400);

      const { error: reviewErr } = await sc.from("discovery_architecture_reviews").insert({
        organization_id,
        recommendation_id: body.recommendation_id,
        reviewer_ref: body.reviewer_ref || null,
        review_status: REVIEW_ACTIONS[action],
        review_notes: body.review_notes || null,
        review_reason_codes: body.review_reason_codes || null,
        linked_changes: body.linked_changes || null,
      });
      if (reviewErr) return errorResponse(reviewErr.message, 500);

      await sc.from("discovery_architecture_recommendations")
        .update({ status: result.new_recommendation_status })
        .eq("id", body.recommendation_id);

      return jsonResponse({ success: true, new_status: result.new_recommendation_status });
    }

    return errorResponse(
      "Invalid action. Must be: overview, signals, recommendations, reviews, stress_map, explain, recompute, review_recommendation, accept_recommendation, reject_recommendation, dismiss_recommendation",
      400
    );
  } catch (e) {
    console.error("discovery-architecture error:", e);
    return errorResponse(e.message || "Internal error", 500);
  }
});
