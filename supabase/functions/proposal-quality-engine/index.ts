import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, AuthContext } from "../_shared/auth.ts";
import {
  scoreQualityRecord,
  computeAggregateQuality,
  QualityRecordInput,
} from "../_shared/meta-agents/proposal-quality-scoring.ts";

/**
 * proposal-quality-engine — Sprint 19
 *
 * Actions:
 *   record_outcome    — Record a review outcome and compute quality scores
 *   compute_aggregates — Recompute aggregate quality metrics per meta-agent
 *   get_feedback       — Get quality feedback signals for generation improvement
 *   get_metrics        — Get quality metrics for UI display
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

    // ─── RECORD OUTCOME ───
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

      // Upsert quality record
      const { data, error } = await sc
        .from("proposal_quality_records")
        .upsert({
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
        }, { onConflict: "organization_id,entity_type,entity_id" })
        .select("id")
        .maybeSingle();

      if (error) {
        console.error("Quality record insert error:", error);
        // Non-blocking: insert without unique constraint fallback
        const { data: insertData, error: insertError } = await sc
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
        
        if (insertError) {
          console.error("Quality record fallback insert error:", insertError);
          return errorResponse("Failed to record quality", 500);
        }
        return jsonResponse({ id: insertData.id, scores, recorded: true });
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
        // Fetch recommendation counts
        const { data: recs } = await sc
          .from("meta_agent_recommendations")
          .select("status, confidence_score, source_metrics")
          .eq("organization_id", organization_id)
          .eq("meta_agent_type", agentType);

        const allRecs = recs || [];
        const accepted = allRecs.filter((r: any) => r.status === "accepted");
        const rejected = allRecs.filter((r: any) => r.status === "rejected");
        const deferred = allRecs.filter((r: any) => r.status === "deferred");

        // Fetch artifact counts
        const { data: arts } = await sc
          .from("meta_agent_artifacts")
          .select("status")
          .eq("organization_id", organization_id)
          .eq("created_by_meta_agent", agentType);

        const allArts = (arts || []) as any[];
        const approved = allArts.filter((a: any) => a.status === "approved" || a.status === "implemented");
        const implemented = allArts.filter((a: any) => a.status === "implemented");

        // Memory enrichment stats
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

        // Recent quality scores
        const { data: recentQuality } = await sc
          .from("proposal_quality_records")
          .select("overall_quality_score")
          .eq("organization_id", organization_id)
          .eq("meta_agent_type", agentType)
          .order("created_at", { ascending: false })
          .limit(20);

        const recentScores = (recentQuality || []).map((q: any) => Number(q.overall_quality_score));

        // Previous aggregate for trend
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

        // Upsert aggregate
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

      // Get aggregate quality
      const { data: agg } = await sc
        .from("proposal_quality_aggregates")
        .select("*")
        .eq("organization_id", organization_id)
        .eq("meta_agent_type", metaAgentType)
        .maybeSingle();

      // Get recent feedback signals
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

    return errorResponse("Invalid action. Must be: record_outcome, compute_aggregates, get_feedback, get_metrics", 400);
  } catch (e) {
    console.error("proposal-quality-engine error:", e);
    return errorResponse(e.message || "Internal error", 500);
  }
});
