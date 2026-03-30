/**
 * Deploy Audit Trail — Sprint 3 (Deploy Assurance)
 * 
 * Structured lifecycle events for deploy decisions.
 * Every deploy action (attempt, success, failure, rollback, health check)
 * is recorded as an auditable event with cause→decision→result lineage.
 * 
 * Integrates with existing:
 * - deploy-feedback-loop.ts (Sprint 216) for learning signals
 * - nervous-system-temporal-engine.ts (Sprint 1) for spike accumulation
 */

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export type DeployAuditEventType =
  | "deploy_initiated"
  | "deploy_succeeded"
  | "deploy_failed"
  | "health_check_passed"
  | "health_check_failed"
  | "regression_detected"
  | "rollback_recommended"
  | "rollback_approved"
  | "rollback_executed"
  | "rollback_failed"
  | "rollback_cancelled"
  | "stability_confirmed"
  | "operator_intervention";

export interface DeployAuditEvent {
  id: string;
  organization_id: string;
  initiative_id: string;
  deploy_id: string;
  event_type: DeployAuditEventType;
  actor: string;
  actor_type: "system" | "operator" | "governance";
  cause: string;
  decision: string;
  result: string;
  evidence_refs: Record<string, unknown>;
  severity: "info" | "warning" | "error" | "critical";
  created_at: string;
}

export interface DeployLifecycleView {
  deploy_id: string;
  initiative_id: string;
  organization_id: string;
  events: DeployAuditEvent[];
  current_status: string;
  total_duration_minutes: number;
  rollback_count: number;
  health_check_count: number;
  regression_count: number;
}

// ═══════════════════════════════════════════════════════════════
// Event Builders
// ═══════════════════════════════════════════════════════════════

let _eventCounter = 0;

function generateEventId(): string {
  _eventCounter++;
  return `dae-${Date.now()}-${_eventCounter}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Build a structured audit event for the deploy lifecycle.
 */
export function buildAuditEvent(params: {
  organization_id: string;
  initiative_id: string;
  deploy_id: string;
  event_type: DeployAuditEventType;
  actor?: string;
  actor_type?: DeployAuditEvent["actor_type"];
  cause: string;
  decision: string;
  result: string;
  evidence_refs?: Record<string, unknown>;
  severity?: DeployAuditEvent["severity"];
}): DeployAuditEvent {
  return {
    id: generateEventId(),
    organization_id: params.organization_id,
    initiative_id: params.initiative_id,
    deploy_id: params.deploy_id,
    event_type: params.event_type,
    actor: params.actor || "deploy_assurance_engine",
    actor_type: params.actor_type || "system",
    cause: params.cause,
    decision: params.decision,
    result: params.result,
    evidence_refs: params.evidence_refs || {},
    severity: params.severity || deriveSeverity(params.event_type),
    created_at: new Date().toISOString(),
  };
}

function deriveSeverity(eventType: DeployAuditEventType): DeployAuditEvent["severity"] {
  switch (eventType) {
    case "deploy_failed":
    case "rollback_failed":
      return "error";
    case "regression_detected":
    case "rollback_recommended":
      return "warning";
    case "health_check_failed":
      return "warning";
    case "rollback_executed":
    case "rollback_approved":
      return "critical";
    default:
      return "info";
  }
}

/**
 * Build a lifecycle view from a sequence of audit events.
 */
export function buildLifecycleView(
  deployId: string,
  initiativeId: string,
  organizationId: string,
  events: DeployAuditEvent[],
): DeployLifecycleView {
  const sorted = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const durationMs = first && last
    ? new Date(last.created_at).getTime() - new Date(first.created_at).getTime()
    : 0;

  return {
    deploy_id: deployId,
    initiative_id: initiativeId,
    organization_id: organizationId,
    events: sorted,
    current_status: last?.event_type || "unknown",
    total_duration_minutes: Math.round(durationMs / 60000),
    rollback_count: sorted.filter(e => e.event_type === "rollback_executed").length,
    health_check_count: sorted.filter(e =>
      e.event_type === "health_check_passed" || e.event_type === "health_check_failed"
    ).length,
    regression_count: sorted.filter(e => e.event_type === "regression_detected").length,
  };
}

/**
 * Persist audit events to the database.
 * Returns success/error for observability.
 */
export async function persistAuditEvents(
  supabase: any,
  events: DeployAuditEvent[],
): Promise<{ success: boolean; inserted: number; error?: string }> {
  if (events.length === 0) return { success: true, inserted: 0 };

  try {
    const rows = events.map(e => ({
      organization_id: e.organization_id,
      initiative_id: e.initiative_id,
      deploy_id: e.deploy_id,
      event_type: e.event_type,
      actor: e.actor,
      actor_type: e.actor_type,
      cause: e.cause,
      decision: e.decision,
      result: e.result,
      evidence_refs: e.evidence_refs,
      severity: e.severity,
    }));

    const { error } = await supabase.from("deploy_audit_events").insert(rows);

    if (error) {
      console.error("[DeployAudit] Insert failed:", error.message);
      return { success: false, inserted: 0, error: error.message };
    }

    return { success: true, inserted: rows.length };
  } catch (err: any) {
    console.error("[DeployAudit] Unexpected error:", err.message);
    return { success: false, inserted: 0, error: err.message };
  }
}

/**
 * Persist a rollback decision to the database.
 */
export async function persistRollbackDecision(
  supabase: any,
  decision: {
    deploy_id: string;
    initiative_id: string;
    organization_id: string;
    action: string;
    rollback_target: string | null;
    confidence: number;
    reason: string;
    evidence_summary: Record<string, unknown>;
    requires_approval: boolean;
    approval_level: string;
    triggered_by: string;
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("deploy_rollback_decisions").insert({
      deploy_id: decision.deploy_id,
      initiative_id: decision.initiative_id,
      organization_id: decision.organization_id,
      action: decision.action,
      rollback_target: decision.rollback_target,
      confidence: decision.confidence,
      reason: decision.reason,
      evidence_summary: decision.evidence_summary,
      requires_approval: decision.requires_approval,
      approval_level: decision.approval_level,
      triggered_by: decision.triggered_by,
    });

    if (error) {
      console.error("[DeployAudit] Rollback decision insert failed:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
