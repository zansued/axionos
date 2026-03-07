/**
 * Workflow Optimizer Meta-Agent — Sprint 18 (Memory-Aware)
 *
 * Analyzes execution inefficiencies and proposes workflow-level improvements.
 * Now enriched with historical context: failure patterns, retrieval summaries,
 * prior workflow proposals, and implemented outcomes.
 *
 * SAFETY: Read-only. Produces conservative recommendations with expected gains.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MetaRecommendation } from "./types.ts";
import { scoreRecommendation, generateSignature } from "./scoring.ts";
import { HistoricalContext } from "./meta-agent-memory-context.ts";
import { computeContinuityScores, determineHistoricalAlignment, ContinuityScoreInputs } from "./historical-continuity-scoring.ts";
import { checkRedundancy, hasNewEvidence } from "./historical-redundancy-guard.ts";

export async function runWorkflowOptimizer(
  sc: SupabaseClient,
  organizationId: string,
  historyCtx?: HistoricalContext,
): Promise<MetaRecommendation[]> {
  const recommendations: MetaRecommendation[] = [];

  const { data: jobs } = await sc
    .from("initiative_jobs")
    .select("stage, status, duration_ms, cost_usd, initiative_id")
    .in("initiative_id",
      (await sc.from("initiatives").select("id").eq("organization_id", organizationId).limit(200))
        .data?.map((i) => i.id) || []
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (!jobs || jobs.length < 10) return recommendations;

  const stageStats: Record<string, {
    total: number; failed: number; durations: number[]; costs: number[];
  }> = {};

  for (const job of jobs) {
    if (!stageStats[job.stage]) stageStats[job.stage] = { total: 0, failed: 0, durations: [], costs: [] };
    stageStats[job.stage].total++;
    if (job.status === "failed") stageStats[job.stage].failed++;
    if (job.duration_ms) stageStats[job.stage].durations.push(job.duration_ms);
    if (job.cost_usd) stageStats[job.stage].costs.push(Number(job.cost_usd));
  }

  const totalJobs = jobs.length;

  for (const [stage, stats] of Object.entries(stageStats)) {
    const retryRatio = stats.total > 0 ? stats.failed / stats.total : 0;
    const avgDuration = stats.durations.length > 0
      ? stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length : 0;
    const totalCost = stats.costs.reduce((a, b) => a + b, 0);

    // High retry rate
    if (retryRatio > 0.30 && stats.total >= 5) {
      const wastedTime = avgDuration * stats.failed;
      const scores = scoreRecommendation({
        evidence_count: stats.failed,
        recurrence_count: stats.failed,
        total_observations: stats.total,
        cost_savings_estimate: totalCost * retryRatio,
        failure_rate: retryRatio,
        time_savings_estimate: wastedTime / 1000,
        avg_execution_time: avgDuration / 1000,
        trend_worsening: retryRatio > 0.5,
        breadth: 1,
      });

      const hist = buildWorkflowHistoryContext(historyCtx, stage, "STEP_ELIMINATION", scores);
      if (hist.suppress) continue;

      recommendations.push({
        meta_agent_type: "WORKFLOW_OPTIMIZER",
        recommendation_type: "STEP_ELIMINATION",
        target_component: stage,
        title: `High retry rate at stage "${stage}" — consider pre-validation`,
        description: `Stage "${stage}" has ${(retryRatio * 100).toFixed(1)}% failure rate (${stats.failed}/${stats.total} jobs). Estimated wasted time: ${(wastedTime / 1000).toFixed(1)}s. Adding upstream validation could eliminate unnecessary executions.`,
        confidence_score: hist.adjustedConfidence,
        impact_score: scores.impact_score,
        priority_score: scores.priority_score,
        supporting_evidence: [
          { type: "retry_analysis", stage, failed: stats.failed, total: stats.total, retry_ratio: retryRatio },
          { type: "cost_waste", total_cost: totalCost, wasted_estimate: totalCost * retryRatio },
          ...hist.evidenceItems,
        ],
        source_metrics: { stage_stats: { [stage]: stats }, ...hist.sourceMetrics },
        source_record_ids: [],
        recommendation_signature: generateSignature(
          "WORKFLOW_OPTIMIZER", "STEP_ELIMINATION", stage, `retry_${stats.failed}`
        ),
      });
    }

    // Very slow stages
    if (avgDuration > 60000 && stats.total >= 3) {
      const scores = scoreRecommendation({
        evidence_count: stats.durations.length,
        recurrence_count: stats.total,
        total_observations: totalJobs,
        cost_savings_estimate: 0,
        failure_rate: retryRatio,
        time_savings_estimate: avgDuration * 0.4 / 1000,
        avg_execution_time: avgDuration / 1000,
        trend_worsening: false,
        breadth: 1,
      });

      const hist = buildWorkflowHistoryContext(historyCtx, stage, "WORKFLOW_PARALLELIZATION", scores);
      if (hist.suppress) continue;

      recommendations.push({
        meta_agent_type: "WORKFLOW_OPTIMIZER",
        recommendation_type: "WORKFLOW_PARALLELIZATION",
        target_component: stage,
        title: `Slow stage "${stage}" — parallelization candidate`,
        description: `Stage "${stage}" averages ${(avgDuration / 1000).toFixed(1)}s over ${stats.total} executions. If sub-tasks within this stage are independent, parallelization could reduce latency by ~40%.`,
        confidence_score: hist.adjustedConfidence,
        impact_score: scores.impact_score,
        priority_score: scores.priority_score,
        supporting_evidence: [
          { type: "duration_analysis", avg_ms: avgDuration, sample_size: stats.durations.length },
          ...hist.evidenceItems,
        ],
        source_metrics: { avg_duration_ms: avgDuration, ...hist.sourceMetrics },
        source_record_ids: [],
        recommendation_signature: generateSignature(
          "WORKFLOW_OPTIMIZER", "WORKFLOW_PARALLELIZATION", stage, `dur_${Math.round(avgDuration)}`
        ),
      });
    }
  }

  return recommendations;
}

function buildWorkflowHistoryContext(
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
      type: "workflow_history_context",
      historical_alignment: alignment,
      ...contScores,
      prior_accepted: accepted,
      prior_rejected: rejected,
      novelty_flag: redundancy.novelty_flag,
    }],
    sourceMetrics: { historical_alignment: alignment, historical_context_score: ctx.historical_context_score },
  };
}
