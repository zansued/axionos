// Learning Signal Storage — AxionOS Sprint 155
// Persists and retrieves learning signals via Supabase.

import type { LearningSignal } from "./learning-signal-types.ts";
import { routeSignals } from "./learning-signal-routing.ts";

/**
 * Persist an array of learning signals into the database.
 * Enriches routing targets before insertion.
 * Returns inserted rows or error.
 */
export async function persistSignals(
  supabase: any,
  signals: LearningSignal[],
): Promise<{ data: any[] | null; error: any }> {
  if (signals.length === 0) return { data: [], error: null };

  const enriched = routeSignals(signals).map((s) => ({
    organization_id: s.organization_id,
    source_type: s.source_type,
    source_id: s.source_id,
    initiative_id: s.initiative_id,
    stage: s.stage,
    signal_type: s.signal_type,
    severity: s.severity,
    confidence: s.confidence,
    summary: s.summary,
    explanation: s.explanation || "",
    related_action_id: s.related_action_id,
    related_outcome_id: s.related_outcome_id,
    related_canon_entry_ids: s.related_canon_entry_ids || [],
    related_agent_id: s.related_agent_id,
    related_policy_decision_id: s.related_policy_decision_id,
    related_recovery_hook_id: s.related_recovery_hook_id,
    routing_target: s.routing_target,
    aggregation_key: s.aggregation_key,
    aggregation_count: s.aggregation_count || 1,
    metadata: s.metadata || {},
  }));

  const { data, error } = await supabase
    .from("learning_signals")
    .insert(enriched)
    .select();

  return { data, error };
}

/**
 * Query learning signals with optional filters.
 */
export async function querySignals(
  supabase: any,
  organizationId: string,
  filters: {
    signal_type?: string;
    routing_target?: string;
    stage?: string;
    min_confidence?: number;
    limit?: number;
  } = {},
): Promise<{ data: any[]; error: any }> {
  let query = supabase
    .from("learning_signals")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (filters.signal_type) query = query.eq("signal_type", filters.signal_type);
  if (filters.routing_target) query = query.eq("routing_target", filters.routing_target);
  if (filters.stage) query = query.eq("stage", filters.stage);
  if (filters.min_confidence) query = query.gte("confidence", filters.min_confidence);

  const { data, error } = await query.limit(filters.limit || 200);
  return { data: data || [], error };
}

/**
 * Aggregate signal counts by type, stage, and routing target.
 */
export async function aggregateSignalSummary(
  supabase: any,
  organizationId: string,
): Promise<{
  by_type: Record<string, number>;
  by_stage: Record<string, number>;
  by_routing: Record<string, number>;
  high_confidence: number;
  total: number;
}> {
  const { data } = await supabase
    .from("learning_signals")
    .select("signal_type, stage, routing_target, confidence")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1000);

  const rows = data || [];
  const by_type: Record<string, number> = {};
  const by_stage: Record<string, number> = {};
  const by_routing: Record<string, number> = {};
  let high_confidence = 0;

  for (const r of rows) {
    by_type[r.signal_type] = (by_type[r.signal_type] || 0) + 1;
    if (r.stage) by_stage[r.stage] = (by_stage[r.stage] || 0) + 1;
    by_routing[r.routing_target] = (by_routing[r.routing_target] || 0) + 1;
    if (r.confidence >= 0.7) high_confidence++;
  }

  return { by_type, by_stage, by_routing, high_confidence, total: rows.length };
}
