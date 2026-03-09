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
        const [{ data: programs }, { data: caps }, { data: parts }, { data: interactions }, { data: policyEvents }, { data: outcomes }] = await Promise.all([
          supabase.from("marketplace_pilot_programs").select("*").eq("organization_id", organization_id).limit(50),
          supabase.from("marketplace_pilot_capabilities").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("marketplace_pilot_participants").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("marketplace_pilot_interactions").select("*").eq("organization_id", organization_id).limit(500),
          supabase.from("marketplace_pilot_policy_events").select("*").eq("organization_id", organization_id).limit(500),
          supabase.from("marketplace_pilot_outcomes").select("*").eq("organization_id", organization_id).limit(100),
        ]);

        const allEvents = policyEvents || [];
        const violations = allEvents.filter((e: any) => e.policy_result === 'fail').length;
        const activeCaps = (caps || []).filter((c: any) => c.pilot_capability_status === 'active').length;
        const activeParts = (parts || []).filter((p: any) => p.participant_status === 'active').length;

        result = {
          total_programs: (programs || []).length,
          active_programs: (programs || []).filter((p: any) => p.pilot_activation_status === 'active').length,
          total_capabilities: (caps || []).length,
          active_capabilities: activeCaps,
          total_participants: (parts || []).length,
          active_participants: activeParts,
          total_interactions: (interactions || []).length,
          total_policy_events: allEvents.length,
          policy_violations: violations,
          total_outcomes: (outcomes || []).length,
          ecosystem_mode: "bounded_pilot_only",
          governance_mode: "governance_first",
          programs_by_status: (programs || []).reduce((acc: Record<string, number>, p: any) => { acc[p.pilot_activation_status] = (acc[p.pilot_activation_status] || 0) + 1; return acc; }, {}),
        };
        break;
      }

      case "select_capabilities": {
        const { data: caps } = await supabase.from("marketplace_pilot_capabilities").select("*, marketplace_pilot_programs(pilot_program_name)").eq("organization_id", organization_id);
        result = { total: (caps || []).length, capabilities: caps || [] };
        break;
      }

      case "gate_participants": {
        const { data: parts } = await supabase.from("marketplace_pilot_participants").select("*, marketplace_pilot_programs(pilot_program_name), external_actor_registry(external_actor_name, external_actor_type)").eq("organization_id", organization_id);
        result = { total: (parts || []).length, participants: parts || [] };
        break;
      }

      case "monitor_interactions": {
        const { data: interactions } = await supabase.from("marketplace_pilot_interactions").select("*, marketplace_pilot_capabilities(capability_name), marketplace_pilot_participants(participant_name)").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
        const anomalies = (interactions || []).filter((i: any) => Array.isArray(i.anomaly_flags) && i.anomaly_flags.length > 0);
        result = { total: (interactions || []).length, anomaly_count: anomalies.length, interactions: interactions || [] };
        break;
      }

      case "evaluate_policy_events": {
        const { data: events } = await supabase.from("marketplace_pilot_policy_events").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(200);
        const allEvents = events || [];
        const pass = allEvents.filter((e: any) => e.policy_result === 'pass').length;
        const warn = allEvents.filter((e: any) => e.policy_result === 'warn').length;
        const fail = allEvents.filter((e: any) => e.policy_result === 'fail').length;
        result = { total: allEvents.length, pass, warn, fail, violation_rate: allEvents.length > 0 ? Math.round((fail / allEvents.length) * 10000) / 10000 : 0, events: allEvents };
        break;
      }

      case "pilot_outcomes": {
        const { data: outcomes } = await supabase.from("marketplace_pilot_outcomes").select("*, marketplace_pilot_programs(pilot_program_name)").eq("organization_id", organization_id);
        result = { outcomes: outcomes || [] };
        break;
      }

      case "create_pilot_program": {
        const { data: programs } = await supabase.from("marketplace_pilot_programs").select("*").eq("organization_id", organization_id);
        result = { programs: programs || [] };
        break;
      }

      case "explain": {
        result = {
          explanation: "Limited Marketplace Pilot is a bounded, governed pilot-only environment. No general marketplace activation occurs. All participation requires prior readiness, governance, trust, and sandbox prerequisites.",
          pilot_statuses: ["draft", "approved", "active", "paused", "completed", "rolled_back", "archived"],
          safety_constraints: [
            "Bounded pilot-only — no general marketplace",
            "No unrestricted external participation",
            "No autonomous participant approval",
            "No autonomous capability expansion",
            "Rollback paths required before activation",
            "Human review required for scope changes",
          ],
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
