import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, AuthContext } from "../_shared/auth.ts";

/**
 * extension-management — Sprint 71 (Governed Extensibility)
 *
 * Manages platform extension lifecycle:
 *   - list: List extensions and their activation state
 *   - activate: Request activation (creates pending approval)
 *   - approve: Approve pending activation
 *   - reject: Reject pending activation
 *   - deactivate: Deactivate an active extension
 *   - rollback: Rollback to pre-activation state
 *   - check_compatibility: Run compatibility check
 *
 * SAFETY: Human approval required for activation.
 *         No autonomous mutation. Full audit trail.
 *
 * POST { action, extension_id?, activation_id?, ...params }
 */

const VALID_ACTIONS = ["list", "activate", "approve", "reject", "deactivate", "rollback", "check_compatibility"];

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = await authenticate(req);
    if (auth instanceof Response) return auth;
    const { user, serviceClient: sc } = auth as AuthContext;

    const body = await req.json();
    const { action, extension_id, activation_id, organization_id, notes } = body;

    if (!action || !VALID_ACTIONS.includes(action)) {
      return errorResponse(`Invalid action. Must be one of: ${VALID_ACTIONS.join(", ")}`, 400);
    }

    if (!organization_id) {
      return errorResponse("organization_id required", 400);
    }

    // Verify membership
    const { data: member } = await sc
      .from("organization_members")
      .select("role")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .single();

    if (!member) return errorResponse("Not a member of this organization", 403);

    const isAdmin = ["owner", "admin"].includes(member.role);

    // ── LIST ──
    if (action === "list") {
      const { data: extensions, error } = await sc
        .from("platform_extensions")
        .select("*, extension_activations(*)")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false });

      if (error) return errorResponse("Failed to list extensions", 500);
      return jsonResponse({ extensions: extensions || [] });
    }

    // All other actions require admin
    if (!isAdmin) return errorResponse("Admin access required", 403);

    // ── CHECK COMPATIBILITY ──
    if (action === "check_compatibility") {
      if (!extension_id) return errorResponse("extension_id required", 400);

      const { data: ext } = await sc
        .from("platform_extensions")
        .select("*")
        .eq("id", extension_id)
        .single();

      if (!ext) return errorResponse("Extension not found", 404);

      // Deterministic compatibility assessment
      const constraints = ext.compatibility_constraints as Record<string, unknown> || {};
      const conflicts: string[] = [];
      let score = 1.0;

      // Check for conflicting active extensions
      const { data: activeExts } = await sc
        .from("extension_activations")
        .select("extension_id, platform_extensions(extension_key, category)")
        .eq("organization_id", organization_id)
        .eq("activation_status", "active");

      const exclusiveCategories = (constraints as any).exclusive_categories || [];
      for (const active of (activeExts || [])) {
        const activeExt = (active as any).platform_extensions;
        if (activeExt && exclusiveCategories.includes(activeExt.category)) {
          conflicts.push(`Conflicts with active extension: ${activeExt.extension_key} (same category: ${activeExt.category})`);
          score -= 0.3;
        }
      }

      const riskPenalty: Record<string, number> = { low: 0, moderate: 0.1, high: 0.25, critical: 0.5 };
      score -= riskPenalty[ext.risk_level] || 0;
      score = Math.max(0, Math.round(score * 100) / 100);

      const riskAssessment = score >= 0.8 ? "low" : score >= 0.5 ? "moderate" : "high";

      const { data: check } = await sc
        .from("extension_compatibility_checks")
        .insert({
          organization_id,
          extension_id,
          check_type: "pre_activation",
          compatibility_score: score,
          risk_assessment: riskAssessment,
          conflicts_detected: conflicts,
          requirements_met: conflicts.length === 0,
          check_details: { constraints, active_count: (activeExts || []).length },
        })
        .select("id")
        .single();

      await auditEvent(sc, organization_id, extension_id, null, "compatibility_check", user.id, null, { score, risk: riskAssessment, conflicts });

      return jsonResponse({ compatibility: { score, risk_assessment: riskAssessment, conflicts, requirements_met: conflicts.length === 0, check_id: check?.id } });
    }

    // ── ACTIVATE (request) ──
    if (action === "activate") {
      if (!extension_id) return errorResponse("extension_id required", 400);

      const { data: ext } = await sc
        .from("platform_extensions")
        .select("*")
        .eq("id", extension_id)
        .single();

      if (!ext) return errorResponse("Extension not found", 404);

      // Check if already activated
      const { data: existing } = await sc
        .from("extension_activations")
        .select("id, activation_status")
        .eq("organization_id", organization_id)
        .eq("extension_id", extension_id)
        .in("activation_status", ["active", "pending_approval"])
        .limit(1);

      if (existing && existing.length > 0) {
        return errorResponse(`Extension already ${existing[0].activation_status}`, 409);
      }

      const { data: activation, error: actErr } = await sc
        .from("extension_activations")
        .insert({
          organization_id,
          extension_id,
          activation_status: "pending_approval",
          activated_by: user.id,
          approval_status: "pending",
        })
        .select("id")
        .single();

      if (actErr) return errorResponse("Failed to create activation request", 500);

      await auditEvent(sc, organization_id, extension_id, activation?.id, "activation_requested", user.id, null, { notes });

      return jsonResponse({ activation_id: activation?.id, status: "pending_approval" });
    }

    // ── APPROVE ──
    if (action === "approve") {
      if (!activation_id) return errorResponse("activation_id required", 400);

      const { data: activation } = await sc
        .from("extension_activations")
        .select("*")
        .eq("id", activation_id)
        .single();

      if (!activation) return errorResponse("Activation not found", 404);
      if (activation.activation_status !== "pending_approval") {
        return errorResponse(`Cannot approve: current status is ${activation.activation_status}`, 409);
      }

      const prevState = { activation_status: activation.activation_status, approval_status: activation.approval_status };

      const { error: upErr } = await sc
        .from("extension_activations")
        .update({
          activation_status: "active",
          approval_status: "approved",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          activated_at: new Date().toISOString(),
          rollback_state: prevState,
          updated_at: new Date().toISOString(),
        })
        .eq("id", activation_id);

      if (upErr) return errorResponse("Failed to approve", 500);

      await auditEvent(sc, organization_id, activation.extension_id, activation_id, "activation_approved", user.id, prevState, { approval_status: "approved", notes });

      return jsonResponse({ activation_id, status: "active" });
    }

    // ── REJECT ──
    if (action === "reject") {
      if (!activation_id) return errorResponse("activation_id required", 400);

      const { data: activation } = await sc
        .from("extension_activations")
        .select("*")
        .eq("id", activation_id)
        .single();

      if (!activation) return errorResponse("Activation not found", 404);
      if (activation.activation_status !== "pending_approval") {
        return errorResponse(`Cannot reject: current status is ${activation.activation_status}`, 409);
      }

      const prevState = { activation_status: activation.activation_status, approval_status: activation.approval_status };

      const { error: upErr } = await sc
        .from("extension_activations")
        .update({
          activation_status: "rejected",
          approval_status: "rejected",
          rejection_reason: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", activation_id);

      if (upErr) return errorResponse("Failed to reject", 500);

      await auditEvent(sc, organization_id, activation.extension_id, activation_id, "activation_rejected", user.id, prevState, { rejection_reason: notes });

      return jsonResponse({ activation_id, status: "rejected" });
    }

    // ── DEACTIVATE ──
    if (action === "deactivate") {
      if (!activation_id) return errorResponse("activation_id required", 400);

      const { data: activation } = await sc
        .from("extension_activations")
        .select("*")
        .eq("id", activation_id)
        .single();

      if (!activation) return errorResponse("Activation not found", 404);
      if (activation.activation_status !== "active") {
        return errorResponse(`Cannot deactivate: current status is ${activation.activation_status}`, 409);
      }

      const prevState = { activation_status: "active", activated_at: activation.activated_at };

      const { error: upErr } = await sc
        .from("extension_activations")
        .update({
          activation_status: "inactive",
          deactivated_at: new Date().toISOString(),
          rollback_state: prevState,
          updated_at: new Date().toISOString(),
        })
        .eq("id", activation_id);

      if (upErr) return errorResponse("Failed to deactivate", 500);

      await auditEvent(sc, organization_id, activation.extension_id, activation_id, "deactivated", user.id, prevState, { notes });

      return jsonResponse({ activation_id, status: "inactive" });
    }

    // ── ROLLBACK ──
    if (action === "rollback") {
      if (!activation_id) return errorResponse("activation_id required", 400);

      const { data: activation } = await sc
        .from("extension_activations")
        .select("*")
        .eq("id", activation_id)
        .single();

      if (!activation) return errorResponse("Activation not found", 404);

      const prevState = { activation_status: activation.activation_status };

      const { error: upErr } = await sc
        .from("extension_activations")
        .update({
          activation_status: "rolled_back",
          deactivated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", activation_id);

      if (upErr) return errorResponse("Failed to rollback", 500);

      await auditEvent(sc, organization_id, activation.extension_id, activation_id, "rolled_back", user.id, prevState, { notes });

      return jsonResponse({ activation_id, status: "rolled_back" });
    }

    return errorResponse("Unhandled action", 400);
  } catch (e: any) {
    console.error("extension-management error:", e);
    return errorResponse(e.message || "Internal error", 500);
  }
});

async function auditEvent(
  sc: any,
  orgId: string,
  extId: string,
  actId: string | null,
  eventType: string,
  actorId: string,
  prevState: any,
  details: any,
) {
  try {
    await sc.from("extension_audit_events").insert({
      organization_id: orgId,
      extension_id: extId,
      activation_id: actId,
      event_type: eventType,
      actor_id: actorId,
      previous_state: prevState,
      new_state: details,
      event_details: details || {},
    });
  } catch (e) {
    console.error("Audit event error:", e);
  }
}
