import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { logSecurityAudit, resolveAndValidateOrg } from "../_shared/security-audit.ts";

/**
 * Delivery Outcomes Engine
 * Auth hardened — Sprint 200
 */

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const authResult = await authenticateWithRateLimit(req, "delivery-outcomes");
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient: supabase } = authResult;

    const { action, organization_id: payloadOrgId, ...params } = await req.json();

    const { orgId: organization_id, error: orgError } = await resolveAndValidateOrg(supabase, user.id, payloadOrgId);
    if (orgError || !organization_id) return errorResponse(orgError || "Organization access denied", 403, req);

    await logSecurityAudit(supabase, {
      organization_id, actor_id: user.id,
      function_name: "delivery-outcomes", action: action || "unknown",
    });

    let result: unknown = null;

    switch (action) {
      case "overview": {
        const [records, factors] = await Promise.all([
          supabase.from("delivery_outcome_records").select("id, outcome_type, analysis_status, confidence_score").eq("organization_id", organization_id),
          supabase.from("delivery_outcome_factors").select("id, factor_direction, factor_type, confidence_score").eq("organization_id", organization_id),
        ]);
        const r = records.data || [];
        const f = factors.data || [];
        result = {
          total_outcomes: r.length,
          analyzed: r.filter((x: any) => x.analysis_status === "analyzed").length,
          reviewed: r.filter((x: any) => x.analysis_status === "reviewed").length,
          low_confidence: r.filter((x: any) => x.analysis_status === "low_confidence" || x.confidence_score < 0.4).length,
          pending: r.filter((x: any) => x.analysis_status === "pending").length,
          positive_factors: f.filter((x: any) => x.factor_direction === "positive").length,
          negative_factors: f.filter((x: any) => x.factor_direction === "negative").length,
          rollback_outcomes: r.filter((x: any) => x.outcome_type === "rollback").length,
        };
        break;
      }

      case "list_outcome_records": {
        const { data } = await supabase.from("delivery_outcome_records")
          .select("*, initiatives(id, title)")
          .eq("organization_id", organization_id)
          .order("updated_at", { ascending: false }).limit(100);
        result = data || [];
        break;
      }

      case "outcome_detail": {
        const { outcome_id } = params;
        const { data: record } = await supabase.from("delivery_outcome_records")
          .select("*, initiatives(id, title)").eq("id", outcome_id).single();
        if (!record) { result = { error: "Not found" }; break; }
        const [factors, links, reviews] = await Promise.all([
          supabase.from("delivery_outcome_factors").select("*").eq("outcome_id", outcome_id).order("contribution_weight", { ascending: false }),
          supabase.from("delivery_outcome_causality_links").select("*").eq("outcome_id", outcome_id).order("created_at", { ascending: false }),
          supabase.from("delivery_outcome_analysis_reviews").select("*").eq("outcome_id", outcome_id).order("created_at", { ascending: false }).limit(10),
        ]);
        result = { record, factors: factors.data || [], links: links.data || [], reviews: reviews.data || [] };
        break;
      }

      case "explain_causality": {
        const { outcome_id } = params;
        const { data: record } = await supabase.from("delivery_outcome_records")
          .select("*, initiatives(id, title)").eq("id", outcome_id).single();
        if (!record) { result = { error: "Not found" }; break; }
        const { data: factors } = await supabase.from("delivery_outcome_factors")
          .select("factor_type, factor_label, factor_direction, contribution_weight, confidence_score, uncertainty_reason")
          .eq("outcome_id", outcome_id).order("contribution_weight", { ascending: false }).limit(10);
        const { data: links } = await supabase.from("delivery_outcome_causality_links")
          .select("link_type, link_strength, confidence_posture, counterfactors, supporting_signals")
          .eq("outcome_id", outcome_id).limit(10);
        const posFactors = (factors || []).filter((f: any) => f.factor_direction === "positive");
        const negFactors = (factors || []).filter((f: any) => f.factor_direction === "negative");
        const uncertainFactors = (factors || []).filter((f: any) => f.factor_direction === "uncertain" || f.confidence_score < 0.4);
        result = {
          record,
          explanation: {
            outcome_type: record.outcome_type,
            confidence: record.confidence_score,
            uncertainty: record.uncertainty_notes,
            positive_factors: posFactors,
            negative_factors: negFactors,
            uncertain_factors: uncertainFactors,
            causal_links: links || [],
            summary: record.confidence_score >= 0.7
              ? `High-confidence analysis with ${posFactors.length} positive and ${negFactors.length} negative factors identified.`
              : record.confidence_score >= 0.4
              ? `Moderate-confidence analysis. ${uncertainFactors.length} factors remain uncertain.`
              : `Low-confidence analysis — results should be reviewed manually. ${uncertainFactors.length} uncertain factors.`,
          },
        };
        break;
      }

      case "review_outcome_analysis": {
        const { outcome_id, review_action: ra, review_notes } = params;
        const { data: record } = await supabase.from("delivery_outcome_records")
          .select("analysis_status").eq("id", outcome_id).single();
        if (!record) { result = { error: "Not found" }; break; }

        const statusMap: Record<string, string> = {
          reviewed: "reviewed", mark_low_confidence: "low_confidence",
          dismiss: "dismissed", confirm: "reviewed", escalate: "pending",
        };
        const newStatus = statusMap[ra] || "analyzed";

        const { data: review, error: revErr } = await supabase.from("delivery_outcome_analysis_reviews").insert({
          organization_id, outcome_id, reviewer_id: user.id,
          review_action: ra, review_notes: review_notes || "",
          previous_status: record.analysis_status, new_status: newStatus,
        }).select().single();
        if (revErr) throw revErr;

        await supabase.from("delivery_outcome_records").update({ analysis_status: newStatus, updated_at: new Date().toISOString() }).eq("id", outcome_id);
        result = review;
        break;
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400, req);
    }

    return jsonResponse({ data: result }, 200, req);
  } catch (err: any) {
    return errorResponse(err.message || "Internal error", 500, req);
  }
});
