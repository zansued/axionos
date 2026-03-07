/**
 * Workflow Optimizer Meta-Agent — Sprint 13
 *
 * Analyzes execution inefficiencies and proposes workflow-level improvements.
 *
 * SAFETY: Read-only. Produces conservative recommendations with expected gains.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MetaRecommendation } from "./types.ts";
import { scoreRecommendation, generateSignature } from "./scoring.ts";

export async function runWorkflowOptimizer(
  sc: SupabaseClient,
  organizationId: string
): Promise<MetaRecommendation[]> {
  const recommendations: MetaRecommendation[] = [];

  // 1. Gather job data: retries, durations, failures by stage
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

  // Aggregate by stage
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

  // 2. Detect high-retry stages (many jobs relative to unique initiatives)
  for (const [stage, stats] of Object.entries(stageStats)) {
    const retryRatio = stats.total > 0 ? stats.failed / stats.total : 0;
    const avgDuration = stats.durations.length > 0
      ? stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length : 0;
    const totalCost = stats.costs.reduce((a, b) => a + b, 0);

    // High retry rate (>30%) with enough data
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

      recommendations.push({
        meta_agent_type: "WORKFLOW_OPTIMIZER",
        recommendation_type: "STEP_ELIMINATION",
        target_component: stage,
        title: `High retry rate at stage "${stage}" — consider pre-validation`,
        description: `Stage "${stage}" has ${(retryRatio * 100).toFixed(1)}% failure rate (${stats.failed}/${stats.total} jobs). Estimated wasted time: ${(wastedTime / 1000).toFixed(1)}s. Adding upstream validation could eliminate unnecessary executions.`,
        ...scores,
        supporting_evidence: [
          { type: "retry_analysis", stage, failed: stats.failed, total: stats.total, retry_ratio: retryRatio },
          { type: "cost_waste", total_cost: totalCost, wasted_estimate: totalCost * retryRatio },
        ],
        source_metrics: { stage_stats: { [stage]: stats } },
        source_record_ids: [],
        recommendation_signature: generateSignature(
          "WORKFLOW_OPTIMIZER", "STEP_ELIMINATION", stage, `retry_${stats.failed}`
        ),
      });
    }

    // Very slow stages (avg > 60s) — candidate for parallelization
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

      recommendations.push({
        meta_agent_type: "WORKFLOW_OPTIMIZER",
        recommendation_type: "WORKFLOW_PARALLELIZATION",
        target_component: stage,
        title: `Slow stage "${stage}" — parallelization candidate`,
        description: `Stage "${stage}" averages ${(avgDuration / 1000).toFixed(1)}s over ${stats.total} executions. If sub-tasks within this stage are independent, parallelization could reduce latency by ~40%.`,
        ...scores,
        supporting_evidence: [
          { type: "duration_analysis", avg_ms: avgDuration, sample_size: stats.durations.length },
        ],
        source_metrics: { avg_duration_ms: avgDuration },
        source_record_ids: [],
        recommendation_signature: generateSignature(
          "WORKFLOW_OPTIMIZER", "WORKFLOW_PARALLELIZATION", stage, `dur_${Math.round(avgDuration)}`
        ),
      });
    }
  }

  return recommendations;
}
