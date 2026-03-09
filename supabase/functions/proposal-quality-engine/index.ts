import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, AuthContext, requireOrgMembership } from "../_shared/auth.ts";
import {
  scoreQualityRecord,
  computeAggregateQuality,
  computeFeedbackScores,
  QualityRecordInput,
} from "../_shared/meta-agents/proposal-quality-scoring.ts";
import {
  captureRecommendationFeedback,
  captureArtifactFeedback,
  recordOutcomeSignal,
  listProposalFeedback,
} from "../_shared/meta-agents/proposal-quality-feedback-service.ts";
import { generateProposalQualitySummaries } from "../_shared/meta-agents/proposal-quality-summary-service.ts";

/**
 * proposal-quality-engine — Sprint 19 (Expanded)
 *
 * Actions:
 *   record_outcome       — Record a review outcome and compute quality scores
 *   compute_aggregates   — Recompute aggregate quality metrics per meta-agent
 *   get_feedback         — Get quality feedback signals for generation improvement
 *   get_metrics          — Get quality metrics for UI display
 *   capture_feedback     — Capture structured proposal quality feedback
 *   record_outcome_signal — Attach outcome signal to existing feedback
 *   list_feedback        — List proposal quality feedback records
 *   generate_summaries   — Generate proposal quality summaries
 *   get_summaries        — Get proposal quality summaries
 *   get_observability    — Full observability metrics
 *
 * SAFETY: Read-only analytics + quality record writes. Never mutates proposals.
 */

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = await authenticate(req);
    if (auth instanceof Response) return auth;
    const { user, serviceClient: sc } = auth as AuthContext;

    const body = await req.json();
    const { action, organization_id } = body;

    if (!organization_id) return errorResponse("organization_id required", 400);

    const memberCheck = await requireOrgMembership(sc, user.id, organization_id);
    if (memberCheck instanceof Response) return memberCheck;

    // ─── CAPTURE FEEDBACK ───
    if (action === "capture_feedback") {
      const handler = body.entity_type === "artifact" ? captureArtifactFeedback : captureRecommendationFeedback;
      const result = await handler(sc, user.id, {
        organization_id,
        workspace_id: body.workspace_id,
        entity_type: body.entity_type || "recommendation",
        entity_id: body.entity_id,
        source_meta_agent_type: body.source_meta_agent_type,
        artifact_type: body.artifact_type,
        decision_signal: body.decision_signal,
        follow_through_signal: body.follow_through_signal,
        outcome_signal: body.outcome_signal,
        reviewer_feedback_score: body.reviewer_feedback_score,
        feedback_tags: body.feedback_tags,
        notes: body.notes,
        evidence_refs: body.evidence_refs,
        confidence_score: body.confidence_score,
        impact_score: body.impact_score,
        priority_score: body.priority_score,
        historical_alignment: body.historical_alignment,
        was_memory_enriched: body.was_memory_enriched,
        created_at: body.created_at,
        reviewed_at: body.reviewed_at,
      });
      if (!result) return errorResponse("Failed to capture feedback (non-blocking)", 500);
      return jsonResponse({ ...result, captured: true });
    }

    // ─── RECORD OUTCOME SIGNAL ───
    if (action === "record_outcome_signal") {
      const ok = await recordOutcomeSignal(
        sc, user.id, organization_id,
        body.entity_type, body.entity_id,
        body.outcome_signal, body.follow_through_signal, body.notes,
      );
      return jsonResponse({ updated: ok });
    }

    // ─── LIST FEEDBACK ───
    if (action === "list_feedback") {
      const records = await listProposalFeedback(sc, organization_id, {
        entity_type: body.entity_type,
        meta_agent_type: body.meta_agent_type,
        artifact_type: body.artifact_type,
        decision_signal: body.decision_signal,
        limit: body.limit,
      });
      return jsonResponse({ records, total: records.length });
    }

    // ─── GENERATE SUMMARIES ───
    if (action === "generate_summaries") {
      if (!body.period_start || !body.period_end) {
        return errorResponse("period_start and period_end required", 400);
      }
      const result = await generateProposalQualitySummaries(sc, user.id, {
        organization_id,
        workspace_id: body.workspace_id,
        period_start: body.period_start,
        period_end: body.period_end,
      });
      return jsonResponse(result);
    }

    // ─── GET SUMMARIES ───
    if (action === "get_summaries") {
      const { data } = await sc
        .from("proposal_quality_summaries")
        .select("*")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false })
        .limit(body.limit || 20);
      return jsonResponse({ summaries: data || [] });
    }

    // ─── GET OBSERVABILITY ───
    if (action === "get_observability") {
      const [feedbackRes, summariesRes, aggregatesRes] = await Promise.all([
        sc.from("proposal_quality_feedback").select("entity_type, decision_signal, outcome_signal, quality_score, usefulness_score, source_meta_agent_type, artifact_type, feedback_tags, follow_through_signal").eq("organization_id", organization_id).limit(200),
        sc.from("proposal_quality_summaries").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(10),
        sc.from("proposal_quality_aggregates").select("*").eq("organization_id", organization_id),
      ]);

      const fb = (feedbackRes.data || []) as Record<string, unknown>[];
      const totalFeedback = fb.length;
      const avgQuality = totalFeedback > 0 ? fb.reduce((a, f) => a + Number(f.quality_score || 0), 0) / totalFeedback : 0;
      const avgUsefulness = totalFeedback > 0 ? fb.reduce((a, f) => a + Number(f.usefulness_score || 0), 0) / totalFeedback : 0;

      // By meta-agent
      const byAgent: Record<string, { count: number; avgQ: number; avgU: number }> = {};
      for (const f of fb) {
        const agent = (f.source_meta_agent_type as string) || "unknown";
        if (!byAgent[agent]) byAgent[agent] = { count: 0, avgQ: 0, avgU: 0 };
        byAgent[agent].count++;
        byAgent[agent].avgQ += Number(f.quality_score || 0);
        byAgent[agent].avgU += Number(f.usefulness_score || 0);
      }
      for (const k of Object.keys(byAgent)) {
        byAgent[k].avgQ = Math.round((byAgent[k].avgQ / byAgent[k].count) * 1000) / 1000;
        byAgent[k].avgU = Math.round((byAgent[k].avgU / byAgent[k].count) * 1000) / 1000;
      }

      // Tag frequency
      const tagFreq: Record<string, number> = {};
      for (const f of fb) {
        const tags = Array.isArray(f.feedback_tags) ? f.feedback_tags : [];
        for (const t of tags) { tagFreq[t as string] = (tagFreq[t as string] || 0) + 1; }
      }

      // Outcome breakdown
      const outcomes = { positive: 0, neutral: 0, negative: 0, unknown: 0 };
      for (const f of fb) { outcomes[(f.outcome_signal as keyof typeof outcomes) || "unknown"]++; }

      // Decision breakdown
      const decisions: Record<string, number> = {};
      for (const f of fb) { const d = (f.decision_signal as string) || "unknown"; decisions[d] = (decisions[d] || 0) + 1; }

      return jsonResponse({
        total_feedback_records: totalFeedback,
        avg_quality_score: Math.round(avgQuality * 1000) / 1000,
        avg_usefulness_score: Math.round(avgUsefulness * 1000) / 1000,
        by_meta_agent: byAgent,
        tag_frequency: tagFreq,
        outcome_breakdown: outcomes,
        decision_breakdown: decisions,
        approval_rate: totalFeedback > 0 ? fb.filter((f) => ["accepted", "approved", "implemented"].includes(f.decision_signal as string)).length / totalFeedback : 0,
        implementation_rate: totalFeedback > 0 ? fb.filter((f) => f.follow_through_signal === "implemented" || f.decision_signal === "implemented").length / totalFeedback : 0,
        positive_outcome_rate: totalFeedback > 0 ? outcomes.positive / totalFeedback : 0,
        summaries: summariesRes.data || [],
        aggregates: aggregatesRes.data || [],
      });
    }

    // ─── RECORD OUTCOME (legacy) ───
    if (action === "record_outcome") {
      const input: QualityRecordInput = {
        entity_type: body.entity_type || "recommendation",
        entity_id: body.entity_id,
        meta_agent_type: body.meta_agent_type || "",
        recommendation_type: body.recommendation_type || "",
        artifact_type: body.artifact_type,
        review_outcome: body.review_outcome,
        created_at: body.created_at || new Date().toISOString(),
        reviewed_at: body.reviewed_at,
        confidence_score: Number(body.confidence_score || 0),
        impact_score: Number(body.impact_score || 0),
        priority_score: Number(body.priority_score || 0),
        historical_alignment: body.historical_alignment,
        was_memory_enriched: Boolean(body.was_memory_enriched),
        reviewer_notes: body.reviewer_notes,
      };

      if (!input.entity_id || !input.review_outcome) {
        return errorResponse("entity_id and review_outcome required", 400);
      }

      const scores = scoreQualityRecord(input);

      const { data, error } = await sc
        .from("proposal_quality_records")
        .insert({
          organization_id,
          entity_type: input.entity_type,
          entity_id: input.entity_id,
          meta_agent_type: input.meta_agent_type,
          recommendation_type: input.recommendation_type,
          artifact_type: input.artifact_type,
          review_outcome: input.review_outcome,
          review_latency_hours: scores.review_latency_hours,
          reviewer_notes_length: (input.reviewer_notes || "").length,
          acceptance_quality_score: scores.acceptance_quality_score,
          implementation_quality_score: scores.implementation_quality_score,
          historical_alignment_accuracy: scores.historical_alignment_accuracy,
          overall_quality_score: scores.overall_quality_score,
          confidence_at_creation: input.confidence_score,
          impact_at_creation: input.impact_score,
          priority_at_creation: input.priority_score,
          historical_alignment: input.historical_alignment,
          was_memory_enriched: input.was_memory_enriched,
          feedback_signals: scores.feedback_signals,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Quality record insert error:", error);
        return errorResponse("Failed to record quality", 500);
      }

      return jsonResponse({ id: data?.id, scores, recorded: true });
    }

    // ─── COMPUTE AGGREGATES ───
    if (action === "compute_aggregates") {
      const agentTypes = [
        "ARCHITECTURE_META_AGENT",
        "AGENT_ROLE_DESIGNER",
        "WORKFLOW_OPTIMIZER",
        "SYSTEM_EVOLUTION_ADVISOR",
      ];

      const results: Record<string, unknown> = {};

      for (const agentType of agentTypes) {
        const { data: recs } = await sc
          .from("meta_agent_recommendations")
          .select("status, confidence_score, supporting_evidence, source_metrics")
          .eq("organization_id", organization_id)
          .eq("meta_agent_type", agentType);

        const allRecs = (recs || []) as any[];
        const accepted = allRecs.filter((r: any) => r.status === "accepted");
        const rejected = allRecs.filter((r: any) => r.status === "rejected");
        const deferred = allRecs.filter((r: any) => r.status === "deferred");

        const { data: arts } = await sc
          .from("meta_agent_artifacts")
          .select("status")
          .eq("organization_id", organization_id)
          .eq("created_by_meta_agent", agentType);

        const allArts = (arts || []) as any[];
        const approved = allArts.filter((a: any) => a.status === "approved" || a.status === "implemented");
        const implemented = allArts.filter((a: any) => a.status === "implemented");

        const memoryEnriched = allRecs.filter((r: any) => {
          const ev = Array.isArray(r.supporting_evidence) ? r.supporting_evidence : [];
          return ev.some((e: any) => e.type?.includes("history_context"));
        });
        const memoryAccepted = memoryEnriched.filter((r: any) => r.status === "accepted");
        const nonMemory = allRecs.filter((r: any) => {
          const ev = Array.isArray(r.supporting_evidence) ? r.supporting_evidence : [];
          return !ev.some((e: any) => e.type?.includes("history_context"));
        });
        const nonMemoryAccepted = nonMemory.filter((r: any) => r.status === "accepted");

        const { data: recentQuality } = await sc
          .from("proposal_quality_records")
          .select("overall_quality_score")
          .eq("organization_id", organization_id)
          .eq("meta_agent_type", agentType)
          .order("created_at", { ascending: false })
          .limit(20);

        const recentScores = (recentQuality || []).map((q: any) => Number(q.overall_quality_score));

        const { data: prevAgg } = await sc
          .from("proposal_quality_aggregates")
          .select("avg_overall_quality")
          .eq("organization_id", organization_id)
          .eq("meta_agent_type", agentType)
          .maybeSingle();

        const aggregate = computeAggregateQuality({
          total_recommendations: allRecs.length,
          total_accepted: accepted.length,
          total_rejected: rejected.length,
          total_deferred: deferred.length,
          total_artifacts_generated: allArts.length,
          total_artifacts_approved: approved.length,
          total_artifacts_implemented: implemented.length,
          avg_confidence_accepted: accepted.length > 0
            ? accepted.reduce((a: number, r: any) => a + Number(r.confidence_score), 0) / accepted.length : 0,
          avg_confidence_rejected: rejected.length > 0
            ? rejected.reduce((a: number, r: any) => a + Number(r.confidence_score), 0) / rejected.length : 0,
          memory_enriched_accepted: memoryAccepted.length,
          memory_enriched_total: memoryEnriched.length,
          non_memory_accepted: nonMemoryAccepted.length,
          non_memory_total: nonMemory.length,
          recent_quality_scores: recentScores,
          previous_avg_quality: Number(prevAgg?.avg_overall_quality || 0),
        });

        await sc.from("proposal_quality_aggregates").upsert({
          organization_id,
          meta_agent_type: agentType,
          total_recommendations: allRecs.length,
          total_accepted: accepted.length,
          total_rejected: rejected.length,
          total_deferred: deferred.length,
          total_artifacts_generated: allArts.length,
          total_artifacts_approved: approved.length,
          total_artifacts_implemented: implemented.length,
          avg_acceptance_rate: aggregate.avg_acceptance_rate,
          avg_implementation_rate: aggregate.avg_implementation_rate,
          avg_confidence_accepted: accepted.length > 0
            ? accepted.reduce((a: number, r: any) => a + Number(r.confidence_score), 0) / accepted.length : 0,
          avg_confidence_rejected: rejected.length > 0
            ? rejected.reduce((a: number, r: any) => a + Number(r.confidence_score), 0) / rejected.length : 0,
          avg_overall_quality: aggregate.avg_overall_quality,
          memory_enriched_acceptance_rate: aggregate.memory_enriched_acceptance_rate,
          non_memory_acceptance_rate: aggregate.non_memory_acceptance_rate,
          quality_trend: aggregate.quality_trend,
          last_computed_at: new Date().toISOString(),
        }, { onConflict: "organization_id,meta_agent_type" });

        results[agentType] = aggregate;
      }

      return jsonResponse({ aggregates: results, computed_at: new Date().toISOString() });
    }

    // ─── GET FEEDBACK ───
    if (action === "get_feedback") {
      const metaAgentType = body.meta_agent_type;
      if (!metaAgentType) return errorResponse("meta_agent_type required", 400);

      const { data: agg } = await sc
        .from("proposal_quality_aggregates")
        .select("*")
        .eq("organization_id", organization_id)
        .eq("meta_agent_type", metaAgentType)
        .maybeSingle();

      const { data: recentRecords } = await sc
        .from("proposal_quality_records")
        .select("feedback_signals, review_outcome, overall_quality_score")
        .eq("organization_id", organization_id)
        .eq("meta_agent_type", metaAgentType)
        .order("created_at", { ascending: false })
        .limit(10);

      const records = (recentRecords || []) as any[];
      const overconfidentCount = records.filter((r: any) =>
        r.feedback_signals?.confidence_calibration === "overconfident"
      ).length;
      const underconfidentCount = records.filter((r: any) =>
        r.feedback_signals?.confidence_calibration === "underconfident"
      ).length;

      return jsonResponse({
        aggregate: agg || null,
        recent_calibration: {
          overconfident_ratio: records.length > 0 ? overconfidentCount / records.length : 0,
          underconfident_ratio: records.length > 0 ? underconfidentCount / records.length : 0,
          well_calibrated_ratio: records.length > 0
            ? (records.length - overconfidentCount - underconfidentCount) / records.length : 1,
        },
        memory_effectiveness: agg ? {
          enriched_rate: Number(agg.memory_enriched_acceptance_rate),
          non_enriched_rate: Number(agg.non_memory_acceptance_rate),
          delta: Number(agg.memory_enriched_acceptance_rate) - Number(agg.non_memory_acceptance_rate),
        } : null,
        quality_trend: agg?.quality_trend || "stable",
      });
    }

    // ─── GET METRICS ───
    if (action === "get_metrics") {
      const { data: aggregates } = await sc
        .from("proposal_quality_aggregates")
        .select("*")
        .eq("organization_id", organization_id);

      const { data: recentRecords } = await sc
        .from("proposal_quality_records")
        .select("entity_type, review_outcome, overall_quality_score, was_memory_enriched, meta_agent_type")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false })
        .limit(50);

      const records = (recentRecords || []) as any[];
      const avgQuality = records.length > 0
        ? records.reduce((a: number, r: any) => a + Number(r.overall_quality_score), 0) / records.length : 0;

      return jsonResponse({
        aggregates: aggregates || [],
        summary: {
          total_records: records.length,
          avg_quality: Math.round(avgQuality * 1000) / 1000,
          memory_enriched_count: records.filter((r: any) => r.was_memory_enriched).length,
          by_outcome: {
            accepted: records.filter((r: any) => r.review_outcome === "accepted").length,
            rejected: records.filter((r: any) => r.review_outcome === "rejected").length,
            deferred: records.filter((r: any) => r.review_outcome === "deferred").length,
            approved: records.filter((r: any) => r.review_outcome === "approved").length,
            implemented: records.filter((r: any) => r.review_outcome === "implemented").length,
          },
        },
      });
    }

    return errorResponse("Invalid action. Use: capture_feedback, record_outcome_signal, list_feedback, generate_summaries, get_summaries, get_observability, record_outcome, compute_aggregates, get_feedback, get_metrics", 400);
  } catch (e) {
    console.error("proposal-quality-engine error:", e);
    return errorResponse(e.message || "Internal error", 500);
  }
});
