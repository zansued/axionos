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

    const { action, organization_id } = await req.json();

    switch (action) {
      case "evaluate_system_health":
        return json(await evaluateHealth(supabase, organization_id));
      case "health_metrics":
        return json(await getMetrics(supabase, organization_id));
      case "health_trend":
        return json(await getTrend(supabase, organization_id));
      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// -- Types --

type EvidenceBasis = "observed" | "inferred" | "seeded" | "insufficient";

interface MetricCalc {
  type: string;
  value: number;
  trend: string;
  evidence_basis: EvidenceBasis;
  confidence: number; // 0-1
  evidence_detail: string;
}

// -- Confidence helpers --

/**
 * Confidence based on volume of evidence.
 * - 0 records = 0.1 (insufficient)
 * - 1-4 records = 0.3-0.5
 * - 5-19 = 0.5-0.7
 * - 20-49 = 0.7-0.85
 * - 50+ = 0.85-1.0
 */
function volumeConfidence(count: number): number {
  if (count === 0) return 0.1;
  if (count < 5) return 0.3 + (count / 5) * 0.2;
  if (count < 20) return 0.5 + ((count - 5) / 15) * 0.2;
  if (count < 50) return 0.7 + ((count - 20) / 30) * 0.15;
  return Math.min(1, 0.85 + ((count - 50) / 200) * 0.15);
}

/**
 * Detect if records are likely seeded/bootstrap:
 * - all created within a 5-second window = likely seeded
 * - all have identical values = likely seeded
 */
function detectSeeded(records: any[], timeField = "created_at"): boolean {
  if (records.length === 0) return false;
  if (records.length === 1) return false;

  const timestamps = records
    .map((r) => new Date(r[timeField]).getTime())
    .filter((t) => !isNaN(t));
  if (timestamps.length < 2) return false;

  const minT = Math.min(...timestamps);
  const maxT = Math.max(...timestamps);
  // All created within 5 seconds = likely bulk seeded
  return (maxT - minT) < 5000;
}

/** Discount factor for seeded data: seeded records count as 40% of observed */
const SEEDED_DISCOUNT = 0.4;

// -- Health Evaluation --

async function evaluateHealth(supabase: any, orgId: string) {
  const [execRes, loopsRes, cyclesRes, routingRes, candidatesRes, rulesRes, prevMetrics] =
    await Promise.all([
      supabase
        .from("agent_outputs")
        .select("status, created_at")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("operational_loops")
        .select("*")
        .eq("organization_id", orgId),
      supabase
        .from("operational_cycles")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("adaptive_routing_profiles")
        .select("*")
        .eq("organization_id", orgId)
        .limit(20),
      supabase
        .from("learning_candidates")
        .select("id")
        .eq("organization_id", orgId)
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase
        .from("project_prevention_rules")
        .select("id")
        .eq("organization_id", orgId)
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase
        .from("system_health_metrics")
        .select("*")
        .eq("organization_id", orgId)
        .order("evaluated_at", { ascending: false })
        .limit(30),
    ]);

  const outputs = execRes.data || [];
  const loops = loopsRes.data || [];
  const cycles = cyclesRes.data || [];
  const routing = routingRes.data || [];
  const prev = prevMetrics.data || [];

  const loopsSeeded = detectSeeded(loops);
  const routingSeeded = detectSeeded(routing);

  // -- Compute metrics with evidence tracking --

  const totalOutputs = outputs.length;
  const successOutputs = outputs.filter(
    (o: any) => o.status === "approved" || o.status === "published"
  ).length;

  // 1. Resilience - execution success rate
  let resilience: number;
  let resilienceBasis: EvidenceBasis;
  let resilienceConf: number;
  let resilienceDetail: string;

  if (totalOutputs >= 10) {
    resilience = successOutputs / totalOutputs;
    resilienceBasis = "observed";
    resilienceConf = volumeConfidence(totalOutputs);
    resilienceDetail = `${successOutputs}/${totalOutputs} outputs succeeded`;
  } else if (totalOutputs > 0) {
    resilience = successOutputs / totalOutputs;
    resilienceBasis = "inferred";
    resilienceConf = volumeConfidence(totalOutputs);
    resilienceDetail = `Only ${totalOutputs} outputs — low sample size`;
  } else {
    resilience = 0.5; // neutral, not optimistic
    resilienceBasis = "insufficient";
    resilienceConf = 0.1;
    resilienceDetail = "No agent outputs found";
  }

  // 2. Coherence - loop health average
  let coherence: number;
  let coherenceBasis: EvidenceBasis;
  let coherenceConf: number;
  let coherenceDetail: string;

  if (loops.length > 0) {
    const loopHealthValues = loops.map((l: any) => {
      const h = l.loop_health;
      if (h === "healthy") return 1;
      if (h === "degraded") return 0.6;
      if (h === "critical") return 0.2;
      return 0.5;
    });
    const rawCoherence = loopHealthValues.reduce((a: number, b: number) => a + b, 0) / loopHealthValues.length;

    if (loopsSeeded) {
      coherence = rawCoherence * SEEDED_DISCOUNT + 0.5 * (1 - SEEDED_DISCOUNT);
      coherenceBasis = "seeded";
      coherenceConf = 0.25;
      coherenceDetail = `${loops.length} loops (bootstrap data, discounted)`;
    } else {
      coherence = rawCoherence;
      coherenceBasis = "observed";
      coherenceConf = volumeConfidence(loops.length);
      coherenceDetail = `${loops.length} operational loops observed`;
    }
  } else {
    coherence = 0.5;
    coherenceBasis = "insufficient";
    coherenceConf = 0.1;
    coherenceDetail = "No operational loops found";
  }

  // 3. Learning velocity
  const recentCycles = cycles.filter((c: any) => c.cycle_type === "exploration_window").length;
  const recentCandidates = (candidatesRes.data || []).length;
  const recentRules = (rulesRes.data || []).length;
  const learningEvidenceCount = recentCycles + recentCandidates + recentRules;
  const learningVelocity = Math.min(1, 0.3 + (recentCycles * 0.1) + (recentCandidates * 0.05) + (recentRules * 0.1));

  let learningBasis: EvidenceBasis;
  let learningConf: number;
  let learningDetail: string;

  if (learningEvidenceCount >= 5) {
    learningBasis = "observed";
    learningConf = volumeConfidence(learningEvidenceCount);
    learningDetail = `${recentCycles} cycles, ${recentCandidates} candidates, ${recentRules} rules (7d)`;
  } else if (learningEvidenceCount > 0) {
    learningBasis = "inferred";
    learningConf = volumeConfidence(learningEvidenceCount);
    learningDetail = `Limited evidence: ${learningEvidenceCount} signals in 7d`;
  } else {
    learningBasis = "insufficient";
    learningConf = 0.15;
    learningDetail = "No learning activity in last 7 days";
  }

  // 4. Governance integrity - routing profile discipline
  let governanceIntegrity: number;
  let govBasis: EvidenceBasis;
  let govConf: number;
  let govDetail: string;

  if (routing.length > 0) {
    const deepCount = routing.filter(
      (r: any) => r.validation_depth === "deep" || r.validation_depth === "maximum"
    ).length;
    const rawGov = Math.min(1, deepCount / routing.length + 0.4);

    if (routingSeeded) {
      governanceIntegrity = rawGov * SEEDED_DISCOUNT + 0.5 * (1 - SEEDED_DISCOUNT);
      govBasis = "seeded";
      govConf = 0.25;
      govDetail = `${routing.length} profiles (bootstrap data, discounted)`;
    } else {
      governanceIntegrity = rawGov;
      govBasis = "observed";
      govConf = volumeConfidence(routing.length);
      govDetail = `${deepCount}/${routing.length} profiles use deep/maximum validation`;
    }
  } else {
    governanceIntegrity = 0.5;
    govBasis = "insufficient";
    govConf = 0.1;
    govDetail = "No routing profiles configured";
  }

  // 5. Operator trust - stable posture signals
  let operatorTrust: number;
  let trustBasis: EvidenceBasis;
  let trustConf: number;
  let trustDetail: string;

  if (loops.length > 0) {
    const stableLoops = loops.filter(
      (l: any) => l.loop_status === "active" && l.loop_health === "healthy"
    ).length;
    const rawTrust = Math.min(1, stableLoops / loops.length + 0.2);

    if (loopsSeeded) {
      operatorTrust = rawTrust * SEEDED_DISCOUNT + 0.5 * (1 - SEEDED_DISCOUNT);
      trustBasis = "seeded";
      trustConf = 0.25;
      trustDetail = `${loops.length} loops (bootstrap data, discounted)`;
    } else {
      operatorTrust = rawTrust;
      trustBasis = "observed";
      trustConf = volumeConfidence(loops.length);
      trustDetail = `${stableLoops}/${loops.length} loops active+healthy`;
    }
  } else {
    operatorTrust = 0.5;
    trustBasis = "insufficient";
    trustConf = 0.1;
    trustDetail = "No operational loops found";
  }

  // 6. Compounding strength - multi-dimensional improvement
  const compoundingDimensions = [
    { type: "resilience", weight: 0.25 },
    { type: "coherence", weight: 0.25 },
    { type: "governance_integrity", weight: 0.20 },
    { type: "operator_trust", weight: 0.20 },
    { type: "learning_velocity", weight: 0.10 },
  ];

  let compoundingStrength = 0.5;
  let compBasis: EvidenceBasis = "insufficient";
  let compConf = 0.15;
  let compDetail = "Insufficient history for trend analysis";

  if (prev.length >= 6) {
    let weightedImprovement = 0;
    let totalWeight = 0;
    let stableDimensions = 0;
    let dimensionsEvaluated = 0;

    for (const dim of compoundingDimensions) {
      const history = prev
        .filter((m: any) => m.metric_type === dim.type)
        .map((m: any) => Number(m.metric_value));

      if (history.length >= 2) {
        const delta = history[0] - history[1];
        const dimScore = delta > 0.01 ? 0.8 + Math.min(0.2, delta)
                       : delta < -0.01 ? Math.max(0.2, 0.5 + delta)
                       : 0.65;
        weightedImprovement += dimScore * dim.weight;
        totalWeight += dim.weight;
        if (Math.abs(delta) <= 0.01) stableDimensions++;
        dimensionsEvaluated++;
      }
    }

    if (totalWeight > 0) {
      compoundingStrength = weightedImprovement / totalWeight;
      if (stableDimensions >= 3) {
        compoundingStrength = Math.min(1, compoundingStrength + 0.05);
      }
      compBasis = dimensionsEvaluated >= 4 ? "observed" : "inferred";
      compConf = volumeConfidence(prev.length) * (dimensionsEvaluated / 5);
      compDetail = `${dimensionsEvaluated}/5 dimensions evaluated, ${stableDimensions} stable`;
    }
  }

  const metrics: MetricCalc[] = [
    {
      type: "resilience", value: round(resilience),
      trend: deriveTrend(resilience, findPrev(prev, "resilience")),
      evidence_basis: resilienceBasis, confidence: round(resilienceConf), evidence_detail: resilienceDetail,
    },
    {
      type: "coherence", value: round(coherence),
      trend: deriveTrend(coherence, findPrev(prev, "coherence")),
      evidence_basis: coherenceBasis, confidence: round(coherenceConf), evidence_detail: coherenceDetail,
    },
    {
      type: "learning_velocity", value: round(learningVelocity),
      trend: deriveTrend(learningVelocity, findPrev(prev, "learning_velocity")),
      evidence_basis: learningBasis, confidence: round(learningConf), evidence_detail: learningDetail,
    },
    {
      type: "governance_integrity", value: round(governanceIntegrity),
      trend: deriveTrend(governanceIntegrity, findPrev(prev, "governance_integrity")),
      evidence_basis: govBasis, confidence: round(govConf), evidence_detail: govDetail,
    },
    {
      type: "operator_trust", value: round(operatorTrust),
      trend: deriveTrend(operatorTrust, findPrev(prev, "operator_trust")),
      evidence_basis: trustBasis, confidence: round(trustConf), evidence_detail: trustDetail,
    },
    {
      type: "compounding_strength", value: round(compoundingStrength),
      trend: deriveTrend(compoundingStrength, findPrev(prev, "compounding_strength")),
      evidence_basis: compBasis, confidence: round(compConf), evidence_detail: compDetail,
    },
  ];

  // Persist
  const now = new Date().toISOString();
  const rows = metrics.map((m) => ({
    organization_id: orgId,
    metric_type: m.type,
    metric_value: m.value,
    metric_trend: m.trend,
    evaluated_at: now,
  }));

  await supabase.from("system_health_metrics").insert(rows);

  // Confidence-weighted overall score
  const rawScore = metrics.reduce((s, m) => s + m.value, 0) / metrics.length;
  const avgConfidence = metrics.reduce((s, m) => s + m.confidence, 0) / metrics.length;

  // Weighted score pulls toward 0.5 (neutral) based on lack of confidence
  const weightedScore = rawScore * avgConfidence + 0.5 * (1 - avgConfidence);

  const insufficientCount = metrics.filter(m => m.evidence_basis === "insufficient").length;
  const seededCount = metrics.filter(m => m.evidence_basis === "seeded").length;
  const observedCount = metrics.filter(m => m.evidence_basis === "observed").length;

  return {
    overall_health_score: round(weightedScore),
    raw_score: round(rawScore),
    health_grade: gradeFromScore(weightedScore),
    overall_confidence: round(avgConfidence),
    evidence_summary: {
      observed: observedCount,
      inferred: metrics.filter(m => m.evidence_basis === "inferred").length,
      seeded: seededCount,
      insufficient: insufficientCount,
      trustworthy: observedCount >= 4 && avgConfidence >= 0.6,
    },
    metrics,
    evaluated_at: now,
  };
}

async function getMetrics(supabase: any, orgId: string) {
  const { data } = await supabase
    .from("system_health_metrics")
    .select("*")
    .eq("organization_id", orgId)
    .order("evaluated_at", { ascending: false })
    .limit(30);

  const latest: Record<string, any> = {};
  for (const m of data || []) {
    if (!latest[m.metric_type]) latest[m.metric_type] = m;
  }

  const metrics = Object.values(latest);
  const overallScore =
    metrics.length > 0
      ? round(
          metrics.reduce((s: number, m: any) => s + Number(m.metric_value), 0) /
            metrics.length
        )
      : 0;

  return {
    overall_health_score: overallScore,
    health_grade: gradeFromScore(overallScore),
    metrics,
  };
}

async function getTrend(supabase: any, orgId: string) {
  const { data } = await supabase
    .from("system_health_metrics")
    .select("*")
    .eq("organization_id", orgId)
    .order("evaluated_at", { ascending: false })
    .limit(100);

  const byType: Record<string, any[]> = {};
  for (const m of data || []) {
    if (!byType[m.metric_type]) byType[m.metric_type] = [];
    byType[m.metric_type].push(m);
  }

  return { trend_data: byType };
}

// -- Helpers --

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

function findPrev(prev: any[], type: string): number | null {
  const found = prev.find((m: any) => m.metric_type === type);
  return found ? Number(found.metric_value) : null;
}

function deriveTrend(current: number, previous: number | null): string {
  if (previous === null) return "stable";
  const delta = current - previous;
  if (delta > 0.05) return "improving";
  if (delta < -0.05) return "declining";
  return "stable";
}

function gradeFromScore(score: number): string {
  if (score >= 0.9) return "A";
  if (score >= 0.75) return "B";
  if (score >= 0.6) return "C";
  if (score >= 0.4) return "D";
  return "F";
}
