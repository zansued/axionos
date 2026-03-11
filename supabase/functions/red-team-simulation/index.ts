import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { runScenario } from "../_shared/red-team/red-team-scenario-runner.ts";
import { validateSandbox, getDefaultSandboxConfig } from "../_shared/red-team/adversarial-sandbox-engine.ts";
import { computeFragilityScore } from "../_shared/red-team/fragility-scorer.ts";
import { detectBreach } from "../_shared/red-team/breach-detector.ts";
import { explainSimulation } from "../_shared/red-team/simulation-explainer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { action, ...params } = await req.json();

    switch (action) {
      case "list_exercises": {
        const { data, error } = await supabase
          .from("red_team_exercises")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        return new Response(JSON.stringify({ exercises: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "list_scenarios": {
        const { data, error } = await supabase
          .from("red_team_scenarios")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw error;
        return new Response(JSON.stringify({ scenarios: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "list_runs": {
        const { data, error } = await supabase
          .from("red_team_simulation_runs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        return new Response(JSON.stringify({ runs: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "list_findings": {
        const { data, error } = await supabase
          .from("red_team_findings")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw error;
        return new Response(JSON.stringify({ findings: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "list_reviews": {
        const { data, error } = await supabase
          .from("red_team_review_queue")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        return new Response(JSON.stringify({ reviews: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "run_simulation": {
        const sandboxConfig = getDefaultSandboxConfig();
        const validation = validateSandbox(sandboxConfig);
        if (!validation.permitted) {
          return new Response(JSON.stringify({ error: "Sandbox validation failed", violations: validation.violations }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const scenarioResult = runScenario({
          scenario_type: params.scenario_type ?? "invalid_contract_input_pressure",
          target_surface: params.target_surface ?? "general",
          threat_domain: params.threat_domain ?? "unknown",
          sandbox_mode: true,
          simulation_scope: "bounded",
        });

        const fragilityResult = computeFragilityScore({
          resisted_count: scenarioResult.resisted.length,
          failed_count: scenarioResult.failed.length,
          fragile_count: scenarioResult.fragile.length,
          breach_detected: scenarioResult.breach_detected,
          scenario_severity: params.severity ?? "medium",
        });

        const breachResult = detectBreach({
          run_log: scenarioResult.run_log,
          failed_items: scenarioResult.failed,
          fragile_items: scenarioResult.fragile,
          threat_domain: params.threat_domain ?? "unknown",
        });

        const explanation = explainSimulation({
          scenario_type: params.scenario_type ?? "invalid_contract_input_pressure",
          target_surface: params.target_surface ?? "general",
          threat_domain: params.threat_domain ?? "unknown",
          resisted: scenarioResult.resisted,
          failed: scenarioResult.failed,
          fragile: scenarioResult.fragile,
          breach_detected: breachResult.breach_detected,
          fragility_score: fragilityResult.score,
        });

        return new Response(JSON.stringify({
          scenario_result: scenarioResult,
          fragility: fragilityResult,
          breach: breachResult,
          explanation,
          sandbox_validation: validation,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "overview": {
        const [exercises, runs, findings, reviews] = await Promise.all([
          supabase.from("red_team_exercises").select("*", { count: "exact", head: true }),
          supabase.from("red_team_simulation_runs").select("*", { count: "exact", head: true }),
          supabase.from("red_team_findings").select("*", { count: "exact", head: true }),
          supabase.from("red_team_review_queue").select("*", { count: "exact", head: true }).eq("status", "pending"),
        ]);

        return new Response(JSON.stringify({
          total_exercises: exercises.count ?? 0,
          total_runs: runs.count ?? 0,
          total_findings: findings.count ?? 0,
          pending_reviews: reviews.count ?? 0,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
