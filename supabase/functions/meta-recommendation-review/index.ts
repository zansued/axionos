import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, AuthContext } from "../_shared/auth.ts";
import { META_AUDIT_EVENTS, RECOMMENDATION_STATUSES } from "../_shared/meta-agents/types.ts";
import { scoreQualityRecord } from "../_shared/meta-agents/proposal-quality-scoring.ts";

/**
 * meta-recommendation-review — Sprint 19 (Quality Feedback)
 *
 * Review workflow for Meta-Agent recommendations.
 * Now records quality feedback on every review action.
 *
 * Review workflow for Meta-Agent recommendations.
 * Actions: accepted, rejected, deferred
 *
 * SAFETY:
 * - Status changes only. Acceptance does NOT implement any change.
 * - Validates state transitions (only pending → accepted|rejected|deferred).
 * - Unauthorized org access blocked.
 * - Full audit trail on every action.
 */
serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = await authenticate(req);
    if (auth instanceof Response) return auth;
    const { user, serviceClient: sc } = auth as AuthContext;

    const { recommendation_id, action, review_notes } = await req.json();

    if (!recommendation_id || !action) {
      return errorResponse("recommendation_id and action required", 400);
    }

    const validActions = ["accepted", "rejected", "deferred"];
    if (!validActions.includes(action)) {
      return errorResponse(`Invalid action. Must be one of: ${validActions.join(", ")}`, 400);
    }

    // Fetch recommendation
    const { data: rec, error: fetchErr } = await sc
      .from("meta_agent_recommendations")
      .select("id, organization_id, status, meta_agent_type, title")
      .eq("id", recommendation_id)
      .single();

    if (fetchErr || !rec) return errorResponse("Recommendation not found", 404);

    // --- State transition validation ---
    // Only allow transitions from 'pending'
    if (rec.status !== "pending") {
      return errorResponse(
        `Cannot ${action} a recommendation with status "${rec.status}". Only pending recommendations can be reviewed.`,
        409
      );
    }

    // Verify membership with editor+ role
    const { data: member } = await sc
      .from("organization_members")
      .select("role")
      .eq("organization_id", rec.organization_id)
      .eq("user_id", user.id)
      .single();

    if (!member || !["owner", "admin", "editor"].includes(member.role)) {
      return errorResponse("Insufficient permissions", 403);
    }

    const previousStatus = rec.status;

    // Update recommendation — status change ONLY, no side effects
    const { error: updateErr } = await sc
      .from("meta_agent_recommendations")
      .update({
        status: action,
        review_notes: review_notes || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", recommendation_id);

    if (updateErr) return errorResponse("Failed to update recommendation", 500);

    // Map action to audit event
    const auditEventMap: Record<string, string> = {
      accepted: META_AUDIT_EVENTS.META_RECOMMENDATION_ACCEPTED,
      rejected: META_AUDIT_EVENTS.META_RECOMMENDATION_REJECTED,
      deferred: META_AUDIT_EVENTS.META_RECOMMENDATION_DEFERRED,
    };

    // Write audit log
    await sc.from("audit_logs").insert({
      user_id: user.id,
      action: auditEventMap[action],
      category: "meta_agents",
      entity_type: "meta_agent_recommendations",
      entity_id: recommendation_id,
      message: `${action} meta-recommendation: ${rec.title}`,
      organization_id: rec.organization_id,
      metadata: {
        meta_agent_type: rec.meta_agent_type,
        previous_status: previousStatus,
        new_status: action,
        review_notes: review_notes || null,
      },
    });

    // ── Sprint 19: Record quality feedback (fire-and-forget) ──
    const recFull = await sc
      .from("meta_agent_recommendations")
      .select("confidence_score, impact_score, priority_score, supporting_evidence, source_metrics, created_at")
      .eq("id", recommendation_id)
      .single()
      .then(({ data }) => data)
      .catch(() => null);

    if (recFull) {
      const evidence = Array.isArray(recFull.supporting_evidence) ? recFull.supporting_evidence : [];
      const histEvidence = evidence.find((e: any) => e.type?.includes("history_context")) as any;
      const srcMetrics = recFull.source_metrics as any;
      const alignment = histEvidence?.historical_alignment || srcMetrics?.historical_alignment || null;
      const wasMemoryEnriched = evidence.some((e: any) => e.type?.includes("history_context"));

      const qualityInput = {
        entity_type: "recommendation" as const,
        entity_id: recommendation_id,
        meta_agent_type: rec.meta_agent_type,
        recommendation_type: "",
        review_outcome: action,
        created_at: recFull.created_at,
        reviewed_at: new Date().toISOString(),
        confidence_score: Number(recFull.confidence_score || 0),
        impact_score: Number(recFull.impact_score || 0),
        priority_score: Number(recFull.priority_score || 0),
        historical_alignment: alignment,
        was_memory_enriched: wasMemoryEnriched,
        reviewer_notes: review_notes,
      };
      const scores = scoreQualityRecord(qualityInput);

      // Legacy quality record
      await sc.from("proposal_quality_records").insert({
        organization_id: rec.organization_id,
        entity_type: "recommendation",
        entity_id: recommendation_id,
        meta_agent_type: rec.meta_agent_type,
        review_outcome: action,
        review_latency_hours: scores.review_latency_hours,
        reviewer_notes_length: (review_notes || "").length,
        acceptance_quality_score: scores.acceptance_quality_score,
        implementation_quality_score: scores.implementation_quality_score,
        historical_alignment_accuracy: scores.historical_alignment_accuracy,
        overall_quality_score: scores.overall_quality_score,
        confidence_at_creation: qualityInput.confidence_score,
        impact_at_creation: qualityInput.impact_score,
        priority_at_creation: qualityInput.priority_score,
        historical_alignment: alignment,
        was_memory_enriched: wasMemoryEnriched,
        feedback_signals: scores.feedback_signals,
      }).catch((e: any) => console.error("Quality record error:", e));

      // Sprint 19 expanded: structured feedback record
      const { computeFeedbackScores } = await import("../_shared/meta-agents/proposal-quality-scoring.ts");
      const fbScores = computeFeedbackScores({
        organization_id: rec.organization_id,
        entity_type: "recommendation",
        entity_id: recommendation_id,
        source_meta_agent_type: rec.meta_agent_type,
        decision_signal: action as any,
        confidence_score: qualityInput.confidence_score,
        impact_score: qualityInput.impact_score,
        priority_score: qualityInput.priority_score,
        historical_alignment: alignment,
        was_memory_enriched: wasMemoryEnriched,
        created_at: recFull.created_at,
        reviewed_at: new Date().toISOString(),
        notes: review_notes,
      });

      await sc.from("proposal_quality_feedback").insert({
        organization_id: rec.organization_id,
        entity_type: "recommendation",
        entity_id: recommendation_id,
        source_meta_agent_type: rec.meta_agent_type,
        decision_signal: action,
        quality_score: fbScores.quality_score,
        usefulness_score: fbScores.usefulness_score,
        historical_support_score: fbScores.historical_support_score,
        historical_conflict_score: fbScores.historical_conflict_score,
        notes: review_notes || null,
      }).catch((e: any) => console.error("Feedback record error:", e));
    }

    return jsonResponse({
      id: recommendation_id,
      previous_status: previousStatus,
      new_status: action,
      reviewed_by: user.id,
    });
  } catch (e) {
    console.error("meta-recommendation-review error:", e);
    return errorResponse(e.message || "Internal error", 500);
  }
});
