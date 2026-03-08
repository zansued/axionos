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

    const { action, organization_id, payload } = await req.json();
    if (!organization_id) return jsonResponse({ error: "organization_id required" }, 400);

    switch (action) {
      case "overview": {
        const [profilesRes, signalsRes, candidatesRes, recsRes, outcomesRes] = await Promise.all([
          client.from("platform_convergence_profiles").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(20),
          client.from("divergence_signals").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(20),
          client.from("convergence_candidates").select("*").eq("organization_id", organization_id).eq("status", "open").order("convergence_priority_score", { ascending: false }).limit(10),
          client.from("convergence_recommendations").select("*").eq("organization_id", organization_id).eq("status", "open").order("priority_score", { ascending: false }).limit(10),
          client.from("convergence_outcomes").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(10),
        ]);

        const profiles = profilesRes.data || [];
        const signals = signalsRes.data || [];

        const avgDivergence = profiles.length > 0
          ? profiles.reduce((s: number, p: any) => s + Number(p.current_divergence_score || 0), 0) / profiles.length
          : 0;
        const avgSpecialization = profiles.length > 0
          ? profiles.reduce((s: number, p: any) => s + Number(p.beneficial_specialization_score || 0), 0) / profiles.length
          : 0;
        const avgFragmentation = profiles.length > 0
          ? profiles.reduce((s: number, p: any) => s + Number(p.fragmentation_risk_score || 0), 0) / profiles.length
          : 0;

        // Hotspot domains from signals
        const domainCounts = new Map<string, number>();
        signals.forEach((s: any) => domainCounts.set(s.convergence_domain, (domainCounts.get(s.convergence_domain) || 0) + 1));
        const hotspots = Array.from(domainCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

        return jsonResponse({
          total_profiles: profiles.length,
          total_signals: signals.length,
          open_candidates: (candidatesRes.data || []).length,
          open_recommendations: (recsRes.data || []).length,
          recent_outcomes: (outcomesRes.data || []).length,
          avg_divergence_score: round(avgDivergence),
          avg_specialization_score: round(avgSpecialization),
          avg_fragmentation_risk: round(avgFragmentation),
          divergence_hotspots: hotspots,
          top_candidates: (candidatesRes.data || []).slice(0, 5),
          top_recommendations: (recsRes.data || []).slice(0, 5),
        });
      }

      case "analyze_scope": {
        const { aggregateDivergenceSignals } = await import("../_shared/platform-convergence/divergence-signal-aggregator.ts");
        const { analyzeSpecialization } = await import("../_shared/platform-convergence/beneficial-specialization-analyzer.ts");
        const { detectSpecializationDebt } = await import("../_shared/platform-convergence/specialization-debt-detector.ts");

        const p = payload || {};

        const divergence = aggregateDivergenceSignals({
          organization_id,
          architecture_mode_divergences: p.architecture_mode_divergences || [],
          strategy_variant_count: p.strategy_variant_count || 0,
          calibration_override_count: p.calibration_override_count || 0,
          tenant_exception_count: p.tenant_exception_count || 0,
          economic_redundancy_indicators: p.economic_redundancy_indicators || 0,
          stabilization_pressure_score: p.stabilization_pressure_score || 0,
        });

        const specialization = analyzeSpecialization({
          mode_key: p.mode_key || "default",
          tenant_fit_score: p.tenant_fit_score || 0.5,
          reliability_delta: p.reliability_delta || 0,
          stability_delta: p.stability_delta || 0,
          adoption_ratio: p.adoption_ratio || 0.5,
          divergence_score: divergence.overall_divergence_score,
          maintenance_cost_ratio: p.maintenance_cost_ratio || 0.3,
          outcome_history: p.outcome_history || [],
        });

        const debt = detectSpecializationDebt({
          organization_id,
          local_exception_count: p.local_exception_count || 0,
          special_mode_count: p.special_mode_count || 0,
          variant_count: p.variant_count || 0,
          override_count: p.override_count || 0,
          avg_mode_age_days: p.avg_mode_age_days || 30,
          avg_mode_last_review_days: p.avg_mode_last_review_days || 30,
          total_maintenance_hours_monthly: p.total_maintenance_hours_monthly || 5,
        });

        // Save profile
        const { data: profile } = await client.from("platform_convergence_profiles").insert({
          organization_id,
          workspace_id: p.workspace_id || null,
          scope_type: p.scope_type || "organization",
          scope_id: p.scope_id || organization_id,
          convergence_domain: p.convergence_domain || "architecture_mode",
          current_divergence_score: divergence.overall_divergence_score,
          beneficial_specialization_score: specialization.beneficial_specialization_score,
          fragmentation_risk_score: specialization.fragmentation_risk_score,
          specialization_debt_score: debt.specialization_debt_score,
          economic_redundancy_score: divergence.economic_redundancy_score,
          rollback_complexity_score: p.rollback_complexity || 0,
          convergence_priority_score: round(divergence.overall_divergence_score * 0.4 + specialization.fragmentation_risk_score * 0.3 + debt.specialization_debt_score * 0.3),
          confidence_score: p.confidence || 0.5,
          evidence_links: { divergence_rationale: divergence.rationale_codes, specialization_rationale: specialization.rationale_codes },
          assumptions: p.assumptions || {},
        }).select().single();

        // Save divergence signal
        if (divergence.overall_divergence_score > 0.3) {
          await client.from("divergence_signals").insert({
            organization_id,
            workspace_id: p.workspace_id || null,
            scope_type: p.scope_type || "organization",
            scope_id: p.scope_id || organization_id,
            signal_type: "divergence_analysis",
            convergence_domain: p.convergence_domain || "architecture_mode",
            severity: divergence.overall_divergence_score > 0.7 ? "critical" : divergence.overall_divergence_score > 0.5 ? "high" : "moderate",
            divergence_score: divergence.overall_divergence_score,
            fragmentation_risk_score: specialization.fragmentation_risk_score,
            specialization_debt_score: debt.specialization_debt_score,
            description: `Divergence analysis: ${divergence.hotspot_domains.join(", ")}`,
            evidence_refs: divergence.rationale_codes,
          });
        }

        return jsonResponse({ success: true, profile, divergence, specialization, debt });
      }

      case "detect_candidates": {
        const { buildConvergenceCandidates } = await import("../_shared/platform-convergence/convergence-candidate-builder.ts");
        const p = payload || {};

        const candidates = buildConvergenceCandidates({
          modes: p.modes || [],
          strategy_variants: p.strategy_variants || [],
        });

        // Save candidates
        for (const c of candidates) {
          await client.from("convergence_candidates").insert({
            organization_id,
            workspace_id: p.workspace_id || null,
            convergence_domain: c.convergence_domain,
            candidate_type: c.candidate_type,
            scope_type: "organization",
            target_entities: c.target_entities,
            merge_safety_score: c.merge_safety_score,
            retention_justification_score: c.retention_justification_score,
            deprecation_candidate_score: c.deprecation_candidate_score,
            convergence_expected_value: c.convergence_expected_value,
            convergence_priority_score: round(c.convergence_expected_value * 0.6 + c.deprecation_candidate_score * 0.4),
            confidence_score: p.confidence || 0.5,
            rationale_codes: c.rationale_codes,
          });
        }

        return jsonResponse({ success: true, candidates_count: candidates.length, candidates });
      }

      case "compare_paths": {
        const { scoreConvergenceTradeoff } = await import("../_shared/platform-convergence/convergence-tradeoff-scorer.ts");
        const p = payload || {};

        const scenarios = [
          { label: "stay_divergent", tenant_fit_loss: 0, rollback_complexity: 0, ...p.stay_divergent },
          { label: "bounded_merge", tenant_fit_loss: p.tenant_fit_loss || 0.2, rollback_complexity: p.rollback_complexity || 0.3, ...p.bounded_merge },
          { label: "retire_local", tenant_fit_loss: p.tenant_fit_loss_retire || 0.4, rollback_complexity: p.rollback_complexity_retire || 0.5, ...p.retire_local },
        ].map(s => {
          const result = scoreConvergenceTradeoff({
            beneficial_specialization_score: p.beneficial_specialization_score || 0.5,
            fragmentation_risk_score: p.fragmentation_risk_score || 0.3,
            economic_redundancy_cost: p.economic_redundancy_cost || 0.2,
            rollback_complexity: s.rollback_complexity || 0,
            tenant_fit_loss: s.tenant_fit_loss || 0,
            reliability_impact: p.reliability_impact || 0,
            stability_impact: p.stability_impact || 0,
            confidence: p.confidence || 0.5,
          });
          return { scenario: s.label, ...result };
        });

        return jsonResponse({ scenarios });
      }

      case "recommendations": {
        const { data } = await client.from("convergence_recommendations")
          .select("*")
          .eq("organization_id", organization_id)
          .in("status", ["open", "reviewed"])
          .order("priority_score", { ascending: false })
          .limit(20);
        return jsonResponse({ recommendations: data || [] });
      }

      case "outcomes": {
        const { data } = await client.from("convergence_outcomes")
          .select("*, convergence_recommendations(*)")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false })
          .limit(20);

        const outcomes = data || [];
        const helpful = outcomes.filter((o: any) => o.outcome_status === "helpful").length;
        const harmful = outcomes.filter((o: any) => o.outcome_status === "harmful").length;
        const hitRate = outcomes.length > 0 ? round(helpful / outcomes.length) : 0;

        return jsonResponse({ outcomes, hit_rate: hitRate, helpful_count: helpful, harmful_count: harmful });
      }

      case "explain": {
        const { explainConvergenceScore, explainConvergenceRecommendation } = await import("../_shared/platform-convergence/convergence-explainer.ts");
        const p = payload || {};

        if (p.score_name) {
          const explanation = explainConvergenceScore({
            score_name: p.score_name,
            value: p.value || 0,
            rationale_codes: p.rationale_codes || [],
            confidence: p.confidence || 0.5,
          });
          return jsonResponse({ explanation });
        }

        if (p.recommendation_type) {
          const explanation = explainConvergenceRecommendation({
            recommendation_type: p.recommendation_type,
            target_entities: p.target_entities || [],
            priority_score: p.priority_score || 0,
            confidence_score: p.confidence_score || 0.5,
            rationale_codes: p.rationale_codes || [],
            expected_value: p.expected_value || 0,
          });
          return jsonResponse({ explanation });
        }

        return jsonResponse({ error: "Provide score_name or recommendation_type" }, 400);
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error("platform-convergence-engine error:", err);
    return jsonResponse({ error: err.message }, 500);
  }
});

function round(v: number): number { return Math.round(v * 10000) / 10000; }
