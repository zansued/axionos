// Repair Memory Retriever — AxionOS Sprint 23
// Fetches historical repair evidence for policy engine decisions.

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { MemoryEvidence } from "./repair-policy-engine.ts";

/**
 * Retrieve structured memory evidence for repair policy selection.
 * Queries error patterns, strategy effectiveness, and recent decisions.
 */
export async function retrieveRepairMemory(
  sc: SupabaseClient,
  organizationId: string,
  errorCategory: string,
  stageKey: string,
): Promise<MemoryEvidence> {
  const [patternsRes, effectivenessRes, decisionsRes] = await Promise.all([
    sc.from("error_patterns")
      .select("error_category, success_rate, successful_strategies")
      .eq("organization_id", organizationId)
      .eq("error_category", errorCategory)
      .order("frequency", { ascending: false })
      .limit(5),

    sc.from("strategy_effectiveness_metrics")
      .select("repair_strategy, success_rate, attempts_total")
      .eq("organization_id", organizationId)
      .eq("error_category", errorCategory)
      .order("success_rate", { ascending: false })
      .limit(10),

    sc.from("repair_policy_decisions")
      .select("selected_strategy, outcome_status")
      .eq("organization_id", organizationId)
      .eq("stage_key", stageKey)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return {
    error_patterns: (patternsRes.data || []).map((p: any) => ({
      error_category: p.error_category,
      success_rate: p.success_rate ?? 0,
      successful_strategies: p.successful_strategies || [],
    })),
    strategy_effectiveness: (effectivenessRes.data || []).map((s: any) => ({
      repair_strategy: s.repair_strategy,
      success_rate: s.success_rate ?? 0,
      attempts_total: s.attempts_total ?? 0,
    })),
    recent_decisions: (decisionsRes.data || []).map((d: any) => ({
      selected_strategy: d.selected_strategy,
      outcome_status: d.outcome_status,
    })),
  };
}

/**
 * Fetch the best matching policy profile for a given context.
 */
export async function fetchPolicyProfile(
  sc: SupabaseClient,
  organizationId: string,
  stageKey: string,
  errorSignature: string,
) {
  const { data } = await sc
    .from("repair_policy_profiles")
    .select("id, preferred_strategy, fallback_strategy, confidence, support_count, failure_count, avg_retry_count, avg_repair_cost_usd, status")
    .eq("organization_id", organizationId)
    .eq("stage_key", stageKey)
    .eq("error_signature", errorSignature)
    .eq("status", "active")
    .order("confidence", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data || null;
}
