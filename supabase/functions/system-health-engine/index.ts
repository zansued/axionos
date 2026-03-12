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

// â”€â”€ Health Evaluation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface MetricCalc {
  type: string;
  value: number;
  trend: string;
}

async function evaluateHealth(supabase: any, orgId: string) {
  // Gather signals from existing tables
  const [execRes, loopsRes, cyclesRes, routingRes, candidatesRes, rulesRes, prevMetrics] =
    await Promise.all([
      supabase
        .from("agent_outputs")
        .select("status")
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

  // â”€â”€ Compute metrics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const totalOutputs = outputs.length;
  const successOutputs = outputs.filter(
    (o: any) => o.status === "approved" || o.status === "published"
  ).length;

  // 1. Resilience â€” execution success rate
  const resilience = totalOutputs > 0 ? successOutputs / totalOutputs : 0.8;

  // 2. Coherence â€” loop health average
  const loopHealthValues = loops.map((l: any) => {
    const h = l.loop_health;
    if (h === "healthy") return 1;
    if (h === "degraded") return 0.6;
    if (h === "critical") return 0.2;
    return 0.5;
  });
  const coherence =
    loopHealthValues.length > 0
      ? loopHealthValues.reduce((a: number, b: number) => a + b, 0) /
        loopHealthValues.length
      : 0.7;

  
  // 3. Learning velocity â€” based on cycle activity + real knowledge distillation
  const recentCycles = cycles.filter(
    (c: any) => c.cycle_type === "exploration_window"
  ).length;
  const recentCandidates = (candidatesRes.data || []).length;
  const recentRules = (rulesRes.data || []).length;
  
  // Base 0.3 + cycles (up to 0.2) + candidates (up to 0.3) + rules (up to 0.2)
  const learningVelocity = Math.min(1, 0.3 + (recentCycles * 0.1) + (recentCandidates * 0.05) + (recentRules * 0.1));


  // 4. Governance integrity â€” based on routing profile discipline
  const governanceIntegrity =
    routing.length > 0
      ? Math.min(
          1,
          routing.filter(
            (r: any) =>
              r.validation_depth === "deep" || r.validation_depth === "maximum"
          ).length /
            routing.length +
            0.4
        )
      : 0.7;

  // 5. Operator trust â€” stable posture signals
  const stableLoops = loops.filter(
    (l: any) => l.loop_status === "active" && l.loop_health === "healthy"
  ).length;
  const operatorTrust = Math.min(
    1,
    loops.length > 0 ? stableLoops / loops.length + 0.2 : 0.6
  );

  // 6. Compounding strength â€” improvement over previous metrics
  const prevScores = prev
    .filter((m: any) => m.metric_type === "resilience")
    .map((m: any) => Number(m.metric_value));
  const compoundingStrength =
    prevScores.length >= 2 && prevScores[0] >= prevScores[1]
      ? Math.min(1, 0.6 + (prevScores[0] - prevScores[1]))
      : 0.5;

  const metrics: MetricCalc[] = [
    {
      type: "resilience",
      value: round(resilience),
      trend: deriveTrend(resilience, findPrev(prev, "resilience")),
    },
    {
      type: "coherence",
      value: round(coherence),
      trend: deriveTrend(coherence, findPrev(prev, "coherence")),
    },
    {
      type: "learning_velocity",
      value: round(learningVelocity),
      trend: deriveTrend(learningVelocity, findPrev(prev, "learning_velocity")),
    },
    {
      type: "governance_integrity",
      value: round(governanceIntegrity),
      trend: deriveTrend(
        governanceIntegrity,
        findPrev(prev, "governance_integrity")
      ),
    },
    {
      type: "operator_trust",
      value: round(operatorTrust),
      trend: deriveTrend(operatorTrust, findPrev(prev, "operator_trust")),
    },
    {
      type: "compounding_strength",
      value: round(compoundingStrength),
      trend: deriveTrend(
        compoundingStrength,
        findPrev(prev, "compounding_strength")
      ),
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

  const overallScore = round(
    metrics.reduce((s, m) => s + m.value, 0) / metrics.length
  );

  return {
    overall_health_score: overallScore,
    health_grade: gradeFromScore(overallScore),
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

  // Group by latest per type
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

  // Group by type with history
  const byType: Record<string, any[]> = {};
  for (const m of data || []) {
    if (!byType[m.metric_type]) byType[m.metric_type] = [];
    byType[m.metric_type].push(m);
  }

  return { trend_data: byType };
}

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

