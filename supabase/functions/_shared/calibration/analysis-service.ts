/**
 * Advisory Calibration Analysis Service — Sprint 20
 *
 * Analyzes historical proposal quality, meta-agent performance,
 * and memory effectiveness to generate structured calibration signals.
 *
 * SAFETY: Read-only analytics + calibration signal writes.
 * Never mutates agent behavior, scoring, or thresholds.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type {
  CalibrationSignalInput,
  AgentPerformanceMetrics,
  ArtifactUsefulnessMetrics,
} from "./types.ts";
import {
  computeCalibrationScore,
  isUnderperforming,
  isHighValue,
  isContextOverweighted,
  isContextUnderused,
  isRedundancyTooStrict,
  isRedundancyTooWeak,
} from "./scoring.ts";
import { META_AGENT_TYPES, ARTIFACT_TYPES } from "./types.ts";

// ─── Meta-Agent Performance Analysis ───

export async function analyzeMetaAgentPerformance(
  sc: SupabaseClient,
  organizationId: string,
): Promise<CalibrationSignalInput[]> {
  const signals: CalibrationSignalInput[] = [];

  for (const agentType of META_AGENT_TYPES) {
    const [recsRes, artsRes, feedbackRes] = await Promise.all([
      sc.from("meta_agent_recommendations")
        .select("status, confidence_score, supporting_evidence")
        .eq("organization_id", organizationId)
        .eq("meta_agent_type", agentType),
      sc.from("meta_agent_artifacts")
        .select("status, artifact_type")
        .eq("organization_id", organizationId)
        .eq("created_by_meta_agent", agentType),
      sc.from("proposal_quality_feedback")
        .select("quality_score, usefulness_score, decision_signal, outcome_signal, follow_through_signal")
        .eq("organization_id", organizationId)
        .eq("source_meta_agent_type", agentType),
    ]);

    const recs = (recsRes.data || []) as any[];
    const arts = (artsRes.data || []) as any[];
    const fb = (feedbackRes.data || []) as any[];

    if (recs.length < 3) continue; // insufficient data

    const accepted = recs.filter((r: any) => r.status === "accepted").length;
    const rejected = recs.filter((r: any) => r.status === "rejected").length;
    const implemented = arts.filter((a: any) => a.status === "implemented").length;
    const approved = arts.filter((a: any) => ["approved", "implemented"].includes(a.status)).length;

    const acceptanceRate = recs.length > 0 ? accepted / recs.length : 0;
    const implRate = arts.length > 0 ? implemented / arts.length : 0;
    const avgQ = fb.length > 0 ? fb.reduce((s: number, f: any) => s + Number(f.quality_score || 0), 0) / fb.length : 0;
    const avgU = fb.length > 0 ? fb.reduce((s: number, f: any) => s + Number(f.usefulness_score || 0), 0) / fb.length : 0;
    const positiveOutcomes = fb.filter((f: any) => f.outcome_signal === "positive").length;
    const positiveRate = fb.length > 0 ? positiveOutcomes / fb.length : 0;

    const scoring = computeCalibrationScore({
      sample_size: recs.length,
      acceptance_rate: acceptanceRate,
      implementation_rate: implRate,
      positive_outcome_rate: positiveRate,
      avg_quality_score: avgQ,
      avg_usefulness_score: avgU,
    });

    if (isHighValue(acceptanceRate, implRate, positiveRate)) {
      signals.push({
        organization_id: organizationId,
        calibration_domain: "META_AGENT_PERFORMANCE",
        target_component: agentType,
        signal_type: "HIGH_VALUE_META_AGENT",
        title: `${agentType} is high-value`,
        description: `Acceptance: ${(acceptanceRate * 100).toFixed(0)}%, Implementation: ${(implRate * 100).toFixed(0)}%, Positive outcomes: ${(positiveRate * 100).toFixed(0)}%`,
        ...scoring,
        evidence_refs: [{ acceptance_rate: acceptanceRate, implementation_rate: implRate, positive_outcome_rate: positiveRate, sample_size: recs.length }],
        recommended_action: "Consider increasing weight or priority for this agent's recommendations.",
      });
    }

    if (isUnderperforming(acceptanceRate, implRate, avgQ)) {
      signals.push({
        organization_id: organizationId,
        calibration_domain: "META_AGENT_PERFORMANCE",
        target_component: agentType,
        signal_type: "UNDERPERFORMING_META_AGENT",
        title: `${agentType} may be underperforming`,
        description: `Acceptance: ${(acceptanceRate * 100).toFixed(0)}%, Avg quality: ${(avgQ * 100).toFixed(0)}%`,
        ...scoring,
        evidence_refs: [{ acceptance_rate: acceptanceRate, avg_quality: avgQ, sample_size: recs.length }],
        recommended_action: "Review prompt templates and recommendation scope for this agent.",
      });
    }
  }

  return signals;
}

// ─── Proposal Usefulness Analysis ───

export async function analyzeProposalUsefulness(
  sc: SupabaseClient,
  organizationId: string,
): Promise<CalibrationSignalInput[]> {
  const signals: CalibrationSignalInput[] = [];

  for (const artType of ARTIFACT_TYPES) {
    const [artsRes, fbRes] = await Promise.all([
      sc.from("meta_agent_artifacts")
        .select("status")
        .eq("organization_id", organizationId)
        .eq("artifact_type", artType),
      sc.from("proposal_quality_feedback")
        .select("quality_score, usefulness_score, outcome_signal, follow_through_signal")
        .eq("organization_id", organizationId)
        .eq("artifact_type", artType),
    ]);

    const arts = (artsRes.data || []) as any[];
    const fb = (fbRes.data || []) as any[];

    if (arts.length < 3) continue;

    const approved = arts.filter((a: any) => ["approved", "implemented"].includes(a.status)).length;
    const implemented = arts.filter((a: any) => a.status === "implemented").length;
    const abandoned = arts.filter((a: any) => a.status === "rejected").length;
    const approvalRate = arts.length > 0 ? approved / arts.length : 0;
    const implRate = arts.length > 0 ? implemented / arts.length : 0;
    const avgQ = fb.length > 0 ? fb.reduce((s: number, f: any) => s + Number(f.quality_score || 0), 0) / fb.length : 0;
    const avgU = fb.length > 0 ? fb.reduce((s: number, f: any) => s + Number(f.usefulness_score || 0), 0) / fb.length : 0;
    const positiveCount = fb.filter((f: any) => f.outcome_signal === "positive").length;
    const positiveRate = fb.length > 0 ? positiveCount / fb.length : 0;

    const scoring = computeCalibrationScore({
      sample_size: arts.length,
      acceptance_rate: approvalRate,
      implementation_rate: implRate,
      positive_outcome_rate: positiveRate,
      avg_quality_score: avgQ,
      avg_usefulness_score: avgU,
    });

    if (approvalRate > 0.7 && implRate > 0.4) {
      signals.push({
        organization_id: organizationId,
        calibration_domain: "PROPOSAL_USEFULNESS",
        target_component: artType,
        signal_type: "HIGH_USEFULNESS_ARTIFACT_TYPE",
        title: `${artType} artifacts are highly useful`,
        description: `Approval: ${(approvalRate * 100).toFixed(0)}%, Implementation: ${(implRate * 100).toFixed(0)}%`,
        ...scoring,
        evidence_refs: [{ approval_rate: approvalRate, implementation_rate: implRate, sample_size: arts.length }],
        recommended_action: "This artifact type is effective. Consider expanding its use.",
      });
    }

    if (approvalRate < 0.3 || (avgU > 0 && avgU < 0.3)) {
      signals.push({
        organization_id: organizationId,
        calibration_domain: "PROPOSAL_USEFULNESS",
        target_component: artType,
        signal_type: "LOW_USEFULNESS_ARTIFACT_TYPE",
        title: `${artType} artifacts show low usefulness`,
        description: `Approval: ${(approvalRate * 100).toFixed(0)}%, Avg usefulness: ${(avgU * 100).toFixed(0)}%`,
        ...scoring,
        evidence_refs: [{ approval_rate: approvalRate, avg_usefulness: avgU, abandoned_count: abandoned }],
        recommended_action: "Review generation prompts and context for this artifact type.",
      });
    }

    // Follow-through signals
    const followImpl = fb.filter((f: any) => f.follow_through_signal === "implemented").length;
    const followNotImpl = fb.filter((f: any) => f.follow_through_signal === "not_implemented").length;
    if (fb.length >= 5 && followNotImpl / fb.length > 0.5) {
      signals.push({
        organization_id: organizationId,
        calibration_domain: "DECISION_FOLLOW_THROUGH",
        target_component: artType,
        signal_type: "LOW_FOLLOW_THROUGH_PATTERN",
        title: `Low follow-through on ${artType}`,
        description: `${followNotImpl}/${fb.length} approved items not implemented`,
        ...scoring,
        evidence_refs: [{ not_implemented: followNotImpl, total_feedback: fb.length }],
        recommended_action: "Investigate why approved artifacts of this type are not being implemented.",
      });
    }
    if (fb.length >= 5 && followImpl / fb.length > 0.7) {
      signals.push({
        organization_id: organizationId,
        calibration_domain: "DECISION_FOLLOW_THROUGH",
        target_component: artType,
        signal_type: "HIGH_FOLLOW_THROUGH_PATTERN",
        title: `High follow-through on ${artType}`,
        description: `${followImpl}/${fb.length} items followed through to implementation`,
        ...scoring,
        evidence_refs: [{ implemented: followImpl, total_feedback: fb.length }],
        recommended_action: "This artifact type has strong follow-through. Consider prioritizing it.",
      });
    }
  }

  return signals;
}

// ─── Historical Context Value Analysis ───

export async function analyzeHistoricalContextValue(
  sc: SupabaseClient,
  organizationId: string,
): Promise<CalibrationSignalInput[]> {
  const signals: CalibrationSignalInput[] = [];

  const [aggRes, fbRes] = await Promise.all([
    sc.from("proposal_quality_aggregates")
      .select("meta_agent_type, memory_enriched_acceptance_rate, non_memory_acceptance_rate, total_recommendations")
      .eq("organization_id", organizationId),
    sc.from("proposal_quality_feedback")
      .select("quality_score, usefulness_score, historical_support_score, historical_conflict_score, decision_signal")
      .eq("organization_id", organizationId)
      .not("historical_support_score", "is", null)
      .limit(200),
  ]);

  const aggs = (aggRes.data || []) as any[];
  const fb = (fbRes.data || []) as any[];

  for (const agg of aggs) {
    const memRate = Number(agg.memory_enriched_acceptance_rate || 0);
    const nonMemRate = Number(agg.non_memory_acceptance_rate || 0);
    const total = Number(agg.total_recommendations || 0);

    if (total < 5) continue;

    const scoring = computeCalibrationScore({
      sample_size: total,
      acceptance_rate: memRate,
      implementation_rate: 0.5,
      positive_outcome_rate: 0.5,
      avg_quality_score: 0.5,
      avg_usefulness_score: 0.5,
    });

    if (isContextOverweighted(memRate, nonMemRate, total)) {
      signals.push({
        organization_id: organizationId,
        calibration_domain: "HISTORICAL_CONTEXT_VALUE",
        target_component: agg.meta_agent_type,
        signal_type: "HISTORICAL_CONTEXT_OVERWEIGHTED",
        title: `Historical context may be hurting ${agg.meta_agent_type}`,
        description: `Memory-enriched acceptance: ${(memRate * 100).toFixed(0)}% vs non-memory: ${(nonMemRate * 100).toFixed(0)}%`,
        ...scoring,
        evidence_refs: [{ memory_rate: memRate, non_memory_rate: nonMemRate, total }],
        recommended_action: "Consider reducing historical context weight for this agent.",
      });
    }

    if (isContextUnderused(memRate, nonMemRate, total, total)) {
      signals.push({
        organization_id: organizationId,
        calibration_domain: "HISTORICAL_CONTEXT_VALUE",
        target_component: agg.meta_agent_type,
        signal_type: "HISTORICAL_CONTEXT_UNDERUSED",
        title: `Historical context underused for ${agg.meta_agent_type}`,
        description: `Memory-enriched shows higher acceptance but is only used in limited cases.`,
        ...scoring,
        evidence_refs: [{ memory_rate: memRate, non_memory_rate: nonMemRate, total }],
        recommended_action: "Consider increasing historical context enrichment for this agent.",
      });
    }
  }

  // Overall historical support vs conflict analysis
  if (fb.length >= 5) {
    const highSupport = fb.filter((f: any) => Number(f.historical_support_score) > 0.7);
    const highConflict = fb.filter((f: any) => Number(f.historical_conflict_score) > 0.7);
    const supportAccepted = highSupport.filter((f: any) => ["accepted", "approved", "implemented"].includes(f.decision_signal)).length;
    const conflictRejected = highConflict.filter((f: any) => f.decision_signal === "rejected").length;

    if (highSupport.length >= 3 && supportAccepted / highSupport.length > 0.7) {
      signals.push({
        organization_id: organizationId,
        calibration_domain: "HISTORICAL_CONTEXT_VALUE",
        target_component: "historical_support",
        signal_type: "HISTORICAL_CONTEXT_HIGH_VALUE",
        title: "High historical support correlates with acceptance",
        description: `${supportAccepted}/${highSupport.length} highly supported proposals accepted`,
        signal_strength: 0.6,
        confidence_score: Math.min(0.9, highSupport.length / 20),
        evidence_refs: [{ high_support_count: highSupport.length, accepted: supportAccepted }],
        recommended_action: "Historical support scoring appears well-calibrated.",
      });
    }
  }

  return signals;
}

// ─── Redundancy Guard Effectiveness Analysis ───

export async function analyzeRedundancyGuardEffectiveness(
  sc: SupabaseClient,
  organizationId: string,
): Promise<CalibrationSignalInput[]> {
  const signals: CalibrationSignalInput[] = [];

  const [fbRes, recsRes] = await Promise.all([
    sc.from("proposal_quality_feedback")
      .select("feedback_tags, decision_signal")
      .eq("organization_id", organizationId)
      .limit(200),
    sc.from("meta_agent_recommendations")
      .select("status, recommendation_signature")
      .eq("organization_id", organizationId)
      .limit(500),
  ]);

  const fb = (fbRes.data || []) as any[];
  const recs = (recsRes.data || []) as any[];

  const novelButUseful = fb.filter((f: any) => {
    const tags = Array.isArray(f.feedback_tags) ? f.feedback_tags : [];
    return tags.includes("novel_but_useful");
  });
  const historicallyRedundant = fb.filter((f: any) => {
    const tags = Array.isArray(f.feedback_tags) ? f.feedback_tags : [];
    return tags.includes("historically_redundant");
  });
  const totalTagged = novelButUseful.length + historicallyRedundant.length;

  if (totalTagged >= 3) {
    if (isRedundancyTooStrict(novelButUseful.length, totalTagged)) {
      const scoring = computeCalibrationScore({
        sample_size: totalTagged,
        acceptance_rate: 0.5,
        implementation_rate: 0.5,
        positive_outcome_rate: 0.5,
        avg_quality_score: 0.5,
        avg_usefulness_score: 0.5,
      });
      signals.push({
        organization_id: organizationId,
        calibration_domain: "REDUNDANCY_GUARD_EFFECTIVENESS",
        target_component: "redundancy_guard",
        signal_type: "REDUNDANCY_GUARD_TOO_STRICT",
        title: "Redundancy guard may be too strict",
        description: `${novelButUseful.length} novel-but-useful signals vs ${historicallyRedundant.length} redundant`,
        ...scoring,
        evidence_refs: [{ novel_but_useful: novelButUseful.length, historically_redundant: historicallyRedundant.length }],
        recommended_action: "Consider relaxing redundancy thresholds to allow more novel signals.",
      });
    }

    if (isRedundancyTooWeak(historicallyRedundant.length, totalTagged)) {
      const scoring = computeCalibrationScore({
        sample_size: totalTagged,
        acceptance_rate: 0.5,
        implementation_rate: 0.5,
        positive_outcome_rate: 0.5,
        avg_quality_score: 0.5,
        avg_usefulness_score: 0.5,
      });
      signals.push({
        organization_id: organizationId,
        calibration_domain: "REDUNDANCY_GUARD_EFFECTIVENESS",
        target_component: "redundancy_guard",
        signal_type: "REDUNDANCY_GUARD_TOO_WEAK",
        title: "Redundancy guard may be too weak",
        description: `${historicallyRedundant.length} redundant recommendations still passing through`,
        ...scoring,
        evidence_refs: [{ historically_redundant: historicallyRedundant.length, total: totalTagged }],
        recommended_action: "Consider tightening redundancy suppression thresholds.",
      });
    }
  }

  return signals;
}

// ─── Full Calibration Signal Generation ───

export async function generateCalibrationSignals(
  sc: SupabaseClient,
  userId: string,
  organizationId: string,
  workspaceId?: string | null,
): Promise<{ signals: CalibrationSignalInput[]; persisted: number }> {
  const [agentSignals, usefulnessSignals, contextSignals, redundancySignals] = await Promise.all([
    analyzeMetaAgentPerformance(sc, organizationId).catch(() => []),
    analyzeProposalUsefulness(sc, organizationId).catch(() => []),
    analyzeHistoricalContextValue(sc, organizationId).catch(() => []),
    analyzeRedundancyGuardEffectiveness(sc, organizationId).catch(() => []),
  ]);

  const allSignals = [...agentSignals, ...usefulnessSignals, ...contextSignals, ...redundancySignals];

  // Add workspace_id if provided
  if (workspaceId) {
    for (const s of allSignals) s.workspace_id = workspaceId;
  }

  // Persist signals
  let persisted = 0;
  if (allSignals.length > 0) {
    const rows = allSignals.map((s) => ({
      organization_id: s.organization_id,
      workspace_id: s.workspace_id || null,
      calibration_domain: s.calibration_domain,
      target_component: s.target_component,
      signal_type: s.signal_type,
      title: s.title,
      description: s.description,
      signal_strength: s.signal_strength,
      confidence_score: s.confidence_score,
      evidence_refs: s.evidence_refs,
      recommended_action: s.recommended_action,
      risk_of_overcorrection: s.risk_of_overcorrection || null,
    }));

    const { data } = await sc.from("advisory_calibration_signals").insert(rows).select("id");
    persisted = data?.length || 0;

    // Audit trail
    try {
      await sc.from("audit_logs").insert({
        user_id: userId,
        action: "ADVISORY_CALIBRATION_SIGNAL_CREATED",
        category: "calibration",
        entity_type: "advisory_calibration_signals",
        message: `Generated ${persisted} calibration signals`,
        metadata: { signal_count: persisted, domains: [...new Set(allSignals.map((s) => s.calibration_domain))] },
        organization_id: organizationId,
      });
    } catch { /* non-blocking */ }
  }

  return { signals: allSignals, persisted };
}

// ─── Calibration Summary Generation ───

export async function generateCalibrationSummary(
  sc: SupabaseClient,
  userId: string,
  organizationId: string,
  periodStart: string,
  periodEnd: string,
  workspaceId?: string | null,
): Promise<Record<string, unknown>> {
  const { data: signals } = await sc
    .from("advisory_calibration_signals")
    .select("*")
    .eq("organization_id", organizationId)
    .gte("created_at", periodStart)
    .lte("created_at", periodEnd)
    .order("signal_strength", { ascending: false })
    .limit(100);

  const allSignals = (signals || []) as any[];

  const byDomain: Record<string, any[]> = {};
  for (const s of allSignals) {
    if (!byDomain[s.calibration_domain]) byDomain[s.calibration_domain] = [];
    byDomain[s.calibration_domain].push(s);
  }

  const strongest = allSignals.slice(0, 5).map((s: any) => ({
    signal_type: s.signal_type,
    target_component: s.target_component,
    signal_strength: s.signal_strength,
    title: s.title,
  }));

  const domainSummary: Record<string, { count: number; avg_strength: number; top_signal: string }> = {};
  for (const [domain, sigs] of Object.entries(byDomain)) {
    const avgStr = sigs.reduce((a: number, s: any) => a + Number(s.signal_strength), 0) / sigs.length;
    domainSummary[domain] = {
      count: sigs.length,
      avg_strength: Math.round(avgStr * 1000) / 1000,
      top_signal: sigs[0]?.signal_type || "",
    };
  }

  const summary = {
    organization_id: organizationId,
    workspace_id: workspaceId || null,
    summary_type: "FULL_CALIBRATION_REPORT",
    title: `Calibration Report ${periodStart.slice(0, 10)} to ${periodEnd.slice(0, 10)}`,
    content: {
      total_signals: allSignals.length,
      by_domain: domainSummary,
      strongest_signals: strongest,
      generated_at: new Date().toISOString(),
    },
    signal_count: allSignals.length,
    strongest_signals: strongest,
    period_start: periodStart,
    period_end: periodEnd,
  };

  const { data } = await sc.from("advisory_calibration_summaries").insert(summary).select("id").single();

  // Audit
  try {
    await sc.from("audit_logs").insert({
      user_id: userId,
      action: "ADVISORY_CALIBRATION_SUMMARY_CREATED",
      category: "calibration",
      entity_type: "advisory_calibration_summaries",
      entity_id: data?.id,
      message: `Calibration summary generated with ${allSignals.length} signals`,
      metadata: { signal_count: allSignals.length },
      organization_id: organizationId,
    });
  } catch { /* non-blocking */ }

  return { id: data?.id, ...summary };
}
