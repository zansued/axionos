import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const client = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return jsonResponse({ error: "Unauthorized" }, 401);

    const { action, organization_id, payload } = await req.json();
    if (!organization_id) return jsonResponse({ error: "organization_id required" }, 400);

    const { data: _member } = await client.from("organization_members").select("role").eq("organization_id", organization_id).eq("user_id", user.id).single();
    if (!_member) return jsonResponse({ error: "Not a member of this organization" }, 403);

    switch (action) {
      case "overview": {
        const [casesRes, decisionsRes, outcomesRes] = await Promise.all([
          client.from("convergence_governance_cases").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50),
          client.from("convergence_decisions").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(20),
          client.from("convergence_governance_outcomes").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(20),
        ]);

        const cases = casesRes.data || [];
        const decisions = decisionsRes.data || [];
        const outcomes = outcomesRes.data || [];

        const pending = cases.filter((c: any) => c.review_status === "pending").length;
        const approved = decisions.filter((d: any) => d.decision_status === "approved").length;
        const rejected = decisions.filter((d: any) => d.decision_status === "rejected").length;
        const deferred = decisions.filter((d: any) => d.decision_status === "deferred").length;

        const helpful = outcomes.filter((o: any) => o.outcome_status === "helpful").length;
        const harmful = outcomes.filter((o: any) => o.outcome_status === "harmful").length;
        const hitRate = outcomes.length > 0 ? round(helpful / outcomes.length) : 0;

        const avgAccuracy = outcomes.length > 0
          ? round(outcomes.reduce((s: number, o: any) => s + Number(o.outcome_accuracy_score || 0), 0) / outcomes.length)
          : 0;

        // Top pending cases by promotion/retirement readiness
        const topPending = cases
          .filter((c: any) => c.review_status === "pending")
          .sort((a: any, b: any) => Math.max(Number(b.promotion_readiness_score), Number(b.retirement_readiness_score)) - Math.max(Number(a.promotion_readiness_score), Number(a.retirement_readiness_score)))
          .slice(0, 5);

        return jsonResponse({
          total_cases: cases.length,
          pending_cases: pending,
          approved_decisions: approved,
          rejected_decisions: rejected,
          deferred_decisions: deferred,
          total_outcomes: outcomes.length,
          helpful_outcomes: helpful,
          harmful_outcomes: harmful,
          hit_rate: hitRate,
          avg_accuracy: avgAccuracy,
          top_pending_cases: topPending,
          recent_decisions: decisions.slice(0, 5),
          recent_outcomes: outcomes.slice(0, 5),
        });
      }

      case "build_cases": {
        const { buildGovernanceCases } = await import("../_shared/convergence-governance/convergence-case-builder.ts");
        const p = payload || {};
        const candidates = p.candidates || [];

        const govCases = buildGovernanceCases(candidates);

        const inserted = [];
        for (const gc of govCases) {
          const { data } = await client.from("convergence_governance_cases").insert({
            organization_id,
            workspace_id: p.workspace_id || null,
            ...gc,
          }).select().single();
          if (data) inserted.push(data);
        }

        return jsonResponse({ success: true, cases_created: inserted.length, cases: inserted });
      }

      case "assess_promotion": {
        const { evaluatePromotionReadiness } = await import("../_shared/convergence-governance/promotion-readiness-evaluator.ts");
        const p = payload || {};

        const result = evaluatePromotionReadiness({
          local_performance_score: p.local_performance_score || 0.5,
          local_adoption_ratio: p.local_adoption_ratio || 0.3,
          cross_tenant_compatibility: p.cross_tenant_compatibility || 0.5,
          stability_track_record: p.stability_track_record || 0.5,
          rollback_complexity: p.rollback_complexity || 0.3,
          maintenance_cost_ratio: p.maintenance_cost_ratio || 0.3,
          confidence: p.confidence || 0.5,
        });

        return jsonResponse({ success: true, promotion_assessment: result });
      }

      case "assess_retirement": {
        const { planRetirement } = await import("../_shared/convergence-governance/deprecation-retirement-planner.ts");
        const p = payload || {};

        const result = planRetirement({
          pattern_key: p.pattern_key || "unknown",
          pattern_type: p.pattern_type || "strategy_variant",
          adoption_ratio: p.adoption_ratio || 0.05,
          performance_score: p.performance_score || 0.3,
          last_used_days_ago: p.last_used_days_ago || 60,
          dependency_count: p.dependency_count || 2,
          replacement_available: p.replacement_available ?? true,
          confidence: p.confidence || 0.5,
        });

        return jsonResponse({ success: true, retirement_plan: result });
      }

      case "compare_actions": {
        const { evaluatePromotionReadiness } = await import("../_shared/convergence-governance/promotion-readiness-evaluator.ts");
        const { planBoundedMerge } = await import("../_shared/convergence-governance/bounded-merge-planner.ts");
        const { analyzeRetentionJustification } = await import("../_shared/convergence-governance/retention-justification-analyzer.ts");
        const { planRetirement } = await import("../_shared/convergence-governance/deprecation-retirement-planner.ts");
        const p = payload || {};

        const retainResult = analyzeRetentionJustification({
          tenant_fit_score: p.tenant_fit_score || 0.5,
          local_performance_gain: p.local_performance_gain || 0.3,
          adoption_ratio: p.adoption_ratio || 0.3,
          unique_requirements: p.unique_requirements || 0.3,
          convergence_cost_if_merged: p.convergence_cost || 0.3,
          confidence: p.confidence || 0.5,
        });

        const mergeResult = planBoundedMerge({
          source_entities: p.source_entities || [{ key: "src", type: "mode", performance: 0.5 }],
          target_entity: p.target_entity || { key: "default", type: "mode" },
          merge_safety_score: p.merge_safety_score || 0.6,
          rollback_complexity: p.rollback_complexity || 0.3,
          tenant_fit_loss: p.tenant_fit_loss || 0.2,
          confidence: p.confidence || 0.5,
        });

        const promotionResult = evaluatePromotionReadiness({
          local_performance_score: p.local_performance_score || 0.5,
          local_adoption_ratio: p.adoption_ratio || 0.3,
          cross_tenant_compatibility: p.cross_tenant_compatibility || 0.5,
          stability_track_record: p.stability_track_record || 0.5,
          rollback_complexity: p.rollback_complexity || 0.3,
          maintenance_cost_ratio: p.maintenance_cost_ratio || 0.3,
          confidence: p.confidence || 0.5,
        });

        const retireResult = planRetirement({
          pattern_key: p.pattern_key || "variant",
          pattern_type: p.pattern_type || "strategy_variant",
          adoption_ratio: p.adoption_ratio || 0.05,
          performance_score: p.performance_score || 0.3,
          last_used_days_ago: p.last_used_days_ago || 60,
          dependency_count: p.dependency_count || 2,
          replacement_available: p.replacement_available ?? true,
          confidence: p.confidence || 0.5,
        });

        const scenarios = [
          { action: "retain_local", score: retainResult.retention_justification_score, safety: 1.0, rationale: retainResult.justification_reasons },
          { action: "bounded_merge", score: mergeResult.bounded_merge_score, safety: 1 - (p.rollback_complexity || 0.3), rationale: mergeResult.rationale_codes },
          { action: "promote_shared", score: promotionResult.promotion_readiness_score, safety: promotionResult.rollout_safety_score, rationale: promotionResult.rationale_codes },
          { action: "retire", score: retireResult.retirement_readiness_score, safety: retireResult.dependency_impact.risk === "low" ? 0.9 : 0.5, rationale: retireResult.rationale_codes },
        ];

        const { explainDecisionComparison } = await import("../_shared/convergence-governance/convergence-governance-explainer.ts");
        const comparison = explainDecisionComparison(scenarios);

        return jsonResponse({ scenarios, comparison });
      }

      case "review_queue": {
        const { data } = await client.from("convergence_governance_cases")
          .select("*")
          .eq("organization_id", organization_id)
          .in("review_status", ["pending", "under_review"])
          .order("promotion_readiness_score", { ascending: false })
          .limit(20);
        return jsonResponse({ queue: data || [] });
      }

      case "outcomes": {
        const { data } = await client.from("convergence_governance_outcomes")
          .select("*, convergence_governance_cases(*), convergence_decisions(*)")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false })
          .limit(20);

        const outcomes = data || [];
        const helpful = outcomes.filter((o: any) => o.outcome_status === "helpful").length;
        const harmful = outcomes.filter((o: any) => o.outcome_status === "harmful").length;

        return jsonResponse({ outcomes, helpful_count: helpful, harmful_count: harmful, hit_rate: outcomes.length > 0 ? round(helpful / outcomes.length) : 0 });
      }

      case "explain": {
        const { explainGovernanceCase } = await import("../_shared/convergence-governance/convergence-governance-explainer.ts");
        const p = payload || {};

        const explanation = explainGovernanceCase({
          governance_case_type: p.governance_case_type || "convergence_review",
          proposed_action: p.proposed_action || "retain_local",
          promotion_readiness_score: p.promotion_readiness_score || 0,
          retirement_readiness_score: p.retirement_readiness_score || 0,
          confidence_score: p.confidence_score || 0.5,
          rationale_codes: p.rationale_codes || [],
        });

        return jsonResponse({ explanation });
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error("convergence-governance-engine error:", err);
    return jsonResponse({ error: err.message }, 500);
  }
});

function round(v: number): number { return Math.round(v * 10000) / 10000; }
