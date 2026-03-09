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

    const { data: _member } = await supabase.from("organization_members").select("role").eq("organization_id", organization_id).eq("user_id", user.id).single();
    if (!_member) return new Response(JSON.stringify({ error: "Not a member of this organization" }), { status: 403, headers: corsHeaders });

    let result: unknown;

    switch (action) {
      case "overview": {
        const [{ data: constitutions }, { data: scenarios }, { data: subjects }, { data: runs }, { data: stressPoints }, { data: recs }, { data: snapshots }] = await Promise.all([
          supabase.from("continuity_simulation_constitutions").select("*").eq("organization_id", organization_id),
          supabase.from("simulation_scenarios").select("*").eq("organization_id", organization_id),
          supabase.from("simulation_subjects").select("*").eq("organization_id", organization_id),
          supabase.from("scenario_simulation_runs").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("simulation_stress_points").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("simulation_recommendations").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("future_continuity_snapshots").select("*").eq("organization_id", organization_id).limit(100),
        ]);

        const allRuns = runs || [];
        const avgSurvivability = allRuns.length > 0
          ? allRuns.reduce((s: number, r: any) => s + Number(r.survivability_score || 0), 0) / allRuns.length
          : 0;

        result = {
          total_constitutions: (constitutions || []).length,
          total_scenarios: (scenarios || []).length,
          total_subjects: (subjects || []).length,
          total_runs: allRuns.length,
          total_stress_points: (stressPoints || []).length,
          total_recommendations: (recs || []).length,
          total_snapshots: (snapshots || []).length,
          avg_survivability: Math.round(avgSurvivability * 1000) / 1000,
          governance_mode: "advisory_first",
          simulation_mode: "long_horizon_continuity",
        };
        break;
      }

      case "constitutions": {
        const { data } = await supabase.from("continuity_simulation_constitutions").select("*").eq("organization_id", organization_id);
        result = { constitutions: data || [] };
        break;
      }

      case "scenarios": {
        const { data } = await supabase.from("simulation_scenarios").select("*").eq("organization_id", organization_id);
        result = { scenarios: data || [] };
        break;
      }

      case "subjects": {
        const { data } = await supabase.from("simulation_subjects").select("*").eq("organization_id", organization_id);
        result = { subjects: data || [] };
        break;
      }

      case "simulate": {
        const { data: runs } = await supabase.from("scenario_simulation_runs")
          .select("*, simulation_scenarios(scenario_name, scenario_type), simulation_subjects(title, subject_type)")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false }).limit(50);
        result = { runs: runs || [] };
        break;
      }

      case "stress_points": {
        const { data } = await supabase.from("simulation_stress_points")
          .select("*, scenario_simulation_runs(simulation_summary)")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false }).limit(100);
        result = { stress_points: data || [] };
        break;
      }

      case "recommendations": {
        const { data } = await supabase.from("simulation_recommendations")
          .select("*, scenario_simulation_runs(simulation_summary)")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false }).limit(100);
        result = { recommendations: data || [] };
        break;
      }

      case "snapshots": {
        const { data } = await supabase.from("future_continuity_snapshots")
          .select("*, simulation_scenarios(scenario_name), simulation_subjects(title)")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false }).limit(100);
        result = { snapshots: data || [] };
        break;
      }

      case "explain": {
        result = {
          explanation: "Civilizational Continuity Simulation models long-horizon disruption scenarios to evaluate institutional survivability, identity preservation, and future-state resilience.",
          scenario_types: ["regulatory_shift", "political_shift", "technological_disruption", "budget_collapse", "talent_loss", "trust_erosion", "dependency_failure", "mission_drift_compound"],
          future_states: ["stable", "strained", "degraded", "fragmented", "collapsed", "adaptive_recovery"],
          governance_principles: ["Advisory-first", "Inspectable scenarios", "Multiple futures modeled", "Identity preservation distinct from survival", "Tenant isolation via RLS"],
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
