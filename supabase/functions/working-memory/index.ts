import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, ...params } = await req.json();

    switch (action) {
      case "create_context": return await createContext(supabase, params);
      case "add_memory_entry": return await addMemoryEntry(supabase, params);
      case "propose_state_transition": return await proposeTransition(supabase, params);
      case "accept_state_transition": return await resolveTransition(supabase, params, "accepted");
      case "contest_state_transition": return await resolveTransition(supabase, params, "contested");
      case "escalate_state_transition": return await resolveTransition(supabase, params, "escalated");
      case "add_checkpoint": return await addCheckpoint(supabase, params);
      case "list_contexts": return await listContexts(supabase, params);
      case "context_detail": return await contextDetail(supabase, params);
      default: return json({ error: `Unknown action: ${action}` }, 400);
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

async function createContext(sb: any, p: any) {
  const { data, error } = await sb
    .from("agent_working_memory_contexts")
    .insert({
      organization_id: p.organization_id,
      workspace_id: p.workspace_id || null,
      initiative_id: p.initiative_id || null,
      context_label: p.context_label || "",
      participating_agent_ids: p.participating_agent_ids || [],
      current_task_state: "proposed",
      risk_posture: p.risk_posture || "low",
    })
    .select()
    .single();
  if (error) return json({ error: error.message }, 400);
  return json({ context: data });
}

async function addMemoryEntry(sb: any, p: any) {
  const { data, error } = await sb
    .from("agent_working_memory_entries")
    .insert({
      context_id: p.context_id,
      organization_id: p.organization_id,
      agent_id: p.agent_id || "",
      entry_type: p.entry_type || "observation",
      key: p.key || "",
      value: p.value || {},
      confidence: p.confidence || 0.5,
    })
    .select()
    .single();
  if (error) return json({ error: error.message }, 400);
  return json({ entry: data });
}

async function proposeTransition(sb: any, p: any) {
  const { data: ctx } = await sb
    .from("agent_working_memory_contexts")
    .select("current_task_state")
    .eq("id", p.context_id)
    .single();
  if (!ctx) return json({ error: "Context not found" }, 404);

  const { data, error } = await sb
    .from("agent_task_state_transitions")
    .insert({
      context_id: p.context_id,
      organization_id: p.organization_id,
      from_state: ctx.current_task_state,
      to_state: p.to_state,
      proposed_by: p.proposed_by || "",
      proposal_reason: p.proposal_reason || "",
      status: "proposed",
    })
    .select()
    .single();
  if (error) return json({ error: error.message }, 400);
  return json({ transition: data });
}

async function resolveTransition(sb: any, p: any, status: string) {
  const { data: t, error: fetchErr } = await sb
    .from("agent_task_state_transitions")
    .select("*")
    .eq("id", p.transition_id)
    .single();
  if (fetchErr || !t) return json({ error: "Transition not found" }, 404);

  const { error } = await sb
    .from("agent_task_state_transitions")
    .update({
      status,
      resolved_by: p.resolved_by || "",
      resolution_reason: p.resolution_reason || "",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", p.transition_id);
  if (error) return json({ error: error.message }, 400);

  // If accepted, update the context state
  if (status === "accepted") {
    await sb
      .from("agent_working_memory_contexts")
      .update({ current_task_state: t.to_state, updated_at: new Date().toISOString() })
      .eq("id", t.context_id);
  }

  // If escalated, mark context
  if (status === "escalated") {
    await sb
      .from("agent_working_memory_contexts")
      .update({
        current_task_state: "escalated",
        escalation_reason: p.resolution_reason || "State transition escalated",
        updated_at: new Date().toISOString(),
      })
      .eq("id", t.context_id);
  }

  return json({ status });
}

async function addCheckpoint(sb: any, p: any) {
  const { data, error } = await sb
    .from("agent_coordination_checkpoints")
    .insert({
      context_id: p.context_id,
      organization_id: p.organization_id,
      checkpoint_label: p.checkpoint_label || "",
      snapshot: p.snapshot || {},
      agent_id: p.agent_id || "",
      checkpoint_type: p.checkpoint_type || "progress",
      notes: p.notes || null,
    })
    .select()
    .single();
  if (error) return json({ error: error.message }, 400);
  return json({ checkpoint: data });
}

async function listContexts(sb: any, p: any) {
  let q = sb
    .from("agent_working_memory_contexts")
    .select("*")
    .eq("organization_id", p.organization_id)
    .order("created_at", { ascending: false })
    .limit(p.limit || 100);
  if (p.state) q = q.eq("current_task_state", p.state);
  const { data, error } = await q;
  if (error) return json({ error: error.message }, 400);
  return json({ contexts: data });
}

async function contextDetail(sb: any, p: any) {
  const [ctxRes, entRes, trRes, cpRes] = await Promise.all([
    sb.from("agent_working_memory_contexts").select("*").eq("id", p.context_id).single(),
    sb.from("agent_working_memory_entries").select("*").eq("context_id", p.context_id).order("created_at"),
    sb.from("agent_task_state_transitions").select("*").eq("context_id", p.context_id).order("created_at"),
    sb.from("agent_coordination_checkpoints").select("*").eq("context_id", p.context_id).order("created_at"),
  ]);
  return json({
    context: ctxRes.data,
    entries: entRes.data || [],
    transitions: trRes.data || [],
    checkpoints: cpRes.data || [],
  });
}
