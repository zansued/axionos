import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { detect, DETECTION_CATEGORIES } from "../_shared/blue-team/blue-team-detector.ts";
import { correlateAlerts } from "../_shared/blue-team/anomaly-correlator.ts";
import { getPlaybookActions } from "../_shared/blue-team/response-playbook-engine.ts";
import { planContainment } from "../_shared/blue-team/containment-controller.ts";
import { assessRecoveryPosture } from "../_shared/blue-team/recovery-posture-assessor.ts";
import { explainIncident } from "../_shared/blue-team/incident-explainer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const { action, ...params } = await req.json();
    const json = (data: unknown) => new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    switch (action) {
      case "overview": {
        const [alerts, incidents, actions, reviews] = await Promise.all([
          supabase.from("blue_team_alerts").select("*", { count: "exact", head: true }),
          supabase.from("blue_team_incidents").select("*", { count: "exact", head: true }),
          supabase.from("blue_team_response_actions").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("blue_team_incidents").select("*", { count: "exact", head: true }).eq("response_status", "open"),
        ]);
        return json({ total_alerts: alerts.count ?? 0, total_incidents: incidents.count ?? 0, pending_actions: actions.count ?? 0, open_incidents: reviews.count ?? 0 });
      }

      case "list_alerts": {
        const { data, error } = await supabase.from("blue_team_alerts").select("*").order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return json({ alerts: data });
      }

      case "list_incidents": {
        const { data, error } = await supabase.from("blue_team_incidents").select("*").order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return json({ incidents: data });
      }

      case "list_response_actions": {
        const { data, error } = await supabase.from("blue_team_response_actions").select("*").order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return json({ actions: data });
      }

      case "list_containment": {
        const { data, error } = await supabase.from("blue_team_containment_events").select("*").order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return json({ containment: data });
      }

      case "list_recovery": {
        const { data, error } = await supabase.from("blue_team_recovery_flows").select("*").order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return json({ recovery: data });
      }

      case "list_runbooks": {
        const { data, error } = await supabase.from("blue_team_runbooks").select("*").order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return json({ runbooks: data });
      }

      case "detect_signal": {
        const result = detect({ signal_type: params.signal_type ?? "contract_anomaly", target_surface: params.target_surface ?? "general", evidence: params.evidence ?? {} });
        return json({ detection: result, categories: DETECTION_CATEGORIES });
      }

      case "assess_incident": {
        const playbook = getPlaybookActions({ incident_type: params.incident_type ?? "contract_anomaly", severity: params.severity ?? "medium", containment_applied: false });
        const containment = planContainment({ incident_type: params.incident_type ?? "contract_anomaly", severity: params.severity ?? "medium", target_surface: params.target_surface ?? "general" });
        const recovery = assessRecoveryPosture({ incident_type: params.incident_type ?? "contract_anomaly", severity: params.severity ?? "medium", containment_applied: false, rollback_recommended: false });
        const explanation = explainIncident({
          incident_type: params.incident_type ?? "contract_anomaly", severity: params.severity ?? "medium", target_surface: params.target_surface ?? "general",
          anomaly_summary: params.anomaly_summary ?? "", containment_applied: false, rollback_recommended: false, response_actions: playbook,
        });
        return json({ playbook, containment, recovery, explanation });
      }

      default:
        return json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
