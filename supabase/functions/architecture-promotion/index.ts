import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { logSecurityAudit, resolveAndValidateOrg } from "../_shared/security-audit.ts";

type ActionBody = {
  action: string;
  organization_id: string;
  dossier_title?: string;
  proposed_direction?: string;
  expected_benefit?: string;
  risk_posture?: string;
  uncertainty_posture?: string;
  required_approvals?: number;
  linked_hypothesis_ids?: string[];
  linked_simulation_ids?: string[];
  linked_pattern_ids?: string[];
  lineage_entries?: Array<{
    lineage_type: string;
    source_ref_type: string;
    source_ref_id?: string | null;
    evidence_summary: string;
    confidence_contribution: number;
  }>;
  dossier_id?: string;
  rationale?: string;
  review_status?: string;
  review_notes?: string;
  review_reason_codes?: Record<string, unknown> | unknown[];
};

function nowIso() {
  return new Date().toISOString();
}

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    // Auth hardening — Sprint 197
    const authResult = await authenticateWithRateLimit(req, "architecture-promotion");
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient: supabase } = authResult;

    const body = (await req.json()) as ActionBody;
    const { action, organization_id: payloadOrgId } = body;

    const { orgId: organization_id, error: orgError } = await resolveAndValidateOrg(supabase, user.id, payloadOrgId);
    if (orgError || !organization_id) return errorResponse(orgError || "Organization access denied", 403, req);

    await logSecurityAudit(supabase, {
      organization_id, actor_id: user.id,
      function_name: "architecture-promotion", action: action || "unknown",
    });

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    if (action === "overview") {
      const statuses = [
        "submitted_for_review",
        "approved",
        "rejected",
        "deferred",
        "archived",
        "needs_more_research",
      ];

      const countFor = async (status?: string) => {
        let q = userClient
          .from("architecture_promotion_dossiers")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organization_id);
        if (status) q = q.eq("decision_status", status);
        const { count } = await q;
        return count ?? 0;
      };

      const [total, ...perStatus] = await Promise.all([
        countFor(undefined),
        ...statuses.map((s) => countFor(s)),
      ]);

      const map: Record<string, number> = {};
      statuses.forEach((s, idx) => (map[s] = perStatus[idx]));

      return new Response(
        JSON.stringify({
          total,
          review_backlog: map.submitted_for_review,
          approved: map.approved,
          rejected: map.rejected,
          deferred: map.deferred,
          archived: map.archived,
          needs_more_research: map.needs_more_research,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "list_dossiers") {
      const { data: dossiers, error } = await userClient
        .from("architecture_promotion_dossiers")
        .select("*")
        .eq("organization_id", organization_id)
        .order("updated_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      return new Response(JSON.stringify({ dossiers: dossiers || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "dossier_detail") {
      const { dossier_id } = body;
      if (!dossier_id) throw new Error("Missing dossier_id");

      const [{ data: dossier, error: dossierErr }, { data: lineage }, { data: reviews }, { data: decisions }] =
        await Promise.all([
          userClient
            .from("architecture_promotion_dossiers")
            .select("*")
            .eq("organization_id", organization_id)
            .eq("id", dossier_id)
            .maybeSingle(),
          userClient
            .from("architecture_promotion_lineage")
            .select("*")
            .eq("organization_id", organization_id)
            .eq("dossier_id", dossier_id)
            .order("created_at", { ascending: false }),
          userClient
            .from("architecture_promotion_reviews")
            .select("*")
            .eq("organization_id", organization_id)
            .eq("dossier_id", dossier_id)
            .order("created_at", { ascending: false }),
          userClient
            .from("architecture_promotion_decisions")
            .select("*")
            .eq("organization_id", organization_id)
            .eq("dossier_id", dossier_id)
            .order("decided_at", { ascending: false }),
        ]);

      if (dossierErr) throw dossierErr;
      if (!dossier) throw new Error("Dossier not found");

      return new Response(
        JSON.stringify({
          dossier,
          lineage: lineage || [],
          reviews: reviews || [],
          decisions: decisions || [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "explain_dossier_lineage") {
      const { dossier_id } = body;
      if (!dossier_id) throw new Error("Missing dossier_id");

      const [{ data: dossier }, { data: lineage }] = await Promise.all([
        userClient
          .from("architecture_promotion_dossiers")
          .select("id, dossier_title, decision_status, risk_posture, uncertainty_posture")
          .eq("organization_id", organization_id)
          .eq("id", dossier_id)
          .maybeSingle(),
        userClient
          .from("architecture_promotion_lineage")
          .select("source_ref_type, evidence_summary, confidence_contribution")
          .eq("organization_id", organization_id)
          .eq("dossier_id", dossier_id)
          .order("created_at", { ascending: false }),
      ]);

      if (!dossier) throw new Error("Dossier not found");

      return new Response(
        JSON.stringify({
          dossier,
          lineage: lineage || [],
          governance_note:
            "Promotion dossiers are human-governed and advisory-first. Recording a decision never applies or mutates production architecture.",
          isolation_guarantee:
            "This dossier stores only abstracted research lineage references and sanitized evidence summaries; it must not expose tenant-identifying information.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "create_dossier") {
      const required = [
        "dossier_title",
        "proposed_direction",
        "expected_benefit",
        "risk_posture",
        "uncertainty_posture",
      ] as const;

      for (const k of required) {
        if (!(body as any)[k]) throw new Error(`Missing ${k}`);
      }

      const dossierInsert = {
        organization_id,
        dossier_title: body.dossier_title!,
        proposed_direction: body.proposed_direction!,
        expected_benefit: body.expected_benefit!,
        risk_posture: body.risk_posture!,
        uncertainty_posture: body.uncertainty_posture!,
        decision_status: "submitted_for_review",
        required_approvals: Math.max(1, Number(body.required_approvals ?? 1)),
        approvals_received: 0,
        review_notes: null,
        linked_hypothesis_ids: body.linked_hypothesis_ids ?? [],
        linked_simulation_ids: body.linked_simulation_ids ?? [],
        linked_pattern_ids: body.linked_pattern_ids ?? [],
        audit_metadata: {
          created_by: { user_id: user.id, email: user.email ?? null },
          advisory_only: true,
          requires_human_governance: true,
          created_at: nowIso(),
        },
      };

      const { data: created, error: insErr } = await userClient
        .from("architecture_promotion_dossiers")
        .insert(dossierInsert)
        .select("*")
        .maybeSingle();

      if (insErr) throw insErr;
      if (!created) throw new Error("Failed to create dossier");

      const lineage = (body.lineage_entries || []).map((l) => ({
        organization_id,
        dossier_id: created.id,
        lineage_type: l.lineage_type,
        source_ref_id: l.source_ref_id ?? null,
        source_ref_type: l.source_ref_type,
        evidence_summary: l.evidence_summary,
        confidence_contribution: l.confidence_contribution,
      }));

      if (lineage.length > 0) {
        const { error: linErr } = await userClient
          .from("architecture_promotion_lineage")
          .insert(lineage);
        if (linErr) throw linErr;
      }

      return new Response(JSON.stringify({ dossier: created }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "review_dossier") {
      const { dossier_id, review_status, review_notes } = body;
      if (!dossier_id) throw new Error("Missing dossier_id");
      if (!review_status) throw new Error("Missing review_status");

      const { error } = await userClient
        .from("architecture_promotion_reviews")
        .insert({
          organization_id,
          dossier_id,
          reviewer_ref: { user_id: user.id, email: user.email ?? null },
          review_status,
          review_notes: review_notes ?? null,
          review_reason_codes: body.review_reason_codes ?? {},
        });

      if (error) throw error;

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const decisionActions: Record<string, { status: string; decision: string }> = {
      approve_dossier: { status: "approved", decision: "approved" },
      reject_dossier: { status: "rejected", decision: "rejected" },
      defer_dossier: { status: "deferred", decision: "deferred" },
      needs_more_research: { status: "needs_more_research", decision: "needs_more_research" },
      archive_dossier: { status: "archived", decision: "archived" },
    };

    if (action in decisionActions) {
      const { dossier_id, rationale } = body;
      if (!dossier_id) throw new Error("Missing dossier_id");
      if (!rationale) throw new Error("Missing rationale");

      const { status, decision } = decisionActions[action];

      const [{ error: updErr }, { error: decErr }] = await Promise.all([
        userClient
          .from("architecture_promotion_dossiers")
          .update({ decision_status: status })
          .eq("organization_id", organization_id)
          .eq("id", dossier_id),
        userClient.from("architecture_promotion_decisions").insert({
          organization_id,
          dossier_id,
          decision,
          rationale,
          decided_by_ref: { user_id: user.id, email: user.email ?? null },
          rollback_posture: "rollback_everywhere",
          structural_review_required: true,
          decided_at: nowIso(),
        }),
      ]);

      if (updErr) throw updErr;
      if (decErr) throw decErr;

      return new Response(JSON.stringify({ ok: true, decision_status: status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
