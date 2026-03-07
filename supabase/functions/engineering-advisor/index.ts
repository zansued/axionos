import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, AuthContext } from "../_shared/auth.ts";
import { aggregateAdvisorySignals } from "../_shared/engineering-advisor/engineering-advisory-signal-aggregator.ts";
import { synthesizeOpportunities } from "../_shared/engineering-advisor/engineering-opportunity-synthesizer.ts";
import { generateRecommendations } from "../_shared/engineering-advisor/engineering-advisory-recommendation-engine.ts";
import { prioritizeRecommendations } from "../_shared/engineering-advisor/engineering-advisory-prioritizer.ts";
import { explainRecommendation } from "../_shared/engineering-advisor/engineering-advisory-explainer.ts";
import { clusterRecommendations } from "../_shared/engineering-advisor/engineering-advisory-clustering.ts";
import { validateReviewTransition, buildReview } from "../_shared/engineering-advisor/engineering-advisory-review-manager.ts";

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
      const [{ data: recs }, { data: reviews }, { data: profiles }] = await Promise.all([
        sc.from("engineering_advisory_recommendations").select("*").or(orgFilter).order("created_at", { ascending: false }).limit(50),
        sc.from("engineering_advisory_reviews").select("*").or(orgFilter).order("created_at", { ascending: false }).limit(20),
        sc.from("engineering_advisory_scope_profiles").select("*").or(orgFilter),
      ]);

      const allRecs = recs || [];
      return jsonResponse({
        total_recommendations: allRecs.length,
        open: allRecs.filter((r: any) => r.status === "open").length,
        reviewed: allRecs.filter((r: any) => r.status === "reviewed").length,
        accepted: allRecs.filter((r: any) => r.status === "accepted").length,
        rejected: allRecs.filter((r: any) => r.status === "rejected").length,
        implemented: allRecs.filter((r: any) => r.status === "implemented").length,
        dismissed: allRecs.filter((r: any) => r.status === "dismissed").length,
        total_reviews: (reviews || []).length,
        scope_profiles: (profiles || []).length,
        safety_breakdown: {
          low_risk: allRecs.filter((r: any) => r.safety_class === "low_risk_review").length,
          medium_risk: allRecs.filter((r: any) => r.safety_class === "medium_risk_review").length,
          high_risk: allRecs.filter((r: any) => r.safety_class === "high_risk_review").length,
        },
        recent_recommendations: allRecs.slice(0, 10),
        recent_reviews: (reviews || []).slice(0, 5),
      });
    }

    // ─── GET RECOMMENDATIONS ───
    if (action === "get_recommendations") {
      let query = sc.from("engineering_advisory_recommendations").select("*").or(orgFilter);
      if (body.status) query = query.eq("status", body.status);
      if (body.safety_class) query = query.eq("safety_class", body.safety_class);
      const { data } = await query.order("priority_score", { ascending: false }).limit(body.limit || 50);
      return jsonResponse({ recommendations: data || [] });
    }

    // ─── GET REVIEWS ───
    if (action === "get_reviews") {
      const { data } = await sc.from("engineering_advisory_reviews").select("*").or(orgFilter).order("created_at", { ascending: false }).limit(body.limit || 50);
      return jsonResponse({ reviews: data || [] });
    }

    // ─── GET SCOPE PROFILES ───
    if (action === "get_scope_profiles") {
      const { data } = await sc.from("engineering_advisory_scope_profiles").select("*").or(orgFilter);
      return jsonResponse({ profiles: data || [] });
    }

    // ─── EXPLAIN ───
    if (action === "explain") {
      if (!body.recommendation_id) return errorResponse("recommendation_id required", 400);
      const { data: rec } = await sc.from("engineering_advisory_recommendations").select("*").eq("id", body.recommendation_id).maybeSingle();
      if (!rec) return errorResponse("Recommendation not found", 404);
      const explanation = explainRecommendation(rec as any);
      return jsonResponse({ recommendation: rec, explanation });
    }

    // ─── RECOMPUTE ───
    if (action === "recompute") {
      const signals = aggregateAdvisorySignals(body.layers || {});
      const opportunities = synthesizeOpportunities(signals);
      const recommendations = generateRecommendations(opportunities);
      const prioritized = prioritizeRecommendations(recommendations);

      // Get existing open recs for dedup
      const { data: existing } = await sc.from("engineering_advisory_recommendations").select("recommendation_type, target_scope").or(orgFilter).eq("status", "open");
      const existingTypes = new Set((existing || []).map((e: any) => `${e.recommendation_type}:${e.target_scope}`));

      const clustered = clusterRecommendations(prioritized, existingTypes);

      let created = 0;
      for (const cluster of clustered.clusters) {
        const rep = cluster.representative;
        await sc.from("engineering_advisory_recommendations").insert({
          recommendation_type: rep.recommendation_type,
          target_scope: rep.target_scope,
          target_entities: rep.target_entities,
          rationale_codes: rep.rationale_codes,
          evidence_refs: rep.evidence_refs,
          expected_impact: rep.expected_impact,
          priority_score: rep.priority_score,
          confidence_score: rep.confidence_score,
          safety_class: rep.safety_class,
          review_requirements: rep.review_requirements,
          status: "open",
          organization_id,
        });
        created++;
      }

      return jsonResponse({
        signals: signals.length,
        opportunities: opportunities.length,
        recommendations_generated: prioritized.length,
        clusters: clustered.clusters.length,
        suppressed: clustered.suppressed.length,
        deduplicated: clustered.deduplicated_count,
        created,
        recomputed_at: new Date().toISOString(),
      });
    }

    // ─── REVIEW ───
    if (action === "review_recommendation") {
      if (!body.recommendation_id) return errorResponse("recommendation_id required", 400);
      const { data: rec } = await sc.from("engineering_advisory_recommendations").select("*").eq("id", body.recommendation_id).maybeSingle();
      if (!rec) return errorResponse("Recommendation not found", 404);

      const transition = validateReviewTransition(rec.status, "reviewed");
      if (!transition.valid) return errorResponse(transition.reason, 400);

      await sc.from("engineering_advisory_recommendations").update({ status: "reviewed" }).eq("id", body.recommendation_id);
      const review = buildReview({ recommendation_id: body.recommendation_id, review_status: "reviewed", review_notes: body.notes });
      await sc.from("engineering_advisory_reviews").insert({ ...review, organization_id });
      return jsonResponse({ success: true });
    }

    // ─── ACCEPT ───
    if (action === "accept_recommendation") {
      if (!body.recommendation_id) return errorResponse("recommendation_id required", 400);
      const { data: rec } = await sc.from("engineering_advisory_recommendations").select("*").eq("id", body.recommendation_id).maybeSingle();
      if (!rec) return errorResponse("Recommendation not found", 404);

      const transition = validateReviewTransition(rec.status, "accepted");
      if (!transition.valid) return errorResponse(transition.reason, 400);

      await sc.from("engineering_advisory_recommendations").update({ status: "accepted" }).eq("id", body.recommendation_id);
      const review = buildReview({ recommendation_id: body.recommendation_id, review_status: "accepted", review_notes: body.notes });
      await sc.from("engineering_advisory_reviews").insert({ ...review, organization_id });
      return jsonResponse({ success: true });
    }

    // ─── REJECT ───
    if (action === "reject_recommendation") {
      if (!body.recommendation_id) return errorResponse("recommendation_id required", 400);
      const { data: rec } = await sc.from("engineering_advisory_recommendations").select("*").eq("id", body.recommendation_id).maybeSingle();
      if (!rec) return errorResponse("Recommendation not found", 404);

      const transition = validateReviewTransition(rec.status, "rejected");
      if (!transition.valid) return errorResponse(transition.reason, 400);

      await sc.from("engineering_advisory_recommendations").update({ status: "rejected" }).eq("id", body.recommendation_id);
      const review = buildReview({ recommendation_id: body.recommendation_id, review_status: "rejected", review_notes: body.notes, review_reason_codes: body.reason_codes });
      await sc.from("engineering_advisory_reviews").insert({ ...review, organization_id });
      return jsonResponse({ success: true });
    }

    // ─── DISMISS ───
    if (action === "dismiss_recommendation") {
      if (!body.recommendation_id) return errorResponse("recommendation_id required", 400);
      const { data: rec } = await sc.from("engineering_advisory_recommendations").select("*").eq("id", body.recommendation_id).maybeSingle();
      if (!rec) return errorResponse("Recommendation not found", 404);

      const transition = validateReviewTransition(rec.status, "dismissed");
      if (!transition.valid) return errorResponse(transition.reason, 400);

      await sc.from("engineering_advisory_recommendations").update({ status: "dismissed" }).eq("id", body.recommendation_id);
      const review = buildReview({ recommendation_id: body.recommendation_id, review_status: "dismissed", review_notes: body.notes });
      await sc.from("engineering_advisory_reviews").insert({ ...review, organization_id });
      return jsonResponse({ success: true });
    }

    // ─── MARK IMPLEMENTED ───
    if (action === "mark_implemented") {
      if (!body.recommendation_id) return errorResponse("recommendation_id required", 400);
      const { data: rec } = await sc.from("engineering_advisory_recommendations").select("*").eq("id", body.recommendation_id).maybeSingle();
      if (!rec) return errorResponse("Recommendation not found", 404);

      const transition = validateReviewTransition(rec.status, "implemented");
      if (!transition.valid) return errorResponse(transition.reason, 400);

      await sc.from("engineering_advisory_recommendations").update({ status: "implemented" }).eq("id", body.recommendation_id);
      const review = buildReview({ recommendation_id: body.recommendation_id, review_status: "implemented", review_notes: body.notes, linked_changes: body.linked_changes });
      await sc.from("engineering_advisory_reviews").insert({ ...review, organization_id });
      return jsonResponse({ success: true });
    }

    return errorResponse("Invalid action", 400);
  } catch (e) {
    console.error("engineering-advisor error:", e);
    return errorResponse(e.message || "Internal error", 500);
  }
});
