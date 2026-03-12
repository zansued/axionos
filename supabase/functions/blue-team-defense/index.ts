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

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    // 1. Authenticate + rate limit
    const authResult = await authenticateWithRateLimit(req, "blue-team-defense");
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient } = authResult;

    const body = await req.json();
    const { action, ...params } = body;

    // 2. Resolve & validate org
    const { orgId, error: orgError } = await resolveAndValidateOrg(
      serviceClient, user.id, params.organization_id
    );
    if (orgError || !orgId) {
      return errorResponse(orgError || "Organization access denied", 403, req);
    }

    // 3. Audit
    await logSecurityAudit(serviceClient, {
      organization_id: orgId,
      actor_id: user.id,
      function_name: "blue-team-defense",
      action,
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
        const result = detect({ signal_type: params.signal_type ?? "contract_anomaly", target_surface: params.target_surface ?? "general", evidence: params.evidence ?? {} });
        return jsonResponse({ detection: result, categories: DETECTION_CATEGORIES }, 200, req);
      }

      case "assess_incident": {
        const playbook = getPlaybookActions({ incident_type: params.incident_type ?? "contract_anomaly", severity: params.severity ?? "medium", containment_applied: false });
        const containment = planContainment({ incident_type: params.incident_type ?? "contract_anomaly", severity: params.severity ?? "medium", target_surface: params.target_surface ?? "general" });
        const recovery = assessRecoveryPosture({ incident_type: params.incident_type ?? "contract_anomaly", severity: params.severity ?? "medium", containment_applied: false, rollback_recommended: false });
        const explanation = explainIncident({
          incident_type: params.incident_type ?? "contract_anomaly", severity: params.severity ?? "medium", target_surface: params.target_surface ?? "general",
          anomaly_summary: params.anomaly_summary ?? "", containment_applied: false, rollback_recommended: false, response_actions: playbook,
        });

        await logSecurityAudit(serviceClient, {
          organization_id: orgId,
          actor_id: user.id,
          function_name: "blue-team-defense",
          action: "incident_assessed",
          context: { incident_type: params.incident_type, severity: params.severity },
        });

        return jsonResponse({ playbook, containment, recovery, explanation }, 200, req);
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400, req);
    }
  } catch (err) {
    console.error("[blue-team-defense] Error:", err);
    return errorResponse(err.message, 500, req);
  }
});
