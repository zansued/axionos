/**
 * System Evolution Advisor — Sprint 13
 *
 * Produces high-level system evolution guidance by synthesizing patterns
 * across all lower layers (observability, learning, repair, prevention).
 *
 * SAFETY: Read-only. Outputs are advisory reports, never direct mutations.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MetaRecommendation } from "./types.ts";
import { scoreRecommendation, generateSignature } from "./scoring.ts";

export async function runSystemEvolutionAdvisor(
  sc: SupabaseClient,
  organizationId: string
): Promise<MetaRecommendation[]> {
  const recommendations: MetaRecommendation[] = [];

  // 1. Cost trend analysis
  const { data: recentJobs } = await sc
    .from("initiative_jobs")
    .select("cost_usd, created_at, stage, status, initiative_id")
    .in("initiative_id",
      (await sc.from("initiatives").select("id").eq("organization_id", organizationId).limit(200))
        .data?.map((i) => i.id) || []
    )
    .order("created_at", { ascending: false })
    .limit(300);

  if (recentJobs && recentJobs.length >= 20) {
    const mid = Math.floor(recentJobs.length / 2);
    const recentHalf = recentJobs.slice(0, mid);
    const olderHalf = recentJobs.slice(mid);

    const recentAvgCost = recentHalf.reduce((a, j) => a + Number(j.cost_usd || 0), 0) / recentHalf.length;
    const olderAvgCost = olderHalf.reduce((a, j) => a + Number(j.cost_usd || 0), 0) / olderHalf.length;

    const costIncrease = olderAvgCost > 0 ? (recentAvgCost - olderAvgCost) / olderAvgCost : 0;

    if (costIncrease > 0.20) {
      const scores = scoreRecommendation({
        evidence_count: recentJobs.length,
        recurrence_count: recentHalf.length,
        total_observations: recentJobs.length,
        cost_savings_estimate: recentAvgCost * recentHalf.length * 0.2,
        failure_rate: 0,
        time_savings_estimate: 0,
        avg_execution_time: 0,
        trend_worsening: true,
        breadth: 1,
      });

      recommendations.push({
        meta_agent_type: "SYSTEM_EVOLUTION_ADVISOR",
        recommendation_type: "TECHNICAL_DEBT_ALERT",
        target_component: "cost_management",
        title: "Rising cost trend detected",
        description: `Average job cost has increased by ${(costIncrease * 100).toFixed(1)}% (from $${olderAvgCost.toFixed(4)} to $${recentAvgCost.toFixed(4)}). Review model selection, prompt efficiency, and retry patterns.`,
        ...scores,
        supporting_evidence: [
          { type: "cost_trend", recent_avg: recentAvgCost, older_avg: olderAvgCost, increase_pct: costIncrease },
        ],
        source_metrics: { recent_avg_cost: recentAvgCost, older_avg_cost: olderAvgCost },
        source_record_ids: [],
        recommendation_signature: generateSignature(
          "SYSTEM_EVOLUTION_ADVISOR", "TECHNICAL_DEBT_ALERT", "cost_management",
          `increase_${Math.round(costIncrease * 100)}`
        ),
      });
    }
  }

  // 2. Learning recommendation saturation check
  const { data: learningRecs } = await sc
    .from("learning_recommendations")
    .select("id, status, recommendation_type, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (learningRecs && learningRecs.length > 0) {
    const pending = learningRecs.filter((r) => r.status === "pending").length;
    const pendingRatio = pending / learningRecs.length;

    if (pendingRatio > 0.7 && pending >= 5) {
      const scores = scoreRecommendation({
        evidence_count: pending,
        recurrence_count: pending,
        total_observations: learningRecs.length,
        cost_savings_estimate: 0,
        failure_rate: 0,
        time_savings_estimate: 0,
        avg_execution_time: 0,
        trend_worsening: true,
        breadth: 1,
      });

      recommendations.push({
        meta_agent_type: "SYSTEM_EVOLUTION_ADVISOR",
        recommendation_type: "SYSTEM_EVOLUTION_REPORT",
        target_component: "learning_system",
        title: "Learning recommendations backlog growing",
        description: `${pending} of ${learningRecs.length} learning recommendations remain pending (${(pendingRatio * 100).toFixed(0)}%). Unreviewed recommendations lose relevance over time. Consider scheduling a review cycle.`,
        ...scores,
        supporting_evidence: [
          { type: "recommendation_backlog", pending, total: learningRecs.length, ratio: pendingRatio },
        ],
        source_metrics: { pending_count: pending },
        source_record_ids: learningRecs.filter((r) => r.status === "pending").slice(0, 10).map((r) => r.id),
        recommendation_signature: generateSignature(
          "SYSTEM_EVOLUTION_ADVISOR", "SYSTEM_EVOLUTION_REPORT", "learning_system",
          `backlog_${pending}`
        ),
      });
    }
  }

  // 3. Overall pipeline health report
  const { data: obsData } = await sc
    .from("initiative_observability")
    .select("pipeline_success_rate, deploy_success_rate, automatic_repair_success_rate")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (obsData && obsData.length >= 5) {
    const avgPipeline = obsData.reduce((a, o) => a + Number(o.pipeline_success_rate), 0) / obsData.length;
    const avgDeploy = obsData.reduce((a, o) => a + Number(o.deploy_success_rate), 0) / obsData.length;
    const avgRepair = obsData.reduce((a, o) => a + Number(o.automatic_repair_success_rate), 0) / obsData.length;

    if (avgPipeline < 70 || avgDeploy < 60) {
      const scores = scoreRecommendation({
        evidence_count: obsData.length,
        recurrence_count: obsData.filter((o) => Number(o.pipeline_success_rate) < 70).length,
        total_observations: obsData.length,
        cost_savings_estimate: 0,
        failure_rate: 1 - avgPipeline / 100,
        time_savings_estimate: 0,
        avg_execution_time: 0,
        trend_worsening: avgPipeline < 50,
        breadth: 1,
      });

      recommendations.push({
        meta_agent_type: "SYSTEM_EVOLUTION_ADVISOR",
        recommendation_type: "ARCHITECTURE_CHANGE_PROPOSAL",
        target_component: "pipeline_health",
        title: "System health below target thresholds",
        description: `Pipeline success: ${avgPipeline.toFixed(1)}%, Deploy success: ${avgDeploy.toFixed(1)}%, Repair success: ${avgRepair.toFixed(1)}%. Sustained sub-threshold performance indicates structural issues requiring architectural review.`,
        ...scores,
        supporting_evidence: [
          { type: "health_summary", pipeline: avgPipeline, deploy: avgDeploy, repair: avgRepair, sample_size: obsData.length },
        ],
        source_metrics: { avg_pipeline: avgPipeline, avg_deploy: avgDeploy, avg_repair: avgRepair },
        source_record_ids: [],
        recommendation_signature: generateSignature(
          "SYSTEM_EVOLUTION_ADVISOR", "ARCHITECTURE_CHANGE_PROPOSAL", "pipeline_health",
          `health_${Math.round(avgPipeline)}`
        ),
      });
    }
  }

  return recommendations;
}
