import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { logSecurityAudit, resolveAndValidateOrg } from "../_shared/security-audit.ts";
import {
  createAgentContract,
  validateAgentContract,
  DEFAULT_AGENT_CONSTRAINTS,
  DEFAULT_REVIEW_POLICY,
  DEFAULT_HANDOFF_POLICY,
  type AgentContract,
  type AgentContractRole,
  type TaskDelegation,
  type DelegationResult,
  type OrchestrationPlan,
  type ReviewVerdict,
} from "../_shared/contracts/agent-contract.schema.ts";

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
    const authResult = await authenticateWithRateLimit(req, "swarm-execution");
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient: supabase } = authResult;

    const body = await req.json();
    const { action, organization_id: payloadOrgId, ...params } = body;

    const { orgId, error: orgError } = await resolveAndValidateOrg(supabase, user.id, payloadOrgId || params.organization_id);
    if (orgError || !orgId) return errorResponse(orgError || "Organization access denied", 403, req);

    params.organization_id = orgId;

    await logSecurityAudit(supabase, {
      organization_id: orgId, actor_id: user.id,
      function_name: "swarm-execution", action: action || "unknown",
    });

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
      case "parallel_wave_schedule": return await parallelWaveSchedule(supabase, params);
      case "register_agent_contract": return await registerAgentContract(supabase, params);
      case "delegate_task": return await delegateTask(supabase, params);
      case "review_delegation": return await reviewDelegation(supabase, params);
      case "create_orchestration_plan": return await createOrchestrationPlan(supabase, params);
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

/**
 * Parallel Wave Scheduling — AE-08
 * Enables validation agents to begin analyzing artifacts in real-time
 * while build agents are still producing code, reducing total pipeline latency.
 * 
 * Waves:
 *   Wave 0: Build agents (primary producers)
 *   Wave 1: Validation agents (start as soon as first build artifact appears)
 *   Wave 2: Evolution/synthesis agents (after validation checkpoints)
 */
async function parallelWaveSchedule(sb: any, p: any) {
  const { campaign_id, organization_id, initiative_id } = p;
  if (!campaign_id || !organization_id) {
    return json({ error: "campaign_id and organization_id required" }, 400);
  }

  // Fetch campaign and branches
  const [campRes, branchRes, agentRes] = await Promise.all([
    sb.from("swarm_execution_campaigns").select("*").eq("id", campaign_id).single(),
    sb.from("swarm_execution_branches").select("*").eq("campaign_id", campaign_id).order("created_at"),
    sb.from("swarm_execution_agents").select("*").eq("campaign_id", campaign_id),
  ]);

  const campaign = campRes.data;
  if (!campaign) return json({ error: "Campaign not found" }, 404);

  const branches = branchRes.data || [];
  const agents = agentRes.data || [];

  // Classify branches into waves by agent role and branch type
  const buildBranches = branches.filter((b: any) =>
    b.branch_type === "build" || b.branch_label?.toLowerCase().includes("build")
  );
  const validationBranches = branches.filter((b: any) =>
    b.branch_type === "validation" || b.branch_label?.toLowerCase().includes("valid")
  );
  const otherBranches = branches.filter((b: any) =>
    !buildBranches.includes(b) && !validationBranches.includes(b)
  );

  // Wave 0: Ensure build branches are running
  const wave0Ids: string[] = [];
  for (const b of buildBranches) {
    if (b.status === "pending") {
      await sb.from("swarm_execution_branches")
        .update({ status: "running", updated_at: new Date().toISOString() })
        .eq("id", b.id);
      wave0Ids.push(b.id);
    } else if (b.status === "running") {
      wave0Ids.push(b.id);
    }
  }

  // Wave 1: Start validation branches if ANY build branch has produced artifacts
  const wave1Ids: string[] = [];
  const buildWithArtifacts = buildBranches.filter((b: any) =>
    b.status === "completed" || (b.result_artifacts && Object.keys(b.result_artifacts).length > 0)
  );

  if (buildWithArtifacts.length > 0) {
    for (const b of validationBranches) {
      if (b.status === "pending") {
        await sb.from("swarm_execution_branches")
          .update({
            status: "running",
            updated_at: new Date().toISOString(),
            branch_plan: {
              ...(b.branch_plan || {}),
              parallel_wave: 1,
              partial_validation: true,
              source_build_branches: buildWithArtifacts.map((bb: any) => bb.id),
            },
          })
          .eq("id", b.id);
        wave1Ids.push(b.id);
      }
    }
  }

  // Wave 2: Start remaining branches if all build completed and some validation done
  const wave2Ids: string[] = [];
  const allBuildDone = buildBranches.every((b: any) => b.status === "completed");
  const someValidationDone = validationBranches.some((b: any) => b.status === "completed");

  if (allBuildDone && someValidationDone) {
    for (const b of otherBranches) {
      if (b.status === "pending") {
        await sb.from("swarm_execution_branches")
          .update({
            status: "running",
            updated_at: new Date().toISOString(),
            branch_plan: { ...(b.branch_plan || {}), parallel_wave: 2 },
          })
          .eq("id", b.id);
        wave2Ids.push(b.id);
      }
    }
  }

  // Create synchronization checkpoint
  const checkpointLabel = `wave-sync-${Date.now()}`;
  await sb.from("swarm_execution_checkpoints").insert({
    campaign_id,
    organization_id,
    checkpoint_label: checkpointLabel,
    checkpoint_type: "wave_synchronization",
    snapshot: {
      wave_0: { branch_ids: wave0Ids, type: "build" },
      wave_1: { branch_ids: wave1Ids, type: "validation", triggered_by: buildWithArtifacts.length + " build artifacts" },
      wave_2: { branch_ids: wave2Ids, type: "synthesis", all_build_done: allBuildDone, some_validation_done: someValidationDone },
    },
    branches_required: [...wave0Ids, ...wave1Ids],
    branches_completed: buildWithArtifacts.map((b: any) => b.id),
    status: wave1Ids.length > 0 ? "active" : "pending",
  });

  // Emit scheduling event
  await sb.from("swarm_execution_events").insert({
    campaign_id,
    organization_id,
    event_type: "wave.scheduled",
    event_payload: {
      wave_0_count: wave0Ids.length,
      wave_1_count: wave1Ids.length,
      wave_2_count: wave2Ids.length,
      build_with_artifacts: buildWithArtifacts.length,
      total_branches: branches.length,
      latency_reduction: wave1Ids.length > 0 ? "validation_started_early" : "waiting_for_build_artifacts",
    },
  });

  return json({
    scheduled: true,
    waves: {
      wave_0_build: { started: wave0Ids.length, branch_ids: wave0Ids },
      wave_1_validation: { started: wave1Ids.length, branch_ids: wave1Ids, partial: true },
      wave_2_synthesis: { started: wave2Ids.length, branch_ids: wave2Ids },
    },
    checkpoint: checkpointLabel,
    latency_optimization: wave1Ids.length > 0
      ? "Validation agents started analyzing partial build artifacts — pipeline latency reduced"
      : "Waiting for build agents to produce first artifacts before starting validation",
  });
}
