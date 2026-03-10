import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Posture = "exploratory" | "accelerated" | "stabilizing" | "recovery" | "constrained" | "observation_heavy";

interface PostureSignal {
  signal: string;
  value: number;
  weight: number;
}

interface PostureResult {
  posture: Posture;
  confidence: number;
  signals: PostureSignal[];
  effects: Record<string, string>;
}

const POSTURE_EFFECTS: Record<Posture, Record<string, string>> = {
  exploratory: {
    autonomy_upgrade_speed: "fast",
    validation_strictness: "relaxed",
    repair_aggressiveness: "moderate",
    publish_gating: "standard",
    learning_sensitivity: "high",
  },
  accelerated: {
    autonomy_upgrade_speed: "maximum",
    validation_strictness: "standard",
    repair_aggressiveness: "aggressive",
    publish_gating: "fast-track",
    learning_sensitivity: "moderate",
  },
  stabilizing: {
    autonomy_upgrade_speed: "slow",
    validation_strictness: "strict",
    repair_aggressiveness: "conservative",
    publish_gating: "strict",
    learning_sensitivity: "moderate",
  },
  recovery: {
    autonomy_upgrade_speed: "frozen",
    validation_strictness: "maximum",
    repair_aggressiveness: "maximum",
    publish_gating: "blocked",
    learning_sensitivity: "high",
  },
  constrained: {
    autonomy_upgrade_speed: "frozen",
    validation_strictness: "strict",
    repair_aggressiveness: "conservative",
    publish_gating: "restricted",
    learning_sensitivity: "low",
  },
  observation_heavy: {
    autonomy_upgrade_speed: "paused",
    validation_strictness: "standard",
    repair_aggressiveness: "moderate",
    publish_gating: "standard",
    learning_sensitivity: "maximum",
  },
};

function evaluatePosture(metrics: {
  validation_success_rate: number;
  regression_rate: number;
  weak_zone_count: number;
  compounding_score: number;
  canon_activity: number;
  repair_frequency: number;
}): PostureResult {
  const signals: PostureSignal[] = [];
  let scores: Record<Posture, number> = {
    exploratory: 0, accelerated: 0, stabilizing: 0,
    recovery: 0, constrained: 0, observation_heavy: 0,
  };

  // Validation success rate
  const vsr = metrics.validation_success_rate;
  signals.push({ signal: "validation_success_rate", value: vsr, weight: 0.25 });
  if (vsr >= 0.9) { scores.accelerated += 30; scores.exploratory += 20; }
  else if (vsr >= 0.7) { scores.stabilizing += 20; scores.observation_heavy += 15; }
  else if (vsr >= 0.5) { scores.constrained += 25; scores.recovery += 15; }
  else { scores.recovery += 35; scores.constrained += 20; }

  // Regression rate
  const rr = metrics.regression_rate;
  signals.push({ signal: "regression_rate", value: rr, weight: 0.2 });
  if (rr <= 0.05) { scores.accelerated += 20; scores.exploratory += 15; }
  else if (rr <= 0.15) { scores.stabilizing += 20; }
  else if (rr <= 0.3) { scores.constrained += 25; scores.recovery += 15; }
  else { scores.recovery += 30; }

  // Weak zones
  const wz = metrics.weak_zone_count;
  signals.push({ signal: "weak_zone_count", value: wz, weight: 0.15 });
  if (wz === 0) { scores.accelerated += 15; scores.exploratory += 10; }
  else if (wz <= 2) { scores.stabilizing += 15; }
  else if (wz <= 5) { scores.constrained += 20; }
  else { scores.recovery += 20; scores.constrained += 10; }

  // Compounding score
  const cs = metrics.compounding_score;
  signals.push({ signal: "compounding_score", value: cs, weight: 0.15 });
  if (cs >= 0.7) { scores.accelerated += 20; scores.exploratory += 15; }
  else if (cs >= 0.4) { scores.stabilizing += 15; scores.observation_heavy += 10; }
  else { scores.observation_heavy += 20; scores.constrained += 10; }

  // Canon activity
  const ca = metrics.canon_activity;
  signals.push({ signal: "canon_activity", value: ca, weight: 0.1 });
  if (ca >= 5) { scores.exploratory += 15; scores.accelerated += 10; }
  else if (ca >= 1) { scores.stabilizing += 10; }
  else { scores.observation_heavy += 15; }

  // Repair frequency
  const rf = metrics.repair_frequency;
  signals.push({ signal: "repair_frequency", value: rf, weight: 0.15 });
  if (rf <= 0.1) { scores.accelerated += 15; }
  else if (rf <= 0.3) { scores.stabilizing += 15; }
  else if (rf <= 0.5) { scores.constrained += 15; scores.recovery += 10; }
  else { scores.recovery += 25; }

  // Find winning posture
  let best: Posture = "observation_heavy";
  let bestScore = -1;
  for (const [p, s] of Object.entries(scores)) {
    if (s > bestScore) { bestScore = s; best = p as Posture; }
  }

  const totalPossible = 135; // max theoretical score
  const confidence = Math.round((bestScore / totalPossible) * 10000) / 10000;

  return {
    posture: best,
    confidence: Math.min(confidence, 1),
    signals,
    effects: POSTURE_EFFECTS[best],
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { action, organization_id: orgId } = body;

    if (!orgId) {
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ─── evaluate_posture ─── */
    if (action === "evaluate_posture") {
      const { tenant_id = "default", stack_id = "default" } = body;

      // Gather metrics from operational tables
      const now = new Date();
      const lookback = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Validation success rate
      const { data: valRuns } = await supabase
        .from("execution_validation_runs")
        .select("overall_success")
        .eq("organization_id", orgId)
        .gte("created_at", lookback);
      const totalVal = (valRuns || []).length;
      const successVal = (valRuns || []).filter((r: any) => r.overall_success).length;
      const validation_success_rate = totalVal > 0 ? successVal / totalVal : 0.5;

      // Regression rate (from regression_detection_events)
      const { data: regEvents } = await supabase
        .from("regression_detection_events")
        .select("id")
        .eq("organization_id", orgId)
        .gte("created_at", lookback);
      const regression_rate = totalVal > 0 ? (regEvents || []).length / Math.max(totalVal, 1) : 0;

      // Weak zones
      const { data: weakZones } = await supabase
        .from("weak_zone_signals")
        .select("id")
        .eq("organization_id", orgId)
        .eq("status", "active");
      const weak_zone_count = (weakZones || []).length;

      // Compounding score
      const { data: compScores } = await supabase
        .from("compounding_advantage_scores")
        .select("composite_score")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(1);
      const compounding_score = compScores?.[0]?.composite_score || 0;

      // Canon activity
      const { data: canonRecords } = await supabase
        .from("canon_learning_records")
        .select("id")
        .eq("organization_id", orgId)
        .gte("created_at", lookback);
      const canon_activity = (canonRecords || []).length;

      // Repair frequency
      const { data: repairs } = await supabase
        .from("repair_actions")
        .select("id")
        .eq("organization_id", orgId)
        .gte("created_at", lookback);
      const repair_frequency = totalVal > 0 ? (repairs || []).length / Math.max(totalVal, 1) : 0;

      const result = evaluatePosture({
        validation_success_rate,
        regression_rate,
        weak_zone_count,
        compounding_score,
        canon_activity,
        repair_frequency,
      });

      // Upsert posture state
      const { data: existing } = await supabase
        .from("operational_posture_state")
        .select("id")
        .eq("organization_id", orgId)
        .eq("tenant_id", tenant_id)
        .eq("stack_id", stack_id)
        .limit(1);

      if (existing && existing.length > 0) {
        await supabase
          .from("operational_posture_state")
          .update({
            current_posture: result.posture,
            posture_confidence: result.confidence,
            trigger_signals: result.signals,
            updated_at: now.toISOString(),
          })
          .eq("id", existing[0].id);
      } else {
        await supabase
          .from("operational_posture_state")
          .insert({
            organization_id: orgId,
            tenant_id,
            stack_id,
            current_posture: result.posture,
            posture_confidence: result.confidence,
            trigger_signals: result.signals,
            activated_at: now.toISOString(),
            updated_at: now.toISOString(),
          });
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ─── get_current_posture ─── */
    if (action === "get_current_posture") {
      const { data, error } = await supabase
        .from("operational_posture_state")
        .select("*")
        .eq("organization_id", orgId)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ postures: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ─── posture_metrics ─── */
    if (action === "posture_metrics") {
      const { data, error } = await supabase
        .from("operational_posture_state")
        .select("current_posture, posture_confidence, updated_at")
        .eq("organization_id", orgId);

      if (error) throw error;

      const byPosture: Record<string, number> = {};
      let avgConfidence = 0;

      for (const p of (data || [])) {
        byPosture[p.current_posture] = (byPosture[p.current_posture] || 0) + 1;
        avgConfidence += p.posture_confidence || 0;
      }
      if (data && data.length > 0) avgConfidence = Math.round((avgConfidence / data.length) * 10000) / 10000;

      return new Response(JSON.stringify({
        total: (data || []).length,
        by_posture: byPosture,
        avg_confidence: avgConfidence,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
