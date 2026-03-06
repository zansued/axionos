import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";
import {
  computeOutcomeStatus,
  type InitiativeObservability,
} from "../_shared/contracts/initiative-observability.schema.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceKey);

    const { initiative_id } = await req.json();
    if (!initiative_id) {
      return new Response(JSON.stringify({ error: "initiative_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch initiative
    const { data: initiative, error: initErr } = await serviceClient
      .from("initiatives")
      .select("*")
      .eq("id", initiative_id)
      .single();

    if (initErr || !initiative) {
      return new Response(JSON.stringify({ error: "Initiative not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all jobs for this initiative
    const { data: jobs } = await serviceClient
      .from("initiative_jobs")
      .select("stage, status, cost_usd, duration_ms, created_at, completed_at, error")
      .eq("initiative_id", initiative_id)
      .order("created_at", { ascending: true });

    const allJobs = jobs || [];

    // Fetch outputs for cost/token tracking
    const { data: outputs } = await serviceClient
      .from("agent_outputs")
      .select("id, cost_estimate, tokens_used, model_used, status")
      .eq("initiative_id", initiative_id);

    const allOutputs = outputs || [];

    // Fetch errors for repair metrics
    const { data: errors } = await serviceClient
      .from("project_errors")
      .select("id, fixed, error_type")
      .eq("initiative_id", initiative_id);

    const allErrors = errors || [];

    // ══════════════════════════════════════════
    // METRIC CALCULATIONS
    // ══════════════════════════════════════════

    // pipeline_success_rate: ratio of successful jobs over total jobs
    const totalJobs = allJobs.length;
    const successJobs = allJobs.filter((j) => j.status === "success").length;
    const pipeline_success_rate = totalJobs > 0 ? Math.round((successJobs / totalJobs) * 100) : 0;

    // build_success_rate: based on validation/build jobs
    const buildStages = ["validation", "runtime_validation", "deep_validation", "preventive_validation"];
    const buildJobs = allJobs.filter((j) => buildStages.includes(j.stage));
    const buildSuccess = buildJobs.filter((j) => j.status === "success").length;
    const build_success_rate = buildJobs.length > 0 ? Math.round((buildSuccess / buildJobs.length) * 100) : 0;

    // deploy_success_rate: binary based on deploy_status
    const deploy_success_rate = initiative.deploy_status === "deployed" && initiative.deploy_url ? 100 : 0;

    // time_idea_to_repo_seconds: creation → published stage
    const publishJob = allJobs.find((j) => j.stage === "publish" && j.status === "success");
    const createdAt = new Date(initiative.created_at).getTime();
    const time_idea_to_repo_seconds = publishJob?.completed_at
      ? Math.round((new Date(publishJob.completed_at).getTime() - createdAt) / 1000)
      : null;

    // time_idea_to_deploy_seconds: creation → deployed_at
    const time_idea_to_deploy_seconds = initiative.deployed_at
      ? Math.round((new Date(initiative.deployed_at).getTime() - createdAt) / 1000)
      : null;

    // cost_per_initiative_usd: sum of all job costs + output costs
    const jobCost = allJobs.reduce((s, j) => s + (Number(j.cost_usd) || 0), 0);
    const outputCost = allOutputs.reduce((s, o) => s + (Number(o.cost_estimate) || 0), 0);
    const cost_per_initiative_usd = jobCost + outputCost;

    // tokens_total
    const tokens_total = allOutputs.reduce((s, o) => s + (o.tokens_used || 0), 0);

    // models_used
    const modelsSet = new Set<string>();
    allOutputs.forEach((o) => { if (o.model_used) modelsSet.add(o.model_used); });
    allJobs.forEach((j: any) => { if (j.model) modelsSet.add(j.model); });
    const models_used = Array.from(modelsSet);

    // average_retries_per_initiative: rework/reject/repair jobs
    const retryStages = ["rework", "reject", "build_repair", "build-self-healing", "autonomous-build-repair"];
    const retryJobs = allJobs.filter((j) => retryStages.includes(j.stage));
    const average_retries_per_initiative = retryJobs.length;

    // automatic_repair_success_rate
    const repairJobs = allJobs.filter((j) =>
      ["build_repair", "build-self-healing", "autonomous-build-repair"].includes(j.stage)
    );
    const repairSuccess = repairJobs.filter((j) => j.status === "success").length;
    const automatic_repair_success_rate = repairJobs.length > 0
      ? Math.round((repairSuccess / repairJobs.length) * 100)
      : 0;

    // stage_failure_distribution
    const stage_failure_distribution: Record<string, number> = {};
    allJobs.filter((j) => j.status === "failed").forEach((j) => {
      stage_failure_distribution[j.stage] = (stage_failure_distribution[j.stage] || 0) + 1;
    });

    // stage_durations (total ms per stage)
    const stage_durations: Record<string, number> = {};
    allJobs.forEach((j) => {
      if (j.duration_ms) {
        stage_durations[j.stage] = (stage_durations[j.stage] || 0) + j.duration_ms;
      }
    });

    // stage_costs (total USD per stage)
    const stage_costs: Record<string, number> = {};
    allJobs.forEach((j) => {
      stage_costs[j.stage] = (stage_costs[j.stage] || 0) + (Number(j.cost_usd) || 0);
    });

    // outcome status
    const initiative_outcome_status = computeOutcomeStatus(
      initiative.stage_status,
      initiative.deploy_status,
      initiative.deploy_url,
      allOutputs.length > 0,
    );

    const observability: InitiativeObservability = {
      initiative_id,
      organization_id: initiative.organization_id,
      pipeline_success_rate,
      build_success_rate,
      deploy_success_rate,
      time_idea_to_repo_seconds,
      time_idea_to_deploy_seconds,
      cost_per_initiative_usd,
      tokens_total,
      models_used,
      average_retries_per_initiative,
      automatic_repair_success_rate,
      stage_failure_distribution,
      stage_durations,
      stage_costs,
      initiative_outcome_status,
      computed_at: new Date().toISOString(),
    };

    // Persist to initiative_observability table (upsert)
    await serviceClient.from("initiative_observability").upsert(
      {
        initiative_id,
        organization_id: initiative.organization_id,
        pipeline_success_rate,
        build_success_rate,
        deploy_success_rate,
        time_idea_to_repo_seconds,
        time_idea_to_deploy_seconds,
        cost_per_initiative_usd,
        tokens_total,
        average_retries: average_retries_per_initiative,
        automatic_repair_success_rate,
        initiative_outcome_status,
        stage_failure_distribution,
        stage_durations,
        stage_costs,
        models_used,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "initiative_id" },
    );

    return new Response(JSON.stringify(observability), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Initiative observability error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
