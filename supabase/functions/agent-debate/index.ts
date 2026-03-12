import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { logSecurityAudit, resolveAndValidateOrg } from "../_shared/security-audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    // Auth hardening — Sprint 197
    const authResult = await authenticateWithRateLimit(req, "agent-debate");
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient: supabase } = authResult;

    const body = await req.json();
    const { action, organization_id: payloadOrgId, ...params } = body;

    const { orgId, error: orgError } = await resolveAndValidateOrg(supabase, user.id, payloadOrgId || params.organization_id);
    if (orgError || !orgId) return errorResponse(orgError || "Organization access denied", 403, req);

    // Inject validated org into params for downstream functions
    params.organization_id = orgId;

    await logSecurityAudit(supabase, {
      organization_id: orgId, actor_id: user.id,
      function_name: "agent-debate", action: action || "unknown",
    });

    switch (action) {
      case "start_debate":
        return await startDebate(supabase, params);
      case "add_position":
        return await addPosition(supabase, params);
      case "challenge_position":
        return await challengePosition(supabase, params);
      case "resolve_debate":
        return await resolveDebate(supabase, params);
      case "escalate_debate":
        return await escalateDebate(supabase, params);
      case "list_debates":
        return await listDebates(supabase, params);
      case "debate_detail":
        return await debateDetail(supabase, params);
      case "explain_resolution":
        return await explainResolution(supabase, params);
      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/* ── Actions ── */

async function startDebate(sb: any, p: any) {
  const { organization_id, workspace_id, topic, debate_context, participating_agent_ids, max_rounds, risk_posture, initiative_id } = p;

  const { data, error } = await sb
    .from("agent_debate_sessions")
    .insert({
      organization_id,
      workspace_id: workspace_id || null,
      initiative_id: initiative_id || null,
      topic,
      debate_context: debate_context || {},
      participating_agent_ids: participating_agent_ids || [],
      max_rounds: max_rounds || 5,
      risk_posture: risk_posture || "low",
      status: "open",
    })
    .select()
    .single();

  if (error) return json({ error: error.message }, 400);
  return json({ debate: data });
}

async function addPosition(sb: any, p: any) {
  const { session_id, organization_id, agent_id, position_label, reasoning, evidence_refs, confidence, round_number, position_type } = p;

  // Check debate is open/active
  const { data: session } = await sb
    .from("agent_debate_sessions")
    .select("status, max_rounds, current_round")
    .eq("id", session_id)
    .single();

  if (!session || !["open", "active"].includes(session.status))
    return json({ error: "Debate is not accepting positions" }, 400);

  const effectiveRound = round_number || session.current_round + 1;
  if (effectiveRound > session.max_rounds)
    return json({ error: "Max debate rounds exceeded" }, 400);

  const { data, error } = await sb
    .from("agent_debate_positions")
    .insert({
      session_id,
      organization_id,
      agent_id,
      position_label,
      reasoning,
      evidence_refs: evidence_refs || [],
      confidence: confidence || 0.5,
      round_number: effectiveRound,
      position_type: position_type || "proposal",
    })
    .select()
    .single();

  if (error) return json({ error: error.message }, 400);

  // Update session status and round
  await sb
    .from("agent_debate_sessions")
    .update({ status: "active", current_round: effectiveRound, updated_at: new Date().toISOString() })
    .eq("id", session_id);

  return json({ position: data });
}

async function challengePosition(sb: any, p: any) {
  const { session_id, organization_id, agent_id, target_position_id, argument_type, content, evidence_refs, strength, round_number } = p;

  const { data: session } = await sb
    .from("agent_debate_sessions")
    .select("status, max_rounds, current_round")
    .eq("id", session_id)
    .single();

  if (!session || !["open", "active"].includes(session.status))
    return json({ error: "Debate is not accepting arguments" }, 400);

  const effectiveRound = round_number || session.current_round;

  const { data, error } = await sb
    .from("agent_debate_arguments")
    .insert({
      session_id,
      organization_id,
      agent_id,
      target_position_id,
      argument_type: argument_type || "challenge",
      content,
      evidence_refs: evidence_refs || [],
      strength: strength || 0.5,
      round_number: effectiveRound,
    })
    .select()
    .single();

  if (error) return json({ error: error.message }, 400);
  return json({ argument: data });
}

async function resolveDebate(sb: any, p: any) {
  const { session_id, organization_id, winning_position_id, resolution_type, resolution_summary, confidence, dissenting_views, requires_human_review } = p;

  const { data: resolution, error } = await sb
    .from("agent_debate_resolutions")
    .insert({
      session_id,
      organization_id,
      winning_position_id: winning_position_id || null,
      resolution_type: resolution_type || "winner_selected",
      resolution_summary: resolution_summary || "",
      confidence: confidence || 0.5,
      dissenting_views: dissenting_views || [],
      requires_human_review: requires_human_review ?? (resolution_type === "escalated"),
      human_review_status: requires_human_review ? "pending" : null,
    })
    .select()
    .single();

  if (error) return json({ error: error.message }, 400);

  await sb
    .from("agent_debate_sessions")
    .update({
      status: "resolved",
      resolution_outcome: resolution_type,
      resolution_confidence: confidence || 0.5,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session_id);

  return json({ resolution });
}

async function escalateDebate(sb: any, p: any) {
  const { session_id, escalation_reason } = p;

  const { error } = await sb
    .from("agent_debate_sessions")
    .update({
      status: "escalated",
      escalated: true,
      escalation_reason: escalation_reason || "Unresolved conflict requires human review",
      updated_at: new Date().toISOString(),
    })
    .eq("id", session_id);

  if (error) return json({ error: error.message }, 400);
  return json({ escalated: true });
}

async function listDebates(sb: any, p: any) {
  const { organization_id, status, limit } = p;

  let q = sb
    .from("agent_debate_sessions")
    .select("*")
    .eq("organization_id", organization_id)
    .order("created_at", { ascending: false })
    .limit(limit || 50);

  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return json({ error: error.message }, 400);
  return json({ debates: data });
}

async function debateDetail(sb: any, p: any) {
  const { session_id } = p;

  const [sessRes, posRes, argRes, resRes] = await Promise.all([
    sb.from("agent_debate_sessions").select("*").eq("id", session_id).single(),
    sb.from("agent_debate_positions").select("*").eq("session_id", session_id).order("round_number"),
    sb.from("agent_debate_arguments").select("*").eq("session_id", session_id).order("round_number"),
    sb.from("agent_debate_resolutions").select("*").eq("session_id", session_id),
  ]);

  return json({
    session: sessRes.data,
    positions: posRes.data || [],
    arguments: argRes.data || [],
    resolutions: resRes.data || [],
  });
}

async function explainResolution(sb: any, p: any) {
  const { session_id } = p;

  const [sessRes, posRes, argRes, resRes] = await Promise.all([
    sb.from("agent_debate_sessions").select("*").eq("id", session_id).single(),
    sb.from("agent_debate_positions").select("*").eq("session_id", session_id).order("round_number"),
    sb.from("agent_debate_arguments").select("*").eq("session_id", session_id).order("round_number"),
    sb.from("agent_debate_resolutions").select("*").eq("session_id", session_id),
  ]);

  const session = sessRes.data;
  const positions = posRes.data || [];
  const arguments_ = argRes.data || [];
  const resolutions = resRes.data || [];

  const explanation = {
    topic: session?.topic,
    status: session?.status,
    rounds_executed: session?.current_round,
    max_rounds: session?.max_rounds,
    risk_posture: session?.risk_posture,
    positions_count: positions.length,
    arguments_count: arguments_.length,
    positions_summary: positions.map((p: any) => ({
      label: p.position_label,
      agent: p.agent_id,
      confidence: p.confidence,
      type: p.position_type,
      round: p.round_number,
    })),
    arguments_summary: arguments_.map((a: any) => ({
      type: a.argument_type,
      agent: a.agent_id,
      strength: a.strength,
      round: a.round_number,
    })),
    resolution: resolutions.length > 0
      ? {
          type: resolutions[0].resolution_type,
          summary: resolutions[0].resolution_summary,
          confidence: resolutions[0].confidence,
          requires_human_review: resolutions[0].requires_human_review,
          human_review_status: resolutions[0].human_review_status,
        }
      : null,
    escalated: session?.escalated,
    escalation_reason: session?.escalation_reason,
  };

  return json({ explanation });
}
