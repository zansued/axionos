import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Repair Learning Engine — Sprint 12 Learning Agents v1
 *
 * Adjusts repair strategy weights based on evidence.
 * Formula: new_weight = previous_weight + success_factor - failure_penalty
 * Constraints: cannot modify routing formula, only weights.
 * All changes are logged and reversible.
 */
const SUCCESS_FACTOR = 0.05;
const FAILURE_PENALTY = 0.08;
const MIN_WEIGHT = 0.1;
const MAX_WEIGHT = 3.0;
const MIN_EVIDENCE = 3;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "No authorization" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { organization_id, time_window_days = 30 } = await req.json();
    if (!organization_id) return new Response(JSON.stringify({ error: "organization_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const since = new Date(Date.now() - time_window_days * 86400000).toISOString();

    // 1. Fetch repair evidence
    const { data: repairs } = await sc
      .from("repair_evidence")
      .select("id, repair_strategy, stage_name, repair_result, error_category")
      .eq("organization_id", organization_id)
      .gte("created_at", since)
      .limit(1000);

    // 2. Aggregate by strategy+stage
    const strategyStats = new Map<string, { successes: number; failures: number; evidenceIds: string[] }>();

    for (const r of repairs || []) {
      const key = `${r.repair_strategy}::${r.stage_name || "*"}`;
      const entry = strategyStats.get(key) || { successes: 0, failures: 0, evidenceIds: [] };
      if (r.repair_result === "fixed") entry.successes++;
      else entry.failures++;
      entry.evidenceIds.push(r.id);
      strategyStats.set(key, entry);
    }

    // 3. Fetch current weights
    const { data: currentWeights } = await sc
      .from("repair_strategy_weights")
      .select("*")
      .eq("organization_id", organization_id);

    const weightMap = new Map<string, any>();
    for (const w of currentWeights || []) {
      weightMap.set(`${w.strategy_name}::${w.stage_name}`, w);
    }

    // 4. Compute weight adjustments
    let adjustmentsCount = 0;
    const adjustmentLog: any[] = [];

    for (const [key, stats] of strategyStats) {
      const total = stats.successes + stats.failures;
      if (total < MIN_EVIDENCE) continue;

      const [strategyName, stageName] = key.split("::");
      const existing = weightMap.get(key);
      const previousWeight = existing ? Number(existing.current_weight) : 1.0;

      const successRatio = stats.successes / total;
      const adjustment = (successRatio * SUCCESS_FACTOR * total) - ((1 - successRatio) * FAILURE_PENALTY * total);
      let newWeight = Math.round((previousWeight + adjustment) * 1000) / 1000;
      newWeight = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, newWeight));

      // Skip if no meaningful change
      if (Math.abs(newWeight - previousWeight) < 0.01) continue;

      const reason = `${stats.successes}/${total} success (${Math.round(successRatio * 100)}%), weight ${previousWeight} → ${newWeight}`;

      if (existing) {
        await sc.from("repair_strategy_weights")
          .update({
            previous_weight: previousWeight,
            current_weight: newWeight,
            adjustment_reason: reason,
            evidence_ids: stats.evidenceIds.slice(0, 20),
            adjusted_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await sc.from("repair_strategy_weights").insert({
          organization_id,
          strategy_name: strategyName,
          stage_name: stageName,
          current_weight: newWeight,
          previous_weight: 1.0,
          adjustment_reason: reason,
          evidence_ids: stats.evidenceIds.slice(0, 20),
        });
      }

      adjustmentsCount++;
      adjustmentLog.push({ strategy: strategyName, stage: stageName, from: previousWeight, to: newWeight, reason });
    }

    // 5. Audit trail
    if (adjustmentsCount > 0) {
      await sc.from("audit_logs").insert({
        user_id: "00000000-0000-0000-0000-000000000000",
        action: "LEARNING_UPDATE",
        category: "learning",
        entity_type: "repair_strategy_weights",
        message: `Repair learning: ${adjustmentsCount} strategy weights adjusted`,
        severity: "info",
        organization_id,
        metadata: {
          component: "repair",
          adjustments_count: adjustmentsCount,
          changes: adjustmentLog,
        },
      });
    }

    return new Response(JSON.stringify({
      adjustments_made: adjustmentsCount,
      strategies_evaluated: strategyStats.size,
      changes: adjustmentLog,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Repair learning engine error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
