import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: corsHeaders });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });

    const body = await req.json();
    const { action, organization_id } = body;

    if (!organization_id) return new Response(JSON.stringify({ error: "organization_id required" }), { status: 400, headers: corsHeaders });

    let result: unknown;

    switch (action) {
      case "overview": {
        const [{ data: scenarios }, { data: runs }, { data: conflicts }, { data: blastRadius }, { data: outcomes }] = await Promise.all([
          supabase.from("ecosystem_sandbox_scenarios").select("*").eq("organization_id", organization_id).limit(100),
          supabase.from("ecosystem_simulation_runs").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("ecosystem_policy_conflict_events").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("ecosystem_blast_radius_estimates").select("*").eq("organization_id", organization_id).limit(100),
          supabase.from("ecosystem_simulation_outcomes").select("*").eq("organization_id", organization_id).limit(100),
        ]);

        const allScenarios = scenarios || [];
        const byStatus = allScenarios.reduce((acc: Record<string, number>, s: any) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc; }, {});
        const bySignal = allScenarios.reduce((acc: Record<string, number>, s: any) => { acc[s.activation_readiness_signal] = (acc[s.activation_readiness_signal] || 0) + 1; return acc; }, {});

        result = {
          total_scenarios: allScenarios.length,
          scenarios_by_status: byStatus,
          scenarios_by_signal: bySignal,
          total_runs: (runs || []).length,
          total_conflicts: (conflicts || []).length,
          total_blast_estimates: (blastRadius || []).length,
          total_outcomes: (outcomes || []).length,
          simulation_mode: "sandbox_only",
          governance_mode: "advisory_first",
        };
        break;
      }

      case "build_scenarios": {
        const { data: scenarios } = await supabase.from("ecosystem_sandbox_scenarios").select("*").eq("organization_id", organization_id);
        result = { scenarios: scenarios || [] };
        break;
      }

      case "run_simulations": {
        const { data: runs } = await supabase.from("ecosystem_simulation_runs").select("*, ecosystem_sandbox_scenarios(scenario_name, capability_name)").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50);
        result = { runs: runs || [] };
        break;
      }

      case "simulate_policy_conflicts": {
        const { data: conflicts } = await supabase.from("ecosystem_policy_conflict_events").select("*, ecosystem_sandbox_scenarios(scenario_name)").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
        result = { total: (conflicts || []).length, conflicts: conflicts || [] };
        break;
      }

      case "simulate_trust_failures": {
        const { data: participants } = await supabase.from("ecosystem_simulation_participants").select("*, ecosystem_sandbox_scenarios(scenario_name)").eq("organization_id", organization_id);
        result = { participants: participants || [] };
        break;
      }

      case "estimate_blast_radius": {
        const { data: estimates } = await supabase.from("ecosystem_blast_radius_estimates").select("*, ecosystem_sandbox_scenarios(scenario_name)").eq("organization_id", organization_id);
        result = { estimates: estimates || [] };
        break;
      }

      case "evaluate_activation_readiness": {
        const { data: scenarios } = await supabase.from("ecosystem_sandbox_scenarios").select("*").eq("organization_id", organization_id);
        const ready = (scenarios || []).filter((s: any) => s.activation_readiness_signal === 'simulation_ready');
        const conditional = (scenarios || []).filter((s: any) => s.activation_readiness_signal === 'conditional');
        result = { total: (scenarios || []).length, simulation_ready: ready.length, conditional: conditional.length, not_ready: (scenarios || []).length - ready.length - conditional.length };
        break;
      }

      case "simulation_outcomes": {
        const { data: outcomes } = await supabase.from("ecosystem_simulation_outcomes").select("*, ecosystem_sandbox_scenarios(scenario_name)").eq("organization_id", organization_id);
        result = { outcomes: outcomes || [] };
        break;
      }

      case "explain": {
        result = {
          explanation: "Ecosystem Simulation & Sandbox is a governed, advisory-first environment that simulates future ecosystem interactions without activating live participation.",
          scenario_statuses: ["draft", "ready", "running", "completed", "failed", "archived"],
          recommendation_types: ["simulate_more", "delay", "restrict", "reject_path", "future_pilot_candidate"],
          safety_constraints: ["Simulation-only", "No live ecosystem activation", "Advisory-first", "Tenant isolation via RLS"],
        };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true, data: result }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
