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
        const [{ data: entries }, { data: versions }, { data: visibility }, { data: bindings }, { data: compat }, { data: outcomes }] = await Promise.all([
          supabase.from("capability_registry_entries").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("capability_registry_versions").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("capability_registry_visibility_rules").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("capability_registry_policy_bindings").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("capability_registry_compatibility_rules").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("capability_registry_governance_outcomes").select("*").eq("organization_id", organization_id).limit(100),
        ]);

        const all = entries || [];
        const byLifecycle = all.reduce((acc: Record<string, number>, e: any) => { acc[e.lifecycle_state] = (acc[e.lifecycle_state] || 0) + 1; return acc; }, {});
        const byStatus = all.reduce((acc: Record<string, number>, e: any) => { acc[e.registry_status] = (acc[e.registry_status] || 0) + 1; return acc; }, {});

        result = {
          total_entries: all.length,
          entries_by_lifecycle: byLifecycle,
          entries_by_status: byStatus,
          total_versions: (versions || []).length,
          total_visibility_rules: (visibility || []).length,
          total_policy_bindings: (bindings || []).length,
          total_compatibility_rules: (compat || []).length,
          total_outcomes: (outcomes || []).length,
          governance_mode: "registry_bounded",
        };
        break;
      }

      case "register_capabilities": {
        const { data: entries } = await supabase.from("capability_registry_entries").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
        result = { entries: entries || [] };
        break;
      }

      case "govern_versions": {
        const { data: versions } = await supabase.from("capability_registry_versions").select("*, capability_registry_entries(capability_name)").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
        result = { versions: versions || [] };
        break;
      }

      case "evaluate_visibility": {
        const { data: rules } = await supabase.from("capability_registry_visibility_rules").select("*, capability_registry_entries(capability_name)").eq("organization_id", organization_id).limit(100);
        result = { visibility_rules: rules || [] };
        break;
      }

      case "bind_policies": {
        const { data: bindings } = await supabase.from("capability_registry_policy_bindings").select("*, capability_registry_entries(capability_name)").eq("organization_id", organization_id).limit(100);
        result = { policy_bindings: bindings || [] };
        break;
      }

      case "analyze_compatibility": {
        const { data: rules } = await supabase.from("capability_registry_compatibility_rules").select("*, capability_registry_entries(capability_name)").eq("organization_id", organization_id).limit(100);
        result = { compatibility_rules: rules || [] };
        break;
      }

      case "review_queue": {
        const { data: entries } = await supabase.from("capability_registry_entries").select("*").eq("organization_id", organization_id).in("registry_status", ["proposed", "under_review"]).limit(50);
        result = { review_queue: entries || [] };
        break;
      }

      case "registry_outcomes": {
        const { data: outcomes } = await supabase.from("capability_registry_governance_outcomes").select("*, capability_registry_entries(capability_name)").eq("organization_id", organization_id).limit(100);
        result = { outcomes: outcomes || [] };
        break;
      }

      case "explain": {
        result = {
          explanation: "Capability Registry Governance manages lifecycle, visibility, versioning, policy binding, and compatibility. Registry presence does not imply broad availability.",
          lifecycle_states: ["proposed", "registered", "pilot_only", "restricted", "deprecated", "hidden", "future_candidate", "archived"],
          safety_constraints: ["Registry-bounded", "No autonomous publication", "No autonomous visibility expansion", "Tenant isolation via RLS"],
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
