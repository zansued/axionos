// Cross-Stage Learning Engine — AxionOS Sprint 26
// Edge function for cross-stage learning APIs.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, supabaseKey);

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, organization_id } = body;

    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: unknown;

    switch (action) {
      case "learning_v2_overview": {
        const [edges, policies, outcomes] = await Promise.all([
          serviceClient.from("cross_stage_learning_edges").select("*").eq("organization_id", organization_id),
          serviceClient.from("cross_stage_policy_profiles").select("*").eq("organization_id", organization_id),
          serviceClient.from("cross_stage_policy_outcomes").select("*").eq("organization_id", organization_id),
        ]);
        result = {
          total_edges: edges.data?.length || 0,
          active_edges: edges.data?.filter((e: any) => e.status === "active").length || 0,
          total_policies: policies.data?.length || 0,
          active_policies: policies.data?.filter((p: any) => p.status === "active").length || 0,
          draft_policies: policies.data?.filter((p: any) => p.status === "draft").length || 0,
          watch_policies: policies.data?.filter((p: any) => p.status === "watch").length || 0,
          total_outcomes: outcomes.data?.length || 0,
          helpful_outcomes: outcomes.data?.filter((o: any) => o.observed_outcome === "helpful").length || 0,
          harmful_outcomes: outcomes.data?.filter((o: any) => o.observed_outcome === "harmful").length || 0,
        };
        break;
      }

      case "cross_stage_learning_edges": {
        const { data } = await serviceClient
          .from("cross_stage_learning_edges")
          .select("*")
          .eq("organization_id", organization_id)
          .order("confidence_score", { ascending: false })
          .limit(100);
        result = { edges: data || [] };
        break;
      }

      case "cross_stage_policy_profiles": {
        const { data } = await serviceClient
          .from("cross_stage_policy_profiles")
          .select("*")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false })
          .limit(100);
        result = { policies: data || [] };
        break;
      }

      case "cross_stage_policy_outcomes": {
        const { data } = await serviceClient
          .from("cross_stage_policy_outcomes")
          .select("*, cross_stage_policy_profiles(policy_type, affected_stages, status)")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false })
          .limit(100);
        result = { outcomes: data || [] };
        break;
      }

      case "activate_cross_stage_policy": {
        const { policy_id } = body;
        const { error } = await serviceClient
          .from("cross_stage_policy_profiles")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("id", policy_id)
          .eq("organization_id", organization_id);
        if (error) throw error;
        result = { success: true, status: "active" };
        break;
      }

      case "deprecate_cross_stage_policy": {
        const { policy_id } = body;
        const { error } = await serviceClient
          .from("cross_stage_policy_profiles")
          .update({ status: "deprecated", updated_at: new Date().toISOString() })
          .eq("id", policy_id)
          .eq("organization_id", organization_id);
        if (error) throw error;
        result = { success: true, status: "deprecated" };
        break;
      }

      case "mark_cross_stage_policy_outcome": {
        const { policy_id, observed_outcome, baseline_metrics, policy_metrics, downstream_impact, pipeline_job_id } = body;
        const { error } = await serviceClient
          .from("cross_stage_policy_outcomes")
          .insert({
            organization_id,
            policy_id,
            observed_outcome: observed_outcome || "pending",
            baseline_metrics: baseline_metrics || {},
            policy_metrics: policy_metrics || {},
            downstream_impact: downstream_impact || {},
            pipeline_job_id: pipeline_job_id || null,
          });
        if (error) throw error;
        result = { success: true };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
