import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const sKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const uc = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: ae } = await uc.auth.getUser();
    if (ae || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { action, organization_id, ...params } = await req.json();
    if (!organization_id) return new Response(JSON.stringify({ error: "organization_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const sc = createClient(url, sKey);
    const { data: mem } = await sc.from("organization_members").select("role").eq("organization_id", organization_id).eq("user_id", user.id).single();
    if (!mem) return new Response(JSON.stringify({ error: "Not a member" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let result: unknown;

    switch (action) {
      case "overview": {
        const [cRes, rRes, pRes, spRes, aRes, tRes] = await Promise.all([
          sc.from("succession_constitutions").select("*", { count: "exact", head: true }).eq("organization_id", organization_id),
          sc.from("critical_roles").select("*", { count: "exact", head: true }).eq("organization_id", organization_id),
          sc.from("role_continuity_profiles").select("*", { count: "exact", head: true }).eq("organization_id", organization_id),
          sc.from("succession_plans").select("*", { count: "exact", head: true }).eq("organization_id", organization_id).eq("status", "active"),
          sc.from("succession_assessments").select("*", { count: "exact", head: true }).eq("organization_id", organization_id),
          sc.from("continuity_transition_events").select("*", { count: "exact", head: true }).eq("organization_id", organization_id).is("resolved_at", null),
        ]);
        // Snapshot: roles without backup
        const { data: profiles } = await sc.from("role_continuity_profiles").select("backup_exists,knowledge_concentration_score,succession_readiness_level").eq("organization_id", organization_id);
        const noBackup = (profiles ?? []).filter((p: any) => !p.backup_exists).length;
        const highConcentration = (profiles ?? []).filter((p: any) => (p.knowledge_concentration_score ?? 0) > 0.7).length;
        result = {
          constitutions: cRes.count ?? 0,
          critical_roles: rRes.count ?? 0,
          continuity_profiles: pRes.count ?? 0,
          active_plans: spRes.count ?? 0,
          assessments: aRes.count ?? 0,
          open_transitions: tRes.count ?? 0,
          roles_without_backup: noBackup,
          high_knowledge_concentration: highConcentration,
        };
        break;
      }
      case "constitutions": {
        const { data } = await sc.from("succession_constitutions").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
        result = data ?? [];
        break;
      }
      case "critical_roles": {
        const { data } = await sc.from("critical_roles").select("*").eq("organization_id", organization_id).order("criticality_level").limit(200);
        result = data ?? [];
        break;
      }
      case "continuity_profiles": {
        const { data } = await sc.from("role_continuity_profiles").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(200);
        result = data ?? [];
        break;
      }
      case "succession_plans": {
        const { data } = await sc.from("succession_plans").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
        result = data ?? [];
        break;
      }
      case "assessments": {
        const { data } = await sc.from("succession_assessments").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50);
        result = data ?? [];
        break;
      }
      case "transition_events": {
        const { data } = await sc.from("continuity_transition_events").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
        result = data ?? [];
        break;
      }
      case "recommendations": {
        const { data: profiles } = await sc.from("role_continuity_profiles").select("backup_exists,knowledge_concentration_score,handoff_maturity_score,succession_readiness_level").eq("organization_id", organization_id);
        const recs: string[] = [];
        const all = profiles ?? [];
        const noBackup = all.filter((p: any) => !p.backup_exists);
        if (noBackup.length > 0) recs.push(`${noBackup.length} critical roles without designated backup.`);
        const highConc = all.filter((p: any) => (p.knowledge_concentration_score ?? 0) > 0.7);
        if (highConc.length > 0) recs.push(`${highConc.length} roles with dangerous knowledge concentration.`);
        const lowHandoff = all.filter((p: any) => (p.handoff_maturity_score ?? 0) < 0.3);
        if (lowHandoff.length > 0) recs.push(`${lowHandoff.length} roles with weak handoff maturity.`);
        const { count: openTransitions } = await sc.from("continuity_transition_events").select("*", { count: "exact", head: true }).eq("organization_id", organization_id).is("resolved_at", null);
        if ((openTransitions ?? 0) > 0) recs.push(`${openTransitions} unresolved transition events.`);
        if (recs.length === 0) recs.push("Succession posture is healthy.");
        result = { recommendations: recs };
        break;
      }
      case "explain": {
        const { role_id } = params;
        const { data: role } = await sc.from("critical_roles").select("*").eq("id", role_id).single();
        if (!role) { result = { error: "Role not found" }; break; }
        const { data: profile } = await sc.from("role_continuity_profiles").select("*").eq("role_id", role_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
        const { data: plans } = await sc.from("succession_plans").select("status,succession_type").eq("role_id", role_id);
        result = {
          role: role.role_name,
          domain: role.domain,
          criticality: role.criticality_level,
          continuity_tier: role.continuity_tier,
          backup_exists: profile?.backup_exists ?? false,
          knowledge_concentration: profile?.knowledge_concentration_score ?? 0,
          handoff_maturity: profile?.handoff_maturity_score ?? 0,
          readiness: profile?.succession_readiness_level ?? "unknown",
          plans: (plans ?? []).length,
          active_plan: (plans ?? []).some((p: any) => p.status === "active"),
        };
        break;
      }
      default:
        result = { error: `Unknown action: ${action}` };
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
