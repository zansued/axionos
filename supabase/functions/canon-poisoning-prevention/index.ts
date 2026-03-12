import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { logSecurityAudit, resolveAndValidateOrg } from "../_shared/security-audit.ts";
import {
  scorePoisoningRisk,
  PROMOTION_TRUST_FLOOR,
  PROMOTION_MAX_RISK_SCORE,
  FIRST_TIME_SOURCE_TRUST_FLOOR,
} from "../_shared/canon-poisoning-scorer.ts";

/**
 * Canon Poisoning Prevention Engine — Sprint 193
 *
 * Actions:
 *   - assess_candidate: score a single candidate for poisoning risk
 *   - assess_batch: score a batch of pending candidates
 *   - quarantine_candidate: move a candidate into quarantine
 *   - release_candidate: release from quarantine with review notes
 *   - check_promotion_gate: validate candidate for promotion readiness
 *   - list_quarantined: list quarantined candidates
 *   - list_signals: list security signals
 *   - overview: dashboard metrics
 */

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const authResult = await authenticateWithRateLimit(req, "canon-poisoning-prevention");
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient } = authResult;

    const body = await req.json();
    const { action, ...params } = body;

    const { orgId, error: orgError } = await resolveAndValidateOrg(
      serviceClient, user.id, params.organization_id
    );
    if (orgError || !orgId) return errorResponse(orgError || "Organization access denied", 403, req);

    await logSecurityAudit(serviceClient, {
      organization_id: orgId,
      actor_id: user.id,
      function_name: "canon-poisoning-prevention",
      action,
      context: { params_keys: Object.keys(params) },
    });

    switch (action) {
      // ── Assess single candidate ──
      case "assess_candidate": {
        const { candidate_id } = params;
        if (!candidate_id) return errorResponse("candidate_id required", 400, req);

        const { data: candidate, error: cErr } = await serviceClient
          .from("learning_candidates")
          .select("*")
          .eq("id", candidate_id)
          .eq("organization_id", orgId)
          .single();
        if (cErr || !candidate) return errorResponse("Candidate not found", 404, req);

        // Get source trust if available
        let sourceTrust = 50;
        if (candidate.source_type) {
          const { data: trustData } = await serviceClient
            .from("repo_trust_scores")
            .select("trust_score")
            .eq("organization_id", orgId)
            .eq("source_name", candidate.source_type)
            .limit(1);
          if (trustData?.[0]) sourceTrust = trustData[0].trust_score;
        }

        // Get existing canon for conflict detection
        const { data: canonEntries } = await serviceClient
          .from("canon_entries")
          .select("title")
          .eq("organization_id", orgId)
          .neq("lifecycle_status", "deprecated")
          .limit(200);

        // Count similar candidates from same source
        const { count: similarCount } = await serviceClient
          .from("learning_candidates")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .eq("source_type", candidate.source_type || "")
          .neq("id", candidate_id);

        const result = scorePoisoningRisk({
          candidate_title: candidate.title || "",
          candidate_summary: candidate.summary || "",
          candidate_body: candidate.payload?.body || "",
          source_type: candidate.source_type || "",
          source_trust_score: sourceTrust,
          confidence_score: candidate.confidence_score || 50,
          signal_count: candidate.signal_count || 0,
          existing_canon_titles: (canonEntries || []).map((e: any) => e.title),
          similar_candidate_count: similarCount || 0,
        });

        // Persist assessment
        const { data: assessment } = await serviceClient
          .from("canon_poisoning_assessments")
          .insert({
            organization_id: orgId,
            candidate_id,
            candidate_title: candidate.title || "",
            source_name: candidate.source_type || "",
            poisoning_risk_score: result.poisoning_risk_score,
            poisoning_risk_level: result.poisoning_risk_level,
            poisoning_signals: result.poisoning_signals,
            risk_reason_summary: result.risk_reason_summary,
            requires_security_review: result.requires_security_review,
            quarantine_status: result.recommended_action === "quarantine" ? "quarantined" : "none",
          })
          .select()
          .single();

        // Persist security signals
        for (const signal of result.poisoning_signals) {
          await serviceClient.from("canon_security_signals").insert({
            organization_id: orgId,
            signal_type: signal.signal_type,
            severity: signal.severity,
            candidate_id,
            assessment_id: assessment?.id,
            description: signal.description,
            evidence: { detail: signal.evidence, weight: signal.weight },
          });
        }

        // Auto-quarantine high-risk candidates
        if (result.recommended_action === "quarantine" || result.recommended_action === "security_review") {
          await serviceClient
            .from("learning_candidates")
            .update({ review_status: "quarantined", evaluation_status: "security_review_required" })
            .eq("id", candidate_id);
        }

        return jsonResponse({ assessment: result, assessment_id: assessment?.id }, 200, req);
      }

      // ── Assess batch ──
      case "assess_batch": {
        const batchSize = params.batch_size || 20;

        const { data: candidates, error: fetchErr } = await serviceClient
          .from("learning_candidates")
          .select("id, title, summary, source_type, confidence_score, signal_count, payload")
          .eq("organization_id", orgId)
          .in("review_status", ["pending", "pending_review"])
          .order("created_at", { ascending: true })
          .limit(batchSize);

        if (fetchErr) throw fetchErr;
        if (!candidates?.length) return jsonResponse({ assessed: 0, message: "No pending candidates" }, 200, req);

        const { data: canonEntries } = await serviceClient
          .from("canon_entries")
          .select("title")
          .eq("organization_id", orgId)
          .neq("lifecycle_status", "deprecated")
          .limit(200);
        const canonTitles = (canonEntries || []).map((e: any) => e.title);

        let assessed = 0, quarantined = 0, flagged = 0;

        for (const c of candidates) {
          const result = scorePoisoningRisk({
            candidate_title: c.title || "",
            candidate_summary: c.summary || "",
            candidate_body: c.payload?.body || "",
            source_type: c.source_type || "",
            confidence_score: c.confidence_score || 50,
            signal_count: c.signal_count || 0,
            existing_canon_titles: canonTitles,
          });

          await serviceClient.from("canon_poisoning_assessments").insert({
            organization_id: orgId,
            candidate_id: c.id,
            candidate_title: c.title || "",
            source_name: c.source_type || "",
            poisoning_risk_score: result.poisoning_risk_score,
            poisoning_risk_level: result.poisoning_risk_level,
            poisoning_signals: result.poisoning_signals,
            risk_reason_summary: result.risk_reason_summary,
            requires_security_review: result.requires_security_review,
            quarantine_status: result.recommended_action === "quarantine" ? "quarantined" : "none",
          });

          if (result.recommended_action === "quarantine" || result.recommended_action === "security_review") {
            await serviceClient
              .from("learning_candidates")
              .update({ review_status: "quarantined", evaluation_status: "security_review_required" })
              .eq("id", c.id);
            quarantined++;
          } else if (result.poisoning_risk_score > 0) {
            flagged++;
          }

          assessed++;
        }

        return jsonResponse({ assessed, quarantined, flagged }, 200, req);
      }

      // ── Quarantine candidate ──
      case "quarantine_candidate": {
        const { candidate_id, reason } = params;
        if (!candidate_id) return errorResponse("candidate_id required", 400, req);

        await serviceClient
          .from("learning_candidates")
          .update({ review_status: "quarantined", evaluation_status: "security_review_required" })
          .eq("id", candidate_id)
          .eq("organization_id", orgId);

        await serviceClient
          .from("canon_poisoning_assessments")
          .update({ quarantine_status: "quarantined", updated_at: new Date().toISOString() })
          .eq("candidate_id", candidate_id)
          .eq("organization_id", orgId);

        await logSecurityAudit(serviceClient, {
          organization_id: orgId,
          actor_id: user.id,
          function_name: "canon-poisoning-prevention",
          action: "candidate_quarantined",
          context: { candidate_id, reason },
        });

        return jsonResponse({ success: true, message: "Candidate quarantined" }, 200, req);
      }

      // ── Release from quarantine ──
      case "release_candidate": {
        const { candidate_id, review_notes, new_status } = params;
        if (!candidate_id) return errorResponse("candidate_id required", 400, req);

        const targetStatus = new_status || "pending_review";

        await serviceClient
          .from("learning_candidates")
          .update({ review_status: targetStatus, evaluation_status: "pending" })
          .eq("id", candidate_id)
          .eq("organization_id", orgId);

        await serviceClient
          .from("canon_poisoning_assessments")
          .update({
            quarantine_status: "released",
            review_outcome: "released",
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            review_notes: review_notes || "",
            updated_at: new Date().toISOString(),
          })
          .eq("candidate_id", candidate_id)
          .eq("organization_id", orgId);

        await logSecurityAudit(serviceClient, {
          organization_id: orgId,
          actor_id: user.id,
          function_name: "canon-poisoning-prevention",
          action: "candidate_released",
          context: { candidate_id, review_notes },
        });

        return jsonResponse({ success: true, message: "Candidate released from quarantine" }, 200, req);
      }

      // ── Check promotion gate ──
      case "check_promotion_gate": {
        const { candidate_id } = params;
        if (!candidate_id) return errorResponse("candidate_id required", 400, req);

        const { data: assessment } = await serviceClient
          .from("canon_poisoning_assessments")
          .select("*")
          .eq("candidate_id", candidate_id)
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { data: candidate } = await serviceClient
          .from("learning_candidates")
          .select("source_type, confidence_score, review_status")
          .eq("id", candidate_id)
          .eq("organization_id", orgId)
          .single();

        const blocks: string[] = [];

        // Check quarantine status
        if (candidate?.review_status === "quarantined") {
          blocks.push("Candidate is quarantined — requires security review before promotion");
        }

        // Check poisoning risk
        if (assessment && assessment.poisoning_risk_score > PROMOTION_MAX_RISK_SCORE) {
          blocks.push(`Poisoning risk score (${assessment.poisoning_risk_score}) exceeds threshold (${PROMOTION_MAX_RISK_SCORE})`);
        }

        // Check source trust floor
        let sourceTrust = 50;
        if (candidate?.source_type) {
          const { data: trustData } = await serviceClient
            .from("repo_trust_scores")
            .select("trust_score")
            .eq("organization_id", orgId)
            .eq("source_name", candidate.source_type)
            .limit(1);
          if (trustData?.[0]) sourceTrust = trustData[0].trust_score;
        }

        if (sourceTrust < PROMOTION_TRUST_FLOOR) {
          blocks.push(`Source trust (${sourceTrust}) below minimum floor (${PROMOTION_TRUST_FLOOR})`);
        }

        // Check for unresolved security signals
        const { count: unresolvedSignals } = await serviceClient
          .from("canon_security_signals")
          .select("*", { count: "exact", head: true })
          .eq("candidate_id", candidate_id)
          .eq("organization_id", orgId)
          .eq("resolved", false);

        if ((unresolvedSignals ?? 0) > 0) {
          blocks.push(`${unresolvedSignals} unresolved security signal(s)`);
        }

        const promotionAllowed = blocks.length === 0;

        return jsonResponse({
          candidate_id,
          promotion_allowed: promotionAllowed,
          blocks,
          source_trust: sourceTrust,
          poisoning_risk_score: assessment?.poisoning_risk_score ?? null,
          assessment_id: assessment?.id ?? null,
        }, 200, req);
      }

      // ── List quarantined ──
      case "list_quarantined": {
        const { data, error } = await serviceClient
          .from("canon_poisoning_assessments")
          .select("*")
          .eq("organization_id", orgId)
          .eq("quarantine_status", "quarantined")
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        return jsonResponse({ quarantined: data }, 200, req);
      }

      // ── List signals ──
      case "list_signals": {
        const { data, error } = await serviceClient
          .from("canon_security_signals")
          .select("*")
          .eq("organization_id", orgId)
          .eq("resolved", false)
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw error;
        return jsonResponse({ signals: data }, 200, req);
      }

      // ── List assessments ──
      case "list_assessments": {
        const { data, error } = await serviceClient
          .from("canon_poisoning_assessments")
          .select("*")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        return jsonResponse({ assessments: data }, 200, req);
      }

      // ── Overview ──
      case "overview": {
        const [assessments, quarantined, signals, highRisk] = await Promise.all([
          serviceClient.from("canon_poisoning_assessments").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
          serviceClient.from("canon_poisoning_assessments").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("quarantine_status", "quarantined"),
          serviceClient.from("canon_security_signals").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("resolved", false),
          serviceClient.from("canon_poisoning_assessments").select("*", { count: "exact", head: true }).eq("organization_id", orgId).in("poisoning_risk_level", ["high", "critical"]),
        ]);

        return jsonResponse({
          total_assessments: assessments.count ?? 0,
          quarantined_count: quarantined.count ?? 0,
          unresolved_signals: signals.count ?? 0,
          high_risk_count: highRisk.count ?? 0,
          trust_floor: PROMOTION_TRUST_FLOOR,
          max_risk_threshold: PROMOTION_MAX_RISK_SCORE,
        }, 200, req);
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400, req);
    }
  } catch (err) {
    console.error("[canon-poisoning-prevention] Error:", err);
    return errorResponse(err.message, 500, req);
  }
});
