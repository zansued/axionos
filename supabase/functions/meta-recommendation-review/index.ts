import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, AuthContext } from "../_shared/auth.ts";
import { META_AUDIT_EVENTS, RECOMMENDATION_STATUSES } from "../_shared/meta-agents/types.ts";

/**
 * meta-recommendation-review — Sprint 13
 *
 * Review workflow for Meta-Agent recommendations.
 * Actions: review, accept, reject, defer
 *
 * POST { recommendation_id, action, review_notes? }
 *
 * SAFETY: Status changes only. Acceptance does NOT implement any change.
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

    const validActions = ["reviewed", "accepted", "rejected", "deferred"];
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

    // Verify membership with admin/owner role
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

    // Update recommendation
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
      reviewed: META_AUDIT_EVENTS.META_RECOMMENDATION_REVIEWED,
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
