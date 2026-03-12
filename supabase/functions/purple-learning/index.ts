import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { synthesizeLearning } from "../_shared/purple-learning/purple-learning-synthesizer.ts";
import { buildPattern } from "../_shared/purple-learning/security-pattern-builder.ts";
import { detectAntiPatterns } from "../_shared/purple-learning/security-anti-pattern-detector.ts";
import { generateSecureDevFeedback } from "../_shared/purple-learning/secure-dev-feedback-engine.ts";
import { explainSecurityCanon } from "../_shared/purple-learning/security-canon-explainer.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { logSecurityAudit, resolveAndValidateOrg } from "../_shared/security-audit.ts";
import {
  validateSchema, validationErrorResponse, logValidationFailure,
  COMMON_ACTIONS, COMMON_FIELDS,
  type Schema,
} from "../_shared/input-validation.ts";

// ─── Input Schemas ───

const BASE_SCHEMA: Schema = {
  action: COMMON_FIELDS.action(COMMON_ACTIONS.PURPLE_LEARNING),
  organization_id: COMMON_FIELDS.organization_id,
};

const SYNTHESIZE_SCHEMA: Schema = {
  ...BASE_SCHEMA,
  incident_type: COMMON_FIELDS.safe_string(200),
  severity: COMMON_FIELDS.severity,
  target_surface: COMMON_FIELDS.safe_string(200),
  threat_domain: COMMON_FIELDS.safe_string(200),
  what_resisted: { type: "array", required: false, default: [] },
  what_failed: { type: "array", required: false, default: [] },
  what_was_fragile: { type: "array", required: false, default: [] },
  response_actions: { type: "array", required: false, default: [] },
};

const FEEDBACK_SCHEMA: Schema = {
  ...BASE_SCHEMA,
  agent_type: COMMON_FIELDS.safe_string(100),
  task_domain: COMMON_FIELDS.safe_string(100),
  stack: { type: "string", required: false, maxLength: 200 },
};

const EXPLAIN_SCHEMA: Schema = {
  ...BASE_SCHEMA,
  pattern_type: COMMON_FIELDS.safe_string(200),
  title: COMMON_FIELDS.safe_string(500),
  summary: COMMON_FIELDS.safe_string(2000),
  agent_types: { type: "array", required: false, default: [] },
  confidence_score: COMMON_FIELDS.confidence_score,
  status: { type: "string", required: false, enum: ["active", "deprecated", "draft", "under_review"] },
};

function getSchemaForAction(action: string): Schema {
  switch (action) {
    case "synthesize": return SYNTHESIZE_SCHEMA;
    case "get_secure_dev_feedback": return FEEDBACK_SCHEMA;
    case "explain_pattern": return EXPLAIN_SCHEMA;
    default: return BASE_SCHEMA;
  }
}

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const authResult = await authenticateWithRateLimit(req, "purple-learning");
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient } = authResult;

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return errorResponse("Invalid JSON body", 400, req); }

    // Validate action
    const actionCheck = validateSchema(body, { action: COMMON_FIELDS.action(COMMON_ACTIONS.PURPLE_LEARNING) });
    if (!actionCheck.valid) {
      await logValidationFailure(serviceClient, { actor_id: user.id, function_name: "purple-learning", errors: actionCheck.errors });
      return validationErrorResponse(actionCheck.errors, req);
    }

    const action = body.action as string;
    const params = body;

    // Full validation
    const schema = getSchemaForAction(action);
    const validation = validateSchema(body, schema);
    if (!validation.valid) {
      await logValidationFailure(serviceClient, { actor_id: user.id, function_name: "purple-learning", errors: validation.errors });
      return validationErrorResponse(validation.errors, req);
    }

    // Resolve org
    const { orgId, error: orgError } = await resolveAndValidateOrg(serviceClient, user.id, params.organization_id as string | undefined);
    if (orgError || !orgId) return errorResponse(orgError || "Organization access denied", 403, req);

    await logSecurityAudit(serviceClient, {
      organization_id: orgId, actor_id: user.id,
      function_name: "purple-learning", action,
      context: { params_keys: Object.keys(params) },
    });

    switch (action) {
      case "overview": {
        const [candidates, patterns, antiPatterns, checklists, rules, reviews] = await Promise.all([
          serviceClient.from("security_canon_candidates").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
          serviceClient.from("security_pattern_entries").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
          serviceClient.from("security_anti_patterns").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
          serviceClient.from("secure_development_checklists").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
          serviceClient.from("security_validation_rules").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
          serviceClient.from("purple_learning_reviews").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("decision", "pending"),
        ]);
        return jsonResponse({
          total_candidates: candidates.count ?? 0, total_patterns: patterns.count ?? 0,
          total_anti_patterns: antiPatterns.count ?? 0, total_checklists: checklists.count ?? 0,
          total_rules: rules.count ?? 0, pending_reviews: reviews.count ?? 0,
        }, 200, req);
      }
      case "list_candidates": {
        const { data, error } = await serviceClient.from("security_canon_candidates").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return jsonResponse({ candidates: data }, 200, req);
      }
      case "list_patterns": {
        const { data, error } = await serviceClient.from("security_pattern_entries").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return jsonResponse({ patterns: data }, 200, req);
      }
      case "list_anti_patterns": {
        const { data, error } = await serviceClient.from("security_anti_patterns").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return jsonResponse({ anti_patterns: data }, 200, req);
      }
      case "list_checklists": {
        const { data, error } = await serviceClient.from("secure_development_checklists").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return jsonResponse({ checklists: data }, 200, req);
      }
      case "list_rules": {
        const { data, error } = await serviceClient.from("security_validation_rules").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return jsonResponse({ rules: data }, 200, req);
      }
      case "list_reviews": {
        const { data, error } = await serviceClient.from("purple_learning_reviews").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return jsonResponse({ reviews: data }, 200, req);
      }
      case "synthesize": {
        const candidates = synthesizeLearning({
          incident_type: (params.incident_type as string) ?? "contract_anomaly",
          severity: (params.severity as string) ?? "medium",
          target_surface: (params.target_surface as string) ?? "general",
          what_resisted: (params.what_resisted as any[]) ?? [],
          what_failed: (params.what_failed as any[]) ?? [],
          what_was_fragile: (params.what_was_fragile as any[]) ?? [],
          response_actions: (params.response_actions as any[]) ?? [],
          threat_domain: (params.threat_domain as string) ?? "unknown",
        });
        const patterns = candidates.map(c => buildPattern(c));
        const antiPatterns = detectAntiPatterns({
          failed_items: (params.what_failed as any[]) ?? [],
          fragile_items: (params.what_was_fragile as any[]) ?? [],
          incident_type: (params.incident_type as string) ?? "contract_anomaly",
          severity: (params.severity as string) ?? "medium",
        });
        await logSecurityAudit(serviceClient, { organization_id: orgId, actor_id: user.id, function_name: "purple-learning", action: "synthesis_executed", context: { candidates_count: candidates.length, anti_patterns_count: antiPatterns.length } });
        return jsonResponse({ candidates, patterns, anti_patterns: antiPatterns }, 200, req);
      }
      case "get_secure_dev_feedback": {
        const feedback = generateSecureDevFeedback({
          agent_type: (params.agent_type as string) ?? "BuildAgent",
          task_domain: (params.task_domain as string) ?? "general",
          stack: params.stack as string | undefined,
        });
        return jsonResponse({ feedback }, 200, req);
      }
      case "explain_pattern": {
        const explanation = explainSecurityCanon({
          pattern_type: (params.pattern_type as string) ?? "secure_implementation_pattern",
          title: (params.title as string) ?? "",
          summary: (params.summary as string) ?? "",
          agent_types: (params.agent_types as any[]) ?? [],
          confidence_score: (params.confidence_score as number) ?? 0,
          status: (params.status as string) ?? "active",
        });
        return jsonResponse({ explanation }, 200, req);
      }
      default:
        return errorResponse(`Unknown action: ${action}`, 400, req);
    }
  } catch (err) {
    console.error("[purple-learning] Error:", err);
    return errorResponse(err.message, 500, req);
  }
});
