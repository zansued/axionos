import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { action, organization_id, domain, asset_id, plan_id } = await req.json();
    const json = (d: any) => new Response(JSON.stringify(d), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (action === "overview") {
      const [assets, deps, assessments, plans, incidents] = await Promise.all([
        supabase.from("continuity_assets").select("*").eq("organization_id", organization_id),
        supabase.from("continuity_dependencies").select("*").eq("organization_id", organization_id),
        supabase.from("resilience_assessments").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(10),
        supabase.from("continuity_plans").select("*").eq("organization_id", organization_id),
        supabase.from("continuity_incidents").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(20),
      ]);

      const assetData = assets.data || [];
      const depData = deps.data || [];
      const planData = plans.data || [];
      const incidentData = incidents.data || [];

      const criticalAssets = assetData.filter((a: any) => a.criticality_level === "critical");
      const nofallback = depData.filter((d: any) => !d.fallback_exists);
      const openIncidents = incidentData.filter((i: any) => i.incident_status === "open");
      const uncoveredIncidents = openIncidents.filter((i: any) => !i.continuity_plan_id);

      return json({
        stats: {
          total_assets: assetData.length,
          critical_assets: criticalAssets.length,
          total_dependencies: depData.length,
          deps_without_fallback: nofallback.length,
          active_plans: planData.filter((p: any) => p.plan_status === "active").length,
          open_incidents: openIncidents.length,
          uncovered_incidents: uncoveredIncidents.length,
        },
        recent_assessments: (assessments.data || []).slice(0, 3),
        recent_incidents: incidentData.slice(0, 5),
      });
    }

    if (action === "assets") {
      const { data } = await supabase.from("continuity_assets").select("*").eq("organization_id", organization_id);
      return json({ assets: data });
    }

    if (action === "dependencies") {
      let q = supabase.from("continuity_dependencies").select("*").eq("organization_id", organization_id);
      if (asset_id) q = q.or(`asset_id.eq.${asset_id},depends_on_asset_id.eq.${asset_id}`);
      const { data } = await q;
      return json({ dependencies: data });
    }

    if (action === "assessments") {
      let q = supabase.from("resilience_assessments").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
      if (domain) q = q.eq("domain", domain);
      const { data } = await q;
      return json({ assessments: data });
    }

    if (action === "plans") {
      let q = supabase.from("continuity_plans").select("*").eq("organization_id", organization_id);
      if (domain) q = q.eq("domain", domain);
      const { data } = await q;
      return json({ plans: data });
    }

    if (action === "incidents") {
      const { data } = await supabase.from("continuity_incidents").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
      return json({ incidents: data });
    }

    if (action === "recommendations") {
      const [{ data: deps }, { data: incidents }, { data: plans }] = await Promise.all([
        supabase.from("continuity_dependencies").select("*").eq("organization_id", organization_id),
        supabase.from("continuity_incidents").select("*").eq("organization_id", organization_id).eq("incident_status", "open"),
        supabase.from("continuity_plans").select("*").eq("organization_id", organization_id),
      ]);

      const recs: any[] = [];
      const nofb = (deps || []).filter((d: any) => !d.fallback_exists);
      if (nofb.length > 0) recs.push({ priority: "high", title: `${nofb.length} dependencies without fallback`, description: "Define fallback paths for critical dependencies." });

      const uncovered = (incidents || []).filter((i: any) => !i.continuity_plan_id);
      if (uncovered.length > 0) recs.push({ priority: "critical", title: `${uncovered.length} incidents without continuity plan`, description: "Maturity gap: incidents exist without matching plans." });

      const draftPlans = (plans || []).filter((p: any) => p.plan_status === "draft");
      if (draftPlans.length > 0) recs.push({ priority: "medium", title: `${draftPlans.length} draft plans pending activation`, description: "Review and activate draft continuity plans." });

      if (recs.length === 0) recs.push({ priority: "low", title: "Continuity posture is healthy", description: "No critical gaps detected." });

      return json({ recommendations: recs });
    }

    if (action === "explain" && (asset_id || plan_id)) {
      if (asset_id) {
        const [{ data: asset }, { data: deps }] = await Promise.all([
          supabase.from("continuity_assets").select("*").eq("id", asset_id).single(),
          supabase.from("continuity_dependencies").select("*").or(`asset_id.eq.${asset_id},depends_on_asset_id.eq.${asset_id}`),
        ]);
        return json({ asset, dependencies: deps });
      }
      const { data: plan } = await supabase.from("continuity_plans").select("*").eq("id", plan_id).single();
      return json({ plan });
    }

    return json({ error: "Unknown action" });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
