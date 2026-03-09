import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, requireOrgMembership } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const authResult = await authenticate(req);
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient } = authResult;

    const { action, organization_id, posture_id } = await req.json();
    if (!organization_id) return errorResponse("organization_id required", 400);

    const memberCheck = await requireOrgMembership(serviceClient, user.id, organization_id);
    if (memberCheck instanceof Response) return memberCheck;

    switch (action) {
      case "overview": {
        const [{ data: postures }, { data: factors }, { data: recommendations }] = await Promise.all([
          serviceClient.from("outcome_assurance_postures").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(200),
          serviceClient.from("outcome_assurance_factors").select("*").eq("organization_id", organization_id).limit(500),
          serviceClient.from("outcome_assurance_recommendations").select("*").eq("organization_id", organization_id).limit(200),
        ]);

        const all = postures || [];
        const allFactors = factors || [];
        const allRecs = recommendations || [];
        const highConfidence = all.filter((p: any) => p.confidence_score >= 0.7).length;
        const lowConfidence = all.filter((p: any) => p.confidence_score < 0.4).length;
        const highUncertainty = all.filter((p: any) => p.uncertainty_score > 0.5).length;
        const highRisk = all.filter((p: any) => p.risk_score > 0.6).length;
        const totalBlockers = all.reduce((sum: number, p: any) => sum + (p.blocker_count || 0), 0);
        const pendingReviews = all.filter((p: any) => p.posture_status === "pending" || p.posture_status === "assessed").length;
        const positiveFactors = allFactors.filter((f: any) => f.factor_direction === "positive").length;
        const negativeFactors = allFactors.filter((f: any) => f.factor_direction === "negative").length;
        const openRecs = allRecs.filter((r: any) => r.status === "open").length;

        return jsonResponse({
          total_postures: all.length,
          high_confidence: highConfidence,
          low_confidence: lowConfidence,
          high_uncertainty: highUncertainty,
          high_risk: highRisk,
          total_blockers: totalBlockers,
          pending_reviews: pendingReviews,
          positive_factors: positiveFactors,
          negative_factors: negativeFactors,
          open_recommendations: openRecs,
        });
      }

      case "list_assurance_postures": {
        const { data: postures } = await serviceClient
          .from("outcome_assurance_postures")
          .select("*")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false })
          .limit(100);
        return jsonResponse({ postures: postures || [] });
      }

      case "assurance_posture_detail": {
        if (!posture_id) return errorResponse("posture_id required", 400);
        const [{ data: posture }, { data: factors }, { data: reviews }, { data: recommendations }] = await Promise.all([
          serviceClient.from("outcome_assurance_postures").select("*").eq("id", posture_id).maybeSingle(),
          serviceClient.from("outcome_assurance_factors").select("*").eq("posture_id", posture_id).order("weight", { ascending: false }),
          serviceClient.from("outcome_assurance_reviews").select("*").eq("posture_id", posture_id).order("created_at", { ascending: false }),
          serviceClient.from("outcome_assurance_recommendations").select("*").eq("posture_id", posture_id).order("priority_score", { ascending: false }),
        ]);
        if (!posture) return errorResponse("Posture not found", 404);
        return jsonResponse({ posture, factors: factors || [], reviews: reviews || [], recommendations: recommendations || [] });
      }

      case "explain_assurance": {
        if (!posture_id) return errorResponse("posture_id required", 400);
        const { data: posture } = await serviceClient.from("outcome_assurance_postures").select("*").eq("id", posture_id).maybeSingle();
        if (!posture) return errorResponse("Posture not found", 404);
        const { data: factors } = await serviceClient.from("outcome_assurance_factors").select("*").eq("posture_id", posture_id).order("weight", { ascending: false });

        const positives = (factors || []).filter((f: any) => f.factor_direction === "positive");
        const negatives = (factors || []).filter((f: any) => f.factor_direction === "negative");
        const uncertain = (factors || []).filter((f: any) => f.factor_direction === "uncertain");

        const explanations: string[] = [];
        if (posture.confidence_score >= 0.7) explanations.push("High confidence — strong evidence supports this delivery posture.");
        else if (posture.confidence_score < 0.4) explanations.push("Low confidence — insufficient evidence or conflicting signals.");
        if (posture.risk_score > 0.6) explanations.push("Elevated risk — reliability or rollback concerns detected.");
        if (posture.uncertainty_score > 0.5) explanations.push("High uncertainty — key factors remain unresolved or ambiguous.");
        if (posture.blocker_count > 0) explanations.push(`${posture.blocker_count} active blocker(s) preventing readiness.`);
        if (positives.length > 0) explanations.push(`${positives.length} positive factor(s) supporting confidence.`);
        if (negatives.length > 0) explanations.push(`${negatives.length} negative factor(s) reducing confidence.`);
        if (uncertain.length > 0) explanations.push(`${uncertain.length} uncertain factor(s) requiring further analysis.`);

        return jsonResponse({
          posture_label: posture.posture_label,
          confidence_score: posture.confidence_score,
          explanations,
          positive_factors: positives.length,
          negative_factors: negatives.length,
          uncertain_factors: uncertain.length,
          safety_note: "Assurance posture is advisory-first. No autonomous structural changes are triggered by assurance scores.",
        });
      }

      case "review_assurance": {
        if (!posture_id) return errorResponse("posture_id required", 400);
        const { data: reviews } = await serviceClient
          .from("outcome_assurance_reviews")
          .select("*")
          .eq("posture_id", posture_id)
          .order("created_at", { ascending: false });
        return jsonResponse({ reviews: reviews || [] });
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (err) {
    return errorResponse(String(err), 500);
  }
});
