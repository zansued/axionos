/**
 * Proposal Quality Summary Service — Sprint 19
 *
 * Generates deterministic summary reports from proposal feedback data.
 * Creates advisory signals for future reasoning improvement.
 *
 * SAFETY: Read-only analytics + summary writes. Never mutates proposals.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PROPOSAL_QUALITY_AUDIT_EVENTS, type AdvisorySignal } from "./proposal-quality-types.ts";

interface SummaryOptions {
  organization_id: string;
  workspace_id?: string;
  period_start: string;
  period_end: string;
}

export async function generateProposalQualitySummaries(
  sc: SupabaseClient,
  userId: string,
  opts: SummaryOptions,
): Promise<{ summaries_created: number; advisory_signals: AdvisorySignal[] }> {
  const advisorySignals: AdvisorySignal[] = [];
  let summariesCreated = 0;

  try {
    // Fetch all feedback in period
    const { data: feedback } = await sc
      .from("proposal_quality_feedback")
      .select("*")
      .eq("organization_id", opts.organization_id)
      .gte("created_at", opts.period_start)
      .lte("created_at", opts.period_end);

    const allFeedback = (feedback || []) as Record<string, unknown>[];
    if (allFeedback.length === 0) return { summaries_created: 0, advisory_signals: [] };

    // ── Summary by Meta-Agent Type ──
    const agentTypes = [...new Set(allFeedback.map((f) => f.source_meta_agent_type as string).filter(Boolean))];
    for (const agentType of agentTypes) {
      const agentFb = allFeedback.filter((f) => f.source_meta_agent_type === agentType);
      const summary = computeGroupSummary(agentFb);

      await sc.from("proposal_quality_summaries").insert({
        organization_id: opts.organization_id,
        workspace_id: opts.workspace_id || null,
        summary_type: "agent_quality",
        meta_agent_type: agentType,
        period_start: opts.period_start,
        period_end: opts.period_end,
        total_feedback_count: agentFb.length,
        avg_quality_score: summary.avgQuality,
        avg_usefulness_score: summary.avgUsefulness,
        acceptance_rate: summary.acceptanceRate,
        implementation_rate: summary.implementationRate,
        positive_outcome_rate: summary.positiveOutcomeRate,
        top_feedback_tags: summary.topTags,
        rejection_patterns: summary.rejectionPatterns,
        advisory_signals: [],
        content: summary,
      });
      summariesCreated++;

      // Generate advisory signals
      if (summary.acceptanceRate > 0.7 && summary.implementationRate < 0.3) {
        advisorySignals.push({
          signal_type: "high_accept_low_implement",
          description: `${agentType} recommendations are frequently accepted (${(summary.acceptanceRate * 100).toFixed(0)}%) but rarely implemented (${(summary.implementationRate * 100).toFixed(0)}%).`,
          meta_agent_type: agentType,
          confidence: 0.8,
          supporting_data: { acceptance_rate: summary.acceptanceRate, implementation_rate: summary.implementationRate },
        });
      }
      if (summary.acceptanceRate < 0.3 && agentFb.length >= 5) {
        advisorySignals.push({
          signal_type: "low_acceptance_rate",
          description: `${agentType} recommendations have low acceptance rate (${(summary.acceptanceRate * 100).toFixed(0)}%) over ${agentFb.length} reviews.`,
          meta_agent_type: agentType,
          confidence: 0.7,
          supporting_data: { acceptance_rate: summary.acceptanceRate, total: agentFb.length },
        });
      }
    }

    // ── Summary by Artifact Type ──
    const artifactTypes = [...new Set(allFeedback.filter((f) => f.entity_type === "artifact").map((f) => f.artifact_type as string).filter(Boolean))];
    for (const artType of artifactTypes) {
      const artFb = allFeedback.filter((f) => f.artifact_type === artType);
      const summary = computeGroupSummary(artFb);

      await sc.from("proposal_quality_summaries").insert({
        organization_id: opts.organization_id,
        workspace_id: opts.workspace_id || null,
        summary_type: "artifact_usefulness",
        artifact_type: artType,
        period_start: opts.period_start,
        period_end: opts.period_end,
        total_feedback_count: artFb.length,
        avg_quality_score: summary.avgQuality,
        avg_usefulness_score: summary.avgUsefulness,
        acceptance_rate: summary.acceptanceRate,
        implementation_rate: summary.implementationRate,
        positive_outcome_rate: summary.positiveOutcomeRate,
        top_feedback_tags: summary.topTags,
        rejection_patterns: summary.rejectionPatterns,
        advisory_signals: [],
        content: summary,
      });
      summariesCreated++;
    }

    // ── Historical vs Novel Comparison ──
    const historicallySupported = allFeedback.filter((f) => Number(f.historical_support_score || 0) > 0.5);
    const historicallyNovel = allFeedback.filter((f) => Number(f.historical_support_score || 0) <= 0.5 && Number(f.historical_conflict_score || 0) <= 0.3);

    if (historicallySupported.length >= 3 && historicallyNovel.length >= 3) {
      const supportedSummary = computeGroupSummary(historicallySupported);
      const novelSummary = computeGroupSummary(historicallyNovel);

      await sc.from("proposal_quality_summaries").insert({
        organization_id: opts.organization_id,
        workspace_id: opts.workspace_id || null,
        summary_type: "historical_comparison",
        period_start: opts.period_start,
        period_end: opts.period_end,
        total_feedback_count: historicallySupported.length + historicallyNovel.length,
        avg_quality_score: (supportedSummary.avgQuality + novelSummary.avgQuality) / 2,
        avg_usefulness_score: (supportedSummary.avgUsefulness + novelSummary.avgUsefulness) / 2,
        historically_supported_performance: supportedSummary.avgQuality,
        historically_novel_performance: novelSummary.avgQuality,
        acceptance_rate: 0,
        implementation_rate: 0,
        positive_outcome_rate: 0,
        top_feedback_tags: [],
        rejection_patterns: [],
        advisory_signals: advisorySignals,
        content: { supported: supportedSummary, novel: novelSummary },
      });
      summariesCreated++;

      if (supportedSummary.implementationRate > novelSummary.implementationRate + 0.2) {
        advisorySignals.push({
          signal_type: "historical_support_advantage",
          description: `Historically supported proposals show higher implementation success (${(supportedSummary.implementationRate * 100).toFixed(0)}%) vs novel proposals (${(novelSummary.implementationRate * 100).toFixed(0)}%).`,
          confidence: 0.75,
          supporting_data: { supported_rate: supportedSummary.implementationRate, novel_rate: novelSummary.implementationRate },
        });
      }
    }

    // Audit
    sc.from("audit_logs").insert({
      user_id: userId,
      action: PROPOSAL_QUALITY_AUDIT_EVENTS.PROPOSAL_QUALITY_SUMMARY_CREATED,
      category: "meta_agents",
      message: `Proposal quality summaries created: ${summariesCreated}`,
      organization_id: opts.organization_id,
      metadata: { summaries_created: summariesCreated, advisory_signals_count: advisorySignals.length, period_start: opts.period_start, period_end: opts.period_end },
    }).catch((e: any) => console.error("Audit error:", e));

  } catch (e) {
    console.error("generateProposalQualitySummaries error:", e);
  }

  return { summaries_created: summariesCreated, advisory_signals: advisorySignals };
}

// ─── Internal ───

function computeGroupSummary(feedback: Record<string, unknown>[]) {
  const total = feedback.length;
  if (total === 0) return { avgQuality: 0, avgUsefulness: 0, acceptanceRate: 0, implementationRate: 0, positiveOutcomeRate: 0, topTags: [], rejectionPatterns: [] };

  const avgQuality = feedback.reduce((a, f) => a + Number(f.quality_score || 0), 0) / total;
  const avgUsefulness = feedback.reduce((a, f) => a + Number(f.usefulness_score || 0), 0) / total;

  const accepted = feedback.filter((f) => ["accepted", "approved", "implemented"].includes(f.decision_signal as string));
  const implemented = feedback.filter((f) => f.follow_through_signal === "implemented" || f.decision_signal === "implemented");
  const positiveOutcome = feedback.filter((f) => f.outcome_signal === "positive");

  const acceptanceRate = total > 0 ? accepted.length / total : 0;
  const implementationRate = accepted.length > 0 ? implemented.length / accepted.length : 0;
  const positiveOutcomeRate = implemented.length > 0 ? positiveOutcome.length / implemented.length : 0;

  // Aggregate tags
  const tagCounts: Record<string, number> = {};
  for (const f of feedback) {
    const tags = Array.isArray(f.feedback_tags) ? f.feedback_tags : [];
    for (const t of tags) { tagCounts[t as string] = (tagCounts[t as string] || 0) + 1; }
  }
  const topTags = Object.entries(tagCounts).sort(([, a], [, b]) => b - a).slice(0, 5).map(([tag, count]) => ({ tag, count }));

  // Rejection patterns
  const rejected = feedback.filter((f) => f.decision_signal === "rejected");
  const rejectionPatterns = rejected.length > 0
    ? Object.entries(
        rejected.reduce((acc, f) => {
          const tags = Array.isArray(f.feedback_tags) ? f.feedback_tags : [];
          for (const t of tags) { acc[t as string] = (acc[t as string] || 0) + 1; }
          return acc;
        }, {} as Record<string, number>)
      ).sort(([, a], [, b]) => b - a).slice(0, 3).map(([tag, count]) => ({ tag, count }))
    : [];

  return {
    avgQuality: round3(avgQuality),
    avgUsefulness: round3(avgUsefulness),
    acceptanceRate: round3(acceptanceRate),
    implementationRate: round3(implementationRate),
    positiveOutcomeRate: round3(positiveOutcomeRate),
    topTags,
    rejectionPatterns,
    total,
    accepted_count: accepted.length,
    implemented_count: implemented.length,
    positive_outcome_count: positiveOutcome.length,
  };
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
