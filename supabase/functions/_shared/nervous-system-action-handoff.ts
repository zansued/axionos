/**
 * AI Nervous System — Action Handoff Adapter
 *
 * Integration bridge between the Nervous System (sensory/cognitive/triage)
 * and the existing AxionOS governed action stack (action_registry_entries,
 * action_approval_requests, action_audit_events, axion-execution-worker).
 *
 * DESIGN PRINCIPLE:
 *   The Nervous System is the operational cortex (signal → triage).
 *   The Action Engine stack is the governed motor system (formalize → execute → audit).
 *   This module is the spinal cord — a clean handoff boundary.
 *
 * REPLACES: autonomic_actions parallel execution path (NS-06 legacy).
 * PRESERVES: NS-01 through NS-05 fully intact.
 *
 * INVARIANTS:
 *   - Only approved surfaced items can be handed off
 *   - Handoff creates action_registry_entries (existing stack)
 *   - No second approval authority
 *   - No second execution worker
 *   - No second audit trail
 *   - Full traceability: ns_event_id, ns_decision_id, ns_surfaced_item_id, ns_signal_group_id
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════

const HANDOFF_VERSION = "1.0";

// Maps NS recommended_action_type → action engine trigger_type
const NS_ACTION_TO_TRIGGER_TYPE: Record<string, string> = {
  investigate_service_health: "ns_investigate",
  inspect_agent_fallback_chain: "ns_inspect",
  review_pipeline_dependencies: "ns_review",
  increase_observability: "ns_observability",
  validate_retry_policy: "ns_validate",
  review_cost_routing: "ns_review",
  mark_pattern_for_review: "ns_learning",
};

// Execution mode mapping: NS risk → action engine execution_mode
// Reuses existing action engine semantics: auto, approval_required, manual_only
function mapExecutionMode(riskLevel: string, actionType: string): string {
  if (riskLevel === "critical" || riskLevel === "high") return "approval_required";
  
  const safeAutoActions = new Set(["mark_pattern_for_review", "increase_observability"]);
  if (riskLevel === "low" && safeAutoActions.has(actionType)) return "auto";
  
  return "approval_required";
}

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════

export interface HandoffResult {
  success: boolean;
  action_id?: string;
  action_registry_id?: string;
  execution_mode?: string;
  error?: string;
}

export interface HandoffBatchResult {
  processed: number;
  handed_off: number;
  skipped: number;
  errors: number;
  details: HandoffResult[];
}

export interface HandoffEligibility {
  eligible: boolean;
  reason: string;
}

// ═══════════════════════════════════════════════════
// Eligibility Check
// ═══════════════════════════════════════════════════

export function isSurfacedItemEligibleForHandoff(
  surfacedItem: Record<string, unknown>
): HandoffEligibility {
  const status = surfacedItem.surface_status as string;

  // Must be approved
  if (status !== "approved") {
    return { eligible: false, reason: `Surface status is '${status}', must be 'approved'` };
  }

  // Must have an approver
  if (!surfacedItem.approved_by) {
    return { eligible: false, reason: "No approver recorded" };
  }

  // Must have a recommended action
  if (!surfacedItem.recommended_action_type) {
    return { eligible: false, reason: "No recommended_action_type on surfaced item" };
  }

  // Must not already be handed off (check handoff_action_id)
  if (surfacedItem.handoff_action_id) {
    return { eligible: false, reason: "Already handed off to action engine" };
  }

  // Must not be in a terminal surface state
  if (["resolved", "expired", "dismissed"].includes(status)) {
    return { eligible: false, reason: `Terminal surface status: ${status}` };
  }

  return { eligible: true, reason: "Eligible for handoff" };
}

// ═══════════════════════════════════════════════════
// Map NS Decision → Action Engine Payload
// ═══════════════════════════════════════════════════

export function mapNsDecisionToActionPayload(
  surfacedItem: Record<string, unknown>
): Record<string, unknown> {
  const actionType = surfacedItem.recommended_action_type as string || "investigate_service_health";
  const riskLevel = surfacedItem.risk_level as string || "medium";
  const executionMode = mapExecutionMode(riskLevel, actionType);
  const triggerType = NS_ACTION_TO_TRIGGER_TYPE[actionType] || "ns_action";

  return {
    action_id: crypto.randomUUID(),
    intent_id: crypto.randomUUID(),
    trigger_id: `ns-handoff-${surfacedItem.id}`,
    trigger_type: triggerType,
    execution_mode: executionMode,
    risk_level: riskLevel,
    requires_approval: executionMode === "approval_required",
    rollback_available: false,
    stage: "nervous_system_handoff",
    description: surfacedItem.title as string || `NS Action: ${actionType}`,
    reason: `Nervous System handoff: ${surfacedItem.summary || "Approved surfaced item"}`,
    payload: {
      ns_source: "nervous_system_handoff",
      ns_handoff_version: HANDOFF_VERSION,
      ns_event_id: surfacedItem.event_id,
      ns_decision_id: surfacedItem.decision_id,
      ns_surfaced_item_id: surfacedItem.id,
      ns_signal_group_id: surfacedItem.signal_group_id || null,
      action_type: actionType,
      action_payload: surfacedItem.recommended_action_payload || {},
      expected_outcome: surfacedItem.expected_outcome || {},
      surface_type: surfacedItem.surface_type,
      attention_level: surfacedItem.attention_level,
      priority_level: surfacedItem.priority_level,
      approved_by: surfacedItem.approved_by,
      approved_at: surfacedItem.approved_at,
    },
  };
}

// ═══════════════════════════════════════════════════
// Create Governed Action via Existing Stack
// ═══════════════════════════════════════════════════

export async function createGovernedActionFromSurfacedItem(
  sc: SupabaseClient,
  orgId: string,
  surfacedItem: Record<string, unknown>
): Promise<HandoffResult> {
  // 1. Eligibility
  const eligibility = isSurfacedItemEligibleForHandoff(surfacedItem);
  if (!eligibility.eligible) {
    return { success: false, error: eligibility.reason };
  }

  // 2. Build action payload
  const actionPayload = mapNsDecisionToActionPayload(surfacedItem);

  // 3. Insert into action_registry_entries (existing action engine table)
  const { data: actionEntry, error: insertError } = await sc
    .from("action_registry_entries")
    .insert({
      organization_id: orgId,
      action_id: actionPayload.action_id,
      intent_id: actionPayload.intent_id,
      trigger_id: actionPayload.trigger_id,
      trigger_type: actionPayload.trigger_type,
      execution_mode: actionPayload.execution_mode,
      status: actionPayload.requires_approval ? "pending" : "queued",
      risk_level: actionPayload.risk_level,
      requires_approval: actionPayload.requires_approval,
      rollback_available: actionPayload.rollback_available,
      stage: actionPayload.stage,
      description: actionPayload.description,
      reason: actionPayload.reason,
      payload: actionPayload.payload,
      initiative_id: (surfacedItem.event_id ? null : null), // Could link if initiative known
    })
    .select("id, action_id")
    .single();

  if (insertError) {
    console.error("[NS-Handoff] Failed to create action_registry_entry:", insertError);
    return { success: false, error: insertError.message };
  }

  // 4. Write audit event (using existing audit trail)
  await sc.from("action_audit_events").insert({
    action_id: actionEntry.action_id,
    organization_id: orgId,
    event_type: "ns_handoff_created",
    previous_status: "none",
    new_status: actionPayload.requires_approval ? "pending" : "queued",
    reason: `Nervous System handoff from surfaced item ${surfacedItem.id}. Decision: ${surfacedItem.decision_id}. Event: ${surfacedItem.event_id}.`,
    actor_type: "system",
    executor_type: "nervous_system_handoff",
  });

  // 5. Mark surfaced item as handed off
  await markSurfacedItemHandedOff(sc, orgId, surfacedItem.id as string, actionEntry.action_id);

  // 6. Update decision execution_status
  if (surfacedItem.decision_id) {
    await sc.from("nervous_system_decisions")
      .update({ execution_status: "handed_off" })
      .eq("id", surfacedItem.decision_id)
      .eq("organization_id", orgId);
  }

  return {
    success: true,
    action_id: actionEntry.action_id,
    action_registry_id: actionEntry.id,
    execution_mode: actionPayload.execution_mode as string,
  };
}

// ═══════════════════════════════════════════════════
// Mark Surfaced Item as Handed Off
// ═══════════════════════════════════════════════════

export async function markSurfacedItemHandedOff(
  sc: SupabaseClient,
  orgId: string,
  itemId: string,
  actionId: string
): Promise<void> {
  const now = new Date().toISOString();
  await sc.from("nervous_system_surfaced_items")
    .update({
      handoff_action_id: actionId,
      handoff_status: "handed_off",
      handoff_at: now,
      execution_status: "handed_off",
      surface_metadata: sc.rpc ? undefined : undefined, // keep existing
    })
    .eq("id", itemId)
    .eq("organization_id", orgId);
}

// ═══════════════════════════════════════════════════
// Batch: Process Approved Items for Handoff
// ═══════════════════════════════════════════════════

export async function processHandoffBatch(
  sc: SupabaseClient,
  orgId: string,
  batchSize = 50
): Promise<HandoffBatchResult> {
  const result: HandoffBatchResult = {
    processed: 0, handed_off: 0, skipped: 0, errors: 0, details: [],
  };

  // Fetch approved surfaced items not yet handed off
  const { data: items, error } = await sc
    .from("nervous_system_surfaced_items")
    .select("*")
    .eq("organization_id", orgId)
    .eq("surface_status", "approved")
    .is("handoff_action_id", null)
    .order("approved_at", { ascending: true })
    .limit(Math.min(batchSize, 100));

  if (error || !items || items.length === 0) return result;

  for (const item of items) {
    result.processed++;
    try {
      const handoff = await createGovernedActionFromSurfacedItem(sc, orgId, item);
      result.details.push(handoff);

      if (handoff.success) {
        result.handed_off++;
      } else {
        result.skipped++;
      }
    } catch (e) {
      console.error("[NS-Handoff] Error processing item:", e);
      result.errors++;
      result.details.push({ success: false, error: (e as Error).message });
    }
  }

  // Update live state with handoff summary
  await updateHandoffLiveState(sc, orgId).catch((e) => {
    console.warn("[NS-Handoff] Live state update failed:", e);
  });

  return result;
}

// ═══════════════════════════════════════════════════
// Feedback: Ingest execution outcomes back into NS
// ═══════════════════════════════════════════════════

export async function ingestExecutionOutcomeToNS(
  sc: SupabaseClient,
  orgId: string,
  actionId: string
): Promise<{ success: boolean; feedback_id?: string; error?: string }> {
  // 1. Find the action_registry_entry
  const { data: action } = await sc
    .from("action_registry_entries")
    .select("id, action_id, status, outcome_status, outcome_summary, payload, organization_id")
    .eq("action_id", actionId)
    .eq("organization_id", orgId)
    .single();

  if (!action) return { success: false, error: "Action not found" };

  // 2. Extract NS references from payload
  const payload = action.payload as Record<string, unknown> || {};
  if (payload.ns_source !== "nervous_system_handoff") {
    return { success: false, error: "Not a NS-originated action" };
  }

  const nsEventId = payload.ns_event_id as string;
  const nsDecisionId = payload.ns_decision_id as string;
  const nsSurfacedItemId = payload.ns_surfaced_item_id as string;
  const nsSignalGroupId = payload.ns_signal_group_id as string | null;

  if (!nsEventId || !nsDecisionId || !nsSurfacedItemId) {
    return { success: false, error: "Missing NS traceability references in payload" };
  }

  // 3. Determine feedback type
  const terminalStatuses = ["completed", "failed", "rejected", "cancelled", "expired"];
  if (!terminalStatuses.includes(action.status)) {
    return { success: false, error: `Action not in terminal state: ${action.status}` };
  }

  const wasSuccessful = action.status === "completed" && action.outcome_status === "success";
  const feedbackType = wasSuccessful ? "execution_success" : "execution_failure";

  // 4. Write learning feedback into NS
  const { data: feedback, error: fbError } = await sc
    .from("nervous_system_learning_feedback")
    .insert({
      organization_id: orgId,
      action_id: action.id, // use registry row id, not action_id string
      surfaced_item_id: nsSurfacedItemId,
      decision_id: nsDecisionId,
      event_id: nsEventId,
      signal_group_id: nsSignalGroupId,
      feedback_type: feedbackType,
      feedback_score: wasSuccessful ? 1.0 : 0.0,
      was_successful: wasSuccessful,
      expected_outcome_met: wasSuccessful, // simplified; could compare expected vs actual
      feedback_reason: `Action Engine outcome: ${action.outcome_status}. ${action.outcome_summary || ""}`.trim(),
      measured_metrics: {},
      feedback_metadata: {
        source: "action_engine_outcome",
        handoff_version: HANDOFF_VERSION,
        action_status: action.status,
        outcome_status: action.outcome_status,
      },
    })
    .select("id")
    .single();

  if (fbError) {
    console.error("[NS-Handoff] Failed to create feedback:", fbError);
    return { success: false, error: fbError.message };
  }

  // 5. Update surfaced item with outcome
  await sc.from("nervous_system_surfaced_items")
    .update({
      execution_status: wasSuccessful ? "succeeded" : "failed",
      surface_status: "resolved",
      resolved_at: new Date().toISOString(),
      status_reason: `Action Engine outcome: ${action.outcome_status}`,
    })
    .eq("id", nsSurfacedItemId)
    .eq("organization_id", orgId);

  // 6. Emit a new NS event for the outcome (closes the loop)
  try {
    const { emitNervousSystemEvent } = await import("./nervous-system.ts");
    await emitNervousSystemEvent(sc, {
      organization_id: orgId,
      source_type: "governance_engine",
      source_id: action.action_id,
      event_type: wasSuccessful ? "autonomic_action_executed" : "autonomic_action_failed",
      event_domain: "governance",
      event_subdomain: "action_engine_outcome",
      severity: wasSuccessful ? "low" : "medium",
      summary: `Action Engine outcome for NS handoff: ${action.outcome_status}. ${action.outcome_summary || ""}`.trim(),
      payload: {
        ns_event_id: nsEventId,
        ns_decision_id: nsDecisionId,
        ns_surfaced_item_id: nsSurfacedItemId,
        action_id: action.action_id,
        outcome_status: action.outcome_status,
        feedback_id: feedback?.id,
      },
    });
  } catch (e) {
    console.warn("[NS-Handoff] Outcome event emission failed (non-critical):", e);
  }

  return { success: true, feedback_id: feedback?.id };
}

// ═══════════════════════════════════════════════════
// Handoff Status Query
// ═══════════════════════════════════════════════════

export async function getHandoffStatus(
  sc: SupabaseClient,
  orgId: string,
  surfacedItemId: string
): Promise<Record<string, unknown> | null> {
  const { data: item } = await sc
    .from("nervous_system_surfaced_items")
    .select("id, handoff_action_id, handoff_status, handoff_at, execution_status, surface_status")
    .eq("id", surfacedItemId)
    .eq("organization_id", orgId)
    .single();

  if (!item || !item.handoff_action_id) return null;

  // Fetch the corresponding action_registry_entry
  const { data: action } = await sc
    .from("action_registry_entries")
    .select("action_id, status, outcome_status, outcome_summary, execution_mode, completed_at")
    .eq("action_id", item.handoff_action_id)
    .eq("organization_id", orgId)
    .single();

  return {
    surfaced_item_id: item.id,
    handoff_action_id: item.handoff_action_id,
    handoff_status: item.handoff_status,
    handoff_at: item.handoff_at,
    ns_execution_status: item.execution_status,
    surface_status: item.surface_status,
    action_engine: action ? {
      action_id: action.action_id,
      status: action.status,
      outcome_status: action.outcome_status,
      outcome_summary: action.outcome_summary,
      execution_mode: action.execution_mode,
      completed_at: action.completed_at,
    } : null,
  };
}

// ═══════════════════════════════════════════════════
// Live State Update
// ═══════════════════════════════════════════════════

async function updateHandoffLiveState(sc: SupabaseClient, orgId: string): Promise<void> {
  // Count items by handoff status
  const { data: items } = await sc
    .from("nervous_system_surfaced_items")
    .select("handoff_status, execution_status, surface_status")
    .eq("organization_id", orgId)
    .not("handoff_action_id", "is", null)
    .limit(500);

  const rows = items || [];
  const byHandoffStatus: Record<string, number> = {};
  const byExecStatus: Record<string, number> = {};

  for (const r of rows) {
    const hs = (r.handoff_status as string) || "unknown";
    const es = (r.execution_status as string) || "unknown";
    byHandoffStatus[hs] = (byHandoffStatus[hs] || 0) + 1;
    byExecStatus[es] = (byExecStatus[es] || 0) + 1;
  }

  const summary = {
    total_handoffs: rows.length,
    by_handoff_status: byHandoffStatus,
    by_execution_status: byExecStatus,
    pending_handoff_count: byHandoffStatus["handed_off"] || 0,
    last_updated: new Date().toISOString(),
  };

  await sc.from("nervous_system_live_state")
    .upsert({
      organization_id: orgId,
      state_key: "handoff_summary",
      state_value: summary,
      updated_at: new Date().toISOString(),
    }, { onConflict: "organization_id,state_key" });
}
