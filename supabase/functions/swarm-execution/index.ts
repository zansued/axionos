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
      case "create_swarm_campaign": return await createCampaign(supabase, params);
      case "launch_swarm": return await updateCampaignStatus(supabase, params, "active");
      case "pause_swarm": return await updateCampaignStatus(supabase, params, "paused");
      case "abort_swarm": return await abortSwarm(supabase, params);
      case "rollback_swarm": return await rollbackSwarm(supabase, params);
      case "add_branch": return await addBranch(supabase, params);
      case "update_branch": return await updateBranch(supabase, params);
      case "add_checkpoint": return await addCheckpoint(supabase, params);
      case "add_event": return await addEvent(supabase, params);
      case "list_swarm_campaigns": return await listCampaigns(supabase, params);
      case "swarm_campaign_detail": return await campaignDetail(supabase, params);
      case "explain_swarm_state": return await explainSwarmState(supabase, params);
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

async function createCampaign(sb: any, p: any) {
  const { data, error } = await sb
    .from("swarm_execution_campaigns")
    .insert({
      organization_id: p.organization_id,
      workspace_id: p.workspace_id || null,
      initiative_id: p.initiative_id || null,
      campaign_name: p.campaign_name || "",
      campaign_description: p.campaign_description || "",
      participating_agent_ids: p.participating_agent_ids || [],
      execution_plan: p.execution_plan || {},
      bounded_scope: p.bounded_scope || {},
      checkpoint_schedule: p.checkpoint_schedule || {},
      escalation_triggers: p.escalation_triggers || {},
      abort_posture: p.abort_posture || {},
      rollback_posture: p.rollback_posture || {},
      risk_posture: p.risk_posture || "low",
      max_branches: p.max_branches || 10,
      max_retries: p.max_retries || 3,
      status: "draft",
    })
    .select()
    .single();
  if (error) return json({ error: error.message }, 400);

  // Register participating agents
  if (p.participating_agent_ids?.length) {
    const agents = p.participating_agent_ids.map((aid: string, i: number) => ({
      campaign_id: data.id,
      organization_id: p.organization_id,
      agent_id: aid,
      agent_role: i === 0 ? "coordinator" : "worker",
    }));
    await sb.from("swarm_execution_agents").insert(agents);
  }

  // Emit creation event
  await sb.from("swarm_execution_events").insert({
    campaign_id: data.id,
    organization_id: p.organization_id,
    event_type: "campaign.created",
    event_payload: { campaign_name: data.campaign_name },
  });

  return json({ campaign: data });
}

async function updateCampaignStatus(sb: any, p: any, status: string) {
  const { error } = await sb
    .from("swarm_execution_campaigns")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", p.campaign_id);
  if (error) return json({ error: error.message }, 400);

  await sb.from("swarm_execution_events").insert({
    campaign_id: p.campaign_id,
    organization_id: p.organization_id,
    event_type: `campaign.${status}`,
    event_payload: { reason: p.reason || "" },
  });

  return json({ status });
}

async function abortSwarm(sb: any, p: any) {
  // Abort all running branches
  await sb
    .from("swarm_execution_branches")
    .update({ status: "aborted", updated_at: new Date().toISOString() })
    .eq("campaign_id", p.campaign_id)
    .in("status", ["pending", "running", "retrying"]);

  return await updateCampaignStatus(sb, p, "aborted");
}

async function rollbackSwarm(sb: any, p: any) {
  await sb
    .from("swarm_execution_branches")
    .update({ status: "rolled_back", updated_at: new Date().toISOString() })
    .eq("campaign_id", p.campaign_id)
    .in("status", ["pending", "running", "completed", "retrying"]);

  return await updateCampaignStatus(sb, p, "rolled_back");
}

async function addBranch(sb: any, p: any) {
  const { data, error } = await sb
    .from("swarm_execution_branches")
    .insert({
      campaign_id: p.campaign_id,
      organization_id: p.organization_id,
      branch_label: p.branch_label || "",
      branch_type: p.branch_type || "parallel",
      parent_branch_id: p.parent_branch_id || null,
      assigned_agent_id: p.assigned_agent_id || null,
      branch_plan: p.branch_plan || {},
    })
    .select()
    .single();
  if (error) return json({ error: error.message }, 400);
  return json({ branch: data });
}

async function updateBranch(sb: any, p: any) {
  const update: any = { updated_at: new Date().toISOString() };
  if (p.status) update.status = p.status;
  if (p.result_summary) update.result_summary = p.result_summary;
  if (p.result_artifacts) update.result_artifacts = p.result_artifacts;
  if (p.retries_used !== undefined) update.retries_used = p.retries_used;

  const { error } = await sb
    .from("swarm_execution_branches")
    .update(update)
    .eq("id", p.branch_id);
  if (error) return json({ error: error.message }, 400);

  await sb.from("swarm_execution_events").insert({
    campaign_id: p.campaign_id,
    organization_id: p.organization_id,
    event_type: `branch.${p.status || "updated"}`,
    branch_id: p.branch_id,
    agent_id: p.agent_id || null,
    event_payload: { result_summary: p.result_summary || "" },
  });

  return json({ ok: true });
}

async function addCheckpoint(sb: any, p: any) {
  const { data, error } = await sb
    .from("swarm_execution_checkpoints")
    .insert({
      campaign_id: p.campaign_id,
      organization_id: p.organization_id,
      checkpoint_label: p.checkpoint_label || "",
      checkpoint_type: p.checkpoint_type || "synchronization",
      snapshot: p.snapshot || {},
      branches_required: p.branches_required || [],
      branches_completed: p.branches_completed || [],
      status: p.status || "pending",
      notes: p.notes || null,
    })
    .select()
    .single();
  if (error) return json({ error: error.message }, 400);
  return json({ checkpoint: data });
}

async function addEvent(sb: any, p: any) {
  const { data, error } = await sb
    .from("swarm_execution_events")
    .insert({
      campaign_id: p.campaign_id,
      organization_id: p.organization_id,
      event_type: p.event_type || "",
      agent_id: p.agent_id || null,
      branch_id: p.branch_id || null,
      event_payload: p.event_payload || {},
    })
    .select()
    .single();
  if (error) return json({ error: error.message }, 400);
  return json({ event: data });
}

async function listCampaigns(sb: any, p: any) {
  let q = sb
    .from("swarm_execution_campaigns")
    .select("*")
    .eq("organization_id", p.organization_id)
    .order("created_at", { ascending: false })
    .limit(p.limit || 100);
  if (p.status) q = q.eq("status", p.status);
  const { data, error } = await q;
  if (error) return json({ error: error.message }, 400);
  return json({ campaigns: data });
}

async function campaignDetail(sb: any, p: any) {
  const [campRes, agentRes, branchRes, cpRes, evtRes] = await Promise.all([
    sb.from("swarm_execution_campaigns").select("*").eq("id", p.campaign_id).single(),
    sb.from("swarm_execution_agents").select("*").eq("campaign_id", p.campaign_id),
    sb.from("swarm_execution_branches").select("*").eq("campaign_id", p.campaign_id).order("created_at"),
    sb.from("swarm_execution_checkpoints").select("*").eq("campaign_id", p.campaign_id).order("created_at"),
    sb.from("swarm_execution_events").select("*").eq("campaign_id", p.campaign_id).order("created_at", { ascending: false }).limit(50),
  ]);
  return json({
    campaign: campRes.data,
    agents: agentRes.data || [],
    branches: branchRes.data || [],
    checkpoints: cpRes.data || [],
    events: evtRes.data || [],
  });
}

async function explainSwarmState(sb: any, p: any) {
  const detail = await campaignDetail(sb, p);
  const body = JSON.parse(await (detail as Response).text());
  const c = body.campaign;
  const branches = body.branches || [];
  const checkpoints = body.checkpoints || [];

  const completed = branches.filter((b: any) => b.status === "completed").length;
  const running = branches.filter((b: any) => b.status === "running").length;
  const blocked = branches.filter((b: any) => b.status === "blocked").length;
  const failed = branches.filter((b: any) => b.status === "failed").length;
  const pendingCps = checkpoints.filter((cp: any) => cp.status === "pending").length;

  return json({
    campaign_id: p.campaign_id,
    campaign_name: c?.campaign_name,
    status: c?.status,
    risk_posture: c?.risk_posture,
    branch_summary: { total: branches.length, completed, running, blocked, failed },
    checkpoint_summary: { total: checkpoints.length, pending: pendingCps },
    escalated: c?.escalated,
    escalation_reason: c?.escalation_reason,
    abort_posture: c?.abort_posture,
    rollback_posture: c?.rollback_posture,
  });
}
