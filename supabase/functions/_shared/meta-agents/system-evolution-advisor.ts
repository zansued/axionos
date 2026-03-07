/**
 * System Evolution Advisor — Sprint 18 (Memory-Aware)
 *
 * Produces high-level system evolution guidance by synthesizing patterns
 * across all lower layers. Now enriched with all summary types, accepted/rejected
 * history, and architecture evolution patterns.
 *
 * SAFETY: Read-only. Outputs are advisory reports, never direct mutations.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MetaRecommendation } from "./types.ts";
import { scoreRecommendation, generateSignature } from "./scoring.ts";
import { HistoricalContext } from "./meta-agent-memory-context.ts";
import { computeContinuityScores, determineHistoricalAlignment, ContinuityScoreInputs } from "./historical-continuity-scoring.ts";
import { checkRedundancy, hasNewEvidence } from "./historical-redundancy-guard.ts";

export async function runSystemEvolutionAdvisor(
  sc: SupabaseClient,
  organizationId: string,
  historyCtx?: HistoricalContext,
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

      const hist = buildEvolutionHistory(historyCtx, "cost_management", "TECHNICAL_DEBT_ALERT", scores);
      if (!hist.suppress) {
        recommendations.push({
          meta_agent_type: "SYSTEM_EVOLUTION_ADVISOR",
          recommendation_type: "TECHNICAL_DEBT_ALERT",
          target_component: "cost_management",
          title: "Rising cost trend detected",
          description: `Average job cost has increased by ${(costIncrease * 100).toFixed(1)}% (from $${olderAvgCost.toFixed(4)} to $${recentAvgCost.toFixed(4)}). Review model selection, prompt efficiency, and retry patterns.`,
          confidence_score: hist.adjustedConfidence,
          impact_score: scores.impact_score,
          priority_score: scores.priority_score,
          supporting_evidence: [
            { type: "cost_trend", recent_avg: recentAvgCost, older_avg: olderAvgCost, increase_pct: costIncrease },
            ...hist.evidenceItems,
          ],
          source_metrics: { recent_avg_cost: recentAvgCost, older_avg_cost: olderAvgCost, ...hist.sourceMetrics },
          source_record_ids: [],
          recommendation_signature: generateSignature(
            "SYSTEM_EVOLUTION_ADVISOR", "TECHNICAL_DEBT_ALERT", "cost_management",
            `increase_${Math.round(costIncrease * 100)}`
          ),
        });
      }
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

      const hist = buildEvolutionHistory(historyCtx, "learning_system", "SYSTEM_EVOLUTION_REPORT", scores);
      if (!hist.suppress) {
        recommendations.push({
          meta_agent_type: "SYSTEM_EVOLUTION_ADVISOR",
          recommendation_type: "SYSTEM_EVOLUTION_REPORT",
          target_component: "learning_system",
          title: "Learning recommendations backlog growing",
          description: `${pending} of ${learningRecs.length} learning recommendations remain pending (${(pendingRatio * 100).toFixed(0)}%). Unreviewed recommendations lose relevance over time. Consider scheduling a review cycle.`,
          confidence_score: hist.adjustedConfidence,
          impact_score: scores.impact_score,
          priority_score: scores.priority_score,
          supporting_evidence: [
            { type: "recommendation_backlog", pending, total: learningRecs.length, ratio: pendingRatio },
            ...hist.evidenceItems,
          ],
          source_metrics: { pending_count: pending, ...hist.sourceMetrics },
          source_record_ids: learningRecs.filter((r) => r.status === "pending").slice(0, 10).map((r) => r.id),
          recommendation_signature: generateSignature(
            "SYSTEM_EVOLUTION_ADVISOR", "SYSTEM_EVOLUTION_REPORT", "learning_system",
            `backlog_${pending}`
          ),
        });
      }
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

      const hist = buildEvolutionHistory(historyCtx, "pipeline_health", "ARCHITECTURE_CHANGE_PROPOSAL", scores);
      if (!hist.suppress) {
        recommendations.push({
          meta_agent_type: "SYSTEM_EVOLUTION_ADVISOR",
          recommendation_type: "ARCHITECTURE_CHANGE_PROPOSAL",
          target_component: "pipeline_health",
          title: "System health below target thresholds",
          description: `Pipeline success: ${avgPipeline.toFixed(1)}%, Deploy success: ${avgDeploy.toFixed(1)}%, Repair success: ${avgRepair.toFixed(1)}%. Sustained sub-threshold performance indicates structural issues requiring architectural review.`,
          confidence_score: hist.adjustedConfidence,
          impact_score: scores.impact_score,
          priority_score: scores.priority_score,
          supporting_evidence: [
            { type: "health_summary", pipeline: avgPipeline, deploy: avgDeploy, repair: avgRepair, sample_size: obsData.length },
            ...hist.evidenceItems,
          ],
          source_metrics: { avg_pipeline: avgPipeline, avg_deploy: avgDeploy, avg_repair: avgRepair, ...hist.sourceMetrics },
          source_record_ids: [],
          recommendation_signature: generateSignature(
            "SYSTEM_EVOLUTION_ADVISOR", "ARCHITECTURE_CHANGE_PROPOSAL", "pipeline_health",
            `health_${Math.round(avgPipeline)}`
          ),
        });
      }
    }
  }

  return recommendations;
}

function buildEvolutionHistory(
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
      type: "evolution_history_context",
      historical_alignment: alignment,
      ...contScores,
      prior_accepted: accepted,
      prior_rejected: rejected,
      related_summaries_count: ctx.related_summaries.length,
      novelty_flag: redundancy.novelty_flag,
    }],
    sourceMetrics: { historical_alignment: alignment, historical_context_score: ctx.historical_context_score },
  };
}
