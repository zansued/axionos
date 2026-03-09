import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, AuthContext, requireOrgMembership } from "../_shared/auth.ts";
import { runSemanticRetrieval } from "../_shared/semantic-retrieval/semantic-retrieval-engine.ts";
import { evaluateRetrievalQuality } from "../_shared/semantic-retrieval/semantic-retrieval-quality-evaluator.ts";
import { getIndexStatuses, rebuildIndex, freezeIndex } from "../_shared/semantic-retrieval/semantic-retrieval-index-manager.ts";

/**
 * semantic-retrieval — Sprint 36
 *
 * Unified semantic retrieval endpoint.
 *
 * POST { action, organization_id, ...params }
 *
 * Actions:
 *   overview, domains, indices, sessions, feedback, explain,
 *   recompute_indices, run_retrieval, review_feedback,
 *   rebuild_index, freeze_index
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

    // ─── OVERVIEW ───
    if (action === "overview") {
      const [quality, indices] = await Promise.all([
        evaluateRetrievalQuality(sc, organization_id),
        getIndexStatuses(sc),
      ]);

      const { data: domainCount } = await sc.from("semantic_retrieval_domains").select("id", { count: "exact", head: true });
      const { data: sessionCount } = await sc.from("semantic_retrieval_sessions").select("id", { count: "exact", head: true }).eq("organization_id", organization_id);

      return jsonResponse({
        quality,
        indices,
        domain_count: domainCount || 0,
        session_count: sessionCount || 0,
      });
    }

    // ─── DOMAINS ───
    if (action === "domains") {
      const { data } = await sc.from("semantic_retrieval_domains").select("*").order("created_at", { ascending: false });
      return jsonResponse({ domains: data || [] });
    }

    // ─── INDICES ───
    if (action === "indices") {
      const indices = await getIndexStatuses(sc);
      return jsonResponse({ indices });
    }

    // ─── SESSIONS ───
    if (action === "sessions") {
      const { data } = await sc.from("semantic_retrieval_sessions").select("*")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false })
        .limit(50);
      return jsonResponse({ sessions: data || [] });
    }

    // ─── FEEDBACK ───
    if (action === "feedback") {
      const { data } = await sc.from("semantic_retrieval_feedback").select("*")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false })
        .limit(50);
      return jsonResponse({ feedback: data || [] });
    }

    // ─── EXPLAIN ───
    if (action === "explain") {
      if (!body.session_id) return errorResponse("session_id required", 400);
      const { data: session } = await sc.from("semantic_retrieval_sessions").select("*")
        .eq("id", body.session_id)
        .eq("organization_id", organization_id)
        .single();
      if (!session) return errorResponse("Session not found", 404);

      const { data: fb } = await sc.from("semantic_retrieval_feedback").select("*")
        .eq("retrieval_session_id", body.session_id);

      return jsonResponse({
        session,
        feedback: fb || [],
        explanation: {
          query_context: session.query_payload,
          domains_searched: session.domains_used,
          results_count: Array.isArray(session.ranked_results) ? session.ranked_results.length : 0,
          confidence: session.confidence_score,
          rationale: session.rationale_codes,
        },
      });
    }

    // ─── RUN RETRIEVAL ───
    if (action === "run_retrieval") {
      const pack = await runSemanticRetrieval(sc, {
        organization_id,
        session_type: body.session_type || "ad_hoc",
        stage_key: body.stage_key,
        agent_type: body.agent_type,
        execution_context_class: body.execution_context_class,
        error_signature: body.error_signature,
        strategy_family: body.strategy_family,
        policy_family: body.policy_family,
        workspace_id: body.workspace_id,
        advisory_target_scope: body.advisory_target_scope,
        platform_context: body.platform_context,
        query_text: body.query_text,
        domain_keys: body.domain_keys,
        max_results: body.max_results,
      });
      return jsonResponse(pack);
    }

    // ─── REVIEW FEEDBACK ───
    if (action === "review_feedback") {
      if (!body.retrieval_session_id || !body.usefulness_status) {
        return errorResponse("retrieval_session_id and usefulness_status required", 400);
      }
      const { error } = await sc.from("semantic_retrieval_feedback").insert({
        retrieval_session_id: body.retrieval_session_id,
        organization_id,
        usefulness_status: body.usefulness_status,
        feedback_reason: body.feedback_reason || null,
        linked_outcome: body.linked_outcome || null,
      });
      if (error) return errorResponse(error.message, 500);
      return jsonResponse({ success: true });
    }

    // ─── REBUILD INDEX ───
    if (action === "rebuild_index") {
      if (!body.index_id) return errorResponse("index_id required", 400);
      const result = await rebuildIndex(sc, body.index_id);
      return jsonResponse(result);
    }

    // ─── FREEZE INDEX ───
    if (action === "freeze_index") {
      if (!body.index_id) return errorResponse("index_id required", 400);
      const result = await freezeIndex(sc, body.index_id);
      return jsonResponse(result);
    }

    // ─── RECOMPUTE INDICES ───
    if (action === "recompute_indices") {
      const indices = await getIndexStatuses(sc);
      const staleCount = indices.filter((i) => i.is_stale).length;
      return jsonResponse({ total: indices.length, stale: staleCount, indices });
    }

    return errorResponse(
      "Invalid action. Must be: overview, domains, indices, sessions, feedback, explain, run_retrieval, review_feedback, rebuild_index, freeze_index, recompute_indices",
      400
    );
  } catch (e) {
    console.error("semantic-retrieval error:", e);
    return errorResponse(e.message || "Internal error", 500);
  }
});
