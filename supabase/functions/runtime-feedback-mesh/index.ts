import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ingestRuntimeEvent } from "../_shared/runtime-feedback/runtime-feedback-ingestor.ts";
import { buildLineageLink } from "../_shared/runtime-feedback/runtime-outcome-lineage-builder.ts";
import { correlateDeployOutcome } from "../_shared/runtime-feedback/deploy-outcome-correlator.ts";
import { classifyIncident } from "../_shared/runtime-feedback/runtime-incident-classifier.ts";
import { buildRollbackRecord } from "../_shared/runtime-feedback/rollback-linker.ts";
import { synthesizeHealth } from "../_shared/runtime-feedback/outcome-evidence-synthesizer.ts";
import { explainOutcomeLineage, explainRuntimeFeedbackMesh } from "../_shared/runtime-feedback/runtime-feedback-explainer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { action, organizationId, ...params } = await req.json();
    const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    switch (action) {
      case "register_runtime_event": {
        const result = ingestRuntimeEvent({ organization_id: organizationId, ...params });
        if (!result.valid) return json({ error: "Validation failed", errors: result.errors }, 400);
        const { data, error } = await supabase.from("runtime_feedback_events").insert(result.event).select().single();
        if (error) throw error;

        // Auto-build lineage if source info provided
        if (params.source_type && params.source_id) {
          const link = buildLineageLink({ event_id: data.id, source_type: params.source_type, source_id: params.source_id });
          await supabase.from("runtime_outcome_lineage").insert({ organization_id: organizationId, ...link });
        }
        return json(data);
      }

      case "link_deploy_outcome": {
        const { data: events } = await supabase.from("runtime_feedback_events")
          .select("event_type, severity, occurred_at")
          .eq("organization_id", organizationId)
          .eq("deploy_id", params.deploy_id)
          .order("occurred_at", { ascending: true }).limit(200);

        const correlation = correlateDeployOutcome({
          deploy_id: params.deploy_id,
          deploy_status: params.deploy_status || "unknown",
          deployed_at: params.deployed_at || new Date().toISOString(),
          runtime_events: events || [],
        });

        const { data, error } = await supabase.from("deploy_outcome_records").insert({
          organization_id: organizationId, deploy_id: params.deploy_id,
          initiative_id: params.initiative_id || null,
          deploy_status: params.deploy_status || "unknown",
          deployed_at: params.deployed_at, stability_score: correlation.stability_score,
          outcome_summary: correlation.classification,
          first_error_at: correlation.first_error_minutes !== null ? new Date(new Date(params.deployed_at).getTime() + correlation.first_error_minutes * 60000).toISOString() : null,
        }).select().single();
        if (error) throw error;
        return json({ record: data, correlation });
      }

      case "classify_incident": {
        const classification = classifyIncident({
          event_type: params.event_type || "error",
          severity: params.severity || "medium",
          observed_behavior: params.observed_behavior || "",
          affected_surface: params.affected_surface || "",
        });

        const { data, error } = await supabase.from("runtime_incident_signals").insert({
          organization_id: organizationId, event_id: params.event_id || null,
          incident_type: classification.incident_type, severity: classification.severity,
          affected_component: params.affected_surface || "",
          symptom_summary: params.observed_behavior || "",
          root_cause_hypothesis: classification.containment_suggestion,
          linked_deploy_id: params.deploy_id || null,
        }).select().single();
        if (error) throw error;
        return json({ incident: data, classification });
      }

      case "register_rollback": {
        const record = buildRollbackRecord(params);
        const { data, error } = await supabase.from("s119_rollback_events").insert({
          organization_id: organizationId, ...record,
        }).select().single();
        if (error) throw error;
        return json(data);
      }

      case "compute_runtime_health": {
        const since = params.since || new Date(Date.now() - 24 * 3600000).toISOString();
        const periodHours = params.period_hours || 24;

        const { data: events } = await supabase.from("runtime_feedback_events")
          .select("event_type, severity").eq("organization_id", organizationId)
          .gte("occurred_at", since);
        const { data: incidents } = await supabase.from("runtime_incident_signals")
          .select("id").eq("organization_id", organizationId).gte("created_at", since);
        const { data: rollbacks } = await supabase.from("s119_rollback_events")
          .select("id").eq("organization_id", organizationId).gte("created_at", since);
        const { data: windows } = await supabase.from("degraded_service_windows")
          .select("duration_minutes").eq("organization_id", organizationId).gte("started_at", since);

        const degradedMin = (windows || []).reduce((s: number, w: any) => s + (w.duration_minutes || 0), 0);
        const errorCount = (events || []).filter((e: any) => e.event_type === "error" || e.severity === "critical" || e.severity === "high").length;

        const health = synthesizeHealth({
          total_events: events?.length || 0,
          error_count: errorCount,
          incident_count: incidents?.length || 0,
          rollback_count: rollbacks?.length || 0,
          degraded_minutes: degradedMin,
          period_hours: periodHours,
        });

        return json(health);
      }

      case "list_events": {
        let query = supabase.from("runtime_feedback_events").select("*")
          .eq("organization_id", organizationId).order("occurred_at", { ascending: false });
        if (params.event_type) query = query.eq("event_type", params.event_type);
        if (params.severity) query = query.eq("severity", params.severity);
        const { data, error } = await query.limit(100);
        if (error) throw error;
        return json({ events: data });
      }

      case "list_incidents": {
        const { data, error } = await supabase.from("runtime_incident_signals").select("*")
          .eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(100);
        if (error) throw error;
        return json({ incidents: data });
      }

      case "explain_outcome_lineage": {
        if (!params.event_id) return json(explainRuntimeFeedbackMesh());
        const { data: event } = await supabase.from("runtime_feedback_events").select("*").eq("id", params.event_id).single();
        if (!event) return json({ error: "Event not found" }, 404);
        return json(explainOutcomeLineage({
          event_type: event.event_type, severity: event.severity,
        }));
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
