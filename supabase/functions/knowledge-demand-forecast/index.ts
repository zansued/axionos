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
      case "generate_forecasts": result = await generateForecasts(sc, organizationId); break;
      case "list_forecasts": result = await listForecasts(sc, organizationId); break;
      case "list_signals": result = await listSignals(sc, organizationId); break;
      case "list_proposals": result = await listProposals(sc, organizationId, body.status); break;
      case "generate_demand_proposals": result = await generateDemandProposals(sc, organizationId); break;
      case "decide_proposal": result = await decideProposal(sc, organizationId, body, user.id); break;
      default: throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

async function generateForecasts(sc: any, orgId: string) {
  // Gather usage signals from retrieval sessions, canon entries, renewal triggers
  const [canonRes, retrievalRes, triggersRes, portfolioRes] = await Promise.all([
    sc.from("canon_entries").select("domain, entry_type, confidence_score, lifecycle_status, updated_at").eq("organization_id", orgId).in("lifecycle_status", ["approved", "experimental"]).limit(500),
    sc.from("retrieval_sessions").select("query_domain, relevance_score, created_at").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(300),
    sc.from("knowledge_renewal_triggers").select("target_type, trigger_type, strength, created_at").eq("organization_id", orgId).eq("status", "pending").limit(200),
    sc.from("knowledge_portfolio_segments").select("segment_type, segment_key, object_count, health_score, coverage_score").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(100),
  ]);

  const canon = canonRes.data || [];
  const retrievals = retrievalRes.data || [];
  const triggers = triggersRes.data || [];
  const segments = portfolioRes.data || [];

  // Aggregate demand signals by domain
  const domainDemand = new Map<string, { usage: number; retrievals: number; triggers: number; coverage: number; objects: number }>();

  const ensureDomain = (d: string) => {
    if (!domainDemand.has(d)) domainDemand.set(d, { usage: 0, retrievals: 0, triggers: 0, coverage: 0, objects: 0 });
    return domainDemand.get(d)!;
  };

  canon.forEach((c: any) => { const d = ensureDomain(c.domain || "unknown"); d.objects++; });
  retrievals.forEach((r: any) => { const d = ensureDomain(r.query_domain || "unknown"); d.retrievals++; d.usage += r.relevance_score || 0; });
  triggers.forEach((t: any) => { ensureDomain(t.target_type || "unknown").triggers++; });
  segments.filter((s: any) => s.segment_type === "domain").forEach((s: any) => {
    const d = ensureDomain(s.segment_key); d.coverage = s.coverage_score || 0; d.objects = Math.max(d.objects, s.object_count || 0);
  });

  // Generate forecasts and signals
  const forecasts: any[] = [];
  const signals: any[] = [];
  const now = new Date().toISOString();

  for (const [domain, stats] of domainDemand.entries()) {
    const retrievalPressure = Math.min(1, stats.retrievals / 20);
    const triggerPressure = Math.min(1, stats.triggers / 5);
    const coverageGap = Math.max(0, 1 - stats.coverage);
    const forecastScore = retrievalPressure * 0.4 + triggerPressure * 0.3 + coverageGap * 0.3;
    const pressureScore = Math.max(retrievalPressure, triggerPressure);
    const direction = forecastScore > 0.6 ? "rising" : forecastScore > 0.3 ? "stable" : "declining";
    const confidence = Math.min(0.9, 0.3 + (stats.retrievals + stats.objects) * 0.02);

    let primaryDriver = "usage_trend";
    if (triggerPressure > retrievalPressure && triggerPressure > coverageGap) primaryDriver = "renewal_pressure";
    else if (coverageGap > retrievalPressure) primaryDriver = "coverage_gap";

    forecasts.push({
      organization_id: orgId,
      forecast_scope_type: "domain",
      forecast_scope_key: domain,
      forecast_score: Math.round(forecastScore * 100) / 100,
      forecast_confidence: Math.round(confidence * 100) / 100,
      demand_direction: direction,
      forecast_window: "30d",
      pressure_score: Math.round(pressureScore * 100) / 100,
      coverage_gap_score: Math.round(coverageGap * 100) / 100,
      primary_driver: primaryDriver,
      evidence_summary: { retrievals: stats.retrievals, triggers: stats.triggers, objects: stats.objects, coverage: stats.coverage },
    });

    if (forecastScore > 0.3) {
      signals.push({
        organization_id: orgId,
        signal_type: primaryDriver,
        scope_type: "domain",
        scope_key: domain,
        signal_strength: Math.round(forecastScore * 100) / 100,
        payload: { forecast_score: forecastScore, direction, pressure: pressureScore },
      });
    }
  }

  if (forecasts.length > 0) await sc.from("knowledge_demand_forecasts").insert(forecasts);
  if (signals.length > 0) await sc.from("knowledge_forecast_signals").insert(signals);

  return {
    forecasts_created: forecasts.length,
    signals_created: signals.length,
    rising_domains: forecasts.filter(f => f.demand_direction === "rising").length,
  };
}

async function generateDemandProposals(sc: any, orgId: string) {
  const { data: forecasts } = await sc.from("knowledge_demand_forecasts")
    .select("*").eq("organization_id", orgId)
    .order("created_at", { ascending: false }).limit(50);

  if (!forecasts?.length) return { proposals_created: 0 };

  // Take recent high-demand forecasts
  const highDemand = forecasts.filter((f: any) => f.forecast_score > 0.5 && f.demand_direction === "rising").slice(0, 10);
  const proposals: any[] = [];

  for (const f of highDemand) {
    const proposalType = f.coverage_gap_score > 0.6 ? "expand_domain_knowledge" :
      f.primary_driver === "renewal_pressure" ? "anti_pattern_expansion" : "targeted_repo_absorption";

    proposals.push({
      organization_id: orgId,
      proposal_type: proposalType,
      target_scope_type: f.forecast_scope_type,
      target_scope_key: f.forecast_scope_key,
      reason: `Domain "${f.forecast_scope_key}" shows ${f.demand_direction} demand (score: ${f.forecast_score}). Coverage gap: ${(f.coverage_gap_score * 100).toFixed(0)}%. Primary driver: ${f.primary_driver}.`,
      evidence_summary: f.evidence_summary,
      priority: f.forecast_score > 0.7 ? "high" : "medium",
      status: "pending",
    });
  }

  if (proposals.length > 0) await sc.from("knowledge_demand_proposals").insert(proposals);
  return { proposals_created: proposals.length, proposals };
}

async function listForecasts(sc: any, orgId: string) {
  const { data } = await sc.from("knowledge_demand_forecasts").select("*").eq("organization_id", orgId).order("forecast_score", { ascending: false }).limit(50);
  return { forecasts: data || [] };
}

async function listSignals(sc: any, orgId: string) {
  const { data } = await sc.from("knowledge_forecast_signals").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(100);
  return { signals: data || [] };
}

async function listProposals(sc: any, orgId: string, status?: string) {
  let q = sc.from("knowledge_demand_proposals").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(100);
  if (status) q = q.eq("status", status);
  const { data } = await q;
  return { proposals: data || [] };
}

async function decideProposal(sc: any, orgId: string, body: any, userId: string) {
  const { proposalId, decision, notes } = body;
  const { error } = await sc.from("knowledge_demand_proposals").update({
    status: decision, decided_by: userId, decided_at: new Date().toISOString(), decision_notes: notes || "", updated_at: new Date().toISOString(),
  }).eq("id", proposalId).eq("organization_id", orgId);
  if (error) throw error;
  return { success: true, decision };
}
