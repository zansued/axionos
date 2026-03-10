import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { runReflectiveValidation } from "../_shared/reflexive-governance/reflective-validation-runner.ts";
import { explainRevisionAudit } from "../_shared/reflexive-governance/reflective-audit-explainer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const body = await req.json();
    const { action, ...params } = body;

    switch (action) {
      case "register_revision_event": {
        const { data, error } = await supabase.from("self_revision_events").insert({
          organization_id: params.organization_id,
          origin_type: params.origin_type || "validation_fix_loop",
          linked_evolution_proposal_id: params.linked_evolution_proposal_id || null,
          linked_mutation_case_id: params.linked_mutation_case_id || null,
          revision_scope: params.revision_scope || "",
          affected_runtime_surfaces: params.affected_runtime_surfaces || [],
          intended_outcome: params.intended_outcome || "",
          trigger_evidence: params.trigger_evidence || {},
        }).select().single();
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
        return new Response(JSON.stringify({ success: true, data }), { headers: corsHeaders });
      }

      case "run_reflective_validation": {
        const result = runReflectiveValidation({
          revision_event_id: params.revision_event_id,
          intended_outcome: params.intended_outcome || "",
          observed_outcome: params.observed_outcome || "",
          affected_surfaces: params.affected_surfaces || [],
          before_metrics: params.before_metrics || {},
          after_metrics: params.after_metrics || {},
          related_incident_ids: params.related_incident_ids || [],
        });

        // Persist validation run
        await supabase.from("self_revision_validation_runs").insert({
          organization_id: params.organization_id,
          revision_event_id: params.revision_event_id,
          local_improvement_score: result.effectiveness.local_improvement,
          displacement_risk_score: result.effectiveness.displacement_penalty,
          regression_probability: result.effectiveness.regression_penalty,
          net_effectiveness_score: result.effectiveness.net_score,
          confidence_score: result.confidence_score,
          comparison_details: result.outcome_comparison,
          rationale: result.rationale,
        });

        // Persist displacement signals
        for (const signal of result.displacement_signals) {
          await supabase.from("self_revision_displacement_signals").insert({
            organization_id: params.organization_id,
            revision_event_id: params.revision_event_id,
            displaced_surface: signal.displaced_surface,
            displacement_type: signal.displacement_type,
            severity: signal.severity,
            evidence_refs: signal.evidence,
          });
        }

        // Persist regression links
        for (const link of result.regression_links) {
          await supabase.from("self_revision_regression_links").insert({
            organization_id: params.organization_id,
            revision_event_id: params.revision_event_id,
            regression_type: link.regression_type,
            regression_description: link.description,
            confidence: link.confidence,
            evidence_refs: link.evidence_refs,
          });
        }

        // Update event status and observed outcome
        await supabase.from("self_revision_events").update({
          audit_status: "validated",
          observed_outcome: params.observed_outcome || "",
          updated_at: new Date().toISOString(),
        }).eq("id", params.revision_event_id);

        return new Response(JSON.stringify({ success: true, result }), { headers: corsHeaders });
      }

      case "explain_revision_audit": {
        const result = runReflectiveValidation({
          revision_event_id: params.revision_event_id,
          intended_outcome: params.intended_outcome || "",
          observed_outcome: params.observed_outcome || "",
          affected_surfaces: params.affected_surfaces || [],
          before_metrics: params.before_metrics || {},
          after_metrics: params.after_metrics || {},
        });
        const explanation = explainRevisionAudit(result);
        return new Response(JSON.stringify({ success: true, explanation }), { headers: corsHeaders });
      }

      case "submit_audit_review": {
        const { data, error } = await supabase.from("self_revision_audit_reviews").insert({
          organization_id: params.organization_id,
          revision_event_id: params.revision_event_id,
          reviewer_id: user.id,
          review_verdict: params.review_verdict || "pending",
          review_notes: params.review_notes || "",
          effectiveness_accepted: params.effectiveness_accepted || false,
          displacement_acknowledged: params.displacement_acknowledged || false,
        }).select().single();

        if (!error) {
          await supabase.from("self_revision_events").update({
            audit_status: "reviewed",
            updated_at: new Date().toISOString(),
          }).eq("id", params.revision_event_id);
        }

        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
        return new Response(JSON.stringify({ success: true, data }), { headers: corsHeaders });
      }

      case "list_revision_events": {
        const { data, error } = await supabase
          .from("self_revision_events")
          .select("*")
          .eq("organization_id", params.organization_id)
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
        return new Response(JSON.stringify({ success: true, data }), { headers: corsHeaders });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: corsHeaders });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
