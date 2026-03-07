import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, AuthContext } from "../_shared/auth.ts";
import {
  retrieveForRepair,
  retrieveForMetaAgent,
  retrieveForArtifactGeneration,
  retrieveForReview,
  getRetrievalMetrics,
} from "../_shared/engineering-memory-retriever.ts";

/**
 * memory-retrieval-surface — Sprint 16
 *
 * Unified retrieval endpoint for all memory surfaces.
 *
 * POST { action, organization_id, ...params }
 *
 * Actions:
 *   retrieve_for_repair
 *   retrieve_for_meta_agent
 *   retrieve_for_artifact_generation
 *   retrieve_for_review
 *   retrieval_metrics
 *
 * SAFETY: Read-only. Never mutates system state.
 */

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = await authenticate(req);
    if (auth instanceof Response) return auth;
    const { serviceClient: sc } = auth as AuthContext;

    const body = await req.json();
    const { action, organization_id } = body;

    if (!organization_id) return errorResponse("organization_id required", 400);

    // ─── REPAIR SURFACE ───
    if (action === "retrieve_for_repair") {
      const result = await retrieveForRepair(sc, organization_id, {
        error_category: body.error_category,
        affected_stage: body.affected_stage,
        affected_component: body.affected_component,
        error_tags: body.error_tags,
      });
      return jsonResponse(result);
    }

    // ─── META-AGENT ANALYSIS SURFACE ───
    if (action === "retrieve_for_meta_agent") {
      if (!body.meta_agent_type) return errorResponse("meta_agent_type required", 400);
      const result = await retrieveForMetaAgent(sc, organization_id, {
        meta_agent_type: body.meta_agent_type,
        target_component: body.target_component,
        target_stage: body.target_stage,
        analysis_tags: body.analysis_tags,
      });
      return jsonResponse(result);
    }

    // ─── ARTIFACT GENERATION SURFACE ───
    if (action === "retrieve_for_artifact_generation") {
      if (!body.artifact_type) return errorResponse("artifact_type required", 400);
      const result = await retrieveForArtifactGeneration(sc, organization_id, {
        artifact_type: body.artifact_type,
        target_component: body.target_component,
        recommendation_type: body.recommendation_type,
        meta_agent_type: body.meta_agent_type,
      });
      return jsonResponse(result);
    }

    // ─── HUMAN REVIEW SURFACE ───
    if (action === "retrieve_for_review") {
      if (!body.review_type) return errorResponse("review_type required (recommendation_review or artifact_review)", 400);
      const result = await retrieveForReview(sc, organization_id, {
        review_type: body.review_type,
        target_component: body.target_component,
        related_stage: body.related_stage,
        tags: body.tags,
      });
      return jsonResponse(result);
    }

    // ─── RETRIEVAL METRICS ───
    if (action === "retrieval_metrics") {
      const metrics = await getRetrievalMetrics(sc, organization_id);
      return jsonResponse(metrics);
    }

    return errorResponse(
      "Invalid action. Must be: retrieve_for_repair, retrieve_for_meta_agent, retrieve_for_artifact_generation, retrieve_for_review, retrieval_metrics",
      400
    );
  } catch (e) {
    console.error("memory-retrieval-surface error:", e);
    return errorResponse(e.message || "Internal error", 500);
  }
});
