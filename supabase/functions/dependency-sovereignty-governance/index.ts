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
        const [cRes, dRes, lRes, aRes, disRes, eRes] = await Promise.all([
          sc.from("dependency_sovereignty_constitutions").select("*", { count: "exact", head: true }).eq("organization_id", organization_id),
          sc.from("external_dependencies").select("*", { count: "exact", head: true }).eq("organization_id", organization_id),
          sc.from("dependency_reliance_links").select("*", { count: "exact", head: true }).eq("organization_id", organization_id),
          sc.from("dependency_sovereignty_assessments").select("*", { count: "exact", head: true }).eq("organization_id", organization_id),
          sc.from("dependency_disruption_events").select("*", { count: "exact", head: true }).eq("organization_id", organization_id).is("resolved_at", null),
          sc.from("dependency_exit_paths").select("*", { count: "exact", head: true }).eq("organization_id", organization_id).eq("active", true),
        ]);
        // Get sovereignty snapshot
        const { data: deps } = await sc.from("external_dependencies").select("criticality_level,lock_in_risk_level,fallback_exists").eq("organization_id", organization_id);
        const critical = (deps ?? []).filter((d: any) => d.criticality_level === "critical");
        const noFallback = critical.filter((d: any) => !d.fallback_exists);
        const highLockIn = (deps ?? []).filter((d: any) => d.lock_in_risk_level === "high" || d.lock_in_risk_level === "critical");
        result = {
          constitutions: cRes.count ?? 0,
          dependencies: dRes.count ?? 0,
          reliance_links: lRes.count ?? 0,
          assessments: aRes.count ?? 0,
          open_disruptions: disRes.count ?? 0,
          exit_paths: eRes.count ?? 0,
          critical_dependencies: critical.length,
          critical_without_fallback: noFallback.length,
          high_lock_in: highLockIn.length,
        };
        break;
      }
      case "constitutions": {
        const { data } = await sc.from("dependency_sovereignty_constitutions").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
        result = data ?? [];
        break;
      }
      case "dependencies": {
        const { data } = await sc.from("external_dependencies").select("*").eq("organization_id", organization_id).order("criticality_level").limit(200);
        result = data ?? [];
        break;
      }
      case "reliance_links": {
        const { data } = await sc.from("dependency_reliance_links").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(200);
        result = data ?? [];
        break;
      }
      case "assessments": {
        const { data } = await sc.from("dependency_sovereignty_assessments").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50);
        result = data ?? [];
        break;
      }
      case "disruption_events": {
        const { data } = await sc.from("dependency_disruption_events").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
        result = data ?? [];
        break;
      }
      case "exit_paths": {
        const { data } = await sc.from("dependency_exit_paths").select("*").eq("organization_id", organization_id).order("feasibility_score", { ascending: false }).limit(100);
        result = data ?? [];
        break;
      }
      case "recommendations": {
        const { data: deps } = await sc.from("external_dependencies").select("*").eq("organization_id", organization_id);
        const recs: string[] = [];
        const all = deps ?? [];
        const critNoFb = all.filter((d: any) => d.criticality_level === "critical" && !d.fallback_exists);
        if (critNoFb.length > 0) recs.push(`${critNoFb.length} critical dependencies without fallback — sovereignty risk.`);
        const highLock = all.filter((d: any) => d.lock_in_risk_level === "high" || d.lock_in_risk_level === "critical");
        if (highLock.length > 0) recs.push(`${highLock.length} dependencies with high lock-in risk — evaluate exit paths.`);
        const degraded = all.filter((d: any) => d.status === "degraded");
        if (degraded.length > 0) recs.push(`${degraded.length} dependencies currently degraded.`);
        if (recs.length === 0) recs.push("Dependency sovereignty posture is healthy.");
        result = { recommendations: recs };
        break;
      }
      case "explain": {
        const { dependency_id } = params;
        const { data: dep } = await sc.from("external_dependencies").select("*").eq("id", dependency_id).single();
        if (!dep) { result = { error: "Dependency not found" }; break; }
        const { count: linkCount } = await sc.from("dependency_reliance_links").select("*", { count: "exact", head: true }).eq("dependency_id", dependency_id);
        const { data: exits } = await sc.from("dependency_exit_paths").select("feasibility_score,exit_type").eq("dependency_id", dependency_id).eq("active", true);
        result = {
          dependency: dep.dependency_name,
          type: dep.dependency_type,
          provider: dep.provider_name,
          criticality: dep.criticality_level,
          lock_in_risk: dep.lock_in_risk_level,
          replacement_complexity: dep.replacement_complexity,
          fallback_exists: dep.fallback_exists,
          reliance_link_count: linkCount ?? 0,
          exit_paths: exits ?? [],
          is_sovereignty_threat: dep.criticality_level === "critical" && !dep.fallback_exists,
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
