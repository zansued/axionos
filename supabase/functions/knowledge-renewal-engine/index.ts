import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import {
  detectRenewalTriggers,
  recommendRenewalMode,
  buildRevalidationWorkflow,
  assessConfidenceRecovery,
  generateRenewalProposal,
  determineRevalidationOutcome,
  type TriggerDetectionInput,
  type ConfidenceRecoveryInput,
  type RenewalTrigger,
} from "../_shared/canon-renewal/knowledge-renewal-engine.ts";

// ─── Renewal-to-Governance Mapping ───

const GOVERNANCE_ACTION_MAP: Record<string, { governanceAction: string; requiresBridge: boolean }> = {
  deprecate_entry: { governanceAction: "deprecate_canon_entry", requiresBridge: true },
  supersede_with_stronger: { governanceAction: "supersede_knowledge_object", requiresBridge: true },
  restore_confidence: { governanceAction: "approve_confidence_restoration", requiresBridge: true },
  reopen_governance_review: { governanceAction: "governance_review_required", requiresBridge: true },
  refresh_source_evidence: { governanceAction: "refresh_source_evidence", requiresBridge: false },
  rerun_distillation: { governanceAction: "rerun_distillation", requiresBridge: false },
};

const OUTCOME_BRIDGE_ELIGIBILITY: Record<string, boolean> = {
  confidence_reduced: true,
  needs_human_review: true,
  superseded: true,
  deprecated: true,
  confidence_restored: false,  // auto-resolved unless high-impact
  renewed: false,
  revalidated: false,
};

function isBridgeEligible(outcome: string, proposalType: string, strength: number): boolean {
  const mapping = GOVERNANCE_ACTION_MAP[proposalType];
  if (mapping?.requiresBridge) return true;
  if (OUTCOME_BRIDGE_ELIGIBILITY[outcome]) return true;
  if (strength > 0.8) return true;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sc = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { action, organizationId } = body;
    if (!organizationId) throw new Error("organizationId required");

    const { data: membership } = await sc
      .from("organization_members")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) throw new Error("Not a member of this organization");

    let result: any;

    switch (action) {
      case "scan_triggers":
        result = await scanTriggers(sc, organizationId);
        break;
      case "create_trigger":
        result = await createTrigger(sc, organizationId, body);
        break;
      case "start_revalidation":
        result = await startRevalidation(sc, organizationId, body);
        break;
      case "assess_confidence_recovery":
        result = assessConfidenceRecovery(body.input as ConfidenceRecoveryInput);
        break;
      case "generate_proposal":
        result = await generateProposal(sc, organizationId, body);
        break;
      case "list_triggers":
        result = await listTriggers(sc, organizationId, body.status);
        break;
      case "list_workflows":
        result = await listWorkflows(sc, organizationId, body.status);
        break;
      case "list_proposals":
        result = await listProposals(sc, organizationId, body.status);
        break;
      case "list_history":
        result = await listHistory(sc, organizationId, body.limit);
        break;
      case "decide_proposal":
        result = await decideProposal(sc, organizationId, body, user.id);
        break;
      case "complete_workflow":
        result = await completeWorkflow(sc, organizationId, body, user.id);
        break;
      // ── Sprint 185: Bridge actions ──
      case "create_bridge":
        result = await createBridge(sc, organizationId, body, user.id);
        break;
      case "list_bridges":
        result = await listBridges(sc, organizationId, body.status);
        break;
      case "decide_bridge":
        result = await decideBridge(sc, organizationId, body, user.id);
        break;
      case "back_propagate":
        result = await backPropagate(sc, organizationId, body, user.id);
        break;
      case "list_bridge_events":
        result = await listBridgeEvents(sc, organizationId, body.bridgeId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Original Actions ───

async function scanTriggers(sc: any, orgId: string) {
  const { data: entries } = await sc
    .from("canon_entries")
    .select("id, confidence_score, created_at, updated_at")
    .eq("organization_id", orgId)
    .in("lifecycle_status", ["approved", "experimental", "contested"])
    .limit(200);

  if (!entries?.length) return { triggers: [], scanned: 0 };

  // Enrich with real feedback data
  const entryIds = entries.map((e: any) => e.id);
  const { data: feedbackRows } = await sc
    .from("agent_learning_feedback")
    .select("canon_entry_id, impact_direction")
    .eq("organization_id", orgId)
    .in("canon_entry_id", entryIds);

  const feedbackMap = new Map<string, { positive: number; negative: number }>();
  (feedbackRows || []).forEach((f: any) => {
    const key = f.canon_entry_id;
    if (!feedbackMap.has(key)) feedbackMap.set(key, { positive: 0, negative: 0 });
    const entry = feedbackMap.get(key)!;
    if (f.impact_direction === "reinforcement") entry.positive++;
    else if (f.impact_direction === "degradation") entry.negative++;
  });

  // Enrich with confidence ledger data
  const { data: ledgerRows } = await sc
    .from("agent_learning_confidence_ledger")
    .select("canon_entry_id, total_feedback_count, degradation_count, reinforcement_count")
    .eq("organization_id", orgId)
    .in("canon_entry_id", entryIds);

  const ledgerMap = new Map<string, any>();
  (ledgerRows || []).forEach((l: any) => ledgerMap.set(l.canon_entry_id, l));

  const now = Date.now();
  const allTriggers: RenewalTrigger[] = [];

  for (const entry of entries) {
    const ageDays = (now - new Date(entry.created_at).getTime()) / (1000 * 60 * 60 * 24);
    const lastUpdatedDays = (now - new Date(entry.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    const fb = feedbackMap.get(entry.id) || { positive: 0, negative: 0 };
    const ledger = ledgerMap.get(entry.id);

    const input: TriggerDetectionInput = {
      entry_id: entry.id,
      confidence_score: entry.confidence_score || 0.5,
      age_days: Math.round(ageDays),
      recent_usage_count: ledger?.total_feedback_count || 0,
      negative_feedback_count: ledger?.degradation_count || fb.negative,
      positive_feedback_count: ledger?.reinforcement_count || fb.positive,
      source_reliability_score: 50,
      last_revalidated_days_ago: Math.round(lastUpdatedDays),
      has_stronger_competitor: false,
      distillation_age_days: null,
    };

    const triggers = detectRenewalTriggers(input);
    allTriggers.push(...triggers);
  }

  if (allTriggers.length > 0) {
    const rows = allTriggers.map((t) => ({
      organization_id: orgId,
      target_entry_id: t.target_entry_id,
      target_type: t.target_type,
      trigger_type: t.trigger_type,
      reason: t.reason,
      strength: t.strength,
      evidence_refs: t.evidence_refs,
      status: "pending",
    }));
    await sc.from("knowledge_renewal_triggers").insert(rows);
  }

  return { triggers: allTriggers, scanned: entries.length };
}

async function createTrigger(sc: any, orgId: string, body: any) {
  const { data, error } = await sc.from("knowledge_renewal_triggers").insert({
    organization_id: orgId,
    target_entry_id: body.target_entry_id,
    target_type: body.target_type || "canon_entry",
    trigger_type: body.trigger_type,
    reason: body.reason,
    strength: body.strength || 0.5,
    evidence_refs: body.evidence_refs || [],
    status: "pending",
  }).select().single();

  if (error) throw error;
  return { trigger: data };
}

async function startRevalidation(sc: any, orgId: string, body: any) {
  const { triggerId, mode } = body;

  const { data: trigger } = await sc
    .from("knowledge_renewal_triggers")
    .select("*")
    .eq("id", triggerId)
    .eq("organization_id", orgId)
    .single();

  if (!trigger) throw new Error("Trigger not found");

  const renewalMode = mode || recommendRenewalMode(trigger as any);
  const workflow = buildRevalidationWorkflow(trigger as any, renewalMode, trigger.confidence_before || null);

  const { data: wf, error } = await sc.from("knowledge_revalidation_workflows").insert({
    organization_id: orgId,
    trigger_id: triggerId,
    target_entry_id: trigger.target_entry_id,
    target_type: trigger.target_type,
    renewal_mode: renewalMode,
    status: "in_progress",
    confidence_before: workflow.confidence_before,
    revalidation_steps: workflow.revalidation_steps,
    explanation: workflow.explanation,
    evidence_summary: {},
  }).select().single();

  if (error) throw error;

  await sc.from("knowledge_renewal_triggers")
    .update({ status: "in_progress" })
    .eq("id", triggerId);

  return { workflow: wf };
}

async function completeWorkflow(sc: any, orgId: string, body: any, userId: string) {
  const { workflowId, confidenceAfter, evidenceSummary, hasStrongerCompetitor, evidenceStrength } = body;

  const { data: wf } = await sc
    .from("knowledge_revalidation_workflows")
    .select("*")
    .eq("id", workflowId)
    .eq("organization_id", orgId)
    .single();

  if (!wf) throw new Error("Workflow not found");

  const confBefore = wf.confidence_before || 0.5;
  const confAfter = confidenceAfter ?? confBefore;

  const outcome = determineRevalidationOutcome(
    confBefore,
    confAfter,
    hasStrongerCompetitor || false,
    evidenceStrength || 0.5,
  );

  await sc.from("knowledge_revalidation_workflows").update({
    status: "completed",
    outcome,
    confidence_after: confAfter,
    evidence_summary: evidenceSummary || {},
    explanation: `Outcome: ${outcome}. Confidence: ${confBefore} → ${confAfter}.`,
    reviewed_by: userId,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", workflowId);

  if (wf.trigger_id) {
    await sc.from("knowledge_renewal_triggers").update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by: userId,
      resolution_notes: `Workflow completed with outcome: ${outcome}`,
    }).eq("id", wf.trigger_id);
  }

  await sc.from("knowledge_renewal_history").insert({
    organization_id: orgId,
    target_entry_id: wf.target_entry_id,
    target_type: wf.target_type,
    event_type: "revalidation_completed",
    renewal_mode: wf.renewal_mode,
    outcome,
    confidence_before: confBefore,
    confidence_after: confAfter,
    explanation: `Revalidation ${outcome}. Mode: ${wf.renewal_mode}.`,
    actor_id: userId,
    evidence_refs: evidenceSummary?.refs || [],
  });

  // Sprint 185: Auto-create bridge if outcome is governance-eligible
  if (OUTCOME_BRIDGE_ELIGIBILITY[outcome]) {
    await autoCreateBridge(sc, orgId, wf, outcome, confBefore, confAfter, userId);
  }

  return { outcome, confidence_before: confBefore, confidence_after: confAfter };
}

async function generateProposal(sc: any, orgId: string, body: any) {
  const { triggerId, workflowOutcome } = body;

  const { data: trigger } = await sc
    .from("knowledge_renewal_triggers")
    .select("*")
    .eq("id", triggerId)
    .eq("organization_id", orgId)
    .single();

  if (!trigger) throw new Error("Trigger not found");

  const proposal = generateRenewalProposal(trigger as any, workflowOutcome || null);
  if (!proposal) return { proposal: null, message: "No proposal needed — outcome resolved automatically." };

  const { data, error } = await sc.from("knowledge_renewal_proposals").insert({
    organization_id: orgId,
    workflow_id: body.workflowId || null,
    target_entry_id: trigger.target_entry_id,
    proposal_type: proposal.proposal_type,
    urgency: proposal.urgency,
    recommended_action: proposal.recommended_action,
    rationale: proposal.rationale,
    evidence_refs: proposal.evidence_refs,
    status: "pending",
  }).select().single();

  if (error) throw error;

  // Sprint 185: Check if this proposal should bridge to governance
  if (data && isBridgeEligible(workflowOutcome || "", proposal.proposal_type, trigger.strength || 0)) {
    await autoCreateBridgeFromProposal(sc, orgId, data, trigger, body.workflowId, userId_placeholder);
  }

  return { proposal: data };
}

// Placeholder — generateProposal doesn't have userId; bridge creation from proposal
// handled via create_bridge action or auto in completeWorkflow
const userId_placeholder = "system";

async function decideProposal(sc: any, orgId: string, body: any, userId: string) {
  const { proposalId, decision, notes } = body;

  const { error } = await sc.from("knowledge_renewal_proposals").update({
    status: decision,
    decided_by: userId,
    decided_at: new Date().toISOString(),
    decision_notes: notes || "",
    updated_at: new Date().toISOString(),
  }).eq("id", proposalId).eq("organization_id", orgId);

  if (error) throw error;

  const { data: proposal } = await sc.from("knowledge_renewal_proposals")
    .select("*").eq("id", proposalId).single();

  if (proposal) {
    await sc.from("knowledge_renewal_history").insert({
      organization_id: orgId,
      target_entry_id: proposal.target_entry_id,
      target_type: "canon_entry",
      event_type: `proposal_${decision}`,
      explanation: `Proposal ${proposal.proposal_type} ${decision}. ${notes || ""}`,
      actor_id: userId,
      evidence_refs: proposal.evidence_refs || [],
    });
  }

  return { success: true, decision };
}

async function listTriggers(sc: any, orgId: string, status?: string) {
  let q = sc.from("knowledge_renewal_triggers").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(100);
  if (status) q = q.eq("status", status);
  const { data } = await q;
  return { triggers: data || [] };
}

async function listWorkflows(sc: any, orgId: string, status?: string) {
  let q = sc.from("knowledge_revalidation_workflows").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(100);
  if (status) q = q.eq("status", status);
  const { data } = await q;
  return { workflows: data || [] };
}

async function listProposals(sc: any, orgId: string, status?: string) {
  let q = sc.from("knowledge_renewal_proposals").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(100);
  if (status) q = q.eq("status", status);
  const { data } = await q;
  return { proposals: data || [] };
}

async function listHistory(sc: any, orgId: string, limit?: number) {
  const { data } = await sc.from("knowledge_renewal_history")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit || 50);
  return { history: data || [] };
}

// ─── Sprint 185: Bridge Actions ───

async function autoCreateBridge(
  sc: any, orgId: string, workflow: any,
  outcome: string, confBefore: number, confAfter: number, userId: string
) {
  const mapping = GOVERNANCE_ACTION_MAP[outcome] || { governanceAction: "governance_review_required", requiresBridge: true };

  const { data: bridge } = await sc.from("renewal_governance_bridge").insert({
    organization_id: orgId,
    renewal_workflow_id: workflow.id,
    renewal_trigger_id: workflow.trigger_id,
    target_entry_id: workflow.target_entry_id,
    target_type: workflow.target_type || "canon_entry",
    renewal_outcome: outcome,
    governance_action_type: mapping.governanceAction,
    bridge_status: "bridge_eligible",
    confidence_before: confBefore,
    confidence_after: confAfter,
    urgency: confAfter < 0.2 ? "high" : confAfter < 0.4 ? "medium" : "low",
    rationale: `Revalidation outcome '${outcome}' requires governance review. Confidence: ${confBefore} → ${confAfter}.`,
    evidence_refs: workflow.evidence_summary?.refs || [],
    recommended_governance_action: mapping.governanceAction,
  }).select().single();

  if (bridge) {
    await sc.from("renewal_governance_bridge_events").insert({
      organization_id: orgId,
      bridge_id: bridge.id,
      event_type: "bridge_created",
      actor_id: userId,
      details: { outcome, confidence_before: confBefore, confidence_after: confAfter, workflow_id: workflow.id },
    });

    await sc.from("knowledge_renewal_history").insert({
      organization_id: orgId,
      target_entry_id: workflow.target_entry_id,
      target_type: workflow.target_type || "canon_entry",
      event_type: "bridge_created",
      explanation: `Governance bridge created for outcome '${outcome}'.`,
      actor_id: userId,
      evidence_refs: [],
    });
  }

  return bridge;
}

async function autoCreateBridgeFromProposal(
  sc: any, orgId: string, proposal: any, trigger: any, workflowId: string | null, actorId: string
) {
  const mapping = GOVERNANCE_ACTION_MAP[proposal.proposal_type] || { governanceAction: proposal.proposal_type, requiresBridge: true };

  const { data: bridge } = await sc.from("renewal_governance_bridge").insert({
    organization_id: orgId,
    renewal_proposal_id: proposal.id,
    renewal_workflow_id: workflowId,
    renewal_trigger_id: trigger.id,
    target_entry_id: proposal.target_entry_id,
    target_type: trigger.target_type || "canon_entry",
    renewal_outcome: proposal.proposal_type,
    governance_action_type: mapping.governanceAction,
    bridge_status: "bridge_eligible",
    confidence_before: null,
    confidence_after: null,
    urgency: proposal.urgency,
    rationale: proposal.rationale,
    evidence_refs: proposal.evidence_refs || [],
    recommended_governance_action: mapping.governanceAction,
  }).select().single();

  if (bridge) {
    await sc.from("renewal_governance_bridge_events").insert({
      organization_id: orgId,
      bridge_id: bridge.id,
      event_type: "bridge_created_from_proposal",
      actor_id: actorId,
      details: { proposal_id: proposal.id, proposal_type: proposal.proposal_type },
    });
  }

  return bridge;
}

async function createBridge(sc: any, orgId: string, body: any, userId: string) {
  const { proposalId, triggerId, workflowId, targetEntryId, targetType, renewalOutcome, governanceActionType, urgency, rationale, evidenceRefs, confidenceBefore, confidenceAfter } = body;

  const mapping = GOVERNANCE_ACTION_MAP[governanceActionType] || { governanceAction: governanceActionType, requiresBridge: true };

  const { data, error } = await sc.from("renewal_governance_bridge").insert({
    organization_id: orgId,
    renewal_proposal_id: proposalId || null,
    renewal_workflow_id: workflowId || null,
    renewal_trigger_id: triggerId || null,
    target_entry_id: targetEntryId,
    target_type: targetType || "canon_entry",
    renewal_outcome: renewalOutcome,
    governance_action_type: mapping.governanceAction,
    bridge_status: "bridge_eligible",
    confidence_before: confidenceBefore,
    confidence_after: confidenceAfter,
    urgency: urgency || "medium",
    rationale: rationale || "",
    evidence_refs: evidenceRefs || [],
    recommended_governance_action: mapping.governanceAction,
  }).select().single();

  if (error) throw error;

  await sc.from("renewal_governance_bridge_events").insert({
    organization_id: orgId,
    bridge_id: data.id,
    event_type: "bridge_created_manually",
    actor_id: userId,
    details: { rationale },
  });

  return { bridge: data };
}

async function listBridges(sc: any, orgId: string, status?: string) {
  let q = sc.from("renewal_governance_bridge").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(100);
  if (status) q = q.eq("bridge_status", status);
  const { data } = await q;
  return { bridges: data || [] };
}

async function decideBridge(sc: any, orgId: string, body: any, userId: string) {
  const { bridgeId, decision, notes } = body;

  const statusMap: Record<string, string> = {
    approve: "governance_approved",
    reject: "governance_rejected",
    defer: "awaiting_governance_review",
  };

  const newStatus = statusMap[decision] || "governance_decided";

  const { error } = await sc.from("renewal_governance_bridge").update({
    bridge_status: newStatus,
    governance_decision: decision,
    governance_decision_notes: notes || "",
    governance_decided_by: userId,
    governance_decided_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", bridgeId).eq("organization_id", orgId);

  if (error) throw error;

  await sc.from("renewal_governance_bridge_events").insert({
    organization_id: orgId,
    bridge_id: bridgeId,
    event_type: `governance_${decision}`,
    actor_id: userId,
    details: { decision, notes },
  });

  // Record in renewal history
  const { data: bridge } = await sc.from("renewal_governance_bridge").select("*").eq("id", bridgeId).single();
  if (bridge) {
    await sc.from("knowledge_renewal_history").insert({
      organization_id: orgId,
      target_entry_id: bridge.target_entry_id,
      target_type: bridge.target_type,
      event_type: `governance_bridge_${decision}`,
      explanation: `Governance ${decision} for renewal bridge. Action: ${bridge.governance_action_type}. ${notes || ""}`,
      actor_id: userId,
      evidence_refs: bridge.evidence_refs || [],
    });
  }

  return { success: true, status: newStatus };
}

async function backPropagate(sc: any, orgId: string, body: any, userId: string) {
  const { bridgeId } = body;

  const { data: bridge } = await sc.from("renewal_governance_bridge")
    .select("*").eq("id", bridgeId).eq("organization_id", orgId).single();

  if (!bridge) throw new Error("Bridge not found");
  if (bridge.bridge_status !== "governance_approved") {
    throw new Error("Can only back-propagate approved bridges");
  }

  let propagationResult: any = { applied: false };

  // Apply governance outcome back to the knowledge layer
  switch (bridge.governance_action_type) {
    case "deprecate_canon_entry": {
      await sc.from("canon_entries")
        .update({ lifecycle_status: "deprecated", updated_at: new Date().toISOString() })
        .eq("id", bridge.target_entry_id)
        .eq("organization_id", orgId);
      propagationResult = { applied: true, action: "deprecated", target: bridge.target_entry_id };
      break;
    }
    case "approve_confidence_restoration": {
      if (bridge.confidence_after != null) {
        await sc.from("canon_entries")
          .update({ confidence_score: bridge.confidence_after, updated_at: new Date().toISOString() })
          .eq("id", bridge.target_entry_id)
          .eq("organization_id", orgId);
        propagationResult = { applied: true, action: "confidence_restored", confidence: bridge.confidence_after };
      }
      break;
    }
    case "supersede_knowledge_object": {
      await sc.from("canon_entries")
        .update({ lifecycle_status: "superseded", updated_at: new Date().toISOString() })
        .eq("id", bridge.target_entry_id)
        .eq("organization_id", orgId);
      propagationResult = { applied: true, action: "superseded", target: bridge.target_entry_id };
      break;
    }
    default: {
      propagationResult = { applied: false, reason: `No auto-propagation for action: ${bridge.governance_action_type}` };
    }
  }

  const bpStatus = propagationResult.applied ? "applied" : "skipped";

  await sc.from("renewal_governance_bridge").update({
    back_propagation_status: bpStatus,
    back_propagation_result: propagationResult,
    back_propagated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", bridgeId);

  await sc.from("renewal_governance_bridge_events").insert({
    organization_id: orgId,
    bridge_id: bridgeId,
    event_type: "back_propagated",
    actor_id: userId,
    details: propagationResult,
  });

  await sc.from("knowledge_renewal_history").insert({
    organization_id: orgId,
    target_entry_id: bridge.target_entry_id,
    target_type: bridge.target_type,
    event_type: "governance_back_propagated",
    explanation: `Governance decision applied: ${bridge.governance_action_type}. Result: ${JSON.stringify(propagationResult)}.`,
    actor_id: userId,
    evidence_refs: bridge.evidence_refs || [],
  });

  return { success: true, propagation: propagationResult };
}

async function listBridgeEvents(sc: any, orgId: string, bridgeId?: string) {
  let q = sc.from("renewal_governance_bridge_events").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50);
  if (bridgeId) q = q.eq("bridge_id", bridgeId);
  const { data } = await q;
  return { events: data || [] };
}
