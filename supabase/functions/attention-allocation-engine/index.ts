import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, organization_id, ...params } = body;

    if (!organization_id)
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    switch (action) {
      case "compute_attention_map":
        return json(await computeAttentionMap(supabase, organization_id, params), corsHeaders);
      case "list_attention_domains":
        return json(await listAttentionDomains(supabase, organization_id), corsHeaders);
      case "attention_metrics":
        return json(await attentionMetrics(supabase, organization_id), corsHeaders);
      default:
        return json({ error: `Unknown action: ${action}` }, corsHeaders, 400);
    }
  } catch (e) {
    return json({ error: e.message }, corsHeaders, 500);
  }
});

function json(data: any, headers: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

// ── Signal collection ──

interface SignalBucket {
  domain: string;
  score: number;
  reason: string;
  sources: string[];
}

async function collectSignals(
  supabase: any,
  orgId: string,
  _params: any
): Promise<SignalBucket[]> {
  const buckets = new Map<string, SignalBucket>();

  const ensure = (domain: string): SignalBucket => {
    if (!buckets.has(domain))
      buckets.set(domain, { domain, score: 0, reason: "", sources: [] });
    return buckets.get(domain)!;
  };

  // 1. Weak zones from compounding advantage
  const { data: weakZones } = await supabase
    .from("weak_compounding_zones")
    .select("zone_name, weakness_type, severity")
    .eq("organization_id", orgId)
    .limit(50);

  if (weakZones) {
    for (const wz of weakZones) {
      const b = ensure(wz.zone_name);
      const boost = wz.severity === "high" ? 0.3 : wz.severity === "medium" ? 0.2 : 0.1;
      b.score += boost;
      b.sources.push("weak_zone");
      b.reason += `Weak zone (${wz.weakness_type}); `;
    }
  }

  // 2. Repair concentration from error patterns
  const { data: repairs } = await supabase
    .from("repair_strategy_outcomes")
    .select("strategy_id, success")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (repairs && repairs.length > 0) {
    const failCount = repairs.filter((r: any) => !r.success).length;
    const repairRate = failCount / repairs.length;
    if (repairRate > 0.3) {
      const b = ensure("repair_system");
      b.score += repairRate * 0.4;
      b.sources.push("repair_concentration");
      b.reason += `High repair failure rate (${(repairRate * 100).toFixed(0)}%); `;
    }
  }

  // 3. Canon candidate density
  const { data: candidates } = await supabase
    .from("canon_promotion_candidates")
    .select("candidate_type, status")
    .eq("organization_id", orgId)
    .eq("status", "pending")
    .limit(100);

  if (candidates && candidates.length > 10) {
    const b = ensure("canon_pipeline");
    const density = Math.min(candidates.length / 50, 1);
    b.score += density * 0.25;
    b.sources.push("canon_candidate_density");
    b.reason += `${candidates.length} pending canon candidates; `;
  }

  // 4. Compounding scores
  const { data: scores } = await supabase
    .from("compounding_advantage_scores")
    .select("domain_name, compounding_score")
    .eq("organization_id", orgId)
    .order("compounding_score", { ascending: true })
    .limit(10);

  if (scores) {
    for (const s of scores) {
      if (s.compounding_score < 0.3) {
        const b = ensure(s.domain_name);
        b.score += (1 - s.compounding_score) * 0.2;
        b.sources.push("low_compounding");
        b.reason += `Low compounding (${(s.compounding_score * 100).toFixed(0)}%); `;
      }
    }
  }

  // 5. Learning candidates density
  const { data: learning } = await supabase
    .from("learning_candidates")
    .select("candidate_type, status")
    .eq("organization_id", orgId)
    .eq("status", "pending")
    .limit(200);

  if (learning && learning.length > 20) {
    const b = ensure("learning_pipeline");
    const density = Math.min(learning.length / 100, 1);
    b.score += density * 0.2;
    b.sources.push("learning_candidate_density");
    b.reason += `${learning.length} pending learning candidates; `;
  }

  // Normalize scores to 0–1
  const all = Array.from(buckets.values());
  const maxScore = Math.max(...all.map((b) => b.score), 0.01);
  for (const b of all) {
    b.score = Math.round((b.score / maxScore) * 1000) / 1000;
    b.sources = [...new Set(b.sources)];
  }

  return all.sort((a, b) => b.score - a.score);
}

// ── Actions ──

async function computeAttentionMap(supabase: any, orgId: string, params: any) {
  const signals = await collectSignals(supabase, orgId, params);

  // Upsert attention records
  for (const s of signals) {
    const { data: existing } = await supabase
      .from("attention_allocation_map")
      .select("allocation_id")
      .eq("organization_id", orgId)
      .eq("domain_id", s.domain)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("attention_allocation_map")
        .update({
          attention_score: s.score,
          attention_reason: s.reason.trim(),
          signal_sources: s.sources,
          updated_at: new Date().toISOString(),
        })
        .eq("allocation_id", existing.allocation_id);
    } else {
      await supabase.from("attention_allocation_map").insert({
        organization_id: orgId,
        domain_id: s.domain,
        attention_score: s.score,
        attention_reason: s.reason.trim(),
        signal_sources: s.sources,
      });
    }
  }

  return { computed: signals.length, domains: signals };
}

async function listAttentionDomains(supabase: any, orgId: string) {
  const { data, error } = await supabase
    .from("attention_allocation_map")
    .select("*")
    .eq("organization_id", orgId)
    .order("attention_score", { ascending: false });

  if (error) throw error;
  return { domains: data || [] };
}

async function attentionMetrics(supabase: any, orgId: string) {
  const { data } = await supabase
    .from("attention_allocation_map")
    .select("*")
    .eq("organization_id", orgId)
    .order("attention_score", { ascending: false });

  const domains = data || [];
  const total = domains.length;
  const highAttention = domains.filter((d: any) => d.attention_score >= 0.7).length;
  const mediumAttention = domains.filter(
    (d: any) => d.attention_score >= 0.4 && d.attention_score < 0.7
  ).length;
  const lowAttention = domains.filter((d: any) => d.attention_score < 0.4).length;
  const avgScore =
    total > 0
      ? Math.round(
          (domains.reduce((s: number, d: any) => s + Number(d.attention_score), 0) / total) * 1000
        ) / 1000
      : 0;

  const allSources = domains.flatMap((d: any) => d.signal_sources || []);
  const sourceCounts: Record<string, number> = {};
  for (const src of allSources) {
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  }

  return {
    total_domains: total,
    high_attention: highAttention,
    medium_attention: mediumAttention,
    low_attention: lowAttention,
    average_score: avgScore,
    signal_source_distribution: sourceCounts,
    top_domains: domains.slice(0, 5),
  };
}
