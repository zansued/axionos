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
    if (!authHeader) throw new Error("Missing authorization");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { action, organization_id } = body;
    if (!organization_id) throw new Error("Missing organization_id");

    // Verify membership
    const { data: isMember } = await supabase.rpc("is_org_member", { _user_id: user.id, _org_id: organization_id });
    if (!isMember) throw new Error("Not a member of this organization");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    if (action === "overview") {
      const { data: campaigns } = await userClient
        .from("architecture_simulation_campaigns")
        .select("id, evaluation_status, uncertainty_posture")
        .eq("organization_id", organization_id);

      const all = campaigns || [];
      const total = all.length;
      const completed = all.filter((c: any) => c.evaluation_status === "completed").length;
      const inconclusive = all.filter((c: any) => c.evaluation_status === "inconclusive").length;
      const failed = all.filter((c: any) => c.evaluation_status === "failed").length;
      const running = all.filter((c: any) => c.evaluation_status === "running").length;
      const highUncertainty = all.filter((c: any) => c.uncertainty_posture === "very_high" || c.uncertainty_posture === "high").length;

      const { count: resultCount } = await userClient
        .from("architecture_simulation_results")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization_id);

      const { count: reviewCount } = await userClient
        .from("architecture_simulation_campaign_reviews")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization_id);

      return new Response(JSON.stringify({
        campaign_count: total, completed, inconclusive, failed, running,
        high_uncertainty: highUncertainty,
        result_count: resultCount || 0,
        review_count: reviewCount || 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "list_campaigns") {
      const { data: campaigns } = await userClient
        .from("architecture_simulation_campaigns")
        .select("*")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false })
        .limit(100);

      return new Response(JSON.stringify({ campaigns: campaigns || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "campaign_detail") {
      const { campaign_id } = body;
      if (!campaign_id) throw new Error("Missing campaign_id");

      const { data: campaign } = await userClient
        .from("architecture_simulation_campaigns")
        .select("*")
        .eq("id", campaign_id)
        .eq("organization_id", organization_id)
        .maybeSingle();

      const { data: results } = await userClient
        .from("architecture_simulation_results")
        .select("*")
        .eq("campaign_id", campaign_id)
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false });

      const { data: metrics } = await userClient
        .from("architecture_simulation_metrics")
        .select("*")
        .eq("campaign_id", campaign_id)
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false });

      const { data: reviews } = await userClient
        .from("architecture_simulation_campaign_reviews")
        .select("*")
        .eq("campaign_id", campaign_id)
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false });

      return new Response(JSON.stringify({
        campaign, results: results || [], metrics: metrics || [], reviews: reviews || [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "explain_simulation") {
      const { campaign_id } = body;
      if (!campaign_id) throw new Error("Missing campaign_id");

      const { data: campaign } = await userClient
        .from("architecture_simulation_campaigns")
        .select("*")
        .eq("id", campaign_id)
        .eq("organization_id", organization_id)
        .maybeSingle();

      if (!campaign) throw new Error("Campaign not found");

      const { data: metrics } = await userClient
        .from("architecture_simulation_metrics")
        .select("*")
        .eq("campaign_id", campaign_id)
        .eq("organization_id", organization_id);

      const allMetrics = metrics || [];
      const gains = allMetrics.filter((m: any) => m.delta_direction === "gain");
      const regressions = allMetrics.filter((m: any) => m.delta_direction === "regression");

      const explanation: any = {
        campaign_name: campaign.campaign_name,
        status: campaign.evaluation_status,
        uncertainty: campaign.uncertainty_posture,
        scenario_type: campaign.scenario_type,
        what_was_simulated: campaign.simulated_change_model,
        baseline_compared: campaign.baseline_reference,
        gains_observed: gains.map((g: any) => ({
          metric: g.metric_name, domain: g.metric_domain,
          delta: g.delta, significance: g.significance,
        })),
        regressions_observed: regressions.map((r: any) => ({
          metric: r.metric_name, domain: r.metric_domain,
          delta: r.delta, significance: r.significance,
        })),
        inconclusive_note: campaign.evaluation_status === "inconclusive"
          ? "This simulation did not produce conclusive results. Further evidence or refined scenarios may be needed."
          : null,
        governance_note: "This simulation is sandbox-bounded. No production architecture was or will be modified by this simulation.",
      };

      return new Response(JSON.stringify(explanation), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
