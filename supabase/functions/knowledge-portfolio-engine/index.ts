import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sc = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { action, organizationId } = body;
    if (!organizationId) throw new Error("organizationId required");

    const { data: membership } = await sc
      .from("organization_members")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) throw new Error("Not a member of this organization");

    let result: any;

    switch (action) {
      case "analyze_portfolio":
        result = await analyzePortfolio(sc, organizationId);
        break;
      case "detect_redundancies":
        result = await detectRedundancies(sc, organizationId);
        break;
      case "analyze_coverage":
        result = await analyzeCoverage(sc, organizationId);
        break;
      case "generate_optimization_proposals":
        result = await generateOptimizationProposals(sc, organizationId);
        break;
      case "list_snapshots":
        result = await listSnapshots(sc, organizationId);
        break;
      case "list_segments":
        result = await listSegments(sc, organizationId, body.snapshotId);
        break;
      case "list_proposals":
        result = await listProposals(sc, organizationId, body.status);
        break;
      case "decide_proposal":
        result = await decideProposal(sc, organizationId, body, user.id);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Portfolio Analysis ───

async function analyzePortfolio(sc: any, orgId: string) {
  // Gather all knowledge objects
  const [canonRes, skillRes, distilledRes, heuristicsRes, triggersRes] = await Promise.all([
    sc.from("canon_entries").select("id, entry_type, confidence_score, lifecycle_status, domain, created_at, updated_at").eq("organization_id", orgId).limit(500),
    sc.from("skill_bundles").select("id, skill_type, confidence, status, domain, created_at").eq("organization_id", orgId).limit(500),
    sc.from("distilled_outputs").select("id, distillation_type, confidence_score, status, created_at").eq("organization_id", orgId).limit(500),
    sc.from("architecture_heuristics").select("id, domain, confidence, status, created_at").eq("organization_id", orgId).limit(500),
    sc.from("knowledge_renewal_triggers").select("id, status").eq("organization_id", orgId).eq("status", "pending").limit(200),
  ]);

  const canon = canonRes.data || [];
  const skills = skillRes.data || [];
  const distilled = distilledRes.data || [];
  const heuristics = heuristicsRes.data || [];
  const pendingTriggers = triggersRes.data || [];

  const totalObjects = canon.length + skills.length + distilled.length + heuristics.length;

  // Coverage by domain
  const domainMap = new Map<string, { count: number; totalConf: number; stale: number }>();
  const now = Date.now();
  const STALE_DAYS = 90;

  const addToDomain = (domain: string, conf: number, updatedAt: string) => {
    const d = domainMap.get(domain) || { count: 0, totalConf: 0, stale: 0 };
    d.count++;
    d.totalConf += conf;
    const ageDays = (now - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays > STALE_DAYS) d.stale++;
    domainMap.set(domain, d);
  };

  canon.forEach((c: any) => addToDomain(c.domain || "unknown", c.confidence_score || 0.5, c.updated_at || c.created_at));
  skills.forEach((s: any) => addToDomain(s.domain || "unknown", s.confidence || 0.5, s.created_at));
  heuristics.forEach((h: any) => addToDomain(h.domain || "unknown", h.confidence || 0.5, h.created_at));

  // Redundancy detection (simple: count same entry_type+domain combos)
  const typeCountMap = new Map<string, number>();
  canon.forEach((c: any) => {
    const key = `${c.entry_type}::${c.domain || "unknown"}`;
    typeCountMap.set(key, (typeCountMap.get(key) || 0) + 1);
  });
  const redundantClusters = [...typeCountMap.entries()].filter(([, count]) => count > 3);
  const redundancyScore = totalObjects > 0 ? Math.min(1, redundantClusters.length / Math.max(1, domainMap.size)) : 0;

  // Coverage score
  const domainEntries = [...domainMap.values()];
  const avgCoverage = domainEntries.length > 0 ? domainEntries.reduce((s, d) => s + d.count, 0) / domainEntries.length : 0;
  const coverageScore = Math.min(1, avgCoverage / 10); // normalized

  // Stale ratio
  const totalStale = domainEntries.reduce((s, d) => s + d.stale, 0);
  const staleRatio = totalObjects > 0 ? totalStale / totalObjects : 0;

  // Balance score (coefficient of variation of domain sizes)
  const counts = domainEntries.map(d => d.count);
  const mean = counts.length > 0 ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
  const variance = counts.length > 0 ? counts.reduce((s, c) => s + (c - mean) ** 2, 0) / counts.length : 0;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
  const balanceScore = Math.max(0, 1 - cv); // 1 = perfectly balanced

  // Source diversity (unique entry types)
  const uniqueTypes = new Set(canon.map((c: any) => c.entry_type));
  const sourceDiversityScore = Math.min(1, uniqueTypes.size / 8);

  // Portfolio score (weighted aggregate)
  const portfolioScore = (
    coverageScore * 0.25 +
    (1 - redundancyScore) * 0.2 +
    balanceScore * 0.2 +
    sourceDiversityScore * 0.15 +
    (1 - staleRatio) * 0.2
  );

  // Persist snapshot
  const { data: snapshot } = await sc.from("knowledge_portfolio_snapshots").insert({
    organization_id: orgId,
    portfolio_score: Math.round(portfolioScore * 100) / 100,
    coverage_score: Math.round(coverageScore * 100) / 100,
    redundancy_score: Math.round(redundancyScore * 100) / 100,
    balance_score: Math.round(balanceScore * 100) / 100,
    source_diversity_score: Math.round(sourceDiversityScore * 100) / 100,
    stale_ratio: Math.round(staleRatio * 100) / 100,
    total_objects: totalObjects,
    summary: {
      canon_count: canon.length,
      skill_count: skills.length,
      distilled_count: distilled.length,
      heuristic_count: heuristics.length,
      pending_triggers: pendingTriggers.length,
      domain_count: domainMap.size,
      redundant_clusters: redundantClusters.length,
    },
  }).select().single();

  // Persist segments
  if (snapshot) {
    const segmentRows = [...domainMap.entries()].map(([domain, stats]) => ({
      organization_id: orgId,
      snapshot_id: snapshot.id,
      segment_type: "domain",
      segment_key: domain,
      object_count: stats.count,
      coverage_score: Math.round(Math.min(1, stats.count / 10) * 100) / 100,
      redundancy_score: 0,
      usage_score: 0,
      health_score: Math.round((1 - (stats.stale / Math.max(1, stats.count))) * 100) / 100,
      avg_confidence: Math.round((stats.totalConf / Math.max(1, stats.count)) * 100) / 100,
      stale_count: stats.stale,
      notes: "",
    }));

    // Add knowledge-family segments
    const families = [
      { key: "canon_entries", count: canon.length },
      { key: "skill_bundles", count: skills.length },
      { key: "distilled_outputs", count: distilled.length },
      { key: "architecture_heuristics", count: heuristics.length },
    ];
    families.forEach(f => {
      segmentRows.push({
        organization_id: orgId,
        snapshot_id: snapshot.id,
        segment_type: "knowledge_family",
        segment_key: f.key,
        object_count: f.count,
        coverage_score: 0,
        redundancy_score: 0,
        usage_score: 0,
        health_score: 0,
        avg_confidence: 0,
        stale_count: 0,
        notes: "",
      });
    });

    if (segmentRows.length > 0) {
      await sc.from("knowledge_portfolio_segments").insert(segmentRows);
    }
  }

  return {
    snapshot,
    metrics: {
      portfolio_score: portfolioScore,
      coverage_score: coverageScore,
      redundancy_score: redundancyScore,
      balance_score: balanceScore,
      source_diversity_score: sourceDiversityScore,
      stale_ratio: staleRatio,
      total_objects: totalObjects,
      domain_count: domainMap.size,
    },
  };
}

async function detectRedundancies(sc: any, orgId: string) {
  const { data: canon } = await sc.from("canon_entries")
    .select("id, title, entry_type, domain, confidence_score")
    .eq("organization_id", orgId)
    .in("lifecycle_status", ["approved", "experimental"])
    .limit(500);

  if (!canon?.length) return { clusters: [], redundancy_count: 0 };

  // Group by entry_type+domain
  const groups = new Map<string, any[]>();
  canon.forEach((c: any) => {
    const key = `${c.entry_type}::${c.domain || "unknown"}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  });

  const clusters = [...groups.entries()]
    .filter(([, items]) => items.length > 2)
    .map(([key, items]) => ({
      cluster_key: key,
      count: items.length,
      items: items.map((i: any) => ({ id: i.id, title: i.title, confidence: i.confidence_score })),
      recommendation: items.length > 5 ? "merge_cluster" : "review_for_dedup",
    }))
    .sort((a, b) => b.count - a.count);

  return { clusters, redundancy_count: clusters.reduce((s, c) => s + c.count, 0) };
}

async function analyzeCoverage(sc: any, orgId: string) {
  const { data: canon } = await sc.from("canon_entries")
    .select("domain, entry_type, confidence_score")
    .eq("organization_id", orgId)
    .in("lifecycle_status", ["approved", "experimental"])
    .limit(500);

  if (!canon?.length) return { gaps: [], strong_domains: [] };

  const domainStats = new Map<string, { count: number; totalConf: number; types: Set<string> }>();
  canon.forEach((c: any) => {
    const d = c.domain || "unknown";
    const stats = domainStats.get(d) || { count: 0, totalConf: 0, types: new Set() };
    stats.count++;
    stats.totalConf += c.confidence_score || 0.5;
    stats.types.add(c.entry_type);
    domainStats.set(d, stats);
  });

  const results = [...domainStats.entries()].map(([domain, stats]) => ({
    domain,
    count: stats.count,
    avg_confidence: Math.round((stats.totalConf / stats.count) * 100) / 100,
    type_diversity: stats.types.size,
    health: stats.count >= 5 && stats.totalConf / stats.count > 0.6 ? "strong" :
            stats.count >= 2 ? "moderate" : "weak",
  }));

  const gaps = results.filter(r => r.health === "weak").sort((a, b) => a.count - b.count);
  const strong_domains = results.filter(r => r.health === "strong").sort((a, b) => b.count - a.count);

  return { gaps, strong_domains, all_domains: results };
}

async function generateOptimizationProposals(sc: any, orgId: string) {
  const [redundancies, coverage] = await Promise.all([
    detectRedundancies(sc, orgId),
    analyzeCoverage(sc, orgId),
  ]);

  const proposals: any[] = [];

  // Redundancy proposals
  for (const cluster of redundancies.clusters.slice(0, 5)) {
    proposals.push({
      organization_id: orgId,
      proposal_type: cluster.recommendation === "merge_cluster" ? "merge_cluster" : "archive_duplicate",
      target_scope: cluster.cluster_key,
      target_object_ids: cluster.items.map((i: any) => i.id),
      reason: `${cluster.count} entries of type ${cluster.cluster_key} detected. Consider consolidation.`,
      evidence_summary: { cluster_size: cluster.count, items: cluster.items },
      priority: cluster.count > 5 ? "high" : "medium",
      status: "pending",
    });
  }

  // Coverage gap proposals
  for (const gap of coverage.gaps.slice(0, 5)) {
    proposals.push({
      organization_id: orgId,
      proposal_type: "expand_domain",
      target_scope: gap.domain,
      target_object_ids: [],
      reason: `Domain "${gap.domain}" has only ${gap.count} entries with avg confidence ${gap.avg_confidence}. Consider targeted learning.`,
      evidence_summary: { domain: gap.domain, count: gap.count, avg_confidence: gap.avg_confidence },
      priority: gap.count <= 1 ? "high" : "medium",
      status: "pending",
    });
  }

  if (proposals.length > 0) {
    await sc.from("knowledge_optimization_proposals").insert(proposals);
  }

  return { proposals_created: proposals.length, proposals };
}

// ─── List & Decide ───

async function listSnapshots(sc: any, orgId: string) {
  const { data } = await sc.from("knowledge_portfolio_snapshots")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(20);
  return { snapshots: data || [] };
}

async function listSegments(sc: any, orgId: string, snapshotId?: string) {
  let q = sc.from("knowledge_portfolio_segments")
    .select("*")
    .eq("organization_id", orgId)
    .order("object_count", { ascending: false })
    .limit(100);
  if (snapshotId) q = q.eq("snapshot_id", snapshotId);
  const { data } = await q;
  return { segments: data || [] };
}

async function listProposals(sc: any, orgId: string, status?: string) {
  let q = sc.from("knowledge_optimization_proposals")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (status) q = q.eq("status", status);
  const { data } = await q;
  return { proposals: data || [] };
}

async function decideProposal(sc: any, orgId: string, body: any, userId: string) {
  const { proposalId, decision, notes } = body;
  const { error } = await sc.from("knowledge_optimization_proposals").update({
    status: decision,
    decided_by: userId,
    decided_at: new Date().toISOString(),
    decision_notes: notes || "",
    updated_at: new Date().toISOString(),
  }).eq("id", proposalId).eq("organization_id", orgId);

  if (error) throw error;
  return { success: true, decision };
}
