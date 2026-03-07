/**
 * Meta-Agent Memory Context — Sprint 18
 *
 * Gathers relevant memory entries, summaries, prior decisions, and outcomes
 * for each Meta-Agent type. Returns compact, ranked historical context.
 *
 * SAFETY: Read-only, advisory only. Degrades gracefully on failure.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Types ───

export interface HistoricalContext {
  related_memory_entries: MemoryContextItem[];
  related_summaries: SummaryContextItem[];
  related_decisions: DecisionContextItem[];
  related_outcomes: OutcomeContextItem[];
  historical_context_score: number;
}

export interface MemoryContextItem {
  id: string;
  memory_type: string;
  title: string;
  summary: string;
  confidence_score: number;
  created_at: string;
}

export interface SummaryContextItem {
  id: string;
  summary_type: string;
  title: string;
  signal_strength: number;
  period_start: string;
  period_end: string;
}

export interface DecisionContextItem {
  id: string;
  title: string;
  status: string;
  recommendation_type: string;
  created_at: string;
}

export interface OutcomeContextItem {
  id: string;
  title: string;
  memory_type: string;
  summary: string;
  created_at: string;
}

// ─── Config per Meta-Agent ───

const AGENT_MEMORY_CONFIG: Record<string, {
  memory_types: string[];
  summary_types: string[];
}> = {
  ARCHITECTURE_META_AGENT: {
    memory_types: ["DesignMemory", "OutcomeMemory", "DecisionMemory"],
    summary_types: ["ARCHITECTURE_EVOLUTION_SUMMARY", "FAILURE_PATTERN_SUMMARY"],
  },
  AGENT_ROLE_DESIGNER: {
    memory_types: ["DesignMemory", "DecisionMemory", "OutcomeMemory"],
    summary_types: ["RECOMMENDATION_DECISION_SUMMARY", "ARTIFACT_OUTCOME_SUMMARY"],
  },
  WORKFLOW_OPTIMIZER: {
    memory_types: ["StrategyMemory", "OutcomeMemory", "ErrorMemory"],
    summary_types: ["FAILURE_PATTERN_SUMMARY", "MEMORY_RETRIEVAL_SUMMARY", "STRATEGY_EFFECTIVENESS_SUMMARY"],
  },
  SYSTEM_EVOLUTION_ADVISOR: {
    memory_types: ["DesignMemory", "OutcomeMemory", "DecisionMemory", "StrategyMemory"],
    summary_types: [
      "ARCHITECTURE_EVOLUTION_SUMMARY", "FAILURE_PATTERN_SUMMARY",
      "STRATEGY_EFFECTIVENESS_SUMMARY", "RECOMMENDATION_DECISION_SUMMARY",
      "ARTIFACT_OUTCOME_SUMMARY", "MEMORY_RETRIEVAL_SUMMARY",
    ],
  },
};

const EMPTY_CONTEXT: HistoricalContext = {
  related_memory_entries: [],
  related_summaries: [],
  related_decisions: [],
  related_outcomes: [],
  historical_context_score: 0,
};

// ─── Main retrieval ───

export async function getMetaAgentHistoricalContext(
  sc: SupabaseClient,
  organizationId: string,
  metaAgentType: string,
  targetComponent?: string,
): Promise<HistoricalContext> {
  try {
    const config = AGENT_MEMORY_CONFIG[metaAgentType];
    if (!config) return EMPTY_CONTEXT;

    const [memories, summaries, decisions, outcomes] = await Promise.all([
      fetchMemoryEntries(sc, organizationId, config.memory_types, targetComponent),
      fetchSummaries(sc, organizationId, config.summary_types),
      fetchPriorDecisions(sc, organizationId, metaAgentType, targetComponent),
      fetchPriorOutcomes(sc, organizationId, targetComponent),
    ]);

    const historical_context_score = computeHistoricalContextScore(
      memories.length, summaries.length, decisions.length, outcomes.length
    );

    // Log retrieval (fire-and-forget)
    logMemoryContextRetrieval(sc, organizationId, metaAgentType, memories, summaries).catch(() => {});

    return {
      related_memory_entries: memories.slice(0, 5),
      related_summaries: summaries.slice(0, 3),
      related_decisions: decisions.slice(0, 5),
      related_outcomes: outcomes.slice(0, 5),
      historical_context_score,
    };
  } catch (e) {
    console.warn(`Memory context retrieval failed for ${metaAgentType} (non-blocking):`, e);
    return EMPTY_CONTEXT;
  }
}

// ─── Sub-queries ───

async function fetchMemoryEntries(
  sc: SupabaseClient, orgId: string, types: string[], component?: string
): Promise<MemoryContextItem[]> {
  let q = sc.from("engineering_memory_entries")
    .select("id, memory_type, title, summary, confidence_score, created_at")
    .eq("organization_id", orgId)
    .in("memory_type", types)
    .gte("confidence_score", 0.3)
    .order("confidence_score", { ascending: false })
    .limit(15);

  if (component) q = q.eq("related_component", component);

  const { data } = await q;
  return (data || []) as MemoryContextItem[];
}

async function fetchSummaries(
  sc: SupabaseClient, orgId: string, types: string[]
): Promise<SummaryContextItem[]> {
  const { data } = await sc.from("memory_summaries")
    .select("id, summary_type, title, signal_strength, period_start, period_end")
    .eq("organization_id", orgId)
    .in("summary_type", types)
    .order("signal_strength", { ascending: false })
    .limit(5);

  return (data || []) as SummaryContextItem[];
}

async function fetchPriorDecisions(
  sc: SupabaseClient, orgId: string, agentType: string, component?: string
): Promise<DecisionContextItem[]> {
  let q = sc.from("meta_agent_recommendations")
    .select("id, title, status, recommendation_type, created_at")
    .eq("organization_id", orgId)
    .eq("meta_agent_type", agentType)
    .in("status", ["accepted", "rejected", "deferred"])
    .order("created_at", { ascending: false })
    .limit(10);

  if (component) q = q.eq("target_component", component);

  const { data } = await q;
  return (data || []) as DecisionContextItem[];
}

async function fetchPriorOutcomes(
  sc: SupabaseClient, orgId: string, component?: string
): Promise<OutcomeContextItem[]> {
  let q = sc.from("engineering_memory_entries")
    .select("id, title, memory_type, summary, created_at")
    .eq("organization_id", orgId)
    .eq("memory_type", "OutcomeMemory")
    .order("created_at", { ascending: false })
    .limit(10);

  if (component) q = q.eq("related_component", component);

  const { data } = await q;
  return (data || []) as OutcomeContextItem[];
}

// ─── Historical context score ───
// Deterministic, rule-based. Reflects how much historical evidence is available.

function computeHistoricalContextScore(
  memoryCount: number, summaryCount: number, decisionCount: number, outcomeCount: number
): number {
  // Memory weight: log scale, max at ~10
  const memorySignal = Math.min(1, Math.log(memoryCount + 1) / Math.log(11));
  // Summary weight: linear, max at 3
  const summarySignal = Math.min(1, summaryCount / 3);
  // Decision weight: log scale, max at ~5
  const decisionSignal = Math.min(1, Math.log(decisionCount + 1) / Math.log(6));
  // Outcome weight: log scale, max at ~5
  const outcomeSignal = Math.min(1, Math.log(outcomeCount + 1) / Math.log(6));

  const score = memorySignal * 0.3 + summarySignal * 0.2 + decisionSignal * 0.3 + outcomeSignal * 0.2;
  return Math.round(Math.min(1, Math.max(0, score)) * 1000) / 1000;
}

// ─── Logging ───

async function logMemoryContextRetrieval(
  sc: SupabaseClient, orgId: string, agentType: string,
  memories: MemoryContextItem[], summaries: SummaryContextItem[]
): Promise<void> {
  if (memories.length === 0 && summaries.length === 0) return;

  const logs = memories.map((m) => ({
    organization_id: orgId,
    memory_id: m.id,
    retrieved_by_component: agentType,
    retrieval_context: "meta_agent_analysis",
    used_in_decision: false,
  }));

  if (logs.length > 0) {
    await sc.from("memory_retrieval_log").insert(logs);
  }
}
