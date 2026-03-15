/**
 * AI Nervous System — Shared Emit Utility (NS-01: Signal Foundation)
 *
 * ARCHITECTURE NOTES:
 * - This utility is the ONLY sanctioned entry point for writing nervous system events.
 * - It must be called from trusted backend paths (edge functions, workers) using a service-role client.
 * - The frontend NEVER writes directly to nervous_system_events.
 * - Fingerprinting is included now for future dedup workers (NS-02).
 * - Status lifecycle exists now even though only "new" is used in NS-01.
 * - Payload and metadata are typed — not untyped junk drawers.
 *
 * EVOLUTION PATH:
 * - NS-02: Worker-based classification will consume "new" events and transition to "classified".
 * - NS-03: Context engine will correlate with Canon Graph Memory.
 * - NS-04: Decision layer will produce decisions from contextualized events.
 * - NS-06: Learning feedback will close the loop.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════
// Allowed Enums (backend-enforced, not just frontend types)
// ═══════════════════════════════════════════════════

const VALID_DOMAINS = new Set([
  "runtime", "pipeline", "agent", "governance",
  "cost", "adoption", "deployment", "security", "learning",
]);

const VALID_SEVERITIES = new Set(["low", "medium", "high", "critical"]);

const VALID_SOURCE_TYPES = new Set([
  "edge_function", "pipeline_worker", "agent",
  "governance_engine", "canon_system", "api_gateway",
  "scheduler", "manual",
]);

const VALID_STATUSES = new Set([
  "new", "classified", "contextualized", "decided",
  "surfaced", "resolved", "archived",
]);

// ═══════════════════════════════════════════════════
// Input contract
// ═══════════════════════════════════════════════════

export interface EmitEventParams {
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
  occurred_at?: string; // ISO timestamp; defaults to now()
}

export interface EmitEventResult {
  id: string;
  fingerprint: string;
  deduplicated: boolean;
}

// ═══════════════════════════════════════════════════
// Validation
// ═══════════════════════════════════════════════════

function validateEmitParams(params: EmitEventParams): string | null {
  if (!params.organization_id) return "organization_id is required";
  if (!params.source_type) return "source_type is required";
  if (!params.event_type) return "event_type is required";
  if (!params.event_domain) return "event_domain is required";
  if (!params.summary || params.summary.trim().length === 0) return "summary is required";

  if (!VALID_SOURCE_TYPES.has(params.source_type)) {
    return `Invalid source_type: ${params.source_type}`;
  }
  if (!VALID_DOMAINS.has(params.event_domain)) {
    return `Invalid event_domain: ${params.event_domain}`;
  }
  if (params.severity && !VALID_SEVERITIES.has(params.severity)) {
    return `Invalid severity: ${params.severity}`;
  }

  // Guard against payload abuse — reject excessively large payloads
  const payloadStr = JSON.stringify(params.payload || {});
  if (payloadStr.length > 32_768) {
    return "payload exceeds maximum size (32KB)";
  }
  const metaStr = JSON.stringify(params.metadata || {});
  if (metaStr.length > 8_192) {
    return "metadata exceeds maximum size (8KB)";
  }

  return null;
}

// ═══════════════════════════════════════════════════
// Fingerprinting (deterministic, for dedup)
// ═══════════════════════════════════════════════════

function generateFingerprint(params: EmitEventParams): string {
  // Fingerprint captures the semantic identity of the signal,
  // not the specific instance. Two identical signals within a
  // dedup window should produce the same fingerprint.
  const raw = [
    params.organization_id,
    params.source_type,
    params.source_id || "_",
    params.event_type,
    params.event_domain,
    params.event_subdomain || "_",
    params.service_name || "_",
    params.agent_id || "_",
  ].join("|");

  // djb2 hash — fast, deterministic, no crypto dependency needed
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash) + raw.charCodeAt(i);
    hash = hash & 0x7fffffff; // keep positive 31-bit
  }
  return `ns_${hash.toString(36)}`;
}

// ═══════════════════════════════════════════════════
// Severity scoring
// ═══════════════════════════════════════════════════

const SEVERITY_SCORES: Record<string, number> = {
  low: 0.25,
  medium: 0.50,
  high: 0.75,
  critical: 1.00,
};

// ═══════════════════════════════════════════════════
// Core emission
// ═══════════════════════════════════════════════════

/**
 * Emit a nervous system event.
 *
 * MUST be called with a service-role client (sc).
 * This bypasses RLS intentionally — the function validates
 * organization_id ownership before calling this.
 *
 * @param sc - Service-role Supabase client
 * @param params - Validated event parameters
 * @returns EmitEventResult or null on failure
 */
export async function emitNervousSystemEvent(
  sc: SupabaseClient,
  params: EmitEventParams
): Promise<EmitEventResult | null> {
  // 1. Validate input
  const validationError = validateEmitParams(params);
  if (validationError) {
    console.error(`[NervousSystem] Validation failed: ${validationError}`);
    return null;
  }

  const severity = params.severity || "low";
  const fingerprint = generateFingerprint(params);
  const severityScore = SEVERITY_SCORES[severity] ?? 0.25;

  // 2. Check for recent duplicate (same fingerprint in last 5 minutes)
  let dedupGroup: string | null = null;
  let isDuplicate = false;

  try {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: existing } = await sc
      .from("nervous_system_events")
      .select("id, dedup_group")
      .eq("organization_id", params.organization_id)
      .eq("fingerprint", fingerprint)
      .gte("created_at", fiveMinAgo)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      dedupGroup = existing[0].dedup_group || existing[0].id;
      isDuplicate = true;
    }
  } catch (e) {
    // Dedup check failure is non-fatal — proceed with insert
    console.warn("[NervousSystem] Dedup check failed, proceeding:", e);
  }

  // 3. Insert event
  const { data: event, error } = await sc
    .from("nervous_system_events")
    .insert({
      organization_id: params.organization_id,
      occurred_at: params.occurred_at || new Date().toISOString(),
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
      novelty_score: isDuplicate ? 0.1 : 0.8,
      confidence_score: 0.5, // Placeholder — refined by classifier worker in NS-02
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

  // 4. Update live pulse (non-blocking, fire-and-forget)
  updateLivePulse(sc, params.organization_id).catch((e) => {
    console.warn("[NervousSystem] Pulse update failed (non-blocking):", e);
  });

  return {
    id: event.id,
    fingerprint,
    deduplicated: isDuplicate,
  };
}

// ═══════════════════════════════════════════════════
// Live pulse (materialized state for UI)
// ═══════════════════════════════════════════════════

/**
 * Update the system_pulse entry in nervous_system_live_state.
 * This provides a pre-aggregated view for the UI to consume
 * without querying the full events table.
 *
 * EVOLUTION: In later sprints, a dedicated worker will manage
 * live state more efficiently. For NS-01, this inline update
 * is acceptable given low event volume.
 */
async function updateLivePulse(
  sc: SupabaseClient,
  organizationId: string
): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: recentEvents } = await sc
    .from("nervous_system_events")
    .select("severity, status")
    .eq("organization_id", organizationId)
    .gte("created_at", oneHourAgo)
    .limit(500); // Cap to prevent runaway queries

  const events = recentEvents || [];
  const counts = {
    total: events.length,
    critical: events.filter(e => e.severity === "critical").length,
    high: events.filter(e => e.severity === "high").length,
    medium: events.filter(e => e.severity === "medium").length,
    low: events.filter(e => e.severity === "low").length,
    new_count: events.filter(e => e.status === "new").length,
  };

  const healthStatus = counts.critical > 0
    ? "critical"
    : counts.high > 2
      ? "degraded"
      : "healthy";

  await sc
    .from("nervous_system_live_state")
    .upsert(
      {
        state_key: "system_pulse",
        organization_id: organizationId,
        updated_at: new Date().toISOString(),
        state_value: {
          events_last_hour: counts,
          health_status: healthStatus,
          last_updated: new Date().toISOString(),
        },
      },
      { onConflict: "organization_id,state_key" }
    );
}

// ═══════════════════════════════════════════════════
// Safe wrapper (for use inside other edge functions)
// ═══════════════════════════════════════════════════

/**
 * Convenience wrapper that swallows errors.
 * Use when emitting a signal from a function where the signal
 * is secondary to the main operation and must not disrupt it.
 */
export async function emitNsEventSafe(
  sc: SupabaseClient,
  params: EmitEventParams
): Promise<void> {
  try {
    await emitNervousSystemEvent(sc, params);
  } catch {
    // Never fail the caller — signal emission is best-effort
  }
}
