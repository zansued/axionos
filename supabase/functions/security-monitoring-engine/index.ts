import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { logSecurityAudit, resolveAndValidateOrg } from "../_shared/security-audit.ts";
import {
  validateSchema, validationErrorResponse, logValidationFailure,
  COMMON_ACTIONS, COMMON_FIELDS,
  type Schema,
} from "../_shared/input-validation.ts";

// ─── Anomaly Detection Thresholds ───

const THRESHOLDS = {
  auth_failures_per_hour: 10,
  validation_failures_per_hour: 15,
  quarantined_candidates_per_day: 5,
  promotion_blocks_per_day: 3,
  acquisition_failures_per_hour: 8,
  confidence_swing_threshold: 0.3,
};

const ALERT_TYPES = [
  "auth_abuse", "input_abuse", "canon_poisoning", "acquisition_anomaly",
  "confidence_anomaly", "promotion_anomaly", "cross_signal_correlation",
] as const;

const ALERT_SEVERITIES = ["critical", "high", "medium", "low"] as const;
const ALERT_STATUSES = ["open", "acknowledged", "investigating", "contained", "resolved", "dismissed"] as const;

const SIGNAL_CATEGORIES = [
  "auth", "validation", "poisoning", "acquisition", "runtime", "promotion", "trust",
] as const;

// ─── Input Schemas ───

const MONITORING_ACTIONS = [
  "overview", "list_alerts", "list_signals", "run_scan",
  "acknowledge_alert", "resolve_alert", "dismiss_alert",
  "ingest_signal", "correlate_alerts",
] as const;

const BASE_SCHEMA: Schema = {
  action: { type: "string", required: true, enum: MONITORING_ACTIONS as unknown as string[] },
  organization_id: COMMON_FIELDS.organization_id,
};

const ALERT_ID_SCHEMA: Schema = {
  ...BASE_SCHEMA,
  alert_id: COMMON_FIELDS.uuid,
  notes: { type: "string", required: false, maxLength: 2000 },
};

const SIGNAL_SCHEMA: Schema = {
  ...BASE_SCHEMA,
  signal_type: { type: "string", required: true, maxLength: 200 },
  signal_category: { type: "string", required: true, enum: SIGNAL_CATEGORIES as unknown as string[] },
  severity: COMMON_FIELDS.severity,
  source_function: { type: "string", required: false, maxLength: 200 },
  description: { type: "string", required: true, maxLength: 2000 },
  evidence: { type: "object", required: false, default: {} },
};

function getSchemaForAction(action: string): Schema {
  if (["acknowledge_alert", "resolve_alert", "dismiss_alert"].includes(action)) return ALERT_ID_SCHEMA;
  if (action === "ingest_signal") return SIGNAL_SCHEMA;
  return BASE_SCHEMA;
}

// ─── Anomaly Detection Logic ───

interface AnomalyResult {
  alert_type: string;
  severity: string;
  title: string;
  summary: string;
  evidence_snapshot: Record<string, unknown>;
  recommended_action: string;
  source_category: string;
  triggering_signals: unknown[];
}

async function detectAuthAnomalies(
  client: ReturnType<typeof createClient>,
  orgId: string
): Promise<AnomalyResult[]> {
  const results: AnomalyResult[] = [];
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();

  // Check auth failures from security_audit_events
  const { data: authEvents, count } = await client
    .from("security_audit_events")
    .select("*", { count: "exact" })
    .eq("organization_id", orgId)
    .eq("outcome", "denied")
    .gte("created_at", oneHourAgo)
    .limit(50);

  if ((count ?? 0) >= THRESHOLDS.auth_failures_per_hour) {
    // Group by actor
    const actorCounts: Record<string, number> = {};
    (authEvents ?? []).forEach((e: any) => {
      actorCounts[e.actor_id] = (actorCounts[e.actor_id] || 0) + 1;
    });
    const topActor = Object.entries(actorCounts).sort((a, b) => b[1] - a[1])[0];

    results.push({
      alert_type: "auth_abuse",
      severity: (count ?? 0) >= THRESHOLDS.auth_failures_per_hour * 2 ? "critical" : "high",
      title: "Repeated authentication failures detected",
      summary: `${count} auth denials in the last hour. Top actor: ${topActor?.[0] ?? "unknown"} (${topActor?.[1] ?? 0} attempts).`,
      evidence_snapshot: { total_failures: count, actor_distribution: actorCounts, period: "1h" },
      recommended_action: "Investigate actor identity and access patterns. Consider temporary access restriction.",
      source_category: "auth",
      triggering_signals: (authEvents ?? []).slice(0, 5).map((e: any) => ({
        id: e.id, function: e.function_name, actor: e.actor_id, time: e.created_at,
      })),
    });
  }

  return results;
}

async function detectValidationAnomalies(
  client: ReturnType<typeof createClient>,
  orgId: string
): Promise<AnomalyResult[]> {
  const results: AnomalyResult[] = [];
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();

  const { data: valEvents, count } = await client
    .from("security_audit_events")
    .select("*", { count: "exact" })
    .eq("organization_id", orgId)
    .eq("action", "validation_failure")
    .gte("created_at", oneHourAgo)
    .limit(50);

  if ((count ?? 0) >= THRESHOLDS.validation_failures_per_hour) {
    const fnCounts: Record<string, number> = {};
    (valEvents ?? []).forEach((e: any) => {
      fnCounts[e.function_name] = (fnCounts[e.function_name] || 0) + 1;
    });

    results.push({
      alert_type: "input_abuse",
      severity: (count ?? 0) >= THRESHOLDS.validation_failures_per_hour * 2 ? "high" : "medium",
      title: "Repeated input validation failures",
      summary: `${count} validation failures in the last hour across functions.`,
      evidence_snapshot: { total_failures: count, function_distribution: fnCounts, period: "1h" },
      recommended_action: "Review malformed payloads. Check for automated abuse or misconfigured clients.",
      source_category: "validation",
      triggering_signals: (valEvents ?? []).slice(0, 5).map((e: any) => ({
        id: e.id, function: e.function_name, actor: e.actor_id, time: e.created_at,
      })),
    });
  }

  return results;
}

async function detectPoisoningAnomalies(
  client: ReturnType<typeof createClient>,
  orgId: string
): Promise<AnomalyResult[]> {
  const results: AnomalyResult[] = [];
  const oneDayAgo = new Date(Date.now() - 86400_000).toISOString();

  const { data: quarantined, count } = await client
    .from("canon_poisoning_assessments")
    .select("*", { count: "exact" })
    .eq("organization_id", orgId)
    .eq("quarantine_status", "quarantined")
    .gte("created_at", oneDayAgo)
    .limit(50);

  if ((count ?? 0) >= THRESHOLDS.quarantined_candidates_per_day) {
    // Group by source
    const sourceCounts: Record<string, number> = {};
    (quarantined ?? []).forEach((q: any) => {
      const src = q.source_ref || "unknown";
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    });

    results.push({
      alert_type: "canon_poisoning",
      severity: (count ?? 0) >= THRESHOLDS.quarantined_candidates_per_day * 2 ? "critical" : "high",
      title: "Spike in quarantined canon candidates",
      summary: `${count} candidates quarantined in the last 24h. Possible coordinated poisoning attempt.`,
      evidence_snapshot: { total_quarantined: count, source_distribution: sourceCounts, period: "24h" },
      recommended_action: "Review quarantined candidates. Investigate suspicious sources. Consider source trust downgrade.",
      source_category: "poisoning",
      triggering_signals: (quarantined ?? []).slice(0, 5).map((q: any) => ({
        id: q.id, candidate: q.candidate_id, risk: q.poisoning_risk_score, source: q.source_ref,
      })),
    });
  }

  // Check promotion blocks
  const { count: promoBlocks } = await client
    .from("security_audit_events")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("action", "promotion_blocked_by_poisoning_gate")
    .gte("created_at", oneDayAgo);

  if ((promoBlocks ?? 0) >= THRESHOLDS.promotion_blocks_per_day) {
    results.push({
      alert_type: "promotion_anomaly",
      severity: "high",
      title: "Repeated canon promotion blocks",
      summary: `${promoBlocks} promotion attempts blocked by poisoning gate in the last 24h.`,
      evidence_snapshot: { total_blocks: promoBlocks, period: "24h" },
      recommended_action: "Review blocked promotion attempts. Verify candidate pipeline integrity.",
      source_category: "promotion",
      triggering_signals: [],
    });
  }

  return results;
}

async function detectAcquisitionAnomalies(
  client: ReturnType<typeof createClient>,
  orgId: string
): Promise<AnomalyResult[]> {
  const results: AnomalyResult[] = [];
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();

  const { count: failedAcq } = await client
    .from("security_audit_events")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .in("function_name", ["knowledge-acquisition-orchestrator", "deep-repo-absorber-engine"])
    .eq("outcome", "error")
    .gte("created_at", oneHourAgo);

  if ((failedAcq ?? 0) >= THRESHOLDS.acquisition_failures_per_hour) {
    results.push({
      alert_type: "acquisition_anomaly",
      severity: "medium",
      title: "Unusual knowledge acquisition failure rate",
      summary: `${failedAcq} acquisition failures in the last hour.`,
      evidence_snapshot: { total_failures: failedAcq, period: "1h" },
      recommended_action: "Check acquisition sources and budget constraints. Review for suspicious source patterns.",
      source_category: "acquisition",
      triggering_signals: [],
    });
  }

  return results;
}

async function runFullScan(
  client: ReturnType<typeof createClient>,
  orgId: string,
  userId: string
): Promise<{ alerts_created: number; anomalies: AnomalyResult[] }> {
  const [authAnomalies, valAnomalies, poisonAnomalies, acqAnomalies] = await Promise.all([
    detectAuthAnomalies(client, orgId),
    detectValidationAnomalies(client, orgId),
    detectPoisoningAnomalies(client, orgId),
    detectAcquisitionAnomalies(client, orgId),
  ]);

  const allAnomalies = [...authAnomalies, ...valAnomalies, ...poisonAnomalies, ...acqAnomalies];

  let alertsCreated = 0;
  for (const anomaly of allAnomalies) {
    // Dedup: check if an open alert of same type exists in last hour
    const { count: existing } = await client
      .from("security_monitoring_alerts")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("alert_type", anomaly.alert_type)
      .in("status", ["open", "acknowledged", "investigating"])
      .gte("created_at", new Date(Date.now() - 3600_000).toISOString());

    if ((existing ?? 0) === 0) {
      await client.from("security_monitoring_alerts").insert({
        organization_id: orgId,
        alert_type: anomaly.alert_type,
        severity: anomaly.severity,
        status: "open",
        source_category: anomaly.source_category,
        title: anomaly.title,
        summary: anomaly.summary,
        evidence_snapshot: anomaly.evidence_snapshot,
        triggering_signals: anomaly.triggering_signals,
        recommended_action: anomaly.recommended_action,
      });
      alertsCreated++;
    }
  }

  await logSecurityAudit(client, {
    organization_id: orgId,
    actor_id: userId,
    function_name: "security-monitoring-engine",
    action: "full_scan_completed",
    context: { anomalies_found: allAnomalies.length, alerts_created: alertsCreated },
  });

  return { alerts_created: alertsCreated, anomalies: allAnomalies };
}

// ─── Main Handler ───

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const authResult = await authenticateWithRateLimit(req, "security-monitoring-engine");
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient } = authResult;

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return errorResponse("Invalid JSON body", 400, req); }

    const actionCheck = validateSchema(body, { action: { type: "string", required: true, enum: MONITORING_ACTIONS as unknown as string[] } });
    if (!actionCheck.valid) {
      await logValidationFailure(serviceClient, { actor_id: user.id, function_name: "security-monitoring-engine", errors: actionCheck.errors });
      return validationErrorResponse(actionCheck.errors, req);
    }

    const action = body.action as string;
    const schema = getSchemaForAction(action);
    const validation = validateSchema(body, schema);
    if (!validation.valid) {
      await logValidationFailure(serviceClient, { actor_id: user.id, function_name: "security-monitoring-engine", errors: validation.errors });
      return validationErrorResponse(validation.errors, req);
    }

    const { orgId, error: orgError } = await resolveAndValidateOrg(serviceClient, user.id, body.organization_id as string | undefined);
    if (orgError || !orgId) return errorResponse(orgError || "Organization access denied", 403, req);

    await logSecurityAudit(serviceClient, {
      organization_id: orgId, actor_id: user.id,
      function_name: "security-monitoring-engine", action,
    });

    switch (action) {
      case "overview": {
        const [alertsOpen, alertsCritical, signalsRecent, alertsAll] = await Promise.all([
          serviceClient.from("security_monitoring_alerts").select("*", { count: "exact", head: true }).eq("organization_id", orgId).in("status", ["open", "acknowledged", "investigating"]),
          serviceClient.from("security_monitoring_alerts").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("severity", "critical").in("status", ["open", "acknowledged", "investigating"]),
          serviceClient.from("security_monitoring_signals").select("*", { count: "exact", head: true }).eq("organization_id", orgId).gte("created_at", new Date(Date.now() - 86400_000).toISOString()),
          serviceClient.from("security_monitoring_alerts").select("severity, status, alert_type").eq("organization_id", orgId).in("status", ["open", "acknowledged", "investigating"]).limit(100),
        ]);

        const severityDist: Record<string, number> = {};
        const typeDist: Record<string, number> = {};
        (alertsAll.data ?? []).forEach((a: any) => {
          severityDist[a.severity] = (severityDist[a.severity] || 0) + 1;
          typeDist[a.alert_type] = (typeDist[a.alert_type] || 0) + 1;
        });

        return jsonResponse({
          active_alerts: alertsOpen.count ?? 0,
          critical_alerts: alertsCritical.count ?? 0,
          signals_24h: signalsRecent.count ?? 0,
          severity_distribution: severityDist,
          type_distribution: typeDist,
        }, 200, req);
      }

      case "list_alerts": {
        const { data, error } = await serviceClient
          .from("security_monitoring_alerts")
          .select("*")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw error;
        return jsonResponse({ alerts: data }, 200, req);
      }

      case "list_signals": {
        const { data, error } = await serviceClient
          .from("security_monitoring_signals")
          .select("*")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw error;
        return jsonResponse({ signals: data }, 200, req);
      }

      case "run_scan": {
        const result = await runFullScan(serviceClient, orgId, user.id);
        return jsonResponse(result, 200, req);
      }

      case "ingest_signal": {
        const { error } = await serviceClient.from("security_monitoring_signals").insert({
          organization_id: orgId,
          signal_type: body.signal_type as string,
          signal_category: body.signal_category as string,
          severity: (body.severity as string) || "low",
          source_function: body.source_function as string || null,
          actor_id: user.id,
          description: body.description as string,
          evidence: body.evidence || {},
        });
        if (error) throw error;
        return jsonResponse({ status: "signal_ingested" }, 200, req);
      }

      case "acknowledge_alert":
      case "resolve_alert":
      case "dismiss_alert": {
        const alertId = body.alert_id as string;
        const newStatus = action === "acknowledge_alert" ? "acknowledged"
          : action === "resolve_alert" ? "resolved" : "dismissed";
        const timeField = action === "resolve_alert" || action === "dismiss_alert"
          ? "resolved_at" : "acknowledged_at";

        const { error } = await serviceClient
          .from("security_monitoring_alerts")
          .update({
            status: newStatus,
            [timeField]: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", alertId)
          .eq("organization_id", orgId);

        if (error) throw error;

        await logSecurityAudit(serviceClient, {
          organization_id: orgId, actor_id: user.id,
          function_name: "security-monitoring-engine",
          action: `alert_${newStatus}`,
          context: { alert_id: alertId, notes: body.notes },
        });

        return jsonResponse({ status: newStatus, alert_id: alertId }, 200, req);
      }

      case "correlate_alerts": {
        // Simple correlation: group open alerts by source_category
        const { data: openAlerts } = await serviceClient
          .from("security_monitoring_alerts")
          .select("*")
          .eq("organization_id", orgId)
          .in("status", ["open", "acknowledged"])
          .order("created_at", { ascending: false })
          .limit(50);

        const correlations: Record<string, unknown[]> = {};
        (openAlerts ?? []).forEach((a: any) => {
          const key = a.source_category || "general";
          if (!correlations[key]) correlations[key] = [];
          correlations[key].push({ id: a.id, type: a.alert_type, severity: a.severity, title: a.title });
        });

        const incidentCandidates = Object.entries(correlations)
          .filter(([_, alerts]) => (alerts as unknown[]).length >= 2)
          .map(([category, alerts]) => ({
            category,
            alert_count: (alerts as unknown[]).length,
            alerts,
            recommendation: `Multiple ${category} alerts detected. Consider grouping into an incident for coordinated investigation.`,
          }));

        return jsonResponse({ correlations, incident_candidates: incidentCandidates }, 200, req);
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400, req);
    }
  } catch (err) {
    console.error("[security-monitoring-engine] Error:", err);
    return errorResponse(err.message, 500, req);
  }
});
