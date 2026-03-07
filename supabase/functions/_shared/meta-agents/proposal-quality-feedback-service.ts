/**
 * Proposal Quality Feedback Service — Sprint 19
 *
 * Captures feedback for recommendations and artifacts,
 * computes deterministic quality/usefulness signals,
 * retrieves feedback history, and logs audit events.
 *
 * SAFETY: Advisory data capture only. Never mutates system behavior.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  type ProposalQualityFeedbackInput,
  type FeedbackScores,
  type FeedbackTag,
  PROPOSAL_QUALITY_AUDIT_EVENTS,
} from "./proposal-quality-types.ts";
import { computeFeedbackScores } from "./proposal-quality-scoring.ts";

// ─── Capture Recommendation Feedback ───

export async function captureRecommendationFeedback(
  sc: SupabaseClient,
  userId: string,
  input: ProposalQualityFeedbackInput,
): Promise<{ id: string; scores: FeedbackScores } | null> {
  return captureFeedback(sc, userId, { ...input, entity_type: "recommendation" });
}

// ─── Capture Artifact Feedback ───

export async function captureArtifactFeedback(
  sc: SupabaseClient,
  userId: string,
  input: ProposalQualityFeedbackInput,
): Promise<{ id: string; scores: FeedbackScores } | null> {
  return captureFeedback(sc, userId, { ...input, entity_type: "artifact" });
}

// ─── Core Capture ───

async function captureFeedback(
  sc: SupabaseClient,
  userId: string,
  input: ProposalQualityFeedbackInput,
): Promise<{ id: string; scores: FeedbackScores } | null> {
  try {
    const scores = computeFeedbackScores(input);

    const record = {
      organization_id: input.organization_id,
      workspace_id: input.workspace_id || null,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      source_meta_agent_type: input.source_meta_agent_type || null,
      artifact_type: input.artifact_type || null,
      decision_signal: input.decision_signal,
      follow_through_signal: input.follow_through_signal || "unknown",
      outcome_signal: input.outcome_signal || "unknown",
      reviewer_feedback_score: input.reviewer_feedback_score ?? null,
      quality_score: scores.quality_score,
      usefulness_score: scores.usefulness_score,
      historical_support_score: scores.historical_support_score,
      historical_conflict_score: scores.historical_conflict_score,
      feedback_tags: input.feedback_tags || [],
      notes: input.notes || null,
      evidence_refs: input.evidence_refs || [],
    };

    const { data, error } = await sc
      .from("proposal_quality_feedback")
      .insert(record)
      .select("id")
      .single();

    if (error) {
      console.error("Feedback capture error:", error);
      return null;
    }

    // Audit log (fire-and-forget)
    sc.from("audit_logs").insert({
      user_id: userId,
      action: PROPOSAL_QUALITY_AUDIT_EVENTS.PROPOSAL_FEEDBACK_CAPTURED,
      category: "meta_agents",
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      message: `Proposal feedback captured: ${input.entity_type} ${input.entity_id} → ${input.decision_signal}`,
      organization_id: input.organization_id,
      metadata: {
        decision_signal: input.decision_signal,
        quality_score: scores.quality_score,
        usefulness_score: scores.usefulness_score,
        outcome_signal: input.outcome_signal || "unknown",
        meta_agent_type: input.source_meta_agent_type,
        artifact_type: input.artifact_type,
        feedback_tags: input.feedback_tags || [],
      },
    }).catch((e: any) => console.error("Audit log error:", e));

    return { id: data.id, scores };
  } catch (e) {
    console.error("captureFeedback error:", e);
    return null;
  }
}

// ─── Record Outcome Signal ───

export async function recordOutcomeSignal(
  sc: SupabaseClient,
  userId: string,
  organizationId: string,
  entityType: string,
  entityId: string,
  outcomeSignal: string,
  followThroughSignal?: string,
  notes?: string,
): Promise<boolean> {
  try {
    const { error } = await sc
      .from("proposal_quality_feedback")
      .update({
        outcome_signal: outcomeSignal,
        follow_through_signal: followThroughSignal || undefined,
        notes: notes || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", organizationId)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId);

    if (error) {
      console.error("Outcome update error:", error);
      return false;
    }

    // Audit
    sc.from("audit_logs").insert({
      user_id: userId,
      action: PROPOSAL_QUALITY_AUDIT_EVENTS.PROPOSAL_OUTCOME_RECORDED,
      category: "meta_agents",
      entity_type: entityType,
      entity_id: entityId,
      message: `Outcome recorded: ${entityType} ${entityId} → ${outcomeSignal}`,
      organization_id: organizationId,
      metadata: { outcome_signal: outcomeSignal, follow_through_signal: followThroughSignal },
    }).catch((e: any) => console.error("Audit log error:", e));

    return true;
  } catch (e) {
    console.error("recordOutcomeSignal error:", e);
    return false;
  }
}

// ─── List Proposal Feedback ───

export async function listProposalFeedback(
  sc: SupabaseClient,
  organizationId: string,
  filters?: {
    entity_type?: string;
    meta_agent_type?: string;
    artifact_type?: string;
    decision_signal?: string;
    limit?: number;
  },
): Promise<Record<string, unknown>[]> {
  try {
    let query = sc
      .from("proposal_quality_feedback")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(filters?.limit || 50);

    if (filters?.entity_type) query = query.eq("entity_type", filters.entity_type);
    if (filters?.meta_agent_type) query = query.eq("source_meta_agent_type", filters.meta_agent_type);
    if (filters?.artifact_type) query = query.eq("artifact_type", filters.artifact_type);
    if (filters?.decision_signal) query = query.eq("decision_signal", filters.decision_signal);

    const { data, error } = await query;
    if (error) {
      console.error("List feedback error:", error);
      return [];
    }
    return (data || []) as Record<string, unknown>[];
  } catch (e) {
    console.error("listProposalFeedback error:", e);
    return [];
  }
}
