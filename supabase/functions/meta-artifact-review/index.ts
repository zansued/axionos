import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, AuthContext } from "../_shared/auth.ts";
import { scoreQualityRecord } from "../_shared/meta-agents/proposal-quality-scoring.ts";

/**
 * meta-artifact-review — Sprint 19 (Quality Feedback)
 *
 * Review workflow for Meta-Agent artifacts.
 * Valid transitions:
 *   draft → reviewed | rejected
 *   reviewed → approved | rejected
 *   approved → implemented
 *
 * SAFETY: Status changes only. No system mutation.
 *
 * POST { artifact_id, action, review_notes? }
 */

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["reviewed", "rejected"],
  reviewed: ["approved", "rejected"],
  approved: ["implemented"],
};

const AUDIT_EVENTS: Record<string, string> = {
  reviewed: "META_ARTIFACT_REVIEWED",
  approved: "META_ARTIFACT_APPROVED",
  rejected: "META_ARTIFACT_REJECTED",
  implemented: "META_ARTIFACT_IMPLEMENTED",
};

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = await authenticate(req);
    if (auth instanceof Response) return auth;
    const { user, serviceClient: sc } = auth as AuthContext;

    const { artifact_id, action, review_notes } = await req.json();

    if (!artifact_id || !action) {
      return errorResponse("artifact_id and action required", 400);
    }

    const validActions = ["reviewed", "approved", "rejected", "implemented"];
    if (!validActions.includes(action)) {
      return errorResponse(`Invalid action. Must be one of: ${validActions.join(", ")}`, 400);
    }

    // Fetch artifact
    const { data: artifact, error: fetchErr } = await sc
      .from("meta_agent_artifacts")
      .select("id, organization_id, status, title, recommendation_id, created_by_meta_agent")
      .eq("id", artifact_id)
      .single();

    if (fetchErr || !artifact) return errorResponse("Artifact not found", 404);

    // Validate state transition
    const allowed = VALID_TRANSITIONS[artifact.status] || [];
    if (!allowed.includes(action)) {
      return errorResponse(
        `Cannot transition from "${artifact.status}" to "${action}". Allowed: ${allowed.join(", ") || "none"}`,
        409
      );
    }

    // Verify membership with editor+ role
    const { data: member } = await sc
      .from("organization_members")
      .select("role")
      .eq("organization_id", artifact.organization_id)
      .eq("user_id", user.id)
      .single();

    if (!member || !["owner", "admin", "editor"].includes(member.role)) {
      return errorResponse("Insufficient permissions", 403);
    }

    const previousStatus = artifact.status;

    // Update artifact — status change ONLY
    const { error: updateErr } = await sc
      .from("meta_agent_artifacts")
      .update({
        status: action,
        review_notes: review_notes || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", artifact_id);

    if (updateErr) return errorResponse("Failed to update artifact", 500);

    // Write audit log
    await sc.from("audit_logs").insert({
      user_id: user.id,
      action: AUDIT_EVENTS[action] || "META_ARTIFACT_REVIEWED",
      category: "meta_agents",
      entity_type: "meta_agent_artifacts",
      entity_id: artifact_id,
      message: `${action} meta-artifact: ${artifact.title}`,
      organization_id: artifact.organization_id,
      metadata: {
        previous_status: previousStatus,
        new_status: action,
        recommendation_id: artifact.recommendation_id,
        meta_agent_type: artifact.created_by_meta_agent,
        review_notes: review_notes || null,
      },
    });

    // ── Engineering Memory Capture (Sprint 15) ──
    const MEMORY_CAPTURE_MAP: Record<string, { memory_type: string; memory_subtype: string }> = {
      approved: { memory_type: "DesignMemory", memory_subtype: "artifact_approved" },
      implemented: { memory_type: "OutcomeMemory", memory_subtype: "change_implemented" },
    };

    const memoryConfig = MEMORY_CAPTURE_MAP[action];
    if (memoryConfig) {
      await sc.from("engineering_memory_entries").insert({
        organization_id: artifact.organization_id,
        memory_type: memoryConfig.memory_type,
        memory_subtype: memoryConfig.memory_subtype,
        title: `${action}: ${artifact.title}`,
        summary: `Meta-artifact ${artifact_id} transitioned from ${previousStatus} to ${action}. Type: ${artifact.created_by_meta_agent}. Recommendation: ${artifact.recommendation_id}.`,
        source_type: "meta_agent_artifact",
        source_id: artifact_id,
        related_component: artifact.created_by_meta_agent,
        confidence_score: 0.8,
        relevance_score: 0.9,
        tags: [action, artifact.created_by_meta_agent, "meta_artifact"],
      }).then(({ error: memErr }) => {
        if (memErr) console.error("Memory capture error:", memErr);
      });
    }

    // ── Sprint 19: Record quality feedback (fire-and-forget) ──
    const artFull = await sc
      .from("meta_agent_artifacts")
      .select("created_at, artifact_type, content")
      .eq("id", artifact_id)
      .single()
      .then(({ data }) => data)
      .catch(() => null);

    if (artFull) {
      const content = artFull.content as any;
      const histCtx = content?.sections?.historical_context || content?.related_historical_context;
      const alignment = histCtx?.alignment || null;

      const qualityInput = {
        entity_type: "artifact" as const,
        entity_id: artifact_id,
        meta_agent_type: artifact.created_by_meta_agent || "",
        recommendation_type: "",
        artifact_type: artFull.artifact_type,
        review_outcome: action,
        created_at: artFull.created_at,
        reviewed_at: new Date().toISOString(),
        confidence_score: 0,
        impact_score: 0,
        priority_score: 0,
        historical_alignment: alignment,
        was_memory_enriched: !!content?.related_historical_context,
        reviewer_notes: review_notes,
      };
      const scores = scoreQualityRecord(qualityInput);

      await sc.from("proposal_quality_records").insert({
        organization_id: artifact.organization_id,
        entity_type: "artifact",
        entity_id: artifact_id,
        meta_agent_type: artifact.created_by_meta_agent || "",
        artifact_type: artFull.artifact_type,
        review_outcome: action,
        review_latency_hours: scores.review_latency_hours,
        reviewer_notes_length: (review_notes || "").length,
        acceptance_quality_score: scores.acceptance_quality_score,
        implementation_quality_score: scores.implementation_quality_score,
        historical_alignment_accuracy: scores.historical_alignment_accuracy,
        overall_quality_score: scores.overall_quality_score,
        historical_alignment: alignment,
        was_memory_enriched: !!content?.related_historical_context,
        feedback_signals: scores.feedback_signals,
      }).catch((e: any) => console.error("Quality record error:", e));
    }

    return jsonResponse({
      id: artifact_id,
      previous_status: previousStatus,
      new_status: action,
      reviewed_by: user.id,
    });
  } catch (e) {
    console.error("meta-artifact-review error:", e);
    return errorResponse(e.message || "Internal error", 500);
  }
});
