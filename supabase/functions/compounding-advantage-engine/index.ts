import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { computeCompoundingScore } from "../_shared/compounding-advantage/compounding-score-engine.ts";
import { detectMoat } from "../_shared/compounding-advantage/moat-domain-detector.ts";
import { packageDoctrineAsset } from "../_shared/compounding-advantage/doctrine-asset-packager.ts";
import { analyzeStackStrength } from "../_shared/compounding-advantage/stack-strength-analyzer.ts";
import { detectWeakZones } from "../_shared/compounding-advantage/weak-compounding-detector.ts";
import { buildAdvantageLineage } from "../_shared/compounding-advantage/advantage-lineage-builder.ts";
import { explainAdvantage } from "../_shared/compounding-advantage/moat-explainer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { action, organizationId, ...params } = await req.json();
    if (!organizationId) throw new Error("organizationId required");

    let result: unknown;

    switch (action) {
      case "compute_compounding_scores": {
        const scores = computeCompoundingScore({
          reuse_count: params.reuse_count ?? 0,
          total_executions: params.total_executions ?? 1,
          failure_recovery_rate: params.failure_recovery_rate ?? 0,
          doctrine_stability: params.doctrine_stability ?? 0,
          autonomy_level: params.autonomy_level ?? 0,
          max_autonomy: params.max_autonomy ?? 5,
          canon_coverage: params.canon_coverage ?? 0,
          unique_patterns_count: params.unique_patterns_count ?? 0,
          total_patterns_count: params.total_patterns_count ?? 1,
        });

        await supabase.from("compounding_advantage_scores").insert({
          organization_id: organizationId,
          stack_scope: params.stack_scope ?? "",
          domain_scope: params.domain_scope ?? "",
          workflow_scope: params.workflow_scope ?? "",
          compounding_score: scores.compounding,
          uniqueness_score: scores.uniqueness,
          reuse_density_score: scores.reuse_density,
          failure_resilience_score: scores.failure_resilience,
          doctrine_stability_score: scores.doctrine_stability,
          autonomy_maturity_score: scores.autonomy_maturity,
          evidence_refs: [scores],
        });

        result = { scores };
        break;
      }

      case "detect_moat_domains": {
        const detection = detectMoat({
          domain_name: params.domain_name ?? "",
          compounding_score: params.compounding_score ?? 0,
          uniqueness_score: params.uniqueness_score ?? 0,
          reuse_density: params.reuse_density ?? 0,
          failure_resilience: params.failure_resilience ?? 0,
        });

        if (detection.moat_status !== "weak") {
          await supabase.from("capability_moat_domains").insert({
            organization_id: organizationId,
            domain_name: params.domain_name ?? "",
            moat_status: detection.moat_status,
            compounding_score: params.compounding_score ?? 0,
            uniqueness_score: params.uniqueness_score ?? 0,
            reuse_density_score: params.reuse_density ?? 0,
            failure_resilience_score: params.failure_resilience ?? 0,
            recommended_productization: detection.recommended_productization,
          });
        }

        result = { detection };
        break;
      }

      case "generate_doctrine_pack": {
        const pack = packageDoctrineAsset({
          domain_name: params.domain_name ?? "",
          doctrine_entries: params.doctrine_entries ?? [],
          canon_entries: params.canon_entries ?? [],
          autonomy_config: params.autonomy_config ?? { level: 0, allowed_actions: [] },
        });

        await supabase.from("doctrine_asset_packs").insert({
          organization_id: organizationId,
          pack_name: pack.pack_name,
          domain_scope: pack.domain_scope,
          contents: pack.contents,
          doctrine_entries: pack.doctrine_entries,
          canon_entries: pack.canon_entries,
          autonomy_config: pack.autonomy_config,
        });

        result = { pack };
        break;
      }

      case "list_weak_zones": {
        const zones = detectWeakZones({
          domain_name: params.domain_name ?? "",
          compounding_score: params.compounding_score ?? 0,
          reuse_density: params.reuse_density ?? 0,
          failure_resilience: params.failure_resilience ?? 0,
          doctrine_stability: params.doctrine_stability ?? 0,
          execution_count: params.execution_count ?? 0,
        });

        for (const zone of zones) {
          await supabase.from("weak_compounding_zones").insert({
            organization_id: organizationId,
            zone_name: zone.zone_name,
            weakness_type: zone.weakness_type,
            severity: zone.severity,
            description: zone.description,
            recommended_action: zone.recommended_action,
          });
        }

        result = { zones };
        break;
      }

      case "review_moat_candidate": {
        await supabase.from("moat_review_decisions").insert({
          organization_id: organizationId,
          moat_domain_id: params.moat_domain_id,
          decision: params.decision ?? "pending",
          reviewer_notes: params.reviewer_notes ?? "",
          reviewed_by: params.reviewed_by ?? "",
          decided_at: params.decision !== "pending" ? new Date().toISOString() : null,
        });

        if (params.decision === "confirmed" && params.moat_domain_id) {
          await supabase.from("capability_moat_domains").update({ moat_status: "confirmed", updated_at: new Date().toISOString() }).eq("id", params.moat_domain_id);
        }

        result = { reviewed: true };
        break;
      }

      case "explain_advantage_profile": {
        const explanation = explainAdvantage({
          domain_name: params.domain_name ?? "",
          moat_status: params.moat_status ?? "candidate",
          compounding_score: params.compounding_score ?? 0,
          uniqueness_score: params.uniqueness_score ?? 0,
          reuse_density: params.reuse_density ?? 0,
          failure_resilience: params.failure_resilience ?? 0,
          doctrine_stability: params.doctrine_stability ?? 0,
          autonomy_maturity: params.autonomy_maturity ?? 0,
          recommended_productization: params.recommended_productization ?? "",
        });
        result = { explanation };
        break;
      }

      case "list_moat_domains": {
        const { data } = await supabase.from("capability_moat_domains").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false });
        result = { domains: data || [] };
        break;
      }

      case "list_scores": {
        const { data } = await supabase.from("compounding_advantage_scores").select("*").eq("organization_id", organizationId).order("computed_at", { ascending: false }).limit(50);
        result = { scores: data || [] };
        break;
      }

      case "list_doctrine_packs": {
        const { data } = await supabase.from("doctrine_asset_packs").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false });
        result = { packs: data || [] };
        break;
      }

      case "list_weak_compounding_zones": {
        const { data } = await supabase.from("weak_compounding_zones").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false });
        result = { zones: data || [] };
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
