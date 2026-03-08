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
        const [assessRes, recRes, outRes] = await Promise.all([
          client.from("architecture_economic_assessments").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(20),
          client.from("economic_optimization_recommendations").select("*").eq("organization_id", organization_id).eq("status", "open").order("priority_score", { ascending: false }).limit(10),
          client.from("economic_optimization_outcomes").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(10),
        ]);

        const assessments = assessRes.data || [];
        const totalProjectedSavings = assessments.reduce((s: number, a: any) => s + Math.max(0, Number(a.projected_operational_cost_delta) || 0), 0);
        const totalCostExposure = assessments.reduce((s: number, a: any) => s + (Number(a.projected_change_cost) || 0), 0);
        const avgConfidence = assessments.length > 0
          ? assessments.reduce((s: number, a: any) => s + (Number(a.economic_confidence_score) || 0), 0) / assessments.length
          : 0;

        return jsonResponse({
          total_assessments: assessments.length,
          total_projected_savings: Math.round(totalProjectedSavings * 10000) / 10000,
          total_cost_exposure: Math.round(totalCostExposure * 10000) / 10000,
          avg_confidence: Math.round(avgConfidence * 100) / 100,
          open_recommendations: (recRes.data || []).length,
          recent_outcomes: (outRes.data || []).length,
          top_recommendations: (recRes.data || []).slice(0, 5),
          recent_assessments: assessments.slice(0, 5),
        });
      }

      case "assess_change": {
        const { analyzeCostImpact } = await import("../_shared/architecture-economics/architecture-cost-impact-analyzer.ts");
        const { estimateMigrationROI } = await import("../_shared/architecture-economics/migration-roi-estimator.ts");
        const { scoreTradeoff } = await import("../_shared/architecture-economics/economic-tradeoff-scorer.ts");
        const { calibrateConfidence } = await import("../_shared/architecture-economics/economic-confidence-calibrator.ts");

        const p = payload || {};
        const confidence = calibrateConfidence({
          evidenceDensity: p.evidence_density || 2,
          historicalVariance: p.historical_variance || 0.4,
          signalAgreement: p.signal_agreement || 0.6,
          dataRecency: p.data_recency || 0.7,
          changeComplexity: p.change_complexity || 0.5,
        });

        const impact = analyzeCostImpact({
          changeType: p.change_type || "architecture",
          baselineCostPerRun: p.baseline_cost_per_run || 0.05,
          estimatedRunsDelta: p.estimated_runs_delta || 0,
          reliabilityGainEstimate: p.reliability_gain || 0,
          stabilityGainEstimate: p.stability_gain || 0,
          rollbackComplexity: p.rollback_complexity || 0.5,
          tenantScopeCount: p.tenant_scope_count || 1,
          evidenceDensity: p.evidence_density || 2,
        });

        const roi = estimateMigrationROI({
          implementationCost: impact.projected_change_cost,
          rollbackCost: impact.projected_rollback_cost,
          projectedMonthlySavings: Math.max(0, impact.projected_operational_cost_delta),
          reliabilityGain: impact.projected_reliability_gain,
          stabilityGain: impact.projected_stability_gain,
          evidenceDensity: p.evidence_density || 2,
        });

        const tradeoff = scoreTradeoff({
          reliabilityGain: impact.projected_reliability_gain,
          stabilityGain: impact.projected_stability_gain,
          costEfficiency: roi.migration_roi_30d > 0 ? Math.min(1, roi.migration_roi_30d) : 0,
          rollbackSafety: 1 - (p.rollback_complexity || 0.5),
          tenantCoherence: p.tenant_coherence || 0.8,
          implementationSpeed: p.implementation_speed || 0.6,
          confidence: confidence.confidence_score,
        });

        const { data: assessment } = await client.from("architecture_economic_assessments").insert({
          organization_id,
          change_ref: p.change_ref || {},
          change_type: p.change_type || "architecture",
          projected_change_cost: impact.projected_change_cost,
          projected_operational_cost_delta: impact.projected_operational_cost_delta,
          projected_reliability_gain: impact.projected_reliability_gain,
          projected_stability_gain: impact.projected_stability_gain,
          projected_rollback_cost: impact.projected_rollback_cost,
          tenant_divergence_cost: impact.tenant_divergence_cost,
          cost_to_reliability_ratio: impact.cost_to_reliability_ratio,
          cost_to_stability_ratio: impact.cost_to_stability_ratio,
          migration_roi_30d: roi.migration_roi_30d,
          migration_roi_90d: roi.migration_roi_90d,
          economic_tradeoff_score: tradeoff.tradeoff_score,
          rollout_cost_envelope: impact.projected_change_cost * 1.25,
          rollback_reserve_ratio: impact.projected_rollback_cost > 0 ? impact.projected_rollback_cost / impact.projected_change_cost : 0,
          forecast_variance_score: p.historical_variance || 0.4,
          economic_confidence_score: confidence.confidence_score,
          evidence_refs: { impact_rationale: impact.rationale_codes, roi_rationale: roi.rationale_codes },
          rationale_codes: [...tradeoff.rationale_codes, ...confidence.contributing_factors],
          status: "assessed",
        }).select().single();

        return jsonResponse({ success: true, assessment, impact, roi, tradeoff, confidence });
      }

      case "compare_scenarios": {
        const { data } = await client.from("economic_tradeoff_scenarios")
          .select("*")
          .eq("organization_id", organization_id)
          .eq("assessment_id", payload?.assessment_id)
          .order("tradeoff_score", { ascending: false });
        return jsonResponse({ scenarios: data || [] });
      }

      case "rollout_plan": {
        const { planCostAwareRollout } = await import("../_shared/architecture-economics/cost-aware-rollout-planner.ts");
        const p = payload || {};
        const plan = planCostAwareRollout({
          totalProjectedCost: p.total_projected_cost || 1,
          rollbackCost: p.rollback_cost || 0.3,
          phaseCount: p.phase_count || 3,
          riskLevel: p.risk_level || "moderate",
          confidence: p.confidence || 0.6,
        });

        const { data: saved } = await client.from("rollout_economic_plans").insert({
          organization_id,
          assessment_id: p.assessment_id,
          plan_name: p.plan_name || "Cost-Aware Rollout",
          phases: plan.phases,
          total_budget_envelope: plan.total_budget_envelope,
          rollback_reserve: plan.total_rollback_reserve,
          stop_loss_thresholds: plan.stop_loss_thresholds,
          confidence_score: plan.confidence_score,
          status: "proposed",
        }).select().single();

        return jsonResponse({ success: true, plan, saved });
      }

      case "migration_roi": {
        const { estimateMigrationROI } = await import("../_shared/architecture-economics/migration-roi-estimator.ts");
        const { calibrateConfidence } = await import("../_shared/architecture-economics/economic-confidence-calibrator.ts");
        const p = payload || {};

        const confidence = calibrateConfidence({
          evidenceDensity: p.evidence_density || 2,
          historicalVariance: p.historical_variance || 0.4,
          signalAgreement: p.signal_agreement || 0.6,
          dataRecency: p.data_recency || 0.7,
          changeComplexity: p.change_complexity || 0.5,
        });

        const roi = estimateMigrationROI({
          implementationCost: p.implementation_cost || 0,
          rollbackCost: p.rollback_cost || 0,
          projectedMonthlySavings: p.projected_monthly_savings || 0,
          reliabilityGain: p.reliability_gain || 0,
          stabilityGain: p.stability_gain || 0,
          evidenceDensity: p.evidence_density || 2,
        });

        const justified = roi.migration_roi_30d > 0 && confidence.confidence_score > 0.4;
        const recommendation = justified
          ? roi.break_even_days && roi.break_even_days <= 30
            ? "strongly_recommended"
            : roi.break_even_days && roi.break_even_days <= 90
              ? "recommended"
              : "conditionally_recommended"
          : "not_recommended";

        return jsonResponse({
          roi,
          confidence,
          justified,
          recommendation,
          assumptions: [
            "Based on bounded heuristics and historical execution data.",
            "Savings projections assume stable operational conditions.",
            "Advisory-only — no automated migration initiated.",
          ],
        });
      }

      case "rollout_economics": {
        const { planCostAwareRollout } = await import("../_shared/architecture-economics/cost-aware-rollout-planner.ts");
        const { calibrateConfidence } = await import("../_shared/architecture-economics/economic-confidence-calibrator.ts");
        const p = payload || {};

        // Generate 3 scenarios: conservative, balanced, aggressive
        const scenarios = ["conservative", "balanced", "aggressive"].map((label) => {
          const riskLevel = label === "conservative" ? "low" : label === "aggressive" ? "high" : "moderate";
          const phaseCount = label === "conservative" ? 5 : label === "aggressive" ? 2 : 3;

          const plan = planCostAwareRollout({
            totalProjectedCost: p.total_projected_cost || 1,
            rollbackCost: p.rollback_cost || 0.3,
            phaseCount,
            riskLevel,
            confidence: p.confidence || 0.6,
          });

          return { label, risk_level: riskLevel, ...plan };
        });

        const confidence = calibrateConfidence({
          evidenceDensity: p.evidence_density || 2,
          historicalVariance: p.historical_variance || 0.4,
          signalAgreement: p.signal_agreement || 0.6,
          dataRecency: p.data_recency || 0.7,
          changeComplexity: p.change_complexity || 0.5,
        });

        return jsonResponse({ scenarios, confidence });
      }

      case "tenant_mode_economics": {
        const { analyzeFragmentationCost } = await import("../_shared/architecture-economics/tenant-fragmentation-cost-analyzer.ts");
        const p = payload || {};

        const analysis = analyzeFragmentationCost({
          tenantModeCount: p.tenant_mode_count || 1,
          tenantCount: p.tenant_count || 1,
          avgModeDivergence: p.avg_mode_divergence || 0.2,
          avgModeAdoption: p.avg_mode_adoption || 0.5,
          reliabilityDelta: p.reliability_delta || 0,
          stabilityDelta: p.stability_delta || 0,
          baseOperatingCost: p.base_operating_cost || 1,
        });

        return jsonResponse({
          analysis,
          advisory: analysis.net_economic_value > 0
            ? "Tenant specialization is economically beneficial under current conditions."
            : "Tenant specialization fragmentation cost exceeds specialization benefit. Consider consolidation.",
          safety_note: "Advisory-only. No tenant architecture mode mutation performed.",
        });
      }

      case "recommendations": {
        const { data } = await client.from("economic_optimization_recommendations")
          .select("*")
          .eq("organization_id", organization_id)
          .order("priority_score", { ascending: false })
          .limit(50);
        return jsonResponse({ recommendations: data || [] });
      }

      case "outcomes": {
        const { data } = await client.from("economic_optimization_outcomes")
          .select("*")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false })
          .limit(50);
        return jsonResponse({ outcomes: data || [] });
      }

      case "explain": {
        const { explainAssessment } = await import("../_shared/architecture-economics/economic-explainer.ts");
        const p = payload || {};
        const explanation = explainAssessment({
          changeType: p.change_type || "architecture",
          projectedChangeCost: p.projected_change_cost || 0,
          projectedReliabilityGain: p.projected_reliability_gain || 0,
          projectedStabilityGain: p.projected_stability_gain || 0,
          rollbackCost: p.rollback_cost || 0,
          tradeoffScore: p.tradeoff_score || 0,
          confidenceScore: p.confidence_score || 0,
          roi30d: p.roi_30d || 0,
          roi90d: p.roi_90d || 0,
          rationale: p.rationale || [],
          riskFlags: p.risk_flags || [],
        });
        return jsonResponse({ explanation });
      }

      case "health": {
        const [assessRes, recRes, outRes] = await Promise.all([
          client.from("architecture_economic_assessments").select("economic_confidence_score, economic_tradeoff_score, status").eq("organization_id", organization_id).limit(100),
          client.from("economic_optimization_recommendations").select("status, confidence_score").eq("organization_id", organization_id).limit(100),
          client.from("economic_optimization_outcomes").select("outcome_status, forecast_error").eq("organization_id", organization_id).limit(100),
        ]);

        const assessments = assessRes.data || [];
        const outcomes = outRes.data || [];
        const avgConfidence = assessments.length > 0
          ? assessments.reduce((s: number, a: any) => s + (Number(a.economic_confidence_score) || 0), 0) / assessments.length : 0;
        const avgTradeoff = assessments.length > 0
          ? assessments.reduce((s: number, a: any) => s + (Number(a.economic_tradeoff_score) || 0), 0) / assessments.length : 0;
        const avgForecastError = outcomes.length > 0
          ? outcomes.reduce((s: number, o: any) => s + Math.abs(Number(o.forecast_error) || 0), 0) / outcomes.length : 0;
        const helpfulRate = outcomes.length > 0
          ? outcomes.filter((o: any) => o.outcome_status === "helpful").length / outcomes.length : 0;

        return jsonResponse({
          economic_confidence_index: Math.round(avgConfidence * 100) / 100,
          economic_tradeoff_index: Math.round(avgTradeoff * 100) / 100,
          forecast_accuracy_index: Math.round((1 - Math.min(1, avgForecastError)) * 100) / 100,
          recommendation_hit_rate: Math.round(helpfulRate * 100) / 100,
          total_assessments: assessments.length,
          total_outcomes: outcomes.length,
          open_recommendations: (recRes.data || []).filter((r: any) => r.status === "open").length,
        });
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e: any) {
    console.error("Economic Optimization Engine error:", e);
    return jsonResponse({ error: e.message }, 500);
  }
});
