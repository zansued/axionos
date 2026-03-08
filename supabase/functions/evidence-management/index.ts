import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, AuthContext } from "../_shared/auth.ts";

/**
 * evidence-management — Sprint 72 (Evidence Capture & Improvement Ledger)
 *
 * Manages the governed evidence lifecycle:
 *   - ingest: Capture new evidence from system activity
 *   - list: List evidence with filters
 *   - detail: Get single evidence with links
 *   - link_context: Link evidence to system objects
 *   - mark_relevant: Mark evidence as relevant / reviewed / archived
 *   - archive: Archive evidence
 *   - explain: Generate human-readable explanation
 *   - ledger_list: List improvement ledgers
 *   - ledger_create: Create a new ledger
 *
 * SAFETY: Advisory-only. No autonomous mutation. Full audit trail.
 *
 * POST { action, ...params }
 */

const VALID_ACTIONS = [
  "ingest", "list", "detail", "link_context",
  "mark_relevant", "archive", "explain",
  "ledger_list", "ledger_create",
];

const VALID_SOURCE_TYPES = [
  "validation_failure", "repair_attempt", "rollback_event",
  "deployment_blocker", "extension_compatibility_failure",
  "extension_approval_outcome", "operator_note",
  "execution_anomaly", "adoption_friction", "delivery_friction",
  "general",
];

const VALID_SEVERITIES = ["info", "low", "moderate", "high", "critical"];
const VALID_REVIEW_STATUSES = ["new", "reviewing", "relevant", "not_relevant", "archived"];

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = await authenticate(req);
    if (auth instanceof Response) return auth;
    const { user, serviceClient: sc } = auth as AuthContext;

    const body = await req.json();
    const { action, organization_id } = body;

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

    // ── INGEST ──
    if (action === "ingest") {
      if (!isAdmin) return errorResponse("Admin access required for ingestion", 403);

      const { source_type, severity, affected_stage, summary, detail, structured_metadata, workspace_id, initiative_id, linked_extension_id, linked_activation_id } = body;

      if (!source_type || !VALID_SOURCE_TYPES.includes(source_type)) {
        return errorResponse(`Invalid source_type. Must be one of: ${VALID_SOURCE_TYPES.join(", ")}`, 400);
      }
      if (severity && !VALID_SEVERITIES.includes(severity)) {
        return errorResponse(`Invalid severity. Must be one of: ${VALID_SEVERITIES.join(", ")}`, 400);
      }
      if (!summary || summary.trim().length === 0) {
        return errorResponse("summary is required", 400);
      }

      const { data: evidence, error: insertErr } = await sc
        .from("improvement_evidence")
        .insert({
          organization_id,
          workspace_id: workspace_id || null,
          initiative_id: initiative_id || null,
          source_type,
          severity: severity || "info",
          affected_stage: affected_stage || null,
          summary: summary.trim(),
          detail: detail || null,
          structured_metadata: structured_metadata || {},
          linked_extension_id: linked_extension_id || null,
          linked_activation_id: linked_activation_id || null,
          review_status: "new",
        })
        .select("id")
        .single();

      if (insertErr) return errorResponse("Failed to ingest evidence", 500);

      // Audit
      await auditReview(sc, evidence!.id, organization_id, user.id, "ingested", null, "new", null);

      return jsonResponse({ evidence_id: evidence!.id, status: "ingested" });
    }

    // ── LIST ──
    if (action === "list") {
      const { source_type, severity, review_status, limit: rawLimit, offset: rawOffset } = body;

      let query = sc
        .from("improvement_evidence")
        .select("*")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false });

      if (source_type) query = query.eq("source_type", source_type);
      if (severity) query = query.eq("severity", severity);
      if (review_status) query = query.eq("review_status", review_status);

      const limit = Math.min(rawLimit || 50, 200);
      const offset = rawOffset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;
      if (error) return errorResponse("Failed to list evidence", 500);

      // Get counts for KPIs
      const { count: totalCount } = await sc
        .from("improvement_evidence")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organization_id);

      const { count: highCount } = await sc
        .from("improvement_evidence")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organization_id)
        .in("severity", ["high", "critical"]);

      const { count: newCount } = await sc
        .from("improvement_evidence")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organization_id)
        .eq("review_status", "new");

      return jsonResponse({
        evidence: data || [],
        kpis: { total: totalCount || 0, high_severity: highCount || 0, review_backlog: newCount || 0 },
      });
    }

    // ── DETAIL ──
    if (action === "detail") {
      const { evidence_id } = body;
      if (!evidence_id) return errorResponse("evidence_id required", 400);

      const { data: evidence } = await sc
        .from("improvement_evidence")
        .select("*")
        .eq("id", evidence_id)
        .eq("organization_id", organization_id)
        .single();

      if (!evidence) return errorResponse("Evidence not found", 404);

      const { data: links } = await sc
        .from("improvement_evidence_links")
        .select("*")
        .eq("evidence_id", evidence_id)
        .order("created_at", { ascending: false });

      const { data: reviews } = await sc
        .from("improvement_review_events")
        .select("*")
        .eq("evidence_id", evidence_id)
        .order("created_at", { ascending: false });

      return jsonResponse({ evidence, links: links || [], reviews: reviews || [] });
    }

    // ── LINK CONTEXT ──
    if (action === "link_context") {
      if (!isAdmin) return errorResponse("Admin access required", 403);

      const { evidence_id, link_type, target_table, target_id, link_metadata } = body;
      if (!evidence_id || !target_table || !target_id) {
        return errorResponse("evidence_id, target_table, and target_id required", 400);
      }

      const { data: link, error: linkErr } = await sc
        .from("improvement_evidence_links")
        .insert({
          evidence_id,
          organization_id,
          link_type: link_type || "related",
          target_table,
          target_id,
          link_metadata: link_metadata || {},
        })
        .select("id")
        .single();

      if (linkErr) return errorResponse("Failed to create link", 500);

      return jsonResponse({ link_id: link!.id });
    }

    // ── MARK RELEVANT ──
    if (action === "mark_relevant") {
      if (!isAdmin) return errorResponse("Admin access required", 403);

      const { evidence_id, new_status, notes } = body;
      if (!evidence_id) return errorResponse("evidence_id required", 400);
      if (!new_status || !VALID_REVIEW_STATUSES.includes(new_status)) {
        return errorResponse(`Invalid new_status. Must be one of: ${VALID_REVIEW_STATUSES.join(", ")}`, 400);
      }

      const { data: current } = await sc
        .from("improvement_evidence")
        .select("review_status")
        .eq("id", evidence_id)
        .eq("organization_id", organization_id)
        .single();

      if (!current) return errorResponse("Evidence not found", 404);

      const { error: upErr } = await sc
        .from("improvement_evidence")
        .update({
          review_status: new_status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", evidence_id);

      if (upErr) return errorResponse("Failed to update review status", 500);

      await auditReview(sc, evidence_id, organization_id, user.id, "status_change", current.review_status, new_status, notes);

      return jsonResponse({ evidence_id, status: new_status });
    }

    // ── ARCHIVE ──
    if (action === "archive") {
      if (!isAdmin) return errorResponse("Admin access required", 403);

      const { evidence_id, notes } = body;
      if (!evidence_id) return errorResponse("evidence_id required", 400);

      const { data: current } = await sc
        .from("improvement_evidence")
        .select("review_status")
        .eq("id", evidence_id)
        .eq("organization_id", organization_id)
        .single();

      if (!current) return errorResponse("Evidence not found", 404);

      const { error: upErr } = await sc
        .from("improvement_evidence")
        .update({
          review_status: "archived",
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", evidence_id);

      if (upErr) return errorResponse("Failed to archive", 500);

      await auditReview(sc, evidence_id, organization_id, user.id, "archived", current.review_status, "archived", notes);

      return jsonResponse({ evidence_id, status: "archived" });
    }

    // ── EXPLAIN ──
    if (action === "explain") {
      const { evidence_id } = body;
      if (!evidence_id) return errorResponse("evidence_id required", 400);

      const { data: evidence } = await sc
        .from("improvement_evidence")
        .select("*")
        .eq("id", evidence_id)
        .eq("organization_id", organization_id)
        .single();

      if (!evidence) return errorResponse("Evidence not found", 404);

      // Deterministic explanation builder
      const lines: string[] = [];
      lines.push(`**Evidence:** ${evidence.summary}`);
      lines.push(`**Source:** ${evidence.source_type} | **Severity:** ${evidence.severity}`);
      if (evidence.affected_stage) lines.push(`**Affected Stage:** ${evidence.affected_stage}`);
      if (evidence.detail) lines.push(`**Detail:** ${evidence.detail}`);

      const meta = evidence.structured_metadata as Record<string, unknown>;
      if (meta && Object.keys(meta).length > 0) {
        lines.push(`**Context:** ${JSON.stringify(meta)}`);
      }

      lines.push(`**Review Status:** ${evidence.review_status}`);
      lines.push(`**Captured:** ${evidence.created_at}`);

      if (evidence.linked_extension_id) lines.push(`**Linked Extension:** ${evidence.linked_extension_id}`);

      return jsonResponse({ explanation: lines.join("\n"), evidence_id });
    }

    // ── LEDGER LIST ──
    if (action === "ledger_list") {
      const { data: ledgers, error } = await sc
        .from("improvement_ledgers")
        .select("*")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false });

      if (error) return errorResponse("Failed to list ledgers", 500);
      return jsonResponse({ ledgers: ledgers || [] });
    }

    // ── LEDGER CREATE ──
    if (action === "ledger_create") {
      if (!isAdmin) return errorResponse("Admin access required", 403);

      const { ledger_name, ledger_type, description, workspace_id } = body;
      if (!ledger_name) return errorResponse("ledger_name required", 400);

      const { data: ledger, error: createErr } = await sc
        .from("improvement_ledgers")
        .insert({
          organization_id,
          workspace_id: workspace_id || null,
          ledger_name,
          ledger_type: ledger_type || "general",
          description: description || null,
        })
        .select("id")
        .single();

      if (createErr) return errorResponse("Failed to create ledger", 500);

      return jsonResponse({ ledger_id: ledger!.id });
    }

    return errorResponse("Unhandled action", 400);
  } catch (e: any) {
    console.error("evidence-management error:", e);
    return errorResponse(e.message || "Internal error", 500);
  }
});

async function auditReview(
  sc: any,
  evidenceId: string,
  orgId: string,
  actorId: string,
  action: string,
  prevStatus: string | null,
  newStatus: string | null,
  notes: string | null,
) {
  try {
    await sc.from("improvement_review_events").insert({
      evidence_id: evidenceId,
      organization_id: orgId,
      actor_id: actorId,
      action,
      previous_status: prevStatus,
      new_status: newStatus,
      notes: notes || null,
    });
  } catch (e) {
    console.error("Audit review event error:", e);
  }
}
