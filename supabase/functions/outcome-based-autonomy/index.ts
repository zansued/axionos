import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { computeEvidenceScore } from "../_shared/outcome-autonomy/autonomy-evidence-scorer.ts";
import { evaluateLadderPosition } from "../_shared/outcome-autonomy/autonomy-ladder-manager.ts";
import { evaluateAutoApproval } from "../_shared/outcome-autonomy/bounded-autoapproval-engine.ts";
import { detectRegression } from "../_shared/outcome-autonomy/autonomy-regression-detector.ts";
import { computeDowngrade } from "../_shared/outcome-autonomy/autonomy-downgrade-controller.ts";
import { classifyBreach } from "../_shared/outcome-autonomy/guardrail-breach-handler.ts";
import { explainPosture } from "../_shared/outcome-autonomy/autonomy-explainer.ts";

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

    const { action, organizationId, ...params } = await req.json();
    if (!organizationId) throw new Error("organizationId required");

    let result: unknown;

    switch (action) {
      case "score_autonomy": {
        const evidence = computeEvidenceScore({
          validation_success_rate: params.validation_success_rate ?? 0.8,
          rollback_count: params.rollback_count ?? 0,
          incident_count: params.incident_count ?? 0,
          total_executions: params.total_executions ?? 10,
          doctrine_alignment: params.doctrine_alignment ?? 0.7,
          deploy_success_rate: params.deploy_success_rate ?? 0.9,
        });

        await supabase.from("autonomy_evidence_scores").insert({
          organization_id: organizationId,
          domain_id: params.domain_id || null,
          score_type: "composite",
          score_value: evidence.composite,
          evidence_refs: [evidence],
          computation_details: evidence,
        });

        result = { evidence };
        break;
      }

      case "adjust_level": {
        const { data: domain } = await supabase
          .from("autonomy_domains")
          .select("*")
          .eq("id", params.domain_id)
          .eq("organization_id", organizationId)
          .single();

        if (!domain) throw new Error("Domain not found");

        const evaluation = evaluateLadderPosition(
          domain.current_autonomy_level,
          params.evidence_score ?? domain.evidence_score,
          params.incident_rate ?? 0,
        );

        if (evaluation.direction !== "stable") {
          await supabase.from("autonomy_adjustment_events").insert({
            organization_id: organizationId,
            domain_id: params.domain_id,
            previous_level: domain.current_autonomy_level,
            new_level: evaluation.recommended_level,
            adjustment_reason: evaluation.reason,
            adjustment_type: evaluation.direction,
            adjusted_by: params.adjusted_by ?? "system",
          });

          await supabase
            .from("autonomy_domains")
            .update({
              current_autonomy_level: evaluation.recommended_level,
              allowed_action_classes: evaluation.eligible_actions,
              blocked_action_classes: evaluation.blocked_actions,
              updated_at: new Date().toISOString(),
            })
            .eq("id", params.domain_id);
        }

        result = { evaluation };
        break;
      }

      case "list_allowed_actions": {
        const { data: domain } = await supabase
          .from("autonomy_domains")
          .select("*")
          .eq("id", params.domain_id)
          .eq("organization_id", organizationId)
          .single();

        if (!domain) throw new Error("Domain not found");

        const evaluation = evaluateLadderPosition(
          domain.current_autonomy_level,
          Number(domain.evidence_score),
          0,
        );

        result = {
          allowed: evaluation.eligible_actions,
          blocked: evaluation.blocked_actions,
          level: domain.current_autonomy_level,
        };
        break;
      }

      case "register_guardrail_breach": {
        const breach = classifyBreach({
          action_attempted: params.action_attempted ?? "",
          domain_name: params.domain_name ?? "",
          autonomy_level: params.autonomy_level ?? 0,
        });

        await supabase.from("autonomy_guardrail_breaches").insert({
          organization_id: organizationId,
          domain_id: params.domain_id || null,
          breach_type: breach.breach_type,
          severity: breach.severity,
          description: breach.description,
          action_attempted: params.action_attempted ?? "",
          blocked: breach.blocked,
        });

        if (breach.requires_immediate_downgrade && params.domain_id) {
          const downgrade = computeDowngrade({
            current_level: params.autonomy_level ?? 0,
            regression_severity: "critical",
            has_active_review: false,
          });

          if (downgrade.should_downgrade) {
            await supabase
              .from("autonomy_domains")
              .update({ current_autonomy_level: downgrade.new_level, updated_at: new Date().toISOString() })
              .eq("id", params.domain_id);

            await supabase.from("autonomy_adjustment_events").insert({
              organization_id: organizationId,
              domain_id: params.domain_id,
              previous_level: params.autonomy_level ?? 0,
              new_level: downgrade.new_level,
              adjustment_reason: breach.description,
              adjustment_type: "downgrade",
              adjusted_by: "guardrail_breach_handler",
            });
          }
        }

        result = { breach };
        break;
      }

      case "downgrade_autonomy": {
        const regression = detectRegression({
          recent_incident_count: params.recent_incident_count ?? 0,
          recent_rollback_count: params.recent_rollback_count ?? 0,
          validation_failure_rate: params.validation_failure_rate ?? 0,
          evidence_score_trend: params.evidence_score_trend ?? 0,
          guardrail_breach_count: params.guardrail_breach_count ?? 0,
          window_days: params.window_days ?? 7,
        });

        let downgrade = null;
        if (regression.regression_detected) {
          downgrade = computeDowngrade({
            current_level: params.current_level ?? 0,
            regression_severity: regression.severity,
            has_active_review: params.has_active_review ?? false,
          });

          if (downgrade.should_downgrade && params.domain_id) {
            await supabase.from("autonomy_regression_cases").insert({
              organization_id: organizationId,
              domain_id: params.domain_id,
              regression_type: regression.severity,
              severity: regression.severity,
              trigger_event: regression.triggers.join("; "),
            });
          }
        }

        result = { regression, downgrade };
        break;
      }

      case "explain_autonomy_posture": {
        const { data: domain } = await supabase
          .from("autonomy_domains")
          .select("*")
          .eq("id", params.domain_id)
          .eq("organization_id", organizationId)
          .single();

        if (!domain) throw new Error("Domain not found");

        const explanation = explainPosture({
          domain_name: domain.domain_name,
          current_level: domain.current_autonomy_level,
          max_level: domain.max_autonomy_level,
          evidence_score: Number(domain.evidence_score),
          rollback_dependence: Number(domain.rollback_dependence_score),
          incident_penalty: Number(domain.incident_penalty_score),
          validation_rate: Number(domain.validation_success_rate),
          doctrine_alignment: Number(domain.doctrine_alignment_score),
          allowed_actions: (domain.allowed_action_classes as string[]) || [],
          blocked_actions: (domain.blocked_action_classes as string[]) || [],
        });

        result = { explanation };
        break;
      }

      case "list_domains": {
        const { data } = await supabase
          .from("autonomy_domains")
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false });
        result = { domains: data || [] };
        break;
      }

      case "list_adjustments": {
        const { data } = await supabase
          .from("autonomy_adjustment_events")
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(50);
        result = { adjustments: data || [] };
        break;
      }

      case "list_breaches": {
        const { data } = await supabase
          .from("autonomy_guardrail_breaches")
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(50);
        result = { breaches: data || [] };
        break;
      }

      case "list_regressions": {
        const { data } = await supabase
          .from("autonomy_regression_cases")
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(50);
        result = { regressions: data || [] };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
