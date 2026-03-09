import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, AuthContext, requireOrgMembership } from "../_shared/auth.ts";
import { retrieveAgentMemory } from "../_shared/agent-memory/agent-memory-retriever.ts";
import { assembleMemoryInjection, memoryBlockToString } from "../_shared/agent-memory/agent-memory-injector.ts";
import { writeAgentMemory, updateAgentMemoryProfile } from "../_shared/agent-memory/agent-memory-writer.ts";
import { getMemoryQualityReport, deprecateStaleMemory } from "../_shared/agent-memory/agent-memory-quality.ts";

/**
 * agent-memory-engine — Sprint 24
 *
 * Unified API for Agent Memory Layer operations.
 *
 * POST { action, organization_id, ...params }
 *
 * Actions:
 *   agent_memory_overview    — Memory quality report
 *   agent_memory_profiles    — List profiles
 *   agent_memory_records     — List records
 *   agent_memory_context     — Retrieve + inject memory for agent
 *   agent_memory_quality     — Quality report
 *   write_memory             — Write new memory record
 *   update_profile           — Update/create memory profile
 *   recompute_profile        — Recompute profile summary
 *   deprecate_memory         — Deprecate stale memory
 *   refresh_summary          — Refresh profile summary
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

    // ─── OVERVIEW ───
    if (action === "agent_memory_overview" || action === "agent_memory_quality") {
      const report = await getMemoryQualityReport(sc, organization_id);
      return jsonResponse(report);
    }

    // ─── PROFILES ───
    if (action === "agent_memory_profiles") {
      const { data } = await sc.from("agent_memory_profiles")
        .select("*")
        .eq("organization_id", organization_id)
        .order("updated_at", { ascending: false })
        .limit(50);
      return jsonResponse({ profiles: data || [] });
    }

    // ─── RECORDS ───
    if (action === "agent_memory_records") {
      let q = sc.from("agent_memory_records")
        .select("*")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (body.agent_type) q = q.eq("agent_type", body.agent_type);
      if (body.memory_type) q = q.eq("memory_type", body.memory_type);
      const { data } = await q;
      return jsonResponse({ records: data || [] });
    }

    // ─── CONTEXT (Retrieve + Inject) ───
    if (action === "agent_memory_context") {
      if (!body.agent_type) return errorResponse("agent_type required", 400);
      const bundle = await retrieveAgentMemory(sc, organization_id, {
        agent_type: body.agent_type,
        stage_key: body.stage_key,
        model_provider: body.model_provider,
        model_name: body.model_name,
        error_signature: body.error_signature,
        context_signature: body.context_signature,
      });
      const injection = assembleMemoryInjection(bundle);
      const text = memoryBlockToString(injection);
      return jsonResponse({ bundle, injection, text });
    }

    // ─── WRITE MEMORY ───
    if (action === "write_memory") {
      if (!body.agent_type || !body.memory_type) return errorResponse("agent_type and memory_type required", 400);
      const result = await writeAgentMemory(sc, {
        organization_id,
        agent_type: body.agent_type,
        stage_key: body.stage_key,
        memory_type: body.memory_type,
        context_signature: body.context_signature || "",
        memory_payload: body.memory_payload || {},
        relevance_score: body.relevance_score,
        source_refs: body.source_refs,
        event_id: body.event_id,
      });
      return jsonResponse(result);
    }

    // ─── UPDATE PROFILE ───
    if (action === "update_profile" || action === "recompute_profile" || action === "refresh_summary") {
      if (!body.agent_type) return errorResponse("agent_type required", 400);
      const result = await updateAgentMemoryProfile(sc, {
        organization_id,
        agent_type: body.agent_type,
        stage_key: body.stage_key,
        memory_scope: body.memory_scope || "global_agent",
        memory_summary: body.memory_summary || "",
        confidence_delta: body.confidence_delta,
        support_increment: body.support_increment,
      });
      return jsonResponse(result);
    }

    // ─── DEPRECATE ───
    if (action === "deprecate_memory") {
      const result = await deprecateStaleMemory(sc, organization_id);
      return jsonResponse(result);
    }

    return errorResponse(
      "Invalid action. Must be: agent_memory_overview, agent_memory_profiles, agent_memory_records, agent_memory_context, agent_memory_quality, write_memory, update_profile, recompute_profile, deprecate_memory, refresh_summary",
      400,
    );
  } catch (e) {
    console.error("agent-memory-engine error:", e);
    return errorResponse(e.message || "Internal error", 500);
  }
});
