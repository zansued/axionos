import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { detect, DETECTION_CATEGORIES } from "../_shared/blue-team/blue-team-detector.ts";
import { correlateAlerts } from "../_shared/blue-team/anomaly-correlator.ts";
import { getPlaybookActions } from "../_shared/blue-team/response-playbook-engine.ts";
import { planContainment } from "../_shared/blue-team/containment-controller.ts";
import { assessRecoveryPosture } from "../_shared/blue-team/recovery-posture-assessor.ts";
import { explainIncident } from "../_shared/blue-team/incident-explainer.ts";
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
  action: COMMON_FIELDS.action(COMMON_ACTIONS.BLUE_TEAM),
  organization_id: COMMON_FIELDS.organization_id,
};

const DETECT_SCHEMA: Schema = {
  ...BASE_SCHEMA,
  signal_type: COMMON_FIELDS.safe_string(200),
  target_surface: COMMON_FIELDS.safe_string(200),
  evidence: { type: "object", required: false, default: {} },
};

const ASSESS_SCHEMA: Schema = {
  ...BASE_SCHEMA,
  incident_type: COMMON_FIELDS.safe_string(200),
  severity: COMMON_FIELDS.severity,
  target_surface: COMMON_FIELDS.safe_string(200),
  anomaly_summary: COMMON_FIELDS.safe_string(2000),
};

function getSchemaForAction(action: string): Schema {
  if (action === "detect_signal") return DETECT_SCHEMA;
  if (action === "assess_incident") return ASSESS_SCHEMA;
  return BASE_SCHEMA;
}

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const authResult = await authenticateWithRateLimit(req, "blue-team-defense");
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient } = authResult;

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return errorResponse("Invalid JSON body", 400, req); }

    // Validate action
    const actionCheck = validateSchema(body, { action: COMMON_FIELDS.action(COMMON_ACTIONS.BLUE_TEAM) });
    if (!actionCheck.valid) {
      await logValidationFailure(serviceClient, { actor_id: user.id, function_name: "blue-team-defense", errors: actionCheck.errors });
      return validationErrorResponse(actionCheck.errors, req);
    }

    const action = body.action as string;
    const params = body;

    // Full schema validation
    const schema = getSchemaForAction(action);
    const validation = validateSchema(body, schema);
    if (!validation.valid) {
      await logValidationFailure(serviceClient, { actor_id: user.id, function_name: "blue-team-defense", errors: validation.errors });
      return validationErrorResponse(validation.errors, req);
    }

    // Resolve & validate org
    const { orgId, error: orgError } = await resolveAndValidateOrg(serviceClient, user.id, params.organization_id as string | undefined);
    if (orgError || !orgId) return errorResponse(orgError || "Organization access denied", 403, req);

    await logSecurityAudit(serviceClient, {
      organization_id: orgId, actor_id: user.id,
      function_name: "blue-team-defense", action,
      context: { params_keys: Object.keys(params) },
    });

    switch (action) {
      case "overview": {
        const [alerts, incidents, actions, reviews] = await Promise.all([
          serviceClient.from("blue_team_alerts").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
          serviceClient.from("blue_team_incidents").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
          serviceClient.from("blue_team_response_actions").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "pending"),
          serviceClient.from("blue_team_incidents").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("response_status", "open"),
        ]);
        return jsonResponse({ total_alerts: alerts.count ?? 0, total_incidents: incidents.count ?? 0, pending_actions: actions.count ?? 0, open_incidents: reviews.count ?? 0 }, 200, req);
      }
      case "list_alerts": {
        const { data, error } = await serviceClient.from("blue_team_alerts").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return jsonResponse({ alerts: data }, 200, req);
      }
      case "list_incidents": {
        const { data, error } = await serviceClient.from("blue_team_incidents").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return jsonResponse({ incidents: data }, 200, req);
      }
      case "list_response_actions": {
        const { data, error } = await serviceClient.from("blue_team_response_actions").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return jsonResponse({ actions: data }, 200, req);
      }
      case "list_containment": {
        const { data, error } = await serviceClient.from("blue_team_containment_events").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return jsonResponse({ containment: data }, 200, req);
      }
      case "list_recovery": {
        const { data, error } = await serviceClient.from("blue_team_recovery_flows").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return jsonResponse({ recovery: data }, 200, req);
      }
      case "list_runbooks": {
        const { data, error } = await serviceClient.from("blue_team_runbooks").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return jsonResponse({ runbooks: data }, 200, req);
      }
      case "detect_signal": {
        const result = detect({
          signal_type: (params.signal_type as string) ?? "contract_anomaly",
          target_surface: (params.target_surface as string) ?? "general",
          evidence: (params.evidence as Record<string, unknown>) ?? {},
        });
        return jsonResponse({ detection: result, categories: DETECTION_CATEGORIES }, 200, req);
      }
      case "assess_incident": {
        const playbook = getPlaybookActions({ incident_type: (params.incident_type as string) ?? "contract_anomaly", severity: (params.severity as string) ?? "medium", containment_applied: false });
        const containment = planContainment({ incident_type: (params.incident_type as string) ?? "contract_anomaly", severity: (params.severity as string) ?? "medium", target_surface: (params.target_surface as string) ?? "general" });
        const recovery = assessRecoveryPosture({ incident_type: (params.incident_type as string) ?? "contract_anomaly", severity: (params.severity as string) ?? "medium", containment_applied: false, rollback_recommended: false });
        const explanation = explainIncident({
          incident_type: (params.incident_type as string) ?? "contract_anomaly", severity: (params.severity as string) ?? "medium",
          target_surface: (params.target_surface as string) ?? "general", anomaly_summary: (params.anomaly_summary as string) ?? "",
          containment_applied: false, rollback_recommended: false, response_actions: playbook,
        });
        await logSecurityAudit(serviceClient, { organization_id: orgId, actor_id: user.id, function_name: "blue-team-defense", action: "incident_assessed", context: { incident_type: params.incident_type, severity: params.severity } });
        return jsonResponse({ playbook, containment, recovery, explanation }, 200, req);
      }
      default:
        return errorResponse(`Unknown action: ${action}`, 400, req);
    }
  } catch (err) {
    console.error("[blue-team-defense] Error:", err);
    return errorResponse(err.message, 500, req);
  }
});
