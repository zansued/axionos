import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveActiveConstitution, extractHorizonSettings } from "../_shared/continuity-simulation/simulation-constitution-resolver.ts";
import { computeScenarioSeverity, modelDisruptionPathway } from "../_shared/continuity-simulation/scenario-modeler.ts";
import { simulateFutureState } from "../_shared/continuity-simulation/future-state-simulator.ts";
import { assessIdentityPreservation } from "../_shared/continuity-simulation/identity-preservation-assessor.ts";
import { detectStressPoints } from "../_shared/continuity-simulation/stress-pathway-detector.ts";
import { generateRecommendations } from "../_shared/continuity-simulation/simulation-recommendation-engine.ts";
import { explainSimulation } from "../_shared/continuity-simulation/simulation-explainer.ts";
import { extractMissionSignals } from "../_shared/block-w-integration/cross-sprint-signals.ts";

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

      /* ── run_simulation: wire all shared modules ── */
      case "run_simulation": {
        // 1. Fetch constitutions, scenarios, subjects
        const [{ data: constitutions }, { data: scenarios }, { data: subjects }] = await Promise.all([
          supabase.from("continuity_simulation_constitutions").select("*").eq("organization_id", organization_id),
          supabase.from("simulation_scenarios").select("*").eq("organization_id", organization_id).eq("active", true),
          supabase.from("simulation_subjects").select("*").eq("organization_id", organization_id).eq("active", true),
        ]);

        const activeConstitution = resolveActiveConstitution(constitutions || []);
        const horizonSettings = activeConstitution ? extractHorizonSettings(activeConstitution) : {};
        const activeScenarios = scenarios || [];
        const activeSubjects = subjects || [];

        if (activeScenarios.length === 0 || activeSubjects.length === 0) {
          result = { runs: [], stress_points: [], recommendations: [], snapshots: [], explanation: "No active scenarios or subjects to simulate." };
          break;
        }

        // 2. Cleanup stale data
        await Promise.all([
          supabase.from("scenario_simulation_runs").delete().eq("organization_id", organization_id),
          supabase.from("simulation_stress_points").delete().eq("organization_id", organization_id),
          supabase.from("simulation_recommendations").delete().eq("organization_id", organization_id),
          supabase.from("future_continuity_snapshots").delete().eq("organization_id", organization_id),
        ]);

        const allRuns: any[] = [];
        const allStress: any[] = [];
        const allRecs: any[] = [];
        const allSnapshots: any[] = [];
        const allExplanations: any[] = [];

        // 3. For each scenario × subject pair, run full simulation
        for (const scenario of activeScenarios) {
          const severity = computeScenarioSeverity(scenario as any);
          const pathway = modelDisruptionPathway(scenario as any);

          for (const subject of activeSubjects) {
            // Heuristic: derive resilience/identity from subject type
            const subjectResilience = subject.subject_type === "institution" ? 0.7
              : subject.subject_type === "service" ? 0.5
              : subject.subject_type === "portfolio" ? 0.6
              : 0.55;
            const missionAlignment = subject.summary?.length > 50 ? 0.7 : 0.5;

            // a) Future state simulation
            const simResult = simulateFutureState({
              scenario_severity: severity,
              subject_resilience: subjectResilience,
              identity_strength: missionAlignment,
            });

            // b) Identity preservation
            const identityAssessment = assessIdentityPreservation(severity, subject.subject_type, missionAlignment);

            // c) Stress pathway detection
            const stressPoints = detectStressPoints(scenario.scenario_type, severity, subject.subject_type);

            // d) Recommendations
            const recs = generateRecommendations(
              simResult.survivability_score,
              simResult.identity_preservation_score,
              simResult.continuity_stress_score,
              scenario.scenario_type,
            );

            // e) Explanation
            const explanation = explainSimulation(
              simResult.survivability_score,
              simResult.identity_preservation_score,
              simResult.continuity_stress_score,
              simResult.viability_score,
              scenario.scenario_type,
              subject.title,
            );

            // Insert run
            const { data: runData } = await supabase.from("scenario_simulation_runs").insert({
              organization_id,
              scenario_id: scenario.id,
              subject_id: subject.id,
              constitution_id: activeConstitution?.id || null,
              viability_score: simResult.viability_score,
              continuity_stress_score: simResult.continuity_stress_score,
              identity_preservation_score: simResult.identity_preservation_score,
              survivability_score: simResult.survivability_score,
              simulation_summary: simResult.simulation_summary,
            }).select().single();

            const runId = runData?.id;

            // Insert stress points
            for (const sp of stressPoints) {
              const { data: spData } = await supabase.from("simulation_stress_points").insert({
                organization_id,
                simulation_run_id: runId,
                stress_type: sp.stress_type,
                severity: sp.severity,
                stress_summary: sp.stress_summary,
                payload: sp.payload,
              }).select().single();
              if (spData) allStress.push(spData);
            }

            // Insert recommendations
            for (const rec of recs) {
              const { data: recData } = await supabase.from("simulation_recommendations").insert({
                organization_id,
                simulation_run_id: runId,
                recommendation_type: rec.recommendation_type,
                recommendation_summary: rec.recommendation_summary,
                mitigation_priority: rec.mitigation_priority,
                rationale: rec.rationale,
              }).select().single();
              if (recData) allRecs.push(recData);
            }

            // Insert future snapshot
            const { data: snapData } = await supabase.from("future_continuity_snapshots").insert({
              organization_id,
              scenario_id: scenario.id,
              subject_id: subject.id,
              future_state_type: simResult.future_state_type,
              continuity_score: simResult.survivability_score,
              snapshot_summary: simResult.simulation_summary,
            }).select().single();
            if (snapData) allSnapshots.push(snapData);

            allRuns.push({
              ...(runData || {}),
              scenario_name: scenario.scenario_name,
              scenario_type: scenario.scenario_type,
              subject_title: subject.title,
              subject_type: subject.subject_type,
              identity_assessment: identityAssessment,
              disruption_pathway: pathway,
              explanation,
            });

            allExplanations.push({
              scenario: scenario.scenario_name,
              subject: subject.title,
              ...explanation,
            });
          }
        }

        result = {
          runs: allRuns,
          stress_points: allStress,
          recommendations: allRecs,
          snapshots: allSnapshots,
          explanations: allExplanations,
          constitution: activeConstitution ? { id: activeConstitution.id, name: activeConstitution.constitution_name } : null,
          horizon_settings: horizonSettings,
        };
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
        // Reconstruct explanations from persisted runs
        const { data: runs } = await supabase.from("scenario_simulation_runs")
          .select("*, simulation_scenarios(scenario_name, scenario_type), simulation_subjects(title, subject_type)")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false }).limit(50);

        const explanations = (runs || []).map((r: any) => {
          const exp = explainSimulation(
            Number(r.survivability_score),
            Number(r.identity_preservation_score),
            Number(r.continuity_stress_score),
            Number(r.viability_score),
            r.simulation_scenarios?.scenario_type || "unknown",
            r.simulation_subjects?.title || "Unknown",
          );
          return {
            run_id: r.id,
            scenario: r.simulation_scenarios?.scenario_name,
            subject: r.simulation_subjects?.title,
            ...exp,
          };
        });

        result = {
          explanations,
          governance_principles: ["Advisory-first", "Inspectable scenarios", "Multiple futures modeled", "Identity preservation distinct from survival", "Tenant isolation via RLS"],
          scenario_types: ["regulatory_shift", "political_shift", "technological_disruption", "budget_collapse", "talent_loss", "trust_erosion", "dependency_failure", "mission_drift_compound"],
          future_states: ["stable", "strained", "degraded", "fragmented", "collapsed", "adaptive_recovery"],
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
