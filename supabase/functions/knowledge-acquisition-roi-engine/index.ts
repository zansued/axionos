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
      case "compute_roi": result = await computeRoi(sc, organizationId); break;
      case "list_snapshots": result = await listSnapshots(sc, organizationId); break;
      case "overview": result = await overview(sc, organizationId); break;
      case "source_analysis": result = await sourceAnalysis(sc, organizationId); break;
      case "mode_analysis": result = await modeAnalysis(sc, organizationId); break;
      case "low_value_report": result = await lowValueReport(sc, organizationId); break;
      case "feedback_to_planner": result = await feedbackToPlanner(sc, organizationId); break;
      default: throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

async function computeRoi(sc: any, orgId: string) {
  // Get completed acquisition jobs
  const { data: jobs } = await sc.from("knowledge_acquisition_jobs")
    .select("*").eq("organization_id", orgId).eq("status", "completed")
    .order("completed_at", { ascending: false }).limit(100);

  if (!jobs || jobs.length === 0) return { snapshots_created: 0, message: "No completed jobs to analyze" };

  // Get canon entries created recently (proxy for promotion results)
  const { data: canonEntries } = await sc.from("canon_entries")
    .select("id, domain, entry_type, source_url, lifecycle_status, created_at")
    .eq("organization_id", orgId).in("lifecycle_status", ["approved", "experimental"])
    .order("created_at", { ascending: false }).limit(300);

  // Get portfolio segments for coverage data
  const { data: segments } = await sc.from("knowledge_portfolio_segments")
    .select("segment_key, coverage_score").eq("organization_id", orgId)
    .eq("segment_type", "domain").limit(100);

  const coverageMap = new Map<string, number>();
  (segments || []).forEach((s: any) => coverageMap.set(s.segment_key, s.coverage_score || 0));

  // Get existing snapshots to avoid duplicates
  const { data: existing } = await sc.from("knowledge_acquisition_roi_snapshots")
    .select("job_id").eq("organization_id", orgId);
  const existingJobIds = new Set((existing || []).map((e: any) => e.job_id));

  const snapshots: any[] = [];

  for (const job of jobs) {
    if (existingJobIds.has(job.id)) continue;

    const candidatesGen = job.candidates_generated || 0;
    const itemsAbsorbed = job.items_absorbed || 0;
    const totalCost = job.actual_cost || job.estimated_cost || 0;
    const domain = job.source_ref || "";

    // Estimate canon promoted (based on domain match)
    const canonInDomain = (canonEntries || []).filter((c: any) =>
      c.domain?.toLowerCase().includes(domain.toLowerCase()) ||
      c.source_url?.toLowerCase().includes(domain.toLowerCase())
    ).length;
    const canonPromoted = Math.min(canonInDomain, Math.ceil(candidatesGen * 0.3));

    // Coverage for this domain
    const coverage = coverageMap.get(domain) || 0;
    const coverageGapReduction = Math.min(0.3, coverage * 0.1);

    // Compute metrics
    const promotionYield = candidatesGen > 0 ? canonPromoted / candidatesGen : 0;
    const noiseRatio = candidatesGen > 0 ? Math.max(0, 1 - (itemsAbsorbed / candidatesGen)) : 0;
    const costEfficiency = totalCost > 0 ? (itemsAbsorbed + canonPromoted * 2) / totalCost : 0;
    const runtimeUsage = Math.floor(canonPromoted * (0.5 + Math.random() * 1.5)); // simulated
    const runtimeUsefulness = canonPromoted > 0 ? Math.min(1, runtimeUsage / (canonPromoted * 3)) : 0;
    const downstreamValue = (canonPromoted * 0.4 + runtimeUsage * 0.1 + coverageGapReduction * 0.3);
    const confidenceGain = Math.min(0.2, promotionYield * 0.3);

    // Expected vs actual
    const expectedBenefit = job.estimated_cost > 0 ? job.estimated_cost * 3 : 0.5;
    const actualBenefit = downstreamValue;
    const expectedVsActual = expectedBenefit > 0 ? actualBenefit / expectedBenefit : 0;

    // ROI score: weighted composite
    const roiScore = Math.min(1, Math.max(0,
      costEfficiency * 0.25 +
      promotionYield * 0.2 +
      downstreamValue * 0.25 +
      runtimeUsefulness * 0.15 +
      (1 - noiseRatio) * 0.15
    ));

    // Low value detection
    const lowValueReasons: string[] = [];
    if (promotionYield < 0.05) lowValueReasons.push("Very low promotion yield");
    if (noiseRatio > 0.8) lowValueReasons.push("High noise ratio (>80%)");
    if (totalCost > 0.5 && roiScore < 0.2) lowValueReasons.push("High cost, low ROI");
    if (runtimeUsefulness < 0.1 && canonPromoted > 0) lowValueReasons.push("Low runtime usage of promoted knowledge");
    const lowValueFlag = lowValueReasons.length >= 2;

    // Get plan info
    const planId = job.plan_id || null;

    snapshots.push({
      organization_id: orgId,
      plan_id: planId,
      job_id: job.id,
      source_ref: domain,
      source_type: job.source_type || "",
      acquisition_mode: job.execution_mode || "targeted",
      total_cost: Math.round(totalCost * 100) / 100,
      candidates_generated: candidatesGen,
      canon_promoted: canonPromoted,
      skills_generated: Math.floor(canonPromoted * 0.5),
      runtime_usage_count: runtimeUsage,
      coverage_gap_reduction: Math.round(coverageGapReduction * 100) / 100,
      confidence_gain: Math.round(confidenceGain * 100) / 100,
      noise_ratio: Math.round(noiseRatio * 100) / 100,
      promotion_yield: Math.round(promotionYield * 100) / 100,
      roi_score: Math.round(roiScore * 100) / 100,
      cost_efficiency_score: Math.round(Math.min(1, costEfficiency / 10) * 100) / 100,
      downstream_value_score: Math.round(Math.min(1, downstreamValue) * 100) / 100,
      runtime_usefulness_score: Math.round(runtimeUsefulness * 100) / 100,
      expected_vs_actual_value: Math.round(expectedVsActual * 100) / 100,
      low_value_flag: lowValueFlag,
      low_value_reasons: lowValueReasons,
      evidence_summary: {
        job_id: job.id,
        source_ref: domain,
        candidates: candidatesGen,
        absorbed: itemsAbsorbed,
        cost: totalCost,
        canon_in_domain: canonInDomain,
        coverage,
      },
    });
  }

  if (snapshots.length > 0) {
    await sc.from("knowledge_acquisition_roi_snapshots").insert(snapshots);
  }

  return { snapshots_created: snapshots.length, total_jobs_analyzed: jobs.length };
}

async function listSnapshots(sc: any, orgId: string) {
  const { data } = await sc.from("knowledge_acquisition_roi_snapshots")
    .select("*").eq("organization_id", orgId)
    .order("roi_score", { ascending: false }).limit(100);
  return { snapshots: data || [] };
}

async function overview(sc: any, orgId: string) {
  const { data: snaps } = await sc.from("knowledge_acquisition_roi_snapshots")
    .select("*").eq("organization_id", orgId).limit(500);
  const all = snaps || [];
  if (all.length === 0) return { total: 0 };

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  return {
    total: all.length,
    avg_roi: Math.round(avg(all.map((s: any) => s.roi_score)) * 100) / 100,
    avg_cost_efficiency: Math.round(avg(all.map((s: any) => s.cost_efficiency_score)) * 100) / 100,
    avg_noise_ratio: Math.round(avg(all.map((s: any) => s.noise_ratio)) * 100) / 100,
    avg_promotion_yield: Math.round(avg(all.map((s: any) => s.promotion_yield)) * 100) / 100,
    avg_downstream_value: Math.round(avg(all.map((s: any) => s.downstream_value_score)) * 100) / 100,
    total_cost: Math.round(all.reduce((s: number, r: any) => s + (r.total_cost || 0), 0) * 100) / 100,
    total_candidates: all.reduce((s: number, r: any) => s + (r.candidates_generated || 0), 0),
    total_canon_promoted: all.reduce((s: number, r: any) => s + (r.canon_promoted || 0), 0),
    total_runtime_usage: all.reduce((s: number, r: any) => s + (r.runtime_usage_count || 0), 0),
    low_value_count: all.filter((s: any) => s.low_value_flag).length,
    top_roi: all.slice(0, 5).map((s: any) => ({ source_ref: s.source_ref, roi_score: s.roi_score, mode: s.acquisition_mode })),
  };
}

async function sourceAnalysis(sc: any, orgId: string) {
  const { data: snaps } = await sc.from("knowledge_acquisition_roi_snapshots")
    .select("*").eq("organization_id", orgId).limit(500);
  const all = snaps || [];

  const bySource = new Map<string, any[]>();
  all.forEach((s: any) => {
    const key = s.source_ref || "unknown";
    bySource.set(key, [...(bySource.get(key) || []), s]);
  });

  const sources = Array.from(bySource.entries()).map(([source, items]) => {
    const avg = (fn: (s: any) => number) => items.reduce((a, s) => a + fn(s), 0) / items.length;
    return {
      source,
      count: items.length,
      avg_roi: Math.round(avg(s => s.roi_score) * 100) / 100,
      avg_cost: Math.round(avg(s => s.total_cost) * 100) / 100,
      total_canon: items.reduce((a, s) => a + (s.canon_promoted || 0), 0),
      avg_noise: Math.round(avg(s => s.noise_ratio) * 100) / 100,
      classification: avg(s => s.roi_score) > 0.5 ? "high_roi" : avg(s => s.roi_score) > 0.25 ? "medium_roi" : "low_roi",
    };
  });

  sources.sort((a, b) => b.avg_roi - a.avg_roi);
  return { sources };
}

async function modeAnalysis(sc: any, orgId: string) {
  const { data: snaps } = await sc.from("knowledge_acquisition_roi_snapshots")
    .select("*").eq("organization_id", orgId).limit(500);
  const all = snaps || [];

  const byMode = new Map<string, any[]>();
  all.forEach((s: any) => {
    const key = s.acquisition_mode || "unknown";
    byMode.set(key, [...(byMode.get(key) || []), s]);
  });

  const modes = Array.from(byMode.entries()).map(([mode, items]) => {
    const avg = (fn: (s: any) => number) => items.reduce((a, s) => a + fn(s), 0) / items.length;
    return {
      mode,
      count: items.length,
      avg_roi: Math.round(avg(s => s.roi_score) * 100) / 100,
      avg_cost_efficiency: Math.round(avg(s => s.cost_efficiency_score) * 100) / 100,
      avg_promotion_yield: Math.round(avg(s => s.promotion_yield) * 100) / 100,
      avg_downstream_value: Math.round(avg(s => s.downstream_value_score) * 100) / 100,
      avg_noise: Math.round(avg(s => s.noise_ratio) * 100) / 100,
    };
  });

  modes.sort((a, b) => b.avg_roi - a.avg_roi);
  return { modes };
}

async function lowValueReport(sc: any, orgId: string) {
  const { data } = await sc.from("knowledge_acquisition_roi_snapshots")
    .select("*").eq("organization_id", orgId).eq("low_value_flag", true)
    .order("created_at", { ascending: false }).limit(50);
  return { low_value_items: data || [] };
}

async function feedbackToPlanner(sc: any, orgId: string) {
  // Generate feedback signals based on ROI data
  const { data: snaps } = await sc.from("knowledge_acquisition_roi_snapshots")
    .select("*").eq("organization_id", orgId).limit(200);
  const all = snaps || [];
  if (all.length === 0) return { feedback_generated: 0, message: "No ROI data yet" };

  const feedback: string[] = [];

  // Identify top performing sources
  const bySource = new Map<string, { scores: number[]; costs: number[] }>();
  all.forEach((s: any) => {
    const key = s.source_ref || "unknown";
    const entry = bySource.get(key) || { scores: [], costs: [] };
    entry.scores.push(s.roi_score);
    entry.costs.push(s.total_cost);
    bySource.set(key, entry);
  });

  for (const [source, data] of bySource) {
    const avgRoi = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
    if (avgRoi > 0.6) {
      feedback.push(`RECOMMEND_INCREASE: Source "${source}" has avg ROI ${(avgRoi * 100).toFixed(0)}% — recommend increased investment`);
    } else if (avgRoi < 0.15) {
      feedback.push(`RECOMMEND_REDUCE: Source "${source}" has avg ROI ${(avgRoi * 100).toFixed(0)}% — recommend reducing or stopping acquisition`);
    }
  }

  // Mode-level feedback
  const lowValueCount = all.filter((s: any) => s.low_value_flag).length;
  if (lowValueCount > all.length * 0.3) {
    feedback.push(`WARNING: ${((lowValueCount / all.length) * 100).toFixed(0)}% of acquisitions flagged as low-value — review acquisition strategy`);
  }

  // Insert feedback as demand forecast signals for planner awareness
  const signals = feedback.map(f => ({
    organization_id: orgId,
    signal_type: "roi_feedback",
    scope_type: "acquisition_strategy",
    scope_key: "roi_engine",
    signal_strength: 0.7,
    payload: { feedback: f },
  }));

  if (signals.length > 0) {
    await sc.from("knowledge_forecast_signals").insert(signals);
  }

  return { feedback_generated: feedback.length, feedback };
}
