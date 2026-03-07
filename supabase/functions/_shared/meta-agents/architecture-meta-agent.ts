/**
 * Architecture Meta-Agent — Sprint 13
 *
 * Analyzes system execution patterns and produces architecture-level recommendations:
 * - Pipeline bottleneck detection
 * - Stage reordering suggestions
 * - Stage split/merge proposals
 *
 * SAFETY: Read-only against kernel. Only produces persisted recommendations.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MetaRecommendation } from "./types.ts";
import { scoreRecommendation, generateSignature } from "./scoring.ts";

export async function runArchitectureMetaAgent(
  sc: SupabaseClient,
  organizationId: string
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

  // Aggregate stage failures across all initiatives
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

      recommendations.push({
        meta_agent_type: "ARCHITECTURE_META_AGENT",
        recommendation_type: "PIPELINE_OPTIMIZATION",
        target_component: stage,
        title: `Pipeline bottleneck detected at stage "${stage}"`,
        description: `Stage "${stage}" accounts for ${(ratio * 100).toFixed(1)}% of all pipeline failures (${count}/${totalFailures}). Average duration: ${avgDuration.toFixed(0)}ms. Consider restructuring this stage or adding pre-validation.`,
        ...scores,
        supporting_evidence: [
          { type: "failure_distribution", stage, failure_count: count, total: totalFailures, ratio },
          { type: "duration_stats", avg_ms: avgDuration, sample_size: stageDurations[stage]?.length || 0 },
        ],
        source_metrics: { stage_failures: stageFailures },
        source_record_ids: obsData.slice(0, 5).map((o) => o.initiative_id),
        recommendation_signature: generateSignature(
          "ARCHITECTURE_META_AGENT", "PIPELINE_OPTIMIZATION", stage, `failures_${count}`
        ),
      });
    }
  }

  // 3. Detect stages that could be split (high duration + high failure)
  for (const [stage, durations] of Object.entries(stageDurations)) {
    if (durations.length < 3) continue;
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const failCount = stageFailures[stage] || 0;
    const failRatio = totalFailures > 0 ? failCount / totalFailures : 0;

    // Candidate for split: avg duration > 30s AND failure ratio > 15%
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

      recommendations.push({
        meta_agent_type: "ARCHITECTURE_META_AGENT",
        recommendation_type: "STAGE_SPLIT_OR_MERGE",
        target_component: stage,
        title: `Consider splitting stage "${stage}"`,
        description: `Stage "${stage}" has high avg duration (${(avg / 1000).toFixed(1)}s) and ${(failRatio * 100).toFixed(1)}% failure contribution. Splitting into focused sub-stages could improve isolation and reduce cascading failures.`,
        ...scores,
        supporting_evidence: [
          { type: "duration_analysis", avg_ms: avg, sample_size: durations.length },
          { type: "failure_contribution", count: failCount, ratio: failRatio },
        ],
        source_metrics: { avg_duration_ms: avg, fail_ratio: failRatio },
        source_record_ids: [],
        recommendation_signature: generateSignature(
          "ARCHITECTURE_META_AGENT", "STAGE_SPLIT_OR_MERGE", stage, `dur_${Math.round(avg)}`
        ),
      });
    }
  }

  return recommendations;
}
