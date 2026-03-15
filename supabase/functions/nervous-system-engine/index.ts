import { handleCors, errorResponse } from "../_shared/cors.ts";
import { authenticate } from "../_shared/auth.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { logSecurityAudit, resolveAndValidateOrg } from "../_shared/security-audit.ts";
import { emitNervousSystemEvent } from "../_shared/nervous-system.ts";

/**
 * Nervous System Engine — NS-01
 *
 * Actions:
 *   emit_event    — record a new nervous system signal
 *   list_events   — query recent events
 *   get_pulse     — get live system pulse
 *   list_patterns — get known patterns
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const READ_ACTIONS = new Set(["list_events", "get_pulse", "list_patterns"]);
const WRITE_ACTIONS = new Set(["emit_event"]);

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const authResult = await authenticate(req);
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient: sc } = authResult;

    const body = await req.json();
    const { action, organization_id: payloadOrgId, ...params } = body;

    // Granular rate limiting
    const rateScope = READ_ACTIONS.has(action)
      ? "nervous-system-engine-read"
      : WRITE_ACTIONS.has(action)
        ? "nervous-system-engine-write"
        : "nervous-system-engine";
    const { allowed } = await checkRateLimit(user.id, rateScope);
    if (!allowed) {
      return errorResponse("Limite de requisições excedido. Tente novamente em breve.", 429, req);
    }

    const { orgId, error: orgError } = await resolveAndValidateOrg(sc, user.id, payloadOrgId);
    if (orgError || !orgId) return errorResponse(orgError || "Organization access denied", 403, req);

    await logSecurityAudit(sc, {
      organization_id: orgId,
      actor_id: user.id,
      function_name: "nervous-system-engine",
      action: action || "unknown",
    });

    switch (action) {
      case "emit_event":
        return await handleEmitEvent(sc, orgId, params);
      case "list_events":
        return await handleListEvents(sc, orgId, params);
      case "get_pulse":
        return await handleGetPulse(sc, orgId);
      case "list_patterns":
        return await handleListPatterns(sc, orgId, params);
      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e: any) {
    return json({ error: e.message }, 500);
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

async function handleEmitEvent(sc: any, orgId: string, params: any) {
  const {
    source_type, source_id, event_type, event_domain,
    event_subdomain, initiative_id, pipeline_id, agent_id,
    service_name, severity, summary, payload, metadata,
  } = params;

  if (!source_type || !event_type || !event_domain || !summary) {
    return json({ error: "Missing required fields: source_type, event_type, event_domain, summary" }, 400);
  }

  const result = await emitNervousSystemEvent(sc, {
    organization_id: orgId,
    source_type,
    source_id,
    event_type,
    event_domain,
    event_subdomain,
    initiative_id,
    pipeline_id,
    agent_id,
    service_name,
    severity,
    summary,
    payload,
    metadata,
  });

  if (!result) {
    return json({ error: "Failed to emit event" }, 500);
  }

  return json({ success: true, event_id: result.id });
}

async function handleListEvents(sc: any, orgId: string, params: any) {
  const {
    limit = 50,
    domain,
    severity,
    status,
    event_type,
    since,
  } = params;

  let query = sc
    .from("nervous_system_events")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(Math.min(limit, 200));

  if (domain) query = query.eq("event_domain", domain);
  if (severity) query = query.eq("severity", severity);
  if (status) query = query.eq("status", status);
  if (event_type) query = query.eq("event_type", event_type);
  if (since) query = query.gte("created_at", since);

  const { data, error } = await query;
  if (error) return json({ error: error.message }, 500);

  return json({ events: data || [], count: data?.length || 0 });
}

async function handleGetPulse(sc: any, orgId: string) {
  // Get live state
  const { data: pulse } = await sc
    .from("nervous_system_live_state")
    .select("*")
    .eq("organization_id", orgId)
    .eq("state_key", "system_pulse")
    .single();

  // Get recent event counts by domain
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recentEvents } = await sc
    .from("nervous_system_events")
    .select("event_domain, severity, status")
    .eq("organization_id", orgId)
    .gte("created_at", oneHourAgo);

  const domainCounts: Record<string, number> = {};
  const severityCounts: Record<string, number> = {};
  for (const e of recentEvents || []) {
    domainCounts[e.event_domain] = (domainCounts[e.event_domain] || 0) + 1;
    severityCounts[e.severity] = (severityCounts[e.severity] || 0) + 1;
  }

  return json({
    pulse: pulse?.state_value || null,
    events_last_hour: {
      total: recentEvents?.length || 0,
      by_domain: domainCounts,
      by_severity: severityCounts,
    },
    updated_at: pulse?.updated_at || null,
  });
}

async function handleListPatterns(sc: any, orgId: string, params: any) {
  const { limit = 50, domain } = params;

  let query = sc
    .from("nervous_system_event_patterns")
    .select("*")
    .eq("organization_id", orgId)
    .order("occurrence_count", { ascending: false })
    .limit(Math.min(limit, 100));

  if (domain) query = query.eq("domain", domain);

  const { data, error } = await query;
  if (error) return json({ error: error.message }, 500);

  return json({ patterns: data || [] });
}
