import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const sc = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { action, organizationId } = body;
    if (!organizationId) throw new Error("organizationId required");

    const { data: membership } = await sc.from("organization_members").select("id").eq("organization_id", organizationId).eq("user_id", user.id).maybeSingle();
    if (!membership) throw new Error("Not a member of this organization");

    let result: any;
    switch (action) {
      case "rank_opportunities": result = await rankOpportunities(sc, organizationId); break;
      case "generate_plan": result = await generatePlan(sc, organizationId, body); break;
      case "list_opportunities": result = await listOpportunities(sc, organizationId); break;
      case "list_plans": result = await listPlans(sc, organizationId, body.status); break;
      case "list_budgets": result = await listBudgets(sc, organizationId); break;
      case "decide_plan": result = await decidePlan(sc, organizationId, body, user.id); break;
      default: throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

async function rankOpportunities(sc: any, orgId: string) {
  // Use demand forecasts and portfolio gaps to rank acquisition opportunities
  const [forecastsRes, segmentsRes, canonRes] = await Promise.all([
    sc.from("knowledge_demand_forecasts").select("*").eq("organization_id", orgId).order("forecast_score", { ascending: false }).limit(30),
    sc.from("knowledge_portfolio_segments").select("*").eq("organization_id", orgId).eq("segment_type", "domain").order("created_at", { ascending: false }).limit(50),
    sc.from("canon_entries").select("domain, entry_type, source_url").eq("organization_id", orgId).in("lifecycle_status", ["approved", "experimental"]).limit(300),
  ]);

  const forecasts = forecastsRes.data || [];
  const segments = segmentsRes.data || [];
  const canon = canonRes.data || [];

  // Build domain coverage map
  const domainCoverage = new Map<string, number>();
  segments.forEach((s: any) => domainCoverage.set(s.segment_key, s.coverage_score || 0));

  // Known source domains from canon
  const knownSources = new Set(canon.map((c: any) => c.source_url).filter(Boolean));

  const opportunities: any[] = [];

  for (const forecast of forecasts.filter((f: any) => f.forecast_score > 0.3)) {
    const domain = forecast.forecast_scope_key;
    const coverage = domainCoverage.get(domain) || 0;
    const coverageGap = Math.max(0, 1 - coverage);
    const expectedGain = forecast.forecast_score * coverageGap;
    const expectedCost = 0.1 + Math.random() * 0.3; // placeholder cost estimation
    const novelty = Math.max(0.2, 1 - coverage);
    const redundancyRisk = Math.min(0.8, coverage * 0.5);
    const urgency = forecast.pressure_score || 0;
    const downstreamValue = expectedGain * (1 - redundancyRisk);

    const opportunityScore = expectedGain * 0.3 + novelty * 0.2 + urgency * 0.2 + downstreamValue * 0.2 + (1 - expectedCost) * 0.1;

    opportunities.push({
      organization_id: orgId,
      source_type: "domain_expansion",
      source_ref: domain,
      target_domain: domain,
      target_stack: "",
      opportunity_score: Math.round(opportunityScore * 100) / 100,
      expected_knowledge_gain: Math.round(expectedGain * 100) / 100,
      expected_cost: Math.round(expectedCost * 100) / 100,
      urgency_score: Math.round(urgency * 100) / 100,
      novelty_score: Math.round(novelty * 100) / 100,
      redundancy_risk: Math.round(redundancyRisk * 100) / 100,
      expected_downstream_value: Math.round(downstreamValue * 100) / 100,
      evidence_summary: { forecast_score: forecast.forecast_score, coverage, demand_direction: forecast.demand_direction },
    });
  }

  opportunities.sort((a, b) => b.opportunity_score - a.opportunity_score);

  if (opportunities.length > 0) {
    await sc.from("knowledge_acquisition_opportunities").insert(opportunities.slice(0, 20));
  }

  return { opportunities: opportunities.slice(0, 20), total_ranked: opportunities.length };
}

async function generatePlan(sc: any, orgId: string, body: any) {
  const { targetDomain, strategyMode } = body;
  const mode = strategyMode || "targeted";

  const { data: opps } = await sc.from("knowledge_acquisition_opportunities")
    .select("*").eq("organization_id", orgId)
    .eq("target_domain", targetDomain || "")
    .order("opportunity_score", { ascending: false }).limit(5);

  const topOpp = opps?.[0];
  const expectedCost = topOpp?.expected_cost || 0.2;
  const expectedBenefit = topOpp?.expected_knowledge_gain || 0.5;
  const confidence = topOpp?.opportunity_score || 0.5;

  const { data: plan, error } = await sc.from("knowledge_acquisition_plans").insert({
    organization_id: orgId,
    plan_name: `${mode}: ${targetDomain || "general"}`,
    target_scope: targetDomain || "general",
    source_refs: opps?.map((o: any) => o.source_ref) || [],
    strategy_mode: mode,
    priority: confidence > 0.6 ? "high" : "medium",
    status: "proposed",
    expected_cost: expectedCost,
    expected_benefit: expectedBenefit,
    confidence: Math.round(confidence * 100) / 100,
    rationale: `${mode} acquisition for domain "${targetDomain}". Based on ${opps?.length || 0} ranked opportunities.`,
  }).select().single();

  if (error) throw error;
  return { plan };
}

async function listOpportunities(sc: any, orgId: string) {
  const { data } = await sc.from("knowledge_acquisition_opportunities").select("*").eq("organization_id", orgId).order("opportunity_score", { ascending: false }).limit(50);
  return { opportunities: data || [] };
}

async function listPlans(sc: any, orgId: string, status?: string) {
  let q = sc.from("knowledge_acquisition_plans").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50);
  if (status) q = q.eq("status", status);
  const { data } = await q;
  return { plans: data || [] };
}

async function listBudgets(sc: any, orgId: string) {
  const { data } = await sc.from("knowledge_acquisition_budgets").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(20);
  return { budgets: data || [] };
}

async function decidePlan(sc: any, orgId: string, body: any, userId: string) {
  const { planId, decision } = body;
  const { error } = await sc.from("knowledge_acquisition_plans").update({
    status: decision, updated_at: new Date().toISOString(),
  }).eq("id", planId).eq("organization_id", orgId);
  if (error) throw error;
  return { success: true, decision };
}
