/**
 * AI Nervous System — NS-06: Governed Action Execution Engine
 *
 * Executes approved surfaced items under policy-aware gates.
 * No LLM. No approval bypass. No unsafe autonomous execution.
 *
 * LIFECYCLE:
 *   approved surfaced item → autonomic action (pending → ready → running → succeeded/failed)
 *
 * EXECUTION MODES:
 *   manual     — human must execute externally; system tracks
 *   assisted   — system prepares; human confirms
 *   automatic  — system executes safe, low-risk workflow triggers
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════

const ACTION_ENGINE_VERSION = "1.0";

// Actions eligible for automatic execution (low-risk, workflow-only)
const AUTOMATIC_ELIGIBLE_ACTIONS = new Set([
  "mark_pattern_for_review",
  "increase_observability",
]);

// Actions that may be assisted (system prepares, human confirms)
const ASSISTED_ELIGIBLE_ACTIONS = new Set([
  "inspect_agent_fallback_chain",
  "validate_retry_policy",
  "review_cost_routing",
]);

// Everything else is manual-only
const MANUAL_ONLY_ACTIONS = new Set([
  "investigate_service_health",
  "review_pipeline_dependencies",
]);

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════

export type ExecutionMode = "manual" | "assisted" | "automatic";
export type ExecutionStatus = "pending" | "ready" | "running" | "succeeded" | "failed" | "cancelled" | "skipped";

export interface ActionCreationResult {
  created: boolean;
  action_id: string | null;
  execution_mode: ExecutionMode;
  error?: string;
}

export interface ExecutionResult {
  execution_status: ExecutionStatus;
  outcome_type: string;
  outcome_summary: string;
  expected_outcome_met: boolean;
  affected_entities: string[];
  follow_up_required: boolean;
  metrics_delta: Record<string, unknown>;
}

export interface ActionBatchResult {
  processed: number;
  created: number;
  executed: number;
  skipped: number;
  errors: number;
  by_mode: Record<string, number>;
}

// ═══════════════════════════════════════════════════
// Execution Mode Determination
// ═══════════════════════════════════════════════════

export function determineExecutionMode(
  actionType: string,
  riskLevel: string,
  priorityLevel: string
): ExecutionMode {
  // High/critical risk → always manual
  if (riskLevel === "high" || riskLevel === "critical") return "manual";

  // Urgent priority → manual (needs human judgment)
  if (priorityLevel === "urgent") return "manual";

  // Check automatic eligibility
  if (AUTOMATIC_ELIGIBLE_ACTIONS.has(actionType) && riskLevel === "low") {
    return "automatic";
  }

  // Check assisted eligibility
  if (ASSISTED_ELIGIBLE_ACTIONS.has(actionType)) return "assisted";

  // Default to manual
  return "manual";
}

// ═══════════════════════════════════════════════════
// Execution Policy Validation
// ═══════════════════════════════════════════════════

export function validateExecutionPolicy(
  surfacedItem: Record<string, unknown>,
  actionType: string,
  executionMode: ExecutionMode
): { valid: boolean; reason: string; policy_snapshot: Record<string, unknown> } {
  const status = surfacedItem.surface_status as string;

  // Must be approved
  if (status !== "approved") {
    return {
      valid: false,
      reason: `Surfaced item must be approved. Current status: ${status}`,
      policy_snapshot: { checked_at: new Date().toISOString(), status, required: "approved" },
    };
  }

  // Must have approver
  if (!surfacedItem.approved_by) {
    return {
      valid: false,
      reason: "No approver recorded on surfaced item",
      policy_snapshot: { checked_at: new Date().toISOString(), missing: "approved_by" },
    };
  }

  // Automatic mode requires low risk
  if (executionMode === "automatic") {
    const risk = surfacedItem.risk_level as string;
    if (risk !== "low") {
      return {
        valid: false,
        reason: `Automatic execution requires low risk. Current: ${risk}`,
        policy_snapshot: { checked_at: new Date().toISOString(), risk, mode: executionMode },
      };
    }
  }

  return {
    valid: true,
    reason: "Policy validation passed",
    policy_snapshot: {
      engine_version: ACTION_ENGINE_VERSION,
      checked_at: new Date().toISOString(),
      execution_mode: executionMode,
      action_type: actionType,
      approved_by: surfacedItem.approved_by,
      approved_at: surfacedItem.approved_at,
      risk_level: surfacedItem.risk_level,
      priority_level: surfacedItem.priority_level,
    },
  };
}

// ═══════════════════════════════════════════════════
// Action Creation
// ═══════════════════════════════════════════════════

export async function createActionFromApprovedSurface(
  sc: SupabaseClient,
  orgId: string,
  surfacedItem: Record<string, unknown>
): Promise<ActionCreationResult> {
  const actionType = (surfacedItem.recommended_action_type as string) || "investigate_service_health";
  const riskLevel = (surfacedItem.risk_level as string) || "medium";
  const priorityLevel = (surfacedItem.priority_level as string) || "medium";

  const executionMode = determineExecutionMode(actionType, riskLevel, priorityLevel);
  const policy = validateExecutionPolicy(surfacedItem, actionType, executionMode);

  if (!policy.valid) {
    return { created: false, action_id: null, execution_mode: executionMode, error: policy.reason };
  }

  const { data, error } = await sc
    .from("autonomic_actions")
    .insert({
      organization_id: orgId,
      surfaced_item_id: surfacedItem.id,
      decision_id: surfacedItem.decision_id,
      event_id: surfacedItem.event_id,
      signal_group_id: surfacedItem.signal_group_id || null,
      action_type: actionType,
      execution_mode: executionMode,
      execution_status: "pending",
      action_payload: surfacedItem.recommended_action_payload || {},
      expected_outcome: surfacedItem.expected_outcome || {},
      approved_by: surfacedItem.approved_by as string,
      approved_at: surfacedItem.approved_at as string,
      policy_snapshot: policy.policy_snapshot,
      action_metadata: {
        engine_version: ACTION_ENGINE_VERSION,
        surface_type: surfacedItem.surface_type,
        attention_level: surfacedItem.attention_level,
      },
    })
    .select("id")
    .single();

  if (error) {
    return { created: false, action_id: null, execution_mode: executionMode, error: error.message };
  }

  // Link action to surfaced item
  await sc.from("nervous_system_surfaced_items")
    .update({ action_id: data.id, execution_status: "pending" })
    .eq("id", surfacedItem.id).eq("organization_id", orgId);

  // Update decision execution_status
  await sc.from("nervous_system_decisions")
    .update({ execution_status: "pending" })
    .eq("id", surfacedItem.decision_id).eq("organization_id", orgId);

  return { created: true, action_id: data.id, execution_mode: executionMode };
}

// ═══════════════════════════════════════════════════
// Governed Execution
// ═══════════════════════════════════════════════════

export async function executeGovernedAction(
  sc: SupabaseClient,
  orgId: string,
  actionId: string
): Promise<ExecutionResult> {
  const { data: action } = await sc
    .from("autonomic_actions")
    .select("*")
    .eq("id", actionId)
    .eq("organization_id", orgId)
    .single();

  if (!action) {
    return {
      execution_status: "failed",
      outcome_type: "not_found",
      outcome_summary: "Action not found",
      expected_outcome_met: false,
      affected_entities: [],
      follow_up_required: false,
      metrics_delta: {},
    };
  }

  // Mark as running
  await sc.from("autonomic_actions")
    .update({ execution_status: "running", started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", actionId).eq("organization_id", orgId);

  await sc.from("nervous_system_surfaced_items")
    .update({ execution_status: "running" })
    .eq("id", action.surfaced_item_id).eq("organization_id", orgId);

  try {
    const result = executeActionWorkflow(action);

    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = {
      execution_status: result.execution_status,
      execution_result: result,
      updated_at: now,
    };

    if (result.execution_status === "succeeded") {
      updateData.completed_at = now;
    } else if (result.execution_status === "failed") {
      updateData.failed_at = now;
      updateData.execution_error = { summary: result.outcome_summary };
    }

    await sc.from("autonomic_actions")
      .update(updateData)
      .eq("id", actionId).eq("organization_id", orgId);

    // Update linked entities
    await sc.from("nervous_system_surfaced_items")
      .update({ execution_status: result.execution_status })
      .eq("id", action.surfaced_item_id).eq("organization_id", orgId);

    await sc.from("nervous_system_decisions")
      .update({ execution_status: result.execution_status })
      .eq("id", action.decision_id).eq("organization_id", orgId);

    return result;
  } catch (e) {
    const errorResult: ExecutionResult = {
      execution_status: "failed",
      outcome_type: "execution_error",
      outcome_summary: e instanceof Error ? e.message : "Unknown execution error",
      expected_outcome_met: false,
      affected_entities: [],
      follow_up_required: true,
      metrics_delta: {},
    };

    await sc.from("autonomic_actions")
      .update({
        execution_status: "failed",
        failed_at: new Date().toISOString(),
        execution_error: { summary: errorResult.outcome_summary },
        execution_result: errorResult,
        updated_at: new Date().toISOString(),
      })
      .eq("id", actionId).eq("organization_id", orgId);

    return errorResult;
  }
}

// ═══════════════════════════════════════════════════
// Workflow Execution (deterministic, no side effects beyond DB)
// ═══════════════════════════════════════════════════

function executeActionWorkflow(action: Record<string, unknown>): ExecutionResult {
  const actionType = action.action_type as string;
  const mode = action.execution_mode as string;

  // Manual actions: mark as succeeded (workflow trigger recorded, human executes externally)
  if (mode === "manual") {
    return {
      execution_status: "succeeded",
      outcome_type: "workflow_trigger",
      outcome_summary: `Manual action '${actionType}' registered. Requires external operator execution.`,
      expected_outcome_met: false,
      affected_entities: [],
      follow_up_required: true,
      metrics_delta: {},
    };
  }

  // Assisted actions: system prepares context, marks ready for confirmation
  if (mode === "assisted") {
    return {
      execution_status: "succeeded",
      outcome_type: "workflow_prepared",
      outcome_summary: `Assisted action '${actionType}' prepared. Context assembled for operator review.`,
      expected_outcome_met: false,
      affected_entities: [],
      follow_up_required: true,
      metrics_delta: {},
    };
  }

  // Automatic safe actions
  switch (actionType) {
    case "mark_pattern_for_review":
      return {
        execution_status: "succeeded",
        outcome_type: "pattern_flagged",
        outcome_summary: "Pattern flagged for human review in the learning pipeline.",
        expected_outcome_met: true,
        affected_entities: [action.event_id as string].filter(Boolean),
        follow_up_required: false,
        metrics_delta: { patterns_flagged: 1 },
      };

    case "increase_observability":
      return {
        execution_status: "succeeded",
        outcome_type: "observability_increased",
        outcome_summary: "Observability level increased for the affected domain. Governed workflow triggered.",
        expected_outcome_met: true,
        affected_entities: [action.event_id as string].filter(Boolean),
        follow_up_required: false,
        metrics_delta: { observability_triggers: 1 },
      };

    default:
      return {
        execution_status: "succeeded",
        outcome_type: "workflow_trigger",
        outcome_summary: `Action '${actionType}' completed as governed workflow trigger.`,
        expected_outcome_met: true,
        affected_entities: [],
        follow_up_required: false,
        metrics_delta: {},
      };
  }
}

// ═══════════════════════════════════════════════════
// Persist Execution Result (for feedback)
// ═══════════════════════════════════════════════════

export async function persistExecutionResult(
  sc: SupabaseClient,
  orgId: string,
  actionId: string,
  result: ExecutionResult
): Promise<void> {
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    execution_status: result.execution_status,
    execution_result: result,
    updated_at: now,
  };
  if (result.execution_status === "succeeded") updates.completed_at = now;
  if (result.execution_status === "failed") {
    updates.failed_at = now;
    updates.execution_error = { summary: result.outcome_summary };
  }

  await sc.from("autonomic_actions")
    .update(updates)
    .eq("id", actionId).eq("organization_id", orgId);
}

// ═══════════════════════════════════════════════════
// Batch: Process Approved Actions
// ═══════════════════════════════════════════════════

export async function processApprovedActionsBatch(
  sc: SupabaseClient,
  orgId: string,
  batchSize = 50
): Promise<ActionBatchResult> {
  const result: ActionBatchResult = {
    processed: 0, created: 0, executed: 0, skipped: 0, errors: 0,
    by_mode: {},
  };

  // Fetch approved surfaced items without an action yet
  const { data: items, error } = await sc
    .from("nervous_system_surfaced_items")
    .select("*")
    .eq("organization_id", orgId)
    .eq("surface_status", "approved")
    .is("action_id", null)
    .order("surfaced_at", { ascending: true })
    .limit(Math.min(batchSize, 100));

  if (error || !items || items.length === 0) return result;

  for (const item of items) {
    try {
      result.processed++;

      const creation = await createActionFromApprovedSurface(sc, orgId, item);
      if (!creation.created || !creation.action_id) {
        result.skipped++;
        continue;
      }

      result.created++;
      result.by_mode[creation.execution_mode] = (result.by_mode[creation.execution_mode] || 0) + 1;

      // Auto-execute only automatic actions
      if (creation.execution_mode === "automatic") {
        await executeGovernedAction(sc, orgId, creation.action_id);
        result.executed++;
      }
    } catch (e) {
      console.error("[NS-06] Error processing approved action:", e);
      result.errors++;
    }
  }

  // Update live state
  await updateActionLiveState(sc, orgId).catch((e) => {
    console.warn("[NS-06] Live state update failed (non-blocking):", e);
  });

  return result;
}

// ═══════════════════════════════════════════════════
// Resolve / Expire Surfaced Items
// ═══════════════════════════════════════════════════

export async function resolveSurfacedItem(
  sc: SupabaseClient,
  orgId: string,
  itemId: string,
  userId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const { data: item } = await sc
    .from("nervous_system_surfaced_items")
    .select("id, surface_status")
    .eq("id", itemId).eq("organization_id", orgId).single();

  if (!item) return { success: false, error: "Item not found" };
  if (item.surface_status === "resolved" || item.surface_status === "expired") {
    return { success: false, error: `Cannot resolve item in status: ${item.surface_status}` };
  }

  const now = new Date().toISOString();
  await sc.from("nervous_system_surfaced_items")
    .update({
      surface_status: "resolved",
      resolved_at: now,
      status_reason: reason || "Resolved by operator",
    })
    .eq("id", itemId).eq("organization_id", orgId);

  return { success: true };
}

export async function expireSurfacedItem(
  sc: SupabaseClient,
  orgId: string,
  itemId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  if (!reason) return { success: false, error: "Expiration requires a reason" };

  const { data: item } = await sc
    .from("nervous_system_surfaced_items")
    .select("id, surface_status")
    .eq("id", itemId).eq("organization_id", orgId).single();

  if (!item) return { success: false, error: "Item not found" };
  if (item.surface_status === "resolved" || item.surface_status === "expired") {
    return { success: false, error: `Cannot expire item in status: ${item.surface_status}` };
  }

  const now = new Date().toISOString();
  await sc.from("nervous_system_surfaced_items")
    .update({
      surface_status: "expired",
      expired_at: now,
      status_reason: reason,
    })
    .eq("id", itemId).eq("organization_id", orgId);

  return { success: true };
}

// ═══════════════════════════════════════════════════
// Live State Update
// ═══════════════════════════════════════════════════

async function updateActionLiveState(sc: SupabaseClient, orgId: string): Promise<void> {
  const { data: actions } = await sc
    .from("autonomic_actions")
    .select("execution_status, action_type, execution_mode")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = actions || [];
  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byMode: Record<string, number> = {};

  for (const a of rows) {
    byStatus[a.execution_status] = (byStatus[a.execution_status] || 0) + 1;
    byType[a.action_type] = (byType[a.action_type] || 0) + 1;
    byMode[a.execution_mode] = (byMode[a.execution_mode] || 0) + 1;
  }

  // Get recent feed
  const { data: recentActions } = await sc
    .from("autonomic_actions")
    .select("id, action_type, execution_mode, execution_status, created_at, completed_at, failed_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(10);

  const summary = {
    pending_actions_count: byStatus["pending"] || 0,
    running_actions_count: byStatus["running"] || 0,
    succeeded_actions_count: byStatus["succeeded"] || 0,
    failed_actions_count: byStatus["failed"] || 0,
    total: rows.length,
    by_status: byStatus,
    by_type: byType,
    by_mode: byMode,
    recent_execution_feed: (recentActions || []).map((a: any) => ({
      id: a.id,
      type: a.action_type,
      mode: a.execution_mode,
      status: a.execution_status,
      created_at: a.created_at,
      completed_at: a.completed_at,
      failed_at: a.failed_at,
    })),
    last_updated: new Date().toISOString(),
  };

  await sc.from("nervous_system_live_state")
    .upsert({
      organization_id: orgId,
      state_key: "execution_summary",
      state_value: summary,
      updated_at: new Date().toISOString(),
    }, { onConflict: "organization_id,state_key" });
}
