/**
 * AI Nervous System — Shared Emit Utility
 *
 * Used by edge functions and workers to emit nervous system events.
 * Handles fingerprinting, deduplication, and live state updates.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHash } from "https://deno.land/std@0.208.0/crypto/mod.ts";

interface EmitEventParams {
  organization_id: string;
  source_type: string;
  source_id?: string;
  event_type: string;
  event_domain: string;
  event_subdomain?: string;
  initiative_id?: string;
  pipeline_id?: string;
  agent_id?: string;
  service_name?: string;
  severity?: string;
  summary: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Generate a fingerprint for deduplication.
 * Events with the same fingerprint within a time window are grouped.
 */
function generateFingerprint(params: EmitEventParams): string {
  const raw = [
    params.organization_id,
    params.source_type,
    params.event_type,
    params.event_domain,
    params.service_name || "",
    params.agent_id || "",
  ].join("|");

  // Simple hash using built-in
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `ns_${Math.abs(hash).toString(36)}`;
}

/**
 * Calculate initial severity score based on severity level.
 */
function severityToScore(severity: string): number {
  const map: Record<string, number> = {
    low: 0.25,
    medium: 0.50,
    high: 0.75,
    critical: 1.00,
  };
  return map[severity] || 0.25;
}

/**
 * Emit a nervous system event.
 *
 * This is the primary entry point for all system components
 * to report signals to the AI Nervous System.
 *
 * @param sc - Service client (with elevated privileges)
 * @param params - Event parameters
 * @returns The created event record, or null on error
 */
export async function emitNervousSystemEvent(
  sc: SupabaseClient,
  params: EmitEventParams
): Promise<{ id: string } | null> {
  const severity = params.severity || "low";
  const fingerprint = generateFingerprint(params);
  const severityScore = severityToScore(severity);

  // Check for recent duplicate (same fingerprint in last 5 minutes)
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: existing } = await sc
    .from("nervous_system_events")
    .select("id, dedup_group")
    .eq("organization_id", params.organization_id)
    .eq("fingerprint", fingerprint)
    .gte("created_at", fiveMinAgo)
    .order("created_at", { ascending: false })
    .limit(1);

  let dedupGroup: string | null = null;
  if (existing && existing.length > 0) {
    // Group with existing event
    dedupGroup = existing[0].dedup_group || existing[0].id;

    // Update occurrence count in pattern if exists
    await sc
      .from("nervous_system_event_patterns")
      .update({
        occurrence_count: sc.rpc ? undefined : undefined, // Will be handled by pattern worker
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", params.organization_id)
      .eq("pattern_key", `${params.event_type}_${params.event_domain}`);
  }

  // Insert the event
  const { data: event, error } = await sc
    .from("nervous_system_events")
    .insert({
      organization_id: params.organization_id,
      source_type: params.source_type,
      source_id: params.source_id || null,
      event_type: params.event_type,
      event_domain: params.event_domain,
      event_subdomain: params.event_subdomain || null,
      initiative_id: params.initiative_id || null,
      pipeline_id: params.pipeline_id || null,
      agent_id: params.agent_id || null,
      service_name: params.service_name || null,
      severity,
      severity_score: severityScore,
      novelty_score: dedupGroup ? 0.1 : 0.8, // Low novelty if duplicate
      confidence_score: 0.5, // Default, refined by classifier later
      fingerprint,
      dedup_group: dedupGroup,
      summary: params.summary,
      payload: params.payload || {},
      metadata: params.metadata || {},
      status: "new",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[NervousSystem] Failed to emit event:", error.message);
    return null;
  }

  // Update live state pulse (lightweight upsert)
  await updateLivePulse(sc, params.organization_id);

  return event;
}

/**
 * Update the system_pulse live state entry.
 * This is consumed by the UI for real-time health indicators.
 */
async function updateLivePulse(
  sc: SupabaseClient,
  organizationId: string
): Promise<void> {
  try {
    // Count recent events by severity
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentEvents } = await sc
      .from("nervous_system_events")
      .select("severity, status")
      .eq("organization_id", organizationId)
      .gte("created_at", oneHourAgo);

    const counts = {
      total: recentEvents?.length || 0,
      critical: recentEvents?.filter(e => e.severity === "critical").length || 0,
      high: recentEvents?.filter(e => e.severity === "high").length || 0,
      medium: recentEvents?.filter(e => e.severity === "medium").length || 0,
      low: recentEvents?.filter(e => e.severity === "low").length || 0,
      new_count: recentEvents?.filter(e => e.status === "new").length || 0,
    };

    await sc
      .from("nervous_system_live_state")
      .upsert({
        state_key: "system_pulse",
        organization_id: organizationId,
        updated_at: new Date().toISOString(),
        state_value: {
          events_last_hour: counts,
          last_updated: new Date().toISOString(),
          health_status: counts.critical > 0
            ? "critical"
            : counts.high > 2
              ? "degraded"
              : "healthy",
        },
      }, { onConflict: "organization_id,state_key" });
  } catch (e) {
    console.error("[NervousSystem] Failed to update pulse:", e);
  }
}

/**
 * Convenience: emit from within an edge function handler.
 * Swallows errors silently to avoid disrupting main flow.
 */
export async function emitNsEventSafe(
  sc: SupabaseClient,
  params: EmitEventParams
): Promise<void> {
  try {
    await emitNervousSystemEvent(sc, params);
  } catch {
    // Never fail the caller
  }
}
