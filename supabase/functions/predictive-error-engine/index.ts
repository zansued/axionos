import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Predictive Error Engine — Sprint 12 Learning Agents v1
 *
 * Detects patterns that historically lead to failures and generates
 * probability scores. When threshold exceeded, creates prevention rule candidates.
 */
const PREDICTION_THRESHOLD = 0.7;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "No authorization" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { organization_id, time_window_days = 30 } = await req.json();
    if (!organization_id) return new Response(JSON.stringify({ error: "organization_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: _member } = await sc.from("organization_members").select("role").eq("organization_id", organization_id).eq("user_id", user.id).single();
    if (!_member) return new Response(JSON.stringify({ error: "Not a member of this organization" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const since = new Date(Date.now() - time_window_days * 86400000).toISOString();

    // 1. Gather error patterns with frequency data
    const { data: patterns } = await sc
      .from("error_patterns")
      .select("id, error_category, error_signature, normalized_signature, frequency, severity, success_rate, affected_stages, common_causes, recommended_prevention")
      .eq("organization_id", organization_id)
      .order("frequency", { ascending: false })
      .limit(200);

    // 2. Gather recent repair evidence for temporal analysis
    const { data: repairs } = await sc
      .from("repair_evidence")
      .select("error_category, error_signature, stage_name, repair_result, created_at")
      .eq("organization_id", organization_id)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);

    // 3. Analyze error sequences — find repeated stage→error patterns
    const stageErrorFreq = new Map<string, { total: number; failures: number; stages: Set<string>; causes: string[] }>();

    for (const r of repairs || []) {
      const key = r.error_signature || r.error_category;
      const entry = stageErrorFreq.get(key) || { total: 0, failures: 0, stages: new Set(), causes: [] };
      entry.total++;
      if (r.repair_result !== "fixed") entry.failures++;
      if (r.stage_name) entry.stages.add(r.stage_name);
      stageErrorFreq.set(key, entry);
    }

    // Enrich with pattern library data
    for (const p of patterns || []) {
      const key = p.normalized_signature || p.error_signature;
      const entry = stageErrorFreq.get(key) || { total: 0, failures: 0, stages: new Set(), causes: [] };
      entry.total += p.frequency;
      entry.failures += Math.round(p.frequency * (1 - Number(p.success_rate) / 100));
      (p.affected_stages || []).forEach((s: string) => entry.stages.add(s));
      entry.causes = p.common_causes || [];
      stageErrorFreq.set(key, entry);
    }

    // 4. Compute probability scores and persist
    let predictionsCreated = 0;
    let rulesGenerated = 0;

    for (const [sig, data] of stageErrorFreq) {
      if (data.total < 3) continue; // need minimum observations

      const failureRate = data.failures / data.total;
      // Probability = weighted failure rate + frequency bonus
      const frequencyBonus = Math.min(data.total / 50, 0.2);
      const probabilityScore = Math.min(Math.round((failureRate + frequencyBonus) * 1000) / 1000, 1.0);
      const stageName = Array.from(data.stages)[0] || "unknown";

      // Upsert
      await sc.from("predictive_error_patterns")
        .delete()
        .eq("organization_id", organization_id)
        .eq("error_signature", sig);

      const preventionRule = probabilityScore >= PREDICTION_THRESHOLD
        ? `Auto-guard: Block or warn before "${stageName}" for signature "${sig.slice(0, 60)}"`
        : null;

      const { error } = await sc.from("predictive_error_patterns").insert({
        organization_id,
        stage_name: stageName,
        error_signature: sig,
        probability_score: probabilityScore,
        observations_count: data.total,
        recommended_prevention_rule: preventionRule,
        contributing_factors: data.causes.slice(0, 5),
        last_updated: new Date().toISOString(),
      });
      if (!error) predictionsCreated++;

      // If threshold exceeded, create prevention rule candidate
      if (probabilityScore >= PREDICTION_THRESHOLD && preventionRule) {
        const { data: existing } = await sc
          .from("prevention_rule_candidates")
          .select("id")
          .eq("organization_id", organization_id)
          .eq("description", preventionRule)
          .limit(1);

        if (!existing || existing.length === 0) {
          await sc.from("prevention_rule_candidates").insert({
            organization_id,
            rule_type: "predictive_guard",
            description: preventionRule,
            proposed_action: "warn",
            expected_impact: `Reduce failure rate for "${sig.slice(0, 40)}" (current: ${Math.round(failureRate * 100)}%)`,
            confidence_score: probabilityScore,
          });
          rulesGenerated++;
        }
      }
    }

    // Audit
    await sc.from("audit_logs").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      action: "LEARNING_UPDATE",
      category: "learning",
      entity_type: "predictive_error_patterns",
      message: `Predictive error detection: ${predictionsCreated} patterns, ${rulesGenerated} new prevention candidates`,
      severity: "info",
      organization_id,
      metadata: { component: "prevention", predictions: predictionsCreated, rules: rulesGenerated },
    });

    return new Response(JSON.stringify({
      predictions_created: predictionsCreated,
      prevention_rules_generated: rulesGenerated,
      signatures_analyzed: stageErrorFreq.size,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Predictive error engine error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
