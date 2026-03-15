/**
 * AI Nervous System — NS-05: Surfacing Engine
 *
 * Converts decided events into curated, operator-facing surfaced items.
 * Implements threshold logic to reduce noise.
 * Manages surfaced item lifecycle: active → acknowledged → approved → resolved / dismissed.
 *
 * No LLM. No frontend logic. No automatic execution.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════

const SURFACING_ENGINE_VERSION = "1.0";

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════

export type SurfaceType =
  | "decision_surface"
  | "escalation_surface"
  | "recommendation_surface"
  | "learning_surface"
  | "queue_surface";

export type SurfaceStatus = "active" | "acknowledged" | "approved" | "dismissed" | "resolved" | "expired";
export type AttentionLevel = "low" | "medium" | "high" | "urgent";

export interface SurfacingResult {
  surfaced: boolean;
  surface_type: SurfaceType | null;
  title: string;
  summary: string;
  attention_level: AttentionLevel;
  skip_reason: string | null;
}

export interface SurfacingProcessingResult {
  processed: number;
  surfaced: number;
  skipped: number;
  by_type: Record<string, number>;
  errors: number;
}

// ═══════════════════════════════════════════════════
// Threshold: Should this decision be surfaced?
// ═══════════════════════════════════════════════════

function shouldSurface(decision: Record<string, unknown>): { surface: boolean; reason: string } {
  const dt = decision.decision_type as string;
  const risk = decision.risk_level as string;
  const priority = decision.priority_level as string;
  const confidence = (decision.decision_confidence as number) || 0;

  // Always surface escalations
  if (dt === "escalate") return { surface: true, reason: "escalation_always_surfaced" };

  // Always surface queue_for_action
  if (dt === "queue_for_action") return { surface: true, reason: "queue_always_surfaced" };

  // Always surface recommend_action
  if (dt === "recommend_action") return { surface: true, reason: "recommendation_always_surfaced" };

  // Always surface explicit surface decisions
  if (dt === "surface") return { surface: true, reason: "surface_decision" };

  // mark_for_learning: surface only if significant
  if (dt === "mark_for_learning") {
    if (confidence >= 0.4 || risk === "high" || risk === "critical" || priority === "high" || priority === "urgent") {
      return { surface: true, reason: "learning_significant" };
    }
    return { surface: false, reason: "learning_below_significance_threshold" };
  }

  // observe: surface only if risk/priority crosses threshold
  if (dt === "observe") {
    if (risk === "high" || risk === "critical" || priority === "high" || priority === "urgent") {
      return { surface: true, reason: "observe_elevated_risk" };
    }
    return { surface: false, reason: "observe_low_impact" };
  }

  return { surface: false, reason: "no_matching_rule" };
}

// ═══════════════════════════════════════════════════
// Surface Type Determination
// ═══════════════════════════════════════════════════

export function determineSurfaceType(decisionType: string): SurfaceType {
  switch (decisionType) {
    case "escalate": return "escalation_surface";
    case "recommend_action": return "recommendation_surface";
    case "queue_for_action": return "queue_surface";
    case "mark_for_learning": return "learning_surface";
    case "surface":
    case "observe":
    default:
      return "decision_surface";
  }
}

// ═══════════════════════════════════════════════════
// Attention Level
// ═══════════════════════════════════════════════════

export function determineAttentionLevel(
  decisionType: string,
  riskLevel: string,
  priorityLevel: string
): AttentionLevel {
  if (decisionType === "escalate") return "urgent";
  if (priorityLevel === "urgent") return "urgent";
  if (riskLevel === "critical") return "urgent";
  if (riskLevel === "high" || priorityLevel === "high") return "high";
  if (riskLevel === "medium" || priorityLevel === "medium") return "medium";
  return "low";
}

// ═══════════════════════════════════════════════════
// Title Builder
// ═══════════════════════════════════════════════════

export function buildSurfaceTitle(
  decision: Record<string, unknown>,
  event: Record<string, unknown>
): string {
  const dt = decision.decision_type as string;
  const domain = (event.event_domain as string) || "system";
  const eventType = (event.event_type as string) || "signal";
  const serviceName = event.service_name as string | null;
  const contextSummary = event.context_summary as Record<string, unknown> | null;
  const contextType = (contextSummary?.context_type as string) || "";

  const targetLabel = serviceName ? ` in ${serviceName}` : "";

  switch (dt) {
    case "escalate":
      return `Escalation: ${contextType.replace(/_/g, " ")}${targetLabel} (${domain}/${eventType})`;
    case "recommend_action": {
      const actionType = (decision.recommended_action_type as string) || "review";
      return `Recommendation: ${actionType.replace(/_/g, " ")}${targetLabel}`;
    }
    case "queue_for_action":
      return `Queued action: ${contextType.replace(/_/g, " ")}${targetLabel} (${domain})`;
    case "mark_for_learning":
      return `Learning candidate: ${contextType.replace(/_/g, " ")}${targetLabel}`;
    case "surface":
      return `Attention: ${contextType.replace(/_/g, " ")}${targetLabel} (${domain})`;
    case "observe":
      return `Monitor: elevated ${eventType.replace(/_/g, " ")}${targetLabel}`;
    default:
      return `Signal: ${eventType}${targetLabel}`;
  }
}

// ═══════════════════════════════════════════════════
// Summary Builder
// ═══════════════════════════════════════════════════

export function buildSurfaceSummary(
  decision: Record<string, unknown>,
  event: Record<string, unknown>
): string {
  const reason = (decision.decision_reason as string) || "";
  const risk = decision.risk_level as string;
  const priority = decision.priority_level as string;
  const confidence = ((decision.decision_confidence as number) || 0).toFixed(2);
  const contextSummary = event.context_summary as Record<string, unknown> | null;
  const possibleCause = contextSummary?.possible_cause as string | null;

  const parts: string[] = [];
  parts.push(reason);
  parts.push(`Risk: ${risk}. Priority: ${priority}. Confidence: ${confidence}.`);
  if (possibleCause) parts.push(`Possible cause: ${possibleCause}.`);

  return parts.join(" ");
}

// ═══════════════════════════════════════════════════
// Core: Surface a single decision
// ═══════════════════════════════════════════════════

export function surfaceDecision(
  decision: Record<string, unknown>,
  event: Record<string, unknown>
): SurfacingResult {
  const { surface, reason } = shouldSurface(decision);

  if (!surface) {
    return {
      surfaced: false,
      surface_type: null,
      title: "",
      summary: "",
      attention_level: "low",
      skip_reason: reason,
    };
  }

  const dt = decision.decision_type as string;
  const surfaceType = determineSurfaceType(dt);
  const attentionLevel = determineAttentionLevel(
    dt,
    decision.risk_level as string,
    decision.priority_level as string
  );
  const title = buildSurfaceTitle(decision, event);
  const summary = buildSurfaceSummary(decision, event);

  return {
    surfaced: true,
    surface_type: surfaceType,
    title,
    summary,
    attention_level: attentionLevel,
    skip_reason: null,
  };
}

// ═══════════════════════════════════════════════════
// State Transitions
// ═══════════════════════════════════════════════════

export async function acknowledgeSurfacedItem(
  sc: SupabaseClient,
  orgId: string,
  itemId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { data: item } = await sc
    .from("nervous_system_surfaced_items")
    .select("id, surface_status")
    .eq("id", itemId)
    .eq("organization_id", orgId)
    .single();

  if (!item) return { success: false, error: "Item not found" };
  if (item.surface_status !== "active") return { success: false, error: `Cannot acknowledge item in status: ${item.surface_status}` };

  const { error } = await sc
    .from("nervous_system_surfaced_items")
    .update({
      surface_status: "acknowledged",
      acknowledged_by: userId,
      acknowledged_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("organization_id", orgId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function approveSurfacedItem(
  sc: SupabaseClient,
  orgId: string,
  itemId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { data: item } = await sc
    .from("nervous_system_surfaced_items")
    .select("id, surface_status")
    .eq("id", itemId)
    .eq("organization_id", orgId)
    .single();

  if (!item) return { success: false, error: "Item not found" };
  if (item.surface_status !== "active" && item.surface_status !== "acknowledged") {
    return { success: false, error: `Cannot approve item in status: ${item.surface_status}` };
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    surface_status: "approved",
    approved_by: userId,
    approved_at: now,
  };
  if (item.surface_status === "active") {
    updates.acknowledged_by = userId;
    updates.acknowledged_at = now;
  }

  const { error } = await sc
    .from("nervous_system_surfaced_items")
    .update(updates)
    .eq("id", itemId)
    .eq("organization_id", orgId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function dismissSurfacedItem(
  sc: SupabaseClient,
  orgId: string,
  itemId: string,
  userId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  if (!reason || reason.trim().length === 0) {
    return { success: false, error: "Dismissal requires a reason" };
  }

  const { data: item } = await sc
    .from("nervous_system_surfaced_items")
    .select("id, surface_status")
    .eq("id", itemId)
    .eq("organization_id", orgId)
    .single();

  if (!item) return { success: false, error: "Item not found" };
  if (item.surface_status === "dismissed" || item.surface_status === "resolved" || item.surface_status === "expired") {
    return { success: false, error: `Cannot dismiss item in status: ${item.surface_status}` };
  }

  const { error } = await sc
    .from("nervous_system_surfaced_items")
    .update({
      surface_status: "dismissed",
      dismissed_by: userId,
      dismissed_at: new Date().toISOString(),
      status_reason: reason.trim(),
    })
    .eq("id", itemId)
    .eq("organization_id", orgId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ═══════════════════════════════════════════════════
// Batch Processing Pipeline
// ═══════════════════════════════════════════════════

export async function processSurfacingBatch(
  sc: SupabaseClient,
  orgId: string,
  batchSize = 50
): Promise<SurfacingProcessingResult> {
  const result: SurfacingProcessingResult = {
    processed: 0,
    surfaced: 0,
    skipped: 0,
    by_type: {},
    errors: 0,
  };

  // Fetch decided events that haven't been surfaced yet
  const { data: events, error: evErr } = await sc
    .from("nervous_system_events")
    .select("*")
    .eq("organization_id", orgId)
    .eq("status", "decided")
    .order("created_at", { ascending: true })
    .limit(Math.min(batchSize, 100));

  if (evErr || !events || events.length === 0) return result;

  for (const event of events) {
    try {
      result.processed++;

      // Fetch associated decision
      const decisionId = event.decision_id;
      if (!decisionId) {
        // No decision linked — skip but mark as surfaced to unblock pipeline
        await sc.from("nervous_system_events")
          .update({ status: "surfaced", surfaced_at: new Date().toISOString() })
          .eq("id", event.id).eq("organization_id", orgId);
        result.skipped++;
        continue;
      }

      const { data: decision } = await sc
        .from("nervous_system_decisions")
        .select("*")
        .eq("id", decisionId)
        .eq("organization_id", orgId)
        .single();

      if (!decision) {
        result.skipped++;
        continue;
      }

      const surfacing = surfaceDecision(decision, event);

      if (!surfacing.surfaced) {
        // Mark event as surfaced even if we don't create an item (lifecycle progression)
        await sc.from("nervous_system_events")
          .update({ status: "surfaced", surfaced_at: new Date().toISOString() })
          .eq("id", event.id).eq("organization_id", orgId);
        result.skipped++;
        continue;
      }

      // Insert surfaced item
      const { data: surfacedRow, error: insertErr } = await sc
        .from("nervous_system_surfaced_items")
        .insert({
          organization_id: orgId,
          event_id: event.id,
          decision_id: decision.id,
          signal_group_id: event.signal_group_id || null,
          surface_type: surfacing.surface_type!,
          surface_status: "active",
          priority_level: decision.priority_level,
          risk_level: decision.risk_level,
          title: surfacing.title,
          summary: surfacing.summary,
          recommended_action_type: decision.recommended_action_type || null,
          recommended_action_payload: decision.recommended_action_payload || {},
          expected_outcome: decision.expected_outcome || {},
          attention_level: surfacing.attention_level,
          surface_metadata: {
            engine_version: SURFACING_ENGINE_VERSION,
            decision_type: decision.decision_type,
            decision_confidence: decision.decision_confidence,
            context_type: (event.context_summary as any)?.context_type || null,
          },
        })
        .select("id")
        .single();

      if (insertErr) {
        console.error(`[NS-05] Failed to insert surfaced item for event ${event.id}:`, insertErr.message);
        result.errors++;
        continue;
      }

      // Update event lifecycle
      await sc.from("nervous_system_events")
        .update({ status: "surfaced", surfaced_at: new Date().toISOString() })
        .eq("id", event.id).eq("organization_id", orgId);

      // Update decision with surfaced_item_id
      await sc.from("nervous_system_decisions")
        .update({ surfaced_item_id: surfacedRow?.id || null })
        .eq("id", decision.id).eq("organization_id", orgId);

      result.surfaced++;
      result.by_type[surfacing.surface_type!] = (result.by_type[surfacing.surface_type!] || 0) + 1;
    } catch (e) {
      console.error(`[NS-05] Error surfacing event:`, e);
      result.errors++;
    }
  }

  // Update live state
  await updateSurfacingLiveState(sc, orgId).catch((e) => {
    console.warn("[NS-05] Live state update failed (non-blocking):", e);
  });

  return result;
}

// ═══════════════════════════════════════════════════
// Live State Update
// ═══════════════════════════════════════════════════

async function updateSurfacingLiveState(
  sc: SupabaseClient,
  orgId: string
): Promise<void> {
  const { data: activeItems } = await sc
    .from("nervous_system_surfaced_items")
    .select("surface_type, surface_status, attention_level, priority_level, risk_level, surfaced_at, title")
    .eq("organization_id", orgId)
    .in("surface_status", ["active", "acknowledged"])
    .order("surfaced_at", { ascending: false })
    .limit(200);

  let escalations = 0;
  let recommendations = 0;
  let pendingApprovals = 0;
  let learningCandidates = 0;
  const byType: Record<string, number> = {};
  const byAttention: Record<string, number> = {};

  const recentFeed: { title: string; type: string; status: string; attention: string; at: string }[] = [];

  for (const item of activeItems || []) {
    byType[item.surface_type] = (byType[item.surface_type] || 0) + 1;
    byAttention[item.attention_level] = (byAttention[item.attention_level] || 0) + 1;

    if (item.surface_type === "escalation_surface") escalations++;
    if (item.surface_type === "recommendation_surface" || item.surface_type === "queue_surface") recommendations++;
    if (item.surface_type === "learning_surface") learningCandidates++;
    if (item.surface_status === "active") pendingApprovals++;

    if (recentFeed.length < 10) {
      recentFeed.push({
        title: item.title,
        type: item.surface_type,
        status: item.surface_status,
        attention: item.attention_level,
        at: item.surfaced_at,
      });
    }
  }

  await sc
    .from("nervous_system_live_state")
    .upsert(
      {
        state_key: "surfaced_summary",
        organization_id: orgId,
        updated_at: new Date().toISOString(),
        state_value: {
          active_surfaced_count: activeItems?.length || 0,
          active_escalations: escalations,
          active_recommendations: recommendations,
          pending_approvals: pendingApprovals,
          learning_candidates: learningCandidates,
          by_type: byType,
          by_attention: byAttention,
          recent_surfaced_feed: recentFeed,
          last_updated: new Date().toISOString(),
        },
      },
      { onConflict: "organization_id,state_key" }
    );
}
