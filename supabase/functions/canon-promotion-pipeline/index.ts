import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { logSecurityAudit, resolveAndValidateOrg } from "../_shared/security-audit.ts";
import { PROMOTION_TRUST_FLOOR, PROMOTION_MAX_RISK_SCORE } from "../_shared/canon-poisoning-scorer.ts";
import {
  validateSchema, validationErrorResponse, logValidationFailure,
  COMMON_ACTIONS, COMMON_FIELDS,
  type Schema,
} from "../_shared/input-validation.ts";

// ─── Types ───

type PromotionStage = "draft" | "under_review" | "approved" | "active" | "deprecated";

const STAGE_TRANSITIONS: Record<PromotionStage, PromotionStage[]> = {
  draft: ["under_review"],
  under_review: ["approved", "draft"],
  approved: ["active"],
  active: ["deprecated"],
  deprecated: [],
};

function validateStageTransition(from: PromotionStage, to: PromotionStage): boolean {
  return (STAGE_TRANSITIONS[from] || []).includes(to);
}

// ─── Input Schemas ───

const BASE_SCHEMA: Schema = {
  action: COMMON_FIELDS.action(COMMON_ACTIONS.CANON_PROMOTION),
  organization_id: COMMON_FIELDS.organization_id,
};

const RECORD_ACTION_SCHEMA: Schema = {
  ...BASE_SCHEMA,
  record_id: { type: "uuid", required: true },
  review_notes: COMMON_FIELDS.safe_string(2000),
};

const CREATE_RECORD_SCHEMA: Schema = {
  ...BASE_SCHEMA,
  candidate_id: { type: "uuid", required: true },
};

const LIST_SCHEMA: Schema = {
  ...BASE_SCHEMA,
  stage_filter: { type: "string", required: false, enum: ["draft", "under_review", "approved", "active", "deprecated"] },
  approval_filter: { type: "string", required: false, enum: ["pending", "approved", "rejected"] },
};

function getSchemaForAction(action: string): Schema {
  switch (action) {
    case "create_record_from_candidate": return CREATE_RECORD_SCHEMA;
    case "review_record":
    case "approve_record":
    case "activate_record":
    case "deprecate_record":
      return RECORD_ACTION_SCHEMA;
    case "list_canon_records": return LIST_SCHEMA;
    case "canon_summary": return BASE_SCHEMA;
    default: return BASE_SCHEMA;
  }
}

// ─── Handler ───

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    // 1. Authenticate + rate limit (CRITICAL: was missing before Sprint 194)
    const authResult = await authenticateWithRateLimit(req, "canon-promotion-pipeline");
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient } = authResult;

    // 2. Parse body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400, req);
    }

    // 3. Validate action first
    const actionCheck = validateSchema(body, { action: COMMON_FIELDS.action(COMMON_ACTIONS.CANON_PROMOTION) });
    if (!actionCheck.valid) {
      await logValidationFailure(serviceClient, {
        actor_id: user.id,
        function_name: "canon-promotion-pipeline",
        errors: actionCheck.errors,
      });
      return validationErrorResponse(actionCheck.errors, req);
    }

    const action = body.action as string;

    // 4. Validate full schema for action
    const schema = getSchemaForAction(action);
    const validation = validateSchema(body, schema);
    if (!validation.valid) {
      await logValidationFailure(serviceClient, {
        actor_id: user.id,
        function_name: "canon-promotion-pipeline",
        errors: validation.errors,
      });
      return validationErrorResponse(validation.errors, req);
    }

    // 5. Resolve & validate org
    const { orgId, error: orgError } = await resolveAndValidateOrg(
      serviceClient, user.id, body.organization_id as string | undefined
    );
    if (orgError || !orgId) {
      return errorResponse(orgError || "Organization access denied", 403, req);
    }

    // 6. Audit
    await logSecurityAudit(serviceClient, {
      organization_id: orgId,
      actor_id: user.id,
      function_name: "canon-promotion-pipeline",
      action,
      context: { record_id: body.record_id, candidate_id: body.candidate_id },
    });

    // ─── Actions ───

    switch (action) {
      case "create_record_from_candidate": {
        const candidateId = body.candidate_id as string;

        const { data: candidate, error: cErr } = await serviceClient
          .from("learning_candidates")
          .select("*")
          .eq("id", candidateId)
          .eq("organization_id", orgId)
          .single();

        if (cErr || !candidate) {
          return errorResponse("Candidate not found", 404, req);
        }

        const { data: existing } = await serviceClient
          .from("canon_learning_records")
          .select("id")
          .eq("candidate_id", candidateId)
          .eq("organization_id", orgId)
          .not("promotion_stage", "eq", "deprecated")
          .limit(1);

        if (existing && existing.length > 0) {
          return jsonResponse({ error: "Canon record already exists for this candidate", existing_id: existing[0].id }, 409, req);
        }

        const { data: record, error: insertErr } = await serviceClient
          .from("canon_learning_records")
          .insert({
            organization_id: orgId,
            candidate_id: candidateId,
            promotion_stage: "draft",
            review_required: true,
            confidence_score: candidate.confidence_score || 0,
            approval_status: "pending",
          })
          .select()
          .single();

        if (insertErr) throw insertErr;

        return jsonResponse({ record, message: "Canon record created from candidate" }, 200, req);
      }

      case "review_record": {
        const recordId = body.record_id as string;
        const { data: record, error: rErr } = await serviceClient
          .from("canon_learning_records")
          .select("*")
          .eq("id", recordId)
          .eq("organization_id", orgId)
          .single();

        if (rErr || !record) return errorResponse("Record not found", 404, req);

        if (!validateStageTransition(record.promotion_stage as PromotionStage, "under_review")) {
          return jsonResponse({ error: `Cannot transition from '${record.promotion_stage}' to 'under_review'` }, 422, req);
        }

        const { data: updated, error: uErr } = await serviceClient
          .from("canon_learning_records")
          .update({ promotion_stage: "under_review", review_notes: (body.review_notes as string) || "" })
          .eq("id", recordId)
          .select()
          .single();

        if (uErr) throw uErr;
        return jsonResponse({ record: updated, message: "Record moved to review" }, 200, req);
      }

      case "approve_record": {
        const recordId = body.record_id as string;
        const { data: record, error: rErr } = await serviceClient
          .from("canon_learning_records")
          .select("*")
          .eq("id", recordId)
          .eq("organization_id", orgId)
          .single();

        if (rErr || !record) return errorResponse("Record not found", 404, req);

        if (!validateStageTransition(record.promotion_stage as PromotionStage, "approved")) {
          return jsonResponse({ error: `Cannot approve from '${record.promotion_stage}'. Must be 'under_review'.` }, 422, req);
        }

        // ── Poisoning Gate Check (Sprint 193) ──
        if (record.candidate_id) {
          const { data: candidate } = await serviceClient
            .from("learning_candidates")
            .select("review_status")
            .eq("id", record.candidate_id)
            .single();
          if (candidate?.review_status === "quarantined") {
            return jsonResponse({
              error: "Promotion blocked: candidate is quarantined. Requires security review.",
              gate: "poisoning_quarantine",
            }, 422, req);
          }

          const { data: assessment } = await serviceClient
            .from("canon_poisoning_assessments")
            .select("poisoning_risk_score, poisoning_risk_level, quarantine_status")
            .eq("candidate_id", record.candidate_id)
            .eq("organization_id", orgId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (assessment) {
            if (assessment.quarantine_status === "quarantined") {
              return jsonResponse({
                error: "Promotion blocked: poisoning assessment indicates quarantine.",
                gate: "poisoning_assessment",
                risk_score: assessment.poisoning_risk_score,
              }, 422, req);
            }
            if (assessment.poisoning_risk_score > PROMOTION_MAX_RISK_SCORE) {
              return jsonResponse({
                error: `Promotion blocked: poisoning risk score (${assessment.poisoning_risk_score}) exceeds threshold (${PROMOTION_MAX_RISK_SCORE}).`,
                gate: "poisoning_risk_threshold",
                risk_score: assessment.poisoning_risk_score,
              }, 422, req);
            }
          }

          const { count: unresolvedSignals } = await serviceClient
            .from("canon_security_signals")
            .select("*", { count: "exact", head: true })
            .eq("candidate_id", record.candidate_id)
            .eq("organization_id", orgId)
            .eq("resolved", false);

          if ((unresolvedSignals ?? 0) > 0) {
            return jsonResponse({
              error: `Promotion blocked: ${unresolvedSignals} unresolved security signal(s).`,
              gate: "unresolved_signals",
            }, 422, req);
          }
        }

        const { data: updated, error: uErr } = await serviceClient
          .from("canon_learning_records")
          .update({
            promotion_stage: "approved",
            approval_status: "approved",
            review_notes: (body.review_notes as string) || record.review_notes,
          })
          .eq("id", recordId)
          .select()
          .single();

        if (uErr) throw uErr;

        await logSecurityAudit(serviceClient, {
          organization_id: orgId,
          actor_id: user.id,
          function_name: "canon-promotion-pipeline",
          action: "record_approved",
          context: { record_id: recordId },
        });

        return jsonResponse({ record: updated, message: "Record approved" }, 200, req);
      }

      case "activate_record": {
        const recordId = body.record_id as string;
        const { data: record, error: rErr } = await serviceClient
          .from("canon_learning_records")
          .select("*")
          .eq("id", recordId)
          .eq("organization_id", orgId)
          .single();

        if (rErr || !record) return errorResponse("Record not found", 404, req);

        if (!validateStageTransition(record.promotion_stage as PromotionStage, "active")) {
          return jsonResponse({ error: `Cannot activate from '${record.promotion_stage}'. Must be 'approved'.` }, 422, req);
        }

        const { data: updated, error: uErr } = await serviceClient
          .from("canon_learning_records")
          .update({ promotion_stage: "active", activated_at: new Date().toISOString() })
          .eq("id", recordId)
          .select()
          .single();

        if (uErr) throw uErr;
        return jsonResponse({ record: updated, message: "Canon record activated" }, 200, req);
      }

      case "deprecate_record": {
        const recordId = body.record_id as string;
        const { data: record, error: rErr } = await serviceClient
          .from("canon_learning_records")
          .select("*")
          .eq("id", recordId)
          .eq("organization_id", orgId)
          .single();

        if (rErr || !record) return errorResponse("Record not found", 404, req);

        if (!validateStageTransition(record.promotion_stage as PromotionStage, "deprecated")) {
          return jsonResponse({ error: `Cannot deprecate from '${record.promotion_stage}'. Must be 'active'.` }, 422, req);
        }

        const { data: updated, error: uErr } = await serviceClient
          .from("canon_learning_records")
          .update({
            promotion_stage: "deprecated",
            deprecated_at: new Date().toISOString(),
            review_notes: (body.review_notes as string) || record.review_notes,
          })
          .eq("id", recordId)
          .select()
          .single();

        if (uErr) throw uErr;
        return jsonResponse({ record: updated, message: "Canon record deprecated" }, 200, req);
      }

      case "list_canon_records": {
        let query = serviceClient
          .from("canon_learning_records")
          .select("*, learning_candidates(*)")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false });

        if (body.stage_filter) query = query.eq("promotion_stage", body.stage_filter);
        if (body.approval_filter) query = query.eq("approval_status", body.approval_filter);

        const { data, error } = await query.limit(200);
        if (error) throw error;

        return jsonResponse({ records: data || [] }, 200, req);
      }

      case "canon_summary": {
        const { data: records, error } = await serviceClient
          .from("canon_learning_records")
          .select("promotion_stage, approval_status, confidence_score, activated_at, deprecated_at, created_at")
          .eq("organization_id", orgId);

        if (error) throw error;

        const byStage: Record<string, number> = {};
        const byApproval: Record<string, number> = {};
        let recentPromotions = 0;
        let recentDeprecations = 0;
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        for (const r of (records || [])) {
          byStage[r.promotion_stage] = (byStage[r.promotion_stage] || 0) + 1;
          byApproval[r.approval_status] = (byApproval[r.approval_status] || 0) + 1;
          if (r.activated_at && r.activated_at >= oneWeekAgo) recentPromotions++;
          if (r.deprecated_at && r.deprecated_at >= oneWeekAgo) recentDeprecations++;
        }

        return jsonResponse({
          total: (records || []).length,
          by_stage: byStage,
          by_approval: byApproval,
          recent_promotions: recentPromotions,
          recent_deprecations: recentDeprecations,
        }, 200, req);
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400, req);
    }
  } catch (err) {
    console.error("[canon-promotion-pipeline] Error:", err);
    return errorResponse(err.message, 500, req);
  }
});
