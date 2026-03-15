/**
 * Nervous System Engine — NS-01 + NS-02 + NS-03 + NS-04
 *
 * Actions:
 *   READ:  list_events, get_pulse, list_patterns, list_signal_groups,
 *          get_classified_feed, get_contextual_feed, get_decision_feed, list_decisions
 *   WRITE: emit_event, process_pending, process_context_batch, process_decision_batch
 */

import { handleCors, errorResponse } from "../_shared/cors.ts";
import { authenticate } from "../_shared/auth.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { logSecurityAudit, resolveAndValidateOrg } from "../_shared/security-audit.ts";
import { emitNervousSystemEvent } from "../_shared/nervous-system.ts";
import { processPendingEvents } from "../_shared/nervous-system-classifier.ts";
import { processContextualization } from "../_shared/nervous-system-context-engine.ts";
import { processDecisionBatch } from "../_shared/nervous-system-decision-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const READ_ACTIONS = new Set([
  "list_events", "get_pulse", "list_patterns",
  "list_signal_groups", "get_classified_feed", "get_contextual_feed",
  "get_decision_feed", "list_decisions",
]);
const WRITE_ACTIONS = new Set([
  "emit_event", "process_pending", "process_context_batch", "process_decision_batch",
]);
const ALL_ACTIONS = new Set([...READ_ACTIONS, ...WRITE_ACTIONS]);

const MAX_LIST_LIMIT = 200;
const DEFAULT_LIST_LIMIT = 50;

const VALID_DOMAINS = new Set([
  "runtime", "pipeline", "agent", "governance",
  "cost", "adoption", "deployment", "security", "learning",
]);
const VALID_SEVERITIES = new Set(["low", "medium", "high", "critical"]);
const VALID_STATUSES = new Set([
  "new", "classified", "contextualized", "decided",
  "surfaced", "resolved", "archived",
]);
const VALID_DECISION_TYPES = new Set([
  "observe", "surface", "recommend_action", "escalate", "queue_for_action", "mark_for_learning",
]);
const VALID_PRIORITY_LEVELS = new Set(["low", "medium", "high", "urgent"]);

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const authResult = await authenticate(req);
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient: sc } = authResult;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const action = body.action as string;
    const payloadOrgId = body.organization_id as string | undefined;

    if (!action || !ALL_ACTIONS.has(action)) {
      return json({ error: `Unknown or missing action. Valid: ${[...ALL_ACTIONS].join(", ")}` }, 400);
    }

    const rateScope = READ_ACTIONS.has(action)
      ? "nervous-system-engine-read"
      : "nervous-system-engine-write";
    const { allowed } = await checkRateLimit(user.id, rateScope);
    if (!allowed) {
      return json({ error: "Limite de requisições excedido.", retry_after_seconds: 60 }, 429);
    }

    const { orgId, error: orgError } = await resolveAndValidateOrg(sc, user.id, payloadOrgId);
    if (orgError || !orgId) return errorResponse(orgError || "Organization access denied", 403, req);

    await logSecurityAudit(sc, {
      organization_id: orgId,
      actor_id: user.id,
      function_name: "nervous-system-engine",
      action,
    });

    switch (action) {
      case "emit_event":
        return await handleEmitEvent(sc, orgId, body);
      case "process_pending":
        return await handleProcessPending(sc, orgId, body);
      case "process_context_batch":
        return await handleProcessContextBatch(sc, orgId, body);
      case "process_decision_batch":
        return await handleProcessDecisionBatch(sc, orgId, body);
      case "list_events":
        return await handleListEvents(sc, orgId, body);
      case "get_pulse":
        return await handleGetPulse(sc, orgId);
      case "list_patterns":
        return await handleListPatterns(sc, orgId, body);
      case "list_signal_groups":
        return await handleListSignalGroups(sc, orgId, body);
      case "get_classified_feed":
        return await handleGetClassifiedFeed(sc, orgId, body);
      case "get_contextual_feed":
        return await handleGetContextualFeed(sc, orgId, body);
      case "get_decision_feed":
        return await handleGetDecisionFeed(sc, orgId, body);
      case "list_decisions":
        return await handleListDecisions(sc, orgId, body);
      default:
        return json({ error: `Unhandled action: ${action}` }, 400);
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    console.error("[NervousSystemEngine] Unhandled error:", message);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ═══════════════════════════════════════════════════
// HANDLERS
// ═══════════════════════════════════════════════════

async function handleEmitEvent(sc: any, orgId: string, body: Record<string, unknown>) {
  const sourceType = body.source_type as string;
  const eventType = body.event_type as string;
  const eventDomain = body.event_domain as string;
  const summary = body.summary as string;

  if (!sourceType || !eventType || !eventDomain || !summary) {
    return json({ error: "Missing required fields: source_type, event_type, event_domain, summary" }, 400);
  }
  if (!VALID_DOMAINS.has(eventDomain)) return json({ error: `Invalid event_domain: ${eventDomain}` }, 400);
  const severity = body.severity as string | undefined;
  if (severity && !VALID_SEVERITIES.has(severity)) return json({ error: `Invalid severity: ${severity}` }, 400);

  const result = await emitNervousSystemEvent(sc, {
    organization_id: orgId,
    source_type: sourceType,
    source_id: (body.source_id as string) || undefined,
    event_type: eventType,
    event_domain: eventDomain,
    event_subdomain: (body.event_subdomain as string) || undefined,
    initiative_id: (body.initiative_id as string) || undefined,
    pipeline_id: (body.pipeline_id as string) || undefined,
    agent_id: (body.agent_id as string) || undefined,
    service_name: (body.service_name as string) || undefined,
    severity,
    summary,
    payload: (body.payload as Record<string, unknown>) || {},
    metadata: (body.metadata as Record<string, unknown>) || {},
    occurred_at: (body.occurred_at as string) || undefined,
  });

  if (!result) return json({ error: "Failed to emit event" }, 500);
  return json({ success: true, event_id: result.id, fingerprint: result.fingerprint, deduplicated: result.deduplicated });
}

async function handleProcessPending(sc: any, orgId: string, body: Record<string, unknown>) {
  const batchSize = Math.min(Number(body.batch_size) || 50, 100);
  const result = await processPendingEvents(sc, orgId, batchSize);
  return json({ success: true, result });
}

async function handleProcessContextBatch(sc: any, orgId: string, body: Record<string, unknown>) {
  const batchSize = Math.min(Number(body.batch_size) || 50, 100);
  const result = await processContextualization(sc, orgId, batchSize);
  return json({ success: true, result });
}

async function handleProcessDecisionBatch(sc: any, orgId: string, body: Record<string, unknown>) {
  const batchSize = Math.min(Number(body.batch_size) || 50, 100);
  const result = await processDecisionBatch(sc, orgId, batchSize);
  return json({ success: true, result });
}

async function handleListEvents(sc: any, orgId: string, body: Record<string, unknown>) {
  const limit = Math.min(Math.max(1, Number(body.limit) || DEFAULT_LIST_LIMIT), MAX_LIST_LIMIT);
  const domain = body.domain as string | undefined;
  const severity = body.severity as string | undefined;
  const status = body.status as string | undefined;
  const eventType = body.event_type as string | undefined;
  const since = body.since as string | undefined;

  if (domain && !VALID_DOMAINS.has(domain)) return json({ error: `Invalid domain: ${domain}` }, 400);
  if (severity && !VALID_SEVERITIES.has(severity)) return json({ error: `Invalid severity: ${severity}` }, 400);
  if (status && !VALID_STATUSES.has(status)) return json({ error: `Invalid status: ${status}` }, 400);

  let query = sc
    .from("nervous_system_events")
    .select("id, created_at, occurred_at, source_type, source_id, event_type, event_domain, event_subdomain, severity, severity_score, novelty_score, confidence_score, fingerprint, dedup_group, signal_group_id, summary, payload, metadata, classification_metadata, status, classified_at, contextualized_at, surfaced_at, decided_at, decision_id, context_summary, context_confidence, related_event_ids, related_signal_group_ids, initiative_id, service_name")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (domain) query = query.eq("event_domain", domain);
  if (severity) query = query.eq("severity", severity);
  if (status) query = query.eq("status", status);
  if (eventType) query = query.eq("event_type", eventType);
  if (since) query = query.gte("created_at", since);

  const { data, error } = await query;
  if (error) return json({ error: error.message }, 500);
  return json({ events: data || [], count: data?.length || 0 });
}

async function handleGetPulse(sc: any, orgId: string) {
  const { data: liveStates } = await sc
    .from("nervous_system_live_state")
    .select("state_key, state_value, updated_at")
    .eq("organization_id", orgId)
    .in("state_key", ["system_pulse", "classified_summary", "contextualized_summary", "decision_summary"]);

  const find = (key: string) => liveStates?.find((s: any) => s.state_key === key);

  return json({
    pulse: find("system_pulse")?.state_value || null,
    classified_summary: find("classified_summary")?.state_value || null,
    contextualized_summary: find("contextualized_summary")?.state_value || null,
    decision_summary: find("decision_summary")?.state_value || null,
    updated_at: find("system_pulse")?.updated_at || find("decision_summary")?.updated_at || null,
  });
}

async function handleListPatterns(sc: any, orgId: string, body: Record<string, unknown>) {
  const limit = Math.min(Math.max(1, Number(body.limit) || DEFAULT_LIST_LIMIT), 100);
  const domain = body.domain as string | undefined;
  if (domain && !VALID_DOMAINS.has(domain)) return json({ error: `Invalid domain: ${domain}` }, 400);

  let query = sc
    .from("nervous_system_event_patterns")
    .select("id, created_at, updated_at, pattern_key, title, domain, subdomain, description, occurrence_count, successful_resolution_count, confidence_score, canon_reference_id")
    .eq("organization_id", orgId)
    .order("occurrence_count", { ascending: false })
    .limit(limit);
  if (domain) query = query.eq("domain", domain);

  const { data, error } = await query;
  if (error) return json({ error: error.message }, 500);
  return json({ patterns: data || [] });
}

async function handleListSignalGroups(sc: any, orgId: string, body: Record<string, unknown>) {
  const limit = Math.min(Math.max(1, Number(body.limit) || DEFAULT_LIST_LIMIT), MAX_LIST_LIMIT);
  const domain = body.domain as string | undefined;
  const severity = body.severity as string | undefined;
  const status = (body.status as string) || "active";

  if (domain && !VALID_DOMAINS.has(domain)) return json({ error: `Invalid domain: ${domain}` }, 400);
  if (severity && !VALID_SEVERITIES.has(severity)) return json({ error: `Invalid severity: ${severity}` }, 400);

  let query = sc
    .from("nervous_system_signal_groups")
    .select("id, created_at, updated_at, fingerprint, group_key, title, event_domain, event_subdomain, event_type, severity, severity_score, event_count, first_seen_at, last_seen_at, representative_event_id, novelty_score, confidence_score, recurrence_score, status, source_type, service_name, summary")
    .eq("organization_id", orgId)
    .eq("status", status)
    .order("last_seen_at", { ascending: false })
    .limit(limit);
  if (domain) query = query.eq("event_domain", domain);
  if (severity) query = query.eq("severity", severity);

  const { data, error } = await query;
  if (error) return json({ error: error.message }, 500);
  return json({ groups: data || [], count: data?.length || 0 });
}

async function handleGetClassifiedFeed(sc: any, orgId: string, body: Record<string, unknown>) {
  const limit = Math.min(Math.max(1, Number(body.limit) || 20), 50);
  const domain = body.domain as string | undefined;
  const minSeverity = body.min_severity as string | undefined;
  if (domain && !VALID_DOMAINS.has(domain)) return json({ error: `Invalid domain: ${domain}` }, 400);

  let query = sc
    .from("nervous_system_events")
    .select("id, created_at, occurred_at, event_type, event_domain, event_subdomain, severity, severity_score, novelty_score, confidence_score, signal_group_id, summary, classification_metadata, status, classified_at, service_name, source_type")
    .eq("organization_id", orgId)
    .in("status", ["classified", "contextualized", "decided", "surfaced"])
    .order("classified_at", { ascending: false })
    .limit(limit);
  if (domain) query = query.eq("event_domain", domain);
  if (minSeverity && VALID_SEVERITIES.has(minSeverity)) {
    const minScore = { low: 0.25, medium: 0.50, high: 0.75, critical: 1.00 }[minSeverity] || 0;
    query = query.gte("severity_score", minScore);
  }

  const { data, error } = await query;
  if (error) return json({ error: error.message }, 500);
  return json({ feed: data || [], count: data?.length || 0 });
}

async function handleGetContextualFeed(sc: any, orgId: string, body: Record<string, unknown>) {
  const limit = Math.min(Math.max(1, Number(body.limit) || 20), 50);
  const domain = body.domain as string | undefined;
  const attention = body.attention as string | undefined;
  if (domain && !VALID_DOMAINS.has(domain)) return json({ error: `Invalid domain: ${domain}` }, 400);

  let query = sc
    .from("nervous_system_events")
    .select("id, created_at, occurred_at, event_type, event_domain, event_subdomain, severity, severity_score, novelty_score, confidence_score, signal_group_id, summary, classification_metadata, status, classified_at, contextualized_at, context_summary, context_confidence, related_event_ids, related_signal_group_ids, service_name, source_type, agent_id, initiative_id")
    .eq("organization_id", orgId)
    .in("status", ["contextualized", "decided", "surfaced"])
    .order("contextualized_at", { ascending: false })
    .limit(limit);
  if (domain) query = query.eq("event_domain", domain);

  const { data, error } = await query;
  if (error) return json({ error: error.message }, 500);

  let feed = data || [];
  if (attention) {
    feed = feed.filter((e: any) => e.context_summary?.recommended_attention === attention);
  }
  return json({ feed, count: feed.length });
}

/**
 * NS-04: Get decision feed — recent decisions with priority/type filters.
 */
async function handleGetDecisionFeed(sc: any, orgId: string, body: Record<string, unknown>) {
  const limit = Math.min(Math.max(1, Number(body.limit) || 20), 50);
  const decisionType = body.decision_type as string | undefined;
  const priority = body.priority as string | undefined;
  const riskLevel = body.risk_level as string | undefined;

  if (decisionType && !VALID_DECISION_TYPES.has(decisionType)) return json({ error: `Invalid decision_type` }, 400);
  if (priority && !VALID_PRIORITY_LEVELS.has(priority)) return json({ error: `Invalid priority` }, 400);

  let query = sc
    .from("nervous_system_decisions")
    .select("id, organization_id, event_id, signal_group_id, decision_type, decision_reason, decision_confidence, risk_level, priority_level, recommended_action_type, recommended_action_payload, expected_outcome, decision_metadata, created_at, decided_at, status")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .order("decided_at", { ascending: false })
    .limit(limit);

  if (decisionType) query = query.eq("decision_type", decisionType);
  if (priority) query = query.eq("priority_level", priority);
  if (riskLevel) query = query.eq("risk_level", riskLevel);

  const { data, error } = await query;
  if (error) return json({ error: error.message }, 500);
  return json({ decisions: data || [], count: data?.length || 0 });
}

/**
 * NS-04: List all decisions with flexible filters.
 */
async function handleListDecisions(sc: any, orgId: string, body: Record<string, unknown>) {
  const limit = Math.min(Math.max(1, Number(body.limit) || DEFAULT_LIST_LIMIT), MAX_LIST_LIMIT);
  const status = (body.status as string) || "active";
  const decisionType = body.decision_type as string | undefined;

  let query = sc
    .from("nervous_system_decisions")
    .select("id, event_id, signal_group_id, decision_type, decision_reason, decision_confidence, risk_level, priority_level, recommended_action_type, expected_outcome, decided_at, status")
    .eq("organization_id", orgId)
    .eq("status", status)
    .order("decided_at", { ascending: false })
    .limit(limit);

  if (decisionType && VALID_DECISION_TYPES.has(decisionType)) {
    query = query.eq("decision_type", decisionType);
  }

  const { data, error } = await query;
  if (error) return json({ error: error.message }, 500);
  return json({ decisions: data || [], count: data?.length || 0 });
}
