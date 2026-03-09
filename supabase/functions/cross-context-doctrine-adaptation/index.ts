import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, organization_id, ...params } = await req.json();

    switch (action) {
      case "overview": {
        const [doctrines, contexts, rules, evaluations, drifts] = await Promise.all([
          supabase.from("institutional_doctrines").select("id, doctrine_scope, lifecycle_status").eq("organization_id", organization_id),
          supabase.from("doctrine_context_profiles").select("id, doctrine_profile_status").eq("organization_id", organization_id),
          supabase.from("doctrine_adaptation_rules").select("id, active").eq("organization_id", organization_id),
          supabase.from("doctrine_adaptation_evaluations").select("id, evaluation_result, compatibility_score, drift_risk_score").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100),
          supabase.from("doctrine_drift_events").select("id, severity, resolution_status").eq("organization_id", organization_id),
        ]);

        const evalData = evaluations.data || [];
        const driftData = drifts.data || [];
        const avgCompatibility = evalData.length > 0
          ? evalData.reduce((s: number, e: any) => s + Number(e.compatibility_score), 0) / evalData.length
          : 0;

        return new Response(JSON.stringify({
          total_doctrines: (doctrines.data || []).length,
          active_doctrines: (doctrines.data || []).filter((d: any) => d.lifecycle_status === "active").length,
          core_doctrines: (doctrines.data || []).filter((d: any) => d.doctrine_scope === "core").length,
          total_contexts: (contexts.data || []).length,
          active_contexts: (contexts.data || []).filter((c: any) => c.doctrine_profile_status === "active").length,
          total_rules: (rules.data || []).length,
          active_rules: (rules.data || []).filter((r: any) => r.active).length,
          total_evaluations: evalData.length,
          average_compatibility: Number(avgCompatibility.toFixed(3)),
          result_distribution: {
            compatible: evalData.filter((e: any) => e.evaluation_result === "compatible").length,
            adapted: evalData.filter((e: any) => e.evaluation_result === "adapted").length,
            conflicting: evalData.filter((e: any) => e.evaluation_result === "conflicting").length,
            blocked: evalData.filter((e: any) => e.evaluation_result === "blocked").length,
          },
          total_drift_events: driftData.length,
          open_drifts: driftData.filter((d: any) => d.resolution_status === "open").length,
          drift_by_severity: {
            critical: driftData.filter((d: any) => d.severity === "critical").length,
            high: driftData.filter((d: any) => d.severity === "high").length,
            medium: driftData.filter((d: any) => d.severity === "medium").length,
            low: driftData.filter((d: any) => d.severity === "low").length,
          },
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "evaluate": {
        const { doctrine_id, context_profile_id, target_subject_type, target_subject_id } = params;

        const [docRes, ctxRes, rulesRes] = await Promise.all([
          supabase.from("institutional_doctrines").select("*").eq("id", doctrine_id).single(),
          supabase.from("doctrine_context_profiles").select("*").eq("id", context_profile_id).single(),
          supabase.from("doctrine_adaptation_rules").select("*").eq("organization_id", organization_id).eq("doctrine_id", doctrine_id).eq("context_profile_id", context_profile_id).eq("active", true),
        ]);

        if (docRes.error || ctxRes.error) {
          return new Response(JSON.stringify({ error: "Doctrine or context not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const doctrine = docRes.data;
        const context = ctxRes.data;
        const rules = rulesRes.data || [];

        // Simple evaluation logic
        const isStrict = doctrine.immutability_level === "strict";
        const permissiveRules = rules.filter((r: any) => r.adaptation_type === "permissive");
        const restrictiveRules = rules.filter((r: any) => r.adaptation_type === "restrictive");

        let evalResult = "compatible";
        let compatScore = 1.0;
        let driftScore = 0;
        let summary = "Doctrine applies directly.";
        const blockedReasons: string[] = [];

        if (isStrict && permissiveRules.length > 0) {
          evalResult = "blocked";
          compatScore = 0;
          driftScore = 1.0;
          summary = "Strict doctrine cannot accept permissive adaptations.";
          blockedReasons.push("Strict immutability prevents permissive adaptation");
        } else if (rules.length > 0) {
          const driftRisk = Math.min(1.0, (permissiveRules.length * 0.3 + restrictiveRules.length * 0.1) / Math.max(1, rules.length));
          compatScore = Math.max(0, 1.0 - driftRisk * 0.5);
          driftScore = driftRisk;
          evalResult = compatScore >= 0.9 ? "compatible" : driftRisk > 0.7 ? "conflicting" : "adapted";
          summary = `${rules.length} adaptation rule(s) applied.`;
        }

        // Store evaluation
        await supabase.from("doctrine_adaptation_evaluations").insert({
          context_profile_id,
          doctrine_id,
          organization_id,
          target_subject_type: target_subject_type || "general",
          target_subject_id: target_subject_id || "",
          evaluation_result: evalResult,
          compatibility_score: compatScore,
          drift_risk_score: driftScore,
          adaptation_summary: summary,
          blocked_reasons: blockedReasons,
        });

        // Record drift if detected
        if (driftScore >= 0.2) {
          let severity = "low";
          if (driftScore >= 0.8) severity = "critical";
          else if (driftScore >= 0.6) severity = "high";
          else if (driftScore >= 0.4) severity = "medium";

          await supabase.from("doctrine_drift_events").insert({
            doctrine_id,
            context_profile_id,
            organization_id,
            drift_type: evalResult === "blocked" ? "immutability_violation_attempt" : "adaptation_deviation",
            severity,
            drift_summary: `Drift detected: ${summary}`,
            evidence: { compatibility_score: compatScore, drift_risk_score: driftScore, evaluation_result: evalResult },
          });
        }

        return new Response(JSON.stringify({
          evaluation_result: evalResult,
          compatibility_score: compatScore,
          drift_risk_score: driftScore,
          adaptation_summary: summary,
          blocked_reasons: blockedReasons,
          applied_rules: rules.length,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "contexts": {
        const { data, error } = await supabase
          .from("doctrine_context_profiles")
          .select("*")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "doctrines": {
        const { data, error } = await supabase
          .from("institutional_doctrines")
          .select("*")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "adaptation_rules": {
        let query = supabase
          .from("doctrine_adaptation_rules")
          .select("*")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false });
        if (params.doctrine_id) query = query.eq("doctrine_id", params.doctrine_id);
        if (params.context_profile_id) query = query.eq("context_profile_id", params.context_profile_id);
        const { data, error } = await query;
        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "drift_events": {
        let query = supabase
          .from("doctrine_drift_events")
          .select("*")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false })
          .limit(50);
        if (params.resolution_status) query = query.eq("resolution_status", params.resolution_status);
        const { data, error } = await query;
        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "explain": {
        const { evaluation_id } = params;
        const { data: evaluation, error } = await supabase
          .from("doctrine_adaptation_evaluations")
          .select("*")
          .eq("id", evaluation_id)
          .single();
        if (error) throw error;

        const [docRes, ctxRes, rulesRes] = await Promise.all([
          supabase.from("institutional_doctrines").select("*").eq("id", evaluation.doctrine_id).single(),
          supabase.from("doctrine_context_profiles").select("*").eq("id", evaluation.context_profile_id).single(),
          supabase.from("doctrine_adaptation_rules").select("*").eq("doctrine_id", evaluation.doctrine_id).eq("context_profile_id", evaluation.context_profile_id).eq("active", true),
        ]);

        return new Response(JSON.stringify({
          evaluation,
          doctrine: docRes.data,
          context: ctxRes.data,
          rules: rulesRes.data || [],
          explanation: {
            core_principle: `Doctrine "${docRes.data?.doctrine_name}" (${docRes.data?.doctrine_scope} scope, ${docRes.data?.immutability_level} immutability)`,
            contextual_adaptation: evaluation.adaptation_summary,
            institutional_reason: (rulesRes.data || []).map((r: any) => r.justification).filter(Boolean).join("; ") || "Default inheritance",
            preserved_boundary: docRes.data?.immutability_level === "strict" ? "Strictly immutable — no override allowed" : docRes.data?.immutability_level === "bounded" ? "Bounded — adaptation within declared limits" : "Flexible — contextual reinterpretation allowed",
            drift_warning: evaluation.drift_risk_score > 0.2 ? `Drift risk: ${evaluation.drift_risk_score}` : null,
          },
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "recommendations": {
        const { data: evaluations } = await supabase
          .from("doctrine_adaptation_evaluations")
          .select("*")
          .eq("organization_id", organization_id)
          .in("evaluation_result", ["conflicting", "blocked"])
          .order("created_at", { ascending: false })
          .limit(20);

        const recommendations = (evaluations || []).map((e: any) => ({
          evaluation_id: e.id,
          doctrine_id: e.doctrine_id,
          context_profile_id: e.context_profile_id,
          result: e.evaluation_result,
          drift_risk: e.drift_risk_score,
          recommendation: e.evaluation_result === "blocked"
            ? "Review and remove incompatible adaptation rules"
            : "Investigate conflict and consider rule adjustment or doctrine exception",
        }));

        return new Response(JSON.stringify(recommendations), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (err) {
    console.error("cross-context-doctrine-adaptation error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
