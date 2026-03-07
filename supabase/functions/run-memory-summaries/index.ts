import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, AuthContext } from "../_shared/auth.ts";
import { computeSignalStrength, SignalStrengthInputs } from "../_shared/memory-summary-scoring.ts";

/**
 * run-memory-summaries — Sprint 17
 *
 * Generates deterministic memory summaries for an organization.
 *
 * POST { organization_id, period_days?, summary_types? }
 *
 * Actions:
 *   generate    — Generate summaries for given period (default)
 *   list        — List existing summaries
 *   detail      — Get summary by id
 *   metrics     — Summary observability metrics
 *
 * SAFETY: Read-only synthesis. Never mutates system behavior.
 */

const VALID_SUMMARY_TYPES = [
  "FAILURE_PATTERN_SUMMARY",
  "STRATEGY_EFFECTIVENESS_SUMMARY",
  "RECOMMENDATION_DECISION_SUMMARY",
  "ARTIFACT_OUTCOME_SUMMARY",
  "ARCHITECTURE_EVOLUTION_SUMMARY",
  "MEMORY_RETRIEVAL_SUMMARY",
];

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = await authenticate(req);
    if (auth instanceof Response) return auth;
    const { user, serviceClient: sc } = auth as AuthContext;

    const body = await req.json();
    const { action = "generate", organization_id } = body;
    if (!organization_id) return errorResponse("organization_id required", 400);

    // ─── LIST ───
    if (action === "list") {
      let q = sc
        .from("memory_summaries")
        .select("*", { count: "exact" })
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false })
        .limit(Math.min(body.limit || 50, 50));

      if (body.summary_type) q = q.eq("summary_type", body.summary_type);
      if (body.period_after) q = q.gte("period_start", body.period_after);

      const { data, count, error } = await q;
      if (error) return errorResponse("Failed to list summaries", 500);
      return jsonResponse({ summaries: data || [], total_count: count || 0 });
    }

    // ─── DETAIL ───
    if (action === "detail") {
      if (!body.summary_id) return errorResponse("summary_id required", 400);
      const { data, error } = await sc
        .from("memory_summaries")
        .select("*")
        .eq("id", body.summary_id)
        .eq("organization_id", organization_id)
        .single();
      if (error || !data) return errorResponse("Summary not found", 404);
      return jsonResponse(data);
    }

    // ─── METRICS ───
    if (action === "metrics") {
      const { data: all } = await sc
        .from("memory_summaries")
        .select("summary_type, signal_strength, created_at")
        .eq("organization_id", organization_id);

      const byType: Record<string, number> = {};
      let totalStrength = 0;
      (all || []).forEach((s: any) => {
        byType[s.summary_type] = (byType[s.summary_type] || 0) + 1;
        totalStrength += Number(s.signal_strength || 0);
      });

      const count = all?.length || 0;
      return jsonResponse({
        total_summaries: count,
        by_type: byType,
        avg_signal_strength: count > 0 ? Math.round((totalStrength / count) * 1000) / 1000 : 0,
      });
    }

    // ─── GENERATE ───
    const periodDays = body.period_days || 7;
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const typesToGenerate = body.summary_types && Array.isArray(body.summary_types)
      ? body.summary_types.filter((t: string) => VALID_SUMMARY_TYPES.includes(t))
      : VALID_SUMMARY_TYPES;

    const results: Record<string, { created: boolean; signal_strength: number; reason?: string }> = {};

    for (const summaryType of typesToGenerate) {
      try {
        const result = await generateSummary(sc, organization_id, summaryType, periodStart, periodEnd);
        results[summaryType] = result;
      } catch (e) {
        console.error(`Summary generation error for ${summaryType}:`, e);
        results[summaryType] = { created: false, signal_strength: 0, reason: "generation_error" };
      }
    }

    // Audit log
    await sc.from("audit_logs").insert({
      user_id: user.id,
      action: "MEMORY_SUMMARY_RUN",
      category: "engineering_memory",
      message: `Memory summaries generated for ${periodDays}d period`,
      organization_id,
      metadata: { period_days: periodDays, results },
    }).catch(() => {});

    return jsonResponse({
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      results,
    });
  } catch (e) {
    console.error("run-memory-summaries error:", e);
    return errorResponse(e.message || "Internal error", 500);
  }
});

// ─── Summary Generators ───

async function generateSummary(
  sc: any,
  orgId: string,
  summaryType: string,
  periodStart: Date,
  periodEnd: Date
): Promise<{ created: boolean; signal_strength: number; reason?: string }> {
  const pStart = periodStart.toISOString();
  const pEnd = periodEnd.toISOString();

  // Check for duplicate
  const { data: existing } = await sc
    .from("memory_summaries")
    .select("id")
    .eq("organization_id", orgId)
    .eq("summary_type", summaryType)
    .eq("period_start", pStart)
    .eq("period_end", pEnd)
    .limit(1);

  if (existing && existing.length > 0) {
    return { created: false, signal_strength: 0, reason: "duplicate" };
  }

  // Route to specific generator
  switch (summaryType) {
    case "FAILURE_PATTERN_SUMMARY":
      return generateFailurePatternSummary(sc, orgId, pStart, pEnd);
    case "STRATEGY_EFFECTIVENESS_SUMMARY":
      return generateStrategyEffectivenessSummary(sc, orgId, pStart, pEnd);
    case "RECOMMENDATION_DECISION_SUMMARY":
      return generateRecommendationDecisionSummary(sc, orgId, pStart, pEnd);
    case "ARTIFACT_OUTCOME_SUMMARY":
      return generateArtifactOutcomeSummary(sc, orgId, pStart, pEnd);
    case "ARCHITECTURE_EVOLUTION_SUMMARY":
      return generateArchitectureEvolutionSummary(sc, orgId, pStart, pEnd);
    case "MEMORY_RETRIEVAL_SUMMARY":
      return generateMemoryRetrievalSummary(sc, orgId, pStart, pEnd);
    default:
      return { created: false, signal_strength: 0, reason: "unknown_type" };
  }
}

async function generateFailurePatternSummary(
  sc: any, orgId: string, pStart: string, pEnd: string
): Promise<{ created: boolean; signal_strength: number }> {
  const { data: entries } = await sc
    .from("engineering_memory_entries")
    .select("id, memory_subtype, related_stage, related_component, confidence_score, times_retrieved, tags")
    .eq("organization_id", orgId)
    .eq("memory_type", "ErrorMemory")
    .gte("created_at", pStart)
    .lte("created_at", pEnd);

  const items = entries || [];
  if (items.length === 0) return { created: false, signal_strength: 0, reason: "no_data" } as any;

  const subtypeCounts: Record<string, number> = {};
  const stageCounts: Record<string, number> = {};
  const componentCounts: Record<string, number> = {};
  items.forEach((e: any) => {
    if (e.memory_subtype) subtypeCounts[e.memory_subtype] = (subtypeCounts[e.memory_subtype] || 0) + 1;
    if (e.related_stage) stageCounts[e.related_stage] = (stageCounts[e.related_stage] || 0) + 1;
    if (e.related_component) componentCounts[e.related_component] = (componentCounts[e.related_component] || 0) + 1;
  });

  const topSubtypes = Object.entries(subtypeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topStages = Object.entries(stageCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const signal = computeSignalStrength({
    entry_count: items.length,
    breadth: Object.keys(componentCounts).length,
    linked_outcome_count: 0,
    avg_confidence: items.reduce((a: number, e: any) => a + Number(e.confidence_score || 0), 0) / items.length,
    avg_retrieval_count: items.reduce((a: number, e: any) => a + (e.times_retrieved || 0), 0) / items.length,
  });

  const content = {
    top_patterns: topSubtypes.map(([subtype, count]) => ({ subtype, count })),
    affected_stages: topStages.map(([stage, count]) => ({ stage, count })),
    affected_components: Object.keys(componentCounts),
    trend_direction: items.length > 5 ? "recurring" : "isolated",
    total_failures: items.length,
  };

  await sc.from("memory_summaries").insert({
    organization_id: orgId,
    summary_type: "FAILURE_PATTERN_SUMMARY",
    period_start: pStart,
    period_end: pEnd,
    title: `Failure patterns: ${topSubtypes[0]?.[0] || "mixed"} (${items.length} events)`,
    content,
    source_memory_ids: items.map((e: any) => e.id),
    entry_count: items.length,
    signal_strength: signal,
  });

  return { created: true, signal_strength: signal };
}

async function generateStrategyEffectivenessSummary(
  sc: any, orgId: string, pStart: string, pEnd: string
): Promise<{ created: boolean; signal_strength: number }> {
  const { data: entries } = await sc
    .from("engineering_memory_entries")
    .select("id, memory_subtype, title, summary, confidence_score, times_retrieved, related_component")
    .eq("organization_id", orgId)
    .eq("memory_type", "StrategyMemory")
    .gte("created_at", pStart)
    .lte("created_at", pEnd);

  const items = entries || [];
  if (items.length === 0) return { created: false, signal_strength: 0, reason: "no_data" } as any;

  const signal = computeSignalStrength({
    entry_count: items.length,
    breadth: new Set(items.map((e: any) => e.related_component).filter(Boolean)).size,
    linked_outcome_count: 0,
    avg_confidence: items.reduce((a: number, e: any) => a + Number(e.confidence_score || 0), 0) / items.length,
    avg_retrieval_count: items.reduce((a: number, e: any) => a + (e.times_retrieved || 0), 0) / items.length,
  });

  const content = {
    strategies_tracked: items.length,
    top_strategies: items.sort((a: any, b: any) => Number(b.confidence_score) - Number(a.confidence_score)).slice(0, 5).map((e: any) => ({ title: e.title, confidence: e.confidence_score })),
  };

  await sc.from("memory_summaries").insert({
    organization_id: orgId,
    summary_type: "STRATEGY_EFFECTIVENESS_SUMMARY",
    period_start: pStart,
    period_end: pEnd,
    title: `Strategy effectiveness: ${items.length} strategies tracked`,
    content,
    source_memory_ids: items.map((e: any) => e.id),
    entry_count: items.length,
    signal_strength: signal,
  });

  return { created: true, signal_strength: signal };
}

async function generateRecommendationDecisionSummary(
  sc: any, orgId: string, pStart: string, pEnd: string
): Promise<{ created: boolean; signal_strength: number }> {
  const { data: entries } = await sc
    .from("engineering_memory_entries")
    .select("id, memory_subtype, related_component, confidence_score, times_retrieved, tags")
    .eq("organization_id", orgId)
    .eq("memory_type", "DesignMemory")
    .gte("created_at", pStart)
    .lte("created_at", pEnd);

  const items = entries || [];
  if (items.length === 0) return { created: false, signal_strength: 0, reason: "no_data" } as any;

  const accepted = items.filter((e: any) => e.memory_subtype === "recommendation_accepted").length;
  const artifacts = items.filter((e: any) => e.memory_subtype === "artifact_approved").length;

  const signal = computeSignalStrength({
    entry_count: items.length,
    breadth: new Set(items.map((e: any) => e.related_component).filter(Boolean)).size,
    linked_outcome_count: accepted + artifacts,
    avg_confidence: items.reduce((a: number, e: any) => a + Number(e.confidence_score || 0), 0) / items.length,
    avg_retrieval_count: items.reduce((a: number, e: any) => a + (e.times_retrieved || 0), 0) / items.length,
  });

  const content = {
    total_decisions: items.length,
    recommendations_accepted: accepted,
    artifacts_approved: artifacts,
    by_subtype: items.reduce((acc: Record<string, number>, e: any) => {
      acc[e.memory_subtype] = (acc[e.memory_subtype] || 0) + 1;
      return acc;
    }, {}),
  };

  await sc.from("memory_summaries").insert({
    organization_id: orgId,
    summary_type: "RECOMMENDATION_DECISION_SUMMARY",
    period_start: pStart,
    period_end: pEnd,
    title: `Recommendation decisions: ${accepted} accepted, ${artifacts} artifacts approved`,
    content,
    source_memory_ids: items.map((e: any) => e.id),
    entry_count: items.length,
    signal_strength: signal,
  });

  return { created: true, signal_strength: signal };
}

async function generateArtifactOutcomeSummary(
  sc: any, orgId: string, pStart: string, pEnd: string
): Promise<{ created: boolean; signal_strength: number }> {
  const { data: entries } = await sc
    .from("engineering_memory_entries")
    .select("id, memory_subtype, related_component, related_stage, confidence_score, times_retrieved")
    .eq("organization_id", orgId)
    .eq("memory_type", "OutcomeMemory")
    .gte("created_at", pStart)
    .lte("created_at", pEnd);

  const items = entries || [];
  if (items.length === 0) return { created: false, signal_strength: 0, reason: "no_data" } as any;

  const signal = computeSignalStrength({
    entry_count: items.length,
    breadth: new Set(items.map((e: any) => e.related_component).filter(Boolean)).size,
    linked_outcome_count: items.length,
    avg_confidence: items.reduce((a: number, e: any) => a + Number(e.confidence_score || 0), 0) / items.length,
    avg_retrieval_count: items.reduce((a: number, e: any) => a + (e.times_retrieved || 0), 0) / items.length,
  });

  const content = {
    total_outcomes: items.length,
    by_subtype: items.reduce((acc: Record<string, number>, e: any) => {
      acc[e.memory_subtype] = (acc[e.memory_subtype] || 0) + 1;
      return acc;
    }, {}),
    affected_components: [...new Set(items.map((e: any) => e.related_component).filter(Boolean))],
  };

  await sc.from("memory_summaries").insert({
    organization_id: orgId,
    summary_type: "ARTIFACT_OUTCOME_SUMMARY",
    period_start: pStart,
    period_end: pEnd,
    title: `Artifact outcomes: ${items.length} implemented changes tracked`,
    content,
    source_memory_ids: items.map((e: any) => e.id),
    entry_count: items.length,
    signal_strength: signal,
  });

  return { created: true, signal_strength: signal };
}

async function generateArchitectureEvolutionSummary(
  sc: any, orgId: string, pStart: string, pEnd: string
): Promise<{ created: boolean; signal_strength: number }> {
  // Combines design + outcome + error entries
  const { data: entries } = await sc
    .from("engineering_memory_entries")
    .select("id, memory_type, memory_subtype, related_component, related_stage, confidence_score, times_retrieved")
    .eq("organization_id", orgId)
    .in("memory_type", ["DesignMemory", "OutcomeMemory", "ErrorMemory"])
    .gte("created_at", pStart)
    .lte("created_at", pEnd);

  const items = entries || [];
  if (items.length === 0) return { created: false, signal_strength: 0, reason: "no_data" } as any;

  const componentPressure: Record<string, number> = {};
  items.forEach((e: any) => {
    if (e.related_component) componentPressure[e.related_component] = (componentPressure[e.related_component] || 0) + 1;
  });

  const hotComponents = Object.entries(componentPressure).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const signal = computeSignalStrength({
    entry_count: items.length,
    breadth: Object.keys(componentPressure).length,
    linked_outcome_count: items.filter((e: any) => e.memory_type === "OutcomeMemory").length,
    avg_confidence: items.reduce((a: number, e: any) => a + Number(e.confidence_score || 0), 0) / items.length,
    avg_retrieval_count: items.reduce((a: number, e: any) => a + (e.times_retrieved || 0), 0) / items.length,
  });

  const content = {
    total_signals: items.length,
    hot_components: hotComponents.map(([component, count]) => ({ component, count })),
    by_memory_type: items.reduce((acc: Record<string, number>, e: any) => {
      acc[e.memory_type] = (acc[e.memory_type] || 0) + 1;
      return acc;
    }, {}),
    evolution_pressure: hotComponents.length > 3 ? "high" : hotComponents.length > 1 ? "medium" : "low",
  };

  await sc.from("memory_summaries").insert({
    organization_id: orgId,
    summary_type: "ARCHITECTURE_EVOLUTION_SUMMARY",
    period_start: pStart,
    period_end: pEnd,
    title: `Architecture evolution: ${hotComponents[0]?.[0] || "system"} (${items.length} signals)`,
    content,
    source_memory_ids: items.map((e: any) => e.id),
    entry_count: items.length,
    signal_strength: signal,
  });

  return { created: true, signal_strength: signal };
}

async function generateMemoryRetrievalSummary(
  sc: any, orgId: string, pStart: string, pEnd: string
): Promise<{ created: boolean; signal_strength: number }> {
  const { data: logs } = await sc
    .from("memory_retrieval_log")
    .select("memory_id, retrieval_context, used_in_decision")
    .eq("organization_id", orgId)
    .gte("created_at", pStart)
    .lte("created_at", pEnd);

  const items = logs || [];
  if (items.length === 0) return { created: false, signal_strength: 0, reason: "no_data" } as any;

  const byContext: Record<string, number> = {};
  let decisionCount = 0;
  const memoryUsage: Record<string, number> = {};
  items.forEach((l: any) => {
    byContext[l.retrieval_context] = (byContext[l.retrieval_context] || 0) + 1;
    if (l.used_in_decision) decisionCount++;
    memoryUsage[l.memory_id] = (memoryUsage[l.memory_id] || 0) + 1;
  });

  const topMemories = Object.entries(memoryUsage).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const signal = computeSignalStrength({
    entry_count: items.length,
    breadth: Object.keys(byContext).length,
    linked_outcome_count: decisionCount,
    avg_confidence: 0.5,
    avg_retrieval_count: items.length / Math.max(1, Object.keys(memoryUsage).length),
  });

  const content = {
    total_retrievals: items.length,
    by_context: byContext,
    decision_assisted: decisionCount,
    most_reused_memories: topMemories.map(([id, count]) => ({ memory_id: id, count })),
  };

  await sc.from("memory_summaries").insert({
    organization_id: orgId,
    summary_type: "MEMORY_RETRIEVAL_SUMMARY",
    period_start: pStart,
    period_end: pEnd,
    title: `Memory retrieval: ${items.length} retrievals, ${decisionCount} decision-assisted`,
    content,
    source_memory_ids: topMemories.map(([id]) => id),
    entry_count: items.length,
    signal_strength: signal,
  });

  return { created: true, signal_strength: signal };
}
