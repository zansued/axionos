/**
 * Architecture Meta-Agent — Sprint 18 (Memory-Aware)
 *
 * Analyzes system execution patterns and produces architecture-level recommendations.
 * Now enriched with historical memory context:
 *   - prior DesignMemory / OutcomeMemory
 *   - ARCHITECTURE_EVOLUTION_SUMMARY
 *   - prior accepted/rejected architecture-related decisions
 *   - historical alignment classification
 *
 * SAFETY: Read-only against kernel. Only produces persisted recommendations.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MetaRecommendation } from "./types.ts";
import { scoreRecommendation, generateSignature } from "./scoring.ts";
import { HistoricalContext } from "./meta-agent-memory-context.ts";
import { computeContinuityScores, determineHistoricalAlignment, ContinuityScoreInputs } from "./historical-continuity-scoring.ts";
import { checkRedundancy, hasNewEvidence } from "./historical-redundancy-guard.ts";

export async function runArchitectureMetaAgent(
  sc: SupabaseClient,
  organizationId: string,
  historyCtx?: HistoricalContext,
): Promise<MetaRecommendation[]> {
  const recommendations: MetaRecommendation[] = [];

  // 1. Gather stage failure distribution from initiative_observability
  const { data: obsData } = await sc
    .from("initiative_observability")
    .select("stage_failure_distribution, stage_durations, stage_costs, initiative_id")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!obsData || obsData.length === 0) return recommendations;

  const stageFailures: Record<string, number> = {};
  const stageDurations: Record<string, number[]> = {};
  const totalInitiatives = obsData.length;

  for (const obs of obsData) {
    const failures = obs.stage_failure_distribution as Record<string, number> | null;
    if (failures) {
      for (const [stage, count] of Object.entries(failures)) {
        stageFailures[stage] = (stageFailures[stage] || 0) + Number(count);
      }
    }
    const durations = obs.stage_durations as Record<string, number> | null;
    if (durations) {
      for (const [stage, dur] of Object.entries(durations)) {
        if (!stageDurations[stage]) stageDurations[stage] = [];
        stageDurations[stage].push(Number(dur));
      }
    }
  }

  const totalFailures = Object.values(stageFailures).reduce((a, b) => a + b, 0);

  // 2. Detect bottleneck stages (>25% of all failures)
  for (const [stage, count] of Object.entries(stageFailures)) {
    const ratio = totalFailures > 0 ? count / totalFailures : 0;
    if (ratio > 0.25 && count >= 3) {
      const avgDuration = stageDurations[stage]
        ? stageDurations[stage].reduce((a, b) => a + b, 0) / stageDurations[stage].length
        : 0;

      const scores = scoreRecommendation({
        evidence_count: count,
        recurrence_count: count,
        total_observations: totalInitiatives,
        cost_savings_estimate: 0,
        failure_rate: ratio,
        time_savings_estimate: avgDuration * 0.2,
        avg_execution_time: avgDuration,
        trend_worsening: ratio > 0.35,
        breadth: 1,
      });

      // ── Sprint 18: Historical enrichment ──
      const histEnrichment = enrichWithHistory(historyCtx, stage, "PIPELINE_OPTIMIZATION", scores);
      if (histEnrichment.suppress) continue; // Skip historically redundant weak recs

      const rec: MetaRecommendation = {
        meta_agent_type: "ARCHITECTURE_META_AGENT",
        recommendation_type: "PIPELINE_OPTIMIZATION",
        target_component: stage,
        title: `Pipeline bottleneck detected at stage "${stage}"`,
        description: `Stage "${stage}" accounts for ${(ratio * 100).toFixed(1)}% of all pipeline failures (${count}/${totalFailures}). Average duration: ${avgDuration.toFixed(0)}ms. Consider restructuring this stage or adding pre-validation.`,
        confidence_score: histEnrichment.adjustedConfidence,
        impact_score: scores.impact_score,
        priority_score: scores.priority_score,
        supporting_evidence: [
          { type: "failure_distribution", stage, failure_count: count, total: totalFailures, ratio },
          { type: "duration_stats", avg_ms: avgDuration, sample_size: stageDurations[stage]?.length || 0 },
          ...histEnrichment.evidenceItems,
        ],
        source_metrics: { stage_failures: stageFailures, ...histEnrichment.sourceMetrics },
        source_record_ids: obsData.slice(0, 5).map((o) => o.initiative_id),
        recommendation_signature: generateSignature(
          "ARCHITECTURE_META_AGENT", "PIPELINE_OPTIMIZATION", stage, `failures_${count}`
        ),
      };

      recommendations.push(rec);
    }
  }

  // 3. Detect stages that could be split (high duration + high failure)
  for (const [stage, durations] of Object.entries(stageDurations)) {
    if (durations.length < 3) continue;
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const failCount = stageFailures[stage] || 0;
    const failRatio = totalFailures > 0 ? failCount / totalFailures : 0;

    if (avg > 30000 && failRatio > 0.15) {
      const scores = scoreRecommendation({
        evidence_count: durations.length,
        recurrence_count: failCount,
        total_observations: totalInitiatives,
        cost_savings_estimate: 0,
        failure_rate: failRatio,
        time_savings_estimate: avg * 0.3,
        avg_execution_time: avg,
        trend_worsening: false,
        breadth: 1,
      });

      const histEnrichment = enrichWithHistory(historyCtx, stage, "STAGE_SPLIT_OR_MERGE", scores);
      if (histEnrichment.suppress) continue;

      recommendations.push({
        meta_agent_type: "ARCHITECTURE_META_AGENT",
        recommendation_type: "STAGE_SPLIT_OR_MERGE",
        target_component: stage,
        title: `Consider splitting stage "${stage}"`,
        description: `Stage "${stage}" has high avg duration (${(avg / 1000).toFixed(1)}s) and ${(failRatio * 100).toFixed(1)}% failure contribution. Splitting into focused sub-stages could improve isolation and reduce cascading failures.`,
        confidence_score: histEnrichment.adjustedConfidence,
        impact_score: scores.impact_score,
        priority_score: scores.priority_score,
        supporting_evidence: [
          { type: "duration_analysis", avg_ms: avg, sample_size: durations.length },
          { type: "failure_contribution", count: failCount, ratio: failRatio },
          ...histEnrichment.evidenceItems,
        ],
        source_metrics: { avg_duration_ms: avg, fail_ratio: failRatio, ...histEnrichment.sourceMetrics },
        source_record_ids: [],
        recommendation_signature: generateSignature(
          "ARCHITECTURE_META_AGENT", "STAGE_SPLIT_OR_MERGE", stage, `dur_${Math.round(avg)}`
        ),
      });
    }
  }

  return recommendations;
}

// ── Historical enrichment helper ──

interface HistoryEnrichment {
  suppress: boolean;
  adjustedConfidence: number;
  evidenceItems: Record<string, unknown>[];
  sourceMetrics: Record<string, unknown>;
}

function enrichWithHistory(
  ctx: HistoricalContext | undefined,
  targetComponent: string,
  recType: string,
  currentScores: { confidence_score: number; impact_score: number },
): HistoryEnrichment {
  if (!ctx || ctx.historical_context_score === 0) {
    return {
      suppress: false,
      adjustedConfidence: currentScores.confidence_score,
      evidenceItems: [],
      sourceMetrics: {},
    };
  }

  // Build continuity inputs from historical context
  const relevantDecisions = ctx.related_decisions.filter(
    (d) => d.recommendation_type === recType
  );
  const accepted = relevantDecisions.filter((d) => d.status === "accepted").length;
  const rejected = relevantDecisions.filter((d) => d.status === "rejected").length;
  const deferred = relevantDecisions.filter((d) => d.status === "deferred").length;

  const continuityInputs: ContinuityScoreInputs = {
    related_memory_count: ctx.related_memory_entries.length,
    related_summary_count: ctx.related_summaries.length,
    accepted_decisions: accepted,
    rejected_decisions: rejected,
    deferred_decisions: deferred,
    implemented_outcomes: ctx.related_outcomes.length,
    outcome_success_rate: ctx.related_outcomes.length > 0 ? 0.7 : 0, // simplified
    recurrence_across_windows: relevantDecisions.length > 0 ? 1 : 0,
  };

  const contScores = computeContinuityScores(continuityInputs);
  const alignment = determineHistoricalAlignment(contScores, continuityInputs);

  // Redundancy check
  const redundancy = checkRedundancy({
    current_confidence: currentScores.confidence_score,
    current_impact: currentScores.impact_score,
    prior_rejections: rejected,
    prior_acceptances: accepted,
    prior_deferrals: deferred,
    days_since_last_similar: relevantDecisions.length > 0
      ? Math.round((Date.now() - new Date(relevantDecisions[0].created_at).getTime()) / 86400000)
      : null,
    supporting_memory_count: ctx.related_memory_entries.length,
    has_new_evidence: hasNewEvidence(
      currentScores.confidence_score > 0.6 ? 3 : 1,
      rejected > 0 ? 2 : 0,
      currentScores.confidence_score,
      rejected > 0 ? 0.4 : 0,
    ),
    historical_context_score: ctx.historical_context_score,
  });

  if (redundancy.suppress) {
    return { suppress: true, adjustedConfidence: 0, evidenceItems: [], sourceMetrics: {} };
  }

  const adjustedConfidence = Math.round(
    Math.max(0, Math.min(1, currentScores.confidence_score + redundancy.confidence_adjustment)) * 1000
  ) / 1000;

  const evidenceItems: Record<string, unknown>[] = [
    {
      type: "historical_context",
      historical_alignment: alignment,
      historical_support_score: contScores.historical_support_score,
      historical_conflict_score: contScores.historical_conflict_score,
      historical_context_score: contScores.historical_context_score,
      prior_accepted: accepted,
      prior_rejected: rejected,
      related_memories: ctx.related_memory_entries.length,
      related_summaries: ctx.related_summaries.length,
      novelty_flag: redundancy.novelty_flag,
    },
  ];

  return {
    suppress: false,
    adjustedConfidence,
    evidenceItems,
    sourceMetrics: {
      historical_alignment: alignment,
      historical_context_score: ctx.historical_context_score,
    },
  };
}
