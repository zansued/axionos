/**
 * Agent Role Designer Meta-Agent — Sprint 18 (Memory-Aware)
 *
 * Detects when current agent role structure is insufficient or overloaded.
 * Proposes new roles, specializations, or deprecations.
 * Now enriched with historical context: prior role proposals, decisions, outcomes.
 *
 * SAFETY: Read-only. Only produces recommendations, never creates agents.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MetaRecommendation } from "./types.ts";
import { scoreRecommendation, generateSignature } from "./scoring.ts";
import { HistoricalContext } from "./meta-agent-memory-context.ts";
import { computeContinuityScores, determineHistoricalAlignment, ContinuityScoreInputs } from "./historical-continuity-scoring.ts";
import { checkRedundancy, hasNewEvidence } from "./historical-redundancy-guard.ts";

export async function runAgentRoleDesigner(
  sc: SupabaseClient,
  organizationId: string,
  historyCtx?: HistoricalContext,
): Promise<MetaRecommendation[]> {
  const recommendations: MetaRecommendation[] = [];

  const { data: errorPatterns } = await sc
    .from("error_patterns")
    .select("id, title, error_category, frequency, success_rate, successful_strategies, failed_strategies")
    .eq("organization_id", organizationId)
    .order("frequency", { ascending: false })
    .limit(50);

  if (!errorPatterns || errorPatterns.length === 0) return recommendations;

  const categoryStats: Record<string, { total_freq: number; avg_success: number; count: number; patterns: string[] }> = {};
  for (const ep of errorPatterns) {
    const cat = ep.error_category || "unknown";
    if (!categoryStats[cat]) categoryStats[cat] = { total_freq: 0, avg_success: 0, count: 0, patterns: [] };
    categoryStats[cat].total_freq += ep.frequency;
    categoryStats[cat].avg_success += Number(ep.success_rate);
    categoryStats[cat].count++;
    categoryStats[cat].patterns.push(ep.id);
  }

  const totalFreq = Object.values(categoryStats).reduce((a, b) => a + b.total_freq, 0);

  for (const [category, stats] of Object.entries(categoryStats)) {
    const ratio = totalFreq > 0 ? stats.total_freq / totalFreq : 0;
    const avgSuccess = stats.count > 0 ? stats.avg_success / stats.count : 0;

    if (ratio > 0.20 && avgSuccess < 50 && stats.total_freq >= 3) {
      const scores = scoreRecommendation({
        evidence_count: stats.count,
        recurrence_count: stats.total_freq,
        total_observations: totalFreq,
        cost_savings_estimate: 0,
        failure_rate: 1 - avgSuccess / 100,
        time_savings_estimate: 0,
        avg_execution_time: 0,
        trend_worsening: avgSuccess < 30,
        breadth: 1,
      });

      // Sprint 18: Historical enrichment
      const hist = buildRoleHistoryContext(historyCtx, category, "NEW_AGENT_ROLE", scores);
      if (hist.suppress) continue;

      const agentName = category
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join("") + "Agent";

      recommendations.push({
        meta_agent_type: "AGENT_ROLE_DESIGNER",
        recommendation_type: "NEW_AGENT_ROLE",
        target_component: category,
        title: `Create dedicated ${agentName}`,
        description: `Error category "${category}" represents ${(ratio * 100).toFixed(1)}% of all repair attempts (${stats.total_freq}/${totalFreq}) with only ${avgSuccess.toFixed(1)}% success rate. A specialized agent could improve repair effectiveness for this pattern.`,
        confidence_score: hist.adjustedConfidence,
        impact_score: scores.impact_score,
        priority_score: scores.priority_score,
        supporting_evidence: [
          { type: "error_category_analysis", category, frequency: stats.total_freq, ratio, avg_success: avgSuccess },
          { type: "pattern_ids", ids: stats.patterns.slice(0, 5) },
          ...hist.evidenceItems,
        ],
        source_metrics: { category_stats: categoryStats, ...hist.sourceMetrics },
        source_record_ids: stats.patterns.slice(0, 10),
        recommendation_signature: generateSignature(
          "AGENT_ROLE_DESIGNER", "NEW_AGENT_ROLE", category, `freq_${stats.total_freq}`
        ),
      });
    }
  }

  return recommendations;
}

function buildRoleHistoryContext(
  ctx: HistoricalContext | undefined,
  target: string,
  recType: string,
  scores: { confidence_score: number; impact_score: number },
) {
  if (!ctx || ctx.historical_context_score === 0) {
    return { suppress: false, adjustedConfidence: scores.confidence_score, evidenceItems: [] as Record<string, unknown>[], sourceMetrics: {} };
  }

  const relevant = ctx.related_decisions.filter((d) => d.recommendation_type === recType);
  const accepted = relevant.filter((d) => d.status === "accepted").length;
  const rejected = relevant.filter((d) => d.status === "rejected").length;
  const deferred = relevant.filter((d) => d.status === "deferred").length;

  const inputs: ContinuityScoreInputs = {
    related_memory_count: ctx.related_memory_entries.length,
    related_summary_count: ctx.related_summaries.length,
    accepted_decisions: accepted,
    rejected_decisions: rejected,
    deferred_decisions: deferred,
    implemented_outcomes: ctx.related_outcomes.length,
    outcome_success_rate: ctx.related_outcomes.length > 0 ? 0.7 : 0,
    recurrence_across_windows: relevant.length > 0 ? 1 : 0,
  };

  const contScores = computeContinuityScores(inputs);
  const alignment = determineHistoricalAlignment(contScores, inputs);

  const redundancy = checkRedundancy({
    current_confidence: scores.confidence_score,
    current_impact: scores.impact_score,
    prior_rejections: rejected,
    prior_acceptances: accepted,
    prior_deferrals: deferred,
    days_since_last_similar: relevant.length > 0
      ? Math.round((Date.now() - new Date(relevant[0].created_at).getTime()) / 86400000)
      : null,
    supporting_memory_count: ctx.related_memory_entries.length,
    has_new_evidence: hasNewEvidence(
      scores.confidence_score > 0.6 ? 3 : 1, rejected > 0 ? 2 : 0,
      scores.confidence_score, rejected > 0 ? 0.4 : 0,
    ),
    historical_context_score: ctx.historical_context_score,
  });

  if (redundancy.suppress) return { suppress: true, adjustedConfidence: 0, evidenceItems: [], sourceMetrics: {} };

  const adj = Math.round(Math.max(0, Math.min(1, scores.confidence_score + redundancy.confidence_adjustment)) * 1000) / 1000;

  return {
    suppress: false,
    adjustedConfidence: adj,
    evidenceItems: [{
      type: "role_history_context",
      historical_alignment: alignment,
      ...contScores,
      prior_accepted: accepted,
      prior_rejected: rejected,
      novelty_flag: redundancy.novelty_flag,
    }],
    sourceMetrics: { historical_alignment: alignment, historical_context_score: ctx.historical_context_score },
  };
}
