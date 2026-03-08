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
        const [{ data: roles }, { data: frames }, { data: entitlements }, { data: flows }, { data: conflicts }, { data: outcomes }] = await Promise.all([
          supabase.from("ecosystem_party_roles").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("multi_party_policy_frames").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("multi_party_entitlements").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("ecosystem_value_flow_rules").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("multi_party_policy_conflicts").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("multi_party_governance_outcomes").select("*").eq("organization_id", organization_id).limit(100),
        ]);

        const allFrames = frames || [];
        const byStatus = allFrames.reduce((acc: Record<string, number>, f: any) => { acc[f.status] = (acc[f.status] || 0) + 1; return acc; }, {});
        const openConflicts = (conflicts || []).filter((c: any) => c.resolution_status === 'open').length;

        result = {
          total_roles: (roles || []).length,
          total_frames: allFrames.length,
          frames_by_status: byStatus,
          total_entitlements: (entitlements || []).length,
          total_value_flows: (flows || []).length,
          total_conflicts: (conflicts || []).length,
          open_conflicts: openConflicts,
          total_outcomes: (outcomes || []).length,
          governance_mode: "policy_bounded",
        };
        break;
      }

      case "define_policy_frames": {
        const { data: frames } = await supabase.from("multi_party_policy_frames").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
        result = { frames: frames || [] };
        break;
      }

      case "evaluate_entitlements": {
        const { data: entitlements } = await supabase.from("multi_party_entitlements").select("*, multi_party_policy_frames(policy_frame_name)").eq("organization_id", organization_id).limit(100);
        result = { entitlements: entitlements || [] };
        break;
      }

      case "govern_value_flows": {
        const { data: flows } = await supabase.from("ecosystem_value_flow_rules").select("*, multi_party_policy_frames(policy_frame_name)").eq("organization_id", organization_id).limit(100);
        result = { value_flows: flows || [] };
        break;
      }

      case "detect_policy_conflicts": {
        const { data: conflicts } = await supabase.from("multi_party_policy_conflicts").select("*, multi_party_policy_frames(policy_frame_name)").eq("organization_id", organization_id).limit(100);
        result = { conflicts: conflicts || [] };
        break;
      }

      case "evaluate_settlement_readiness": {
        const { data: flows } = await supabase.from("ecosystem_value_flow_rules").select("*").eq("organization_id", organization_id).limit(100);
        result = { value_flows: flows || [] };
        break;
      }

      case "governance_outcomes": {
        const { data: outcomes } = await supabase.from("multi_party_governance_outcomes").select("*, multi_party_policy_frames(policy_frame_name)").eq("organization_id", organization_id).limit(100);
        result = { outcomes: outcomes || [] };
        break;
      }

      case "explain": {
        result = {
          explanation: "Multi-Party Policy & Revenue Governance manages interaction policies, entitlements, value flows, and conflict resolution. This is controlled activation, not unrestricted commerce.",
          party_roles: ["provider", "consumer", "operator", "host", "restricted_participant"],
          safety_constraints: ["Policy-bounded", "No autonomous agreement approval", "No autonomous value-flow expansion", "Tenant isolation via RLS"],
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
