import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";
import type { DecisionSource, StrategyRanking } from "../_shared/contracts/repair-routing.schema.ts";
import { normalizeErrorSignature } from "../_shared/repair/error-signature-normalizer.ts";

/**
 * Adaptive Repair Routing Engine — AxionOS Sprint 9
 *
 * Selects the optimal repair strategy based on:
 *   1. Historical strategy effectiveness (strategy_effectiveness table)
 *   2. Error pattern library (error_patterns table)
 *   3. Static repair strategy map (fallback)
 *
 * Scoring formula:
 *   score = (success_rate * 0.5) + (recency_factor * 0.2) + (stage_match * 0.2) + (pattern_similarity * 0.1)
 */

const STATIC_STRATEGY_MAP: Record<string, string[]> = {
  typescript_error: ["type_safe_patching", "import_correction", "ai_contextual_patch"],
  import_error: ["import_correction", "dependency_resolution", "ai_contextual_patch"],
  dependency_error: ["dependency_resolution", "config_repair", "ai_contextual_patch"],
  build_config_error: ["config_repair", "syntax_repair", "ai_contextual_patch"],
  schema_error: ["ai_contextual_patch", "type_safe_patching"],
  runtime_error: ["ai_contextual_patch", "syntax_repair"],
  deploy_error: ["config_repair", "ai_contextual_patch"],
  unknown_error: ["ai_contextual_patch"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceKey);

    const { initiative_id, error_category, error_signature, pipeline_stage, organization_id } = await req.json();

    if (!error_category) {
      return new Response(JSON.stringify({ error: "error_category required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalized = normalizeErrorSignature(error_signature || error_category);
    const rankings: StrategyRanking[] = [];
    let decisionSource: DecisionSource = "static_map";

    // ── LAYER 1: Strategy Effectiveness (highest priority) ──
    if (organization_id) {
      const { data: effectiveness } = await serviceClient
        .from("strategy_effectiveness")
        .select("*")
        .eq("organization_id", organization_id)
        .eq("error_category", error_category)
        .gt("attempts_total", 0)
        .order("success_rate", { ascending: false });

      if (effectiveness && effectiveness.length > 0) {
        decisionSource = "strategy_effectiveness";
        const now = Date.now();

        for (const eff of effectiveness) {
          const daysSinceLast = eff.last_used_at
            ? (now - new Date(eff.last_used_at).getTime()) / 86400000
            : 30;
          const recencyFactor = Math.max(0, 1 - (daysSinceLast / 30));
          const stageMatch = pipeline_stage ? 0.8 : 0.5; // stage context bonus
          const successRate = Number(eff.success_rate) || 0;

          const score =
            (successRate * 0.5) +
            (recencyFactor * 0.2) +
            (stageMatch * 0.2) +
            (Number(eff.confidence_score || 0) * 0.1);

          rankings.push({
            strategy_id: eff.repair_strategy,
            score: Math.round(score * 1000) / 1000,
            success_rate: successRate,
            recency_factor: Math.round(recencyFactor * 100) / 100,
            stage_match: stageMatch,
            source: "strategy_effectiveness",
          });
        }
      }
    }

    // ── LAYER 2: Error Pattern Library ──
    if (organization_id) {
      const { data: patterns } = await serviceClient
        .from("error_patterns")
        .select("successful_strategies, failed_strategies, success_rate, confidence_score")
        .eq("organization_id", organization_id)
        .eq("error_category", error_category)
        .order("frequency", { ascending: false })
        .limit(5);

      if (patterns && patterns.length > 0) {
        if (rankings.length === 0) decisionSource = "pattern_library";

        for (const pattern of patterns) {
          const successfulStrategies = (pattern.successful_strategies || []) as string[];
          for (const strategy of successfulStrategies) {
            // Only add if not already ranked by effectiveness
            if (!rankings.some(r => r.strategy_id === strategy)) {
              const score = (Number(pattern.success_rate) * 0.5) +
                (Number(pattern.confidence_score) * 0.3) + 0.1;
              rankings.push({
                strategy_id: strategy,
                score: Math.round(score * 1000) / 1000,
                success_rate: Number(pattern.success_rate),
                recency_factor: 0.5,
                stage_match: 0.5,
                source: "pattern_library",
              });
            }
          }
        }
      }
    }

    // ── LAYER 3: Static Map (fallback) ──
    const staticStrategies = STATIC_STRATEGY_MAP[error_category] || STATIC_STRATEGY_MAP["unknown_error"];
    for (let i = 0; i < staticStrategies.length; i++) {
      const strategy = staticStrategies[i];
      if (!rankings.some(r => r.strategy_id === strategy)) {
        rankings.push({
          strategy_id: strategy,
          score: Math.round((0.5 - i * 0.1) * 1000) / 1000,
          success_rate: 0,
          recency_factor: 0,
          stage_match: 0.5,
          source: "static_map",
        });
      }
    }

    // Sort by score descending
    rankings.sort((a, b) => b.score - a.score);

    const selectedStrategy = rankings[0]?.strategy_id || "ai_contextual_patch";
    const confidenceScore = rankings[0]?.score || 0.3;

    // ── Persist routing decision ──
    const routingId = crypto.randomUUID();
    await serviceClient.from("repair_routing_log").insert({
      id: routingId,
      initiative_id: initiative_id || null,
      organization_id: organization_id || null,
      error_category,
      error_signature: normalized,
      pipeline_stage: pipeline_stage || "build_repair",
      selected_strategy: selectedStrategy,
      strategy_rankings: rankings,
      confidence_score: confidenceScore,
      decision_source: decisionSource,
    });

    return new Response(JSON.stringify({
      routing_id: routingId,
      selected_strategy: selectedStrategy,
      strategy_rankings: rankings,
      confidence_score: confidenceScore,
      decision_source: decisionSource,
      normalized_signature: normalized,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("Repair routing engine error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
