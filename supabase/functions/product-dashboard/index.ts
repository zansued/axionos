import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { calculateBilling } from "../_shared/billing-calculator.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth check
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const serviceClient = createClient(supabaseUrl, serviceKey);

    const { action, organization_id } = await req.json();
    if (!organization_id) throw new Error("organization_id required");

    // Verify membership
    const { data: isMember } = await serviceClient.rpc("is_org_member", {
      _user_id: user.id,
      _org_id: organization_id,
    });
    if (!isMember) throw new Error("Not a member of this organization");

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    if (action === "overview") {
      const [initRes, jobsRes, obsRes, billingBreakdown] = await Promise.all([
        serviceClient
          .from("initiatives")
          .select("id, title, status, stage_status, deploy_url, deploy_status, created_at")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false })
          .limit(50),
        serviceClient
          .from("initiative_jobs")
          .select("id, stage, status, cost_usd, duration_ms, created_at")
          .gte("created_at", monthStart.toISOString()),
        serviceClient
          .from("initiative_observability")
          .select("*")
          .eq("organization_id", organization_id)
          .limit(50),
        calculateBilling(serviceClient, organization_id),
      ]);

      const initiatives = initRes.data ?? [];
      const jobs = jobsRes.data ?? [];
      const obs = obsRes.data ?? [];

      // Compute aggregate KPIs
      const totalInitiatives = initiatives.length;
      const deployed = initiatives.filter((i) => i.stage_status === "deployed").length;
      const completedJobs = jobs.filter((j) => j.status === "completed").length;
      const failedJobs = jobs.filter((j) => j.status === "failed").length;
      const pipelineSuccessRate = jobs.length > 0 ? (completedJobs / jobs.length) * 100 : 0;

      const avgRepairRate = obs.length > 0
        ? obs.reduce((s, o) => s + Number(o.automatic_repair_success_rate), 0) / obs.length
        : 0;

      const deploySuccessRate = obs.length > 0
        ? obs.reduce((s, o) => s + Number(o.deploy_success_rate), 0) / obs.length
        : 0;

      const avgTimeToDeploy = obs.filter((o) => o.time_idea_to_deploy_seconds).length > 0
        ? obs.reduce((s, o) => s + (o.time_idea_to_deploy_seconds ?? 0), 0) /
          obs.filter((o) => o.time_idea_to_deploy_seconds).length
        : null;

      return new Response(JSON.stringify({
        total_initiatives: totalInitiatives,
        deployed_count: deployed,
        pipeline_success_rate: Math.round(pipelineSuccessRate * 10) / 10,
        deploy_success_rate: Math.round(deploySuccessRate * 10) / 10,
        repair_success_rate: Math.round(avgRepairRate * 10) / 10,
        average_time_to_deploy_seconds: avgTimeToDeploy ? Math.round(avgTimeToDeploy) : null,
        monthly_cost: billingBreakdown.estimated_monthly_cost,
        tokens_used: billingBreakdown.total_tokens,
        total_runs: billingBreakdown.total_runs,
        total_deployments: billingBreakdown.total_deployments,
        total_repairs: billingBreakdown.total_repairs,
        cost_by_stage: billingBreakdown.cost_by_stage,
        recent_initiatives: initiatives.slice(0, 10),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "usage") {
      const breakdown = await calculateBilling(serviceClient, organization_id);

      // Get plan info
      const { data: billing } = await serviceClient
        .from("billing_accounts")
        .select("*, product_plans(*)")
        .eq("organization_id", organization_id)
        .maybeSingle();

      return new Response(JSON.stringify({
        ...breakdown,
        plan: billing?.product_plans ?? null,
        billing_status: billing?.billing_status ?? "no_plan",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
