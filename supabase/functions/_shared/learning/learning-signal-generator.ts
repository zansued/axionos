// Learning Signal Generator — AxionOS Sprint 155
// Converts structured operational evidence into learning signals.

import type {
  LearningSignal,
  LearningSignalType,
  LearningSourceType,
  RoutingTarget,
  SignalSeverity,
} from "./learning-signal-types.ts";

// ── Evidence input contracts ──

export interface ActionOutcomeEvidence {
  organization_id: string;
  action_id: string;
  outcome_id?: string;
  initiative_id?: string | null;
  stage?: string;
  outcome_status: string; // "success" | "failed" | "rolled_back" | "partial"
  risk_level?: string;
  execution_mode?: string;
  agent_id?: string | null;
  policy_decision_id?: string | null;
  failure_count?: number;
  success_count?: number;
  description?: string;
}

export interface CanonApplicationEvidence {
  organization_id: string;
  initiative_id?: string | null;
  stage?: string;
  canon_entry_ids: string[];
  application_quality: number; // 0–100
  was_applied: boolean;
  was_effective: boolean;
  correlation_score?: number;
  agent_id?: string | null;
}

export interface RecoveryOutcomeEvidence {
  organization_id: string;
  recovery_hook_id: string;
  action_id?: string;
  initiative_id?: string | null;
  stage?: string;
  recovery_type: string;
  outcome: "success" | "failed" | "blocked" | "expired";
  retry_count?: number;
}

export interface ApprovalDecisionEvidence {
  organization_id: string;
  approval_id: string;
  action_id?: string;
  initiative_id?: string | null;
  stage?: string;
  decision: "approved" | "rejected" | "expired" | "cancelled";
  risk_level?: string;
  rejection_count?: number;
}

// ── Confidence / severity heuristics ──

function computeConfidence(repeatCount: number, baseConfidence: number): number {
  // Repeated evidence increases confidence, capped at 0.95
  const boost = Math.min(repeatCount * 0.1, 0.4);
  return Math.min(baseConfidence + boost, 0.95);
}

function severityFromRisk(risk?: string): SignalSeverity {
  if (risk === "critical") return "critical";
  if (risk === "high") return "high";
  if (risk === "low") return "low";
  return "medium";
}

function makeAggKey(org: string, type: string, stage?: string, extra?: string): string {
  return `${org}::${type}::${stage || "all"}::${extra || ""}`;
}

// ── Generators ──

export function generateFromActionOutcome(e: ActionOutcomeEvidence): LearningSignal[] {
  const signals: LearningSignal[] = [];
  const base = {
    organization_id: e.organization_id,
    source_type: "action_outcome" as LearningSourceType,
    source_id: e.outcome_id || e.action_id,
    initiative_id: e.initiative_id || null,
    stage: e.stage || "",
    related_action_id: e.action_id,
    related_outcome_id: e.outcome_id || null,
    related_canon_entry_ids: [],
    related_agent_id: e.agent_id || null,
    related_policy_decision_id: e.policy_decision_id || null,
    related_recovery_hook_id: null,
    metadata: {},
  };

  if (e.outcome_status === "failed") {
    const isRepeated = (e.failure_count || 1) >= 3;
    signals.push({
      ...base,
      signal_type: isRepeated ? "repeated_failure_pattern" : "unstable_action_pattern",
      severity: severityFromRisk(e.risk_level),
      confidence: computeConfidence(e.failure_count || 1, 0.4),
      summary: isRepeated
        ? `Repeated failure detected for action ${e.action_id} (${e.failure_count} times)`
        : `Action ${e.action_id} failed: ${e.description || "no details"}`,
      explanation: isRepeated
        ? "Multiple consecutive failures indicate a systemic issue requiring investigation."
        : "Single failure observed; monitoring for recurrence.",
      routing_target: isRepeated ? "governance_review" : "recovery_tuning",
      aggregation_key: makeAggKey(e.organization_id, "action_failure", e.stage, e.action_id),
      aggregation_count: e.failure_count || 1,
    });
  }

  if (e.outcome_status === "success" && (e.success_count || 1) >= 3) {
    signals.push({
      ...base,
      signal_type: "repeated_success_pattern",
      severity: "info",
      confidence: computeConfidence(e.success_count || 1, 0.5),
      summary: `Consistent success for action pattern in stage ${e.stage || "unknown"}`,
      explanation: "Repeated successful execution suggests a reliable action pattern.",
      routing_target: "canon_evolution",
      aggregation_key: makeAggKey(e.organization_id, "action_success", e.stage),
      aggregation_count: e.success_count || 1,
    });
  }

  if (e.outcome_status === "rolled_back") {
    signals.push({
      ...base,
      signal_type: "unstable_action_pattern",
      severity: severityFromRisk(e.risk_level),
      confidence: 0.6,
      summary: `Action ${e.action_id} was rolled back`,
      explanation: "Rollback indicates instability in the action or its environment.",
      routing_target: "recovery_tuning",
      aggregation_key: makeAggKey(e.organization_id, "rollback", e.stage),
      aggregation_count: 1,
    });
  }

  return signals;
}

export function generateFromCanonApplication(e: CanonApplicationEvidence): LearningSignal[] {
  const signals: LearningSignal[] = [];
  const base = {
    organization_id: e.organization_id,
    source_type: "canon_application" as LearningSourceType,
    source_id: e.canon_entry_ids[0] || null,
    initiative_id: e.initiative_id || null,
    stage: e.stage || "",
    related_action_id: null,
    related_outcome_id: null,
    related_canon_entry_ids: e.canon_entry_ids,
    related_agent_id: e.agent_id || null,
    related_policy_decision_id: null,
    related_recovery_hook_id: null,
    metadata: { application_quality: e.application_quality },
  };

  if (e.was_applied && e.was_effective && e.application_quality >= 75) {
    signals.push({
      ...base,
      signal_type: "high_value_pattern",
      severity: "info",
      confidence: Math.min(e.application_quality / 100, 0.9),
      summary: `Canon entries effectively applied with quality ${e.application_quality}`,
      explanation: "Pattern was applied and correlated with positive outcomes.",
      routing_target: "canon_evolution",
      aggregation_key: makeAggKey(e.organization_id, "canon_high", e.stage),
      aggregation_count: 1,
    });
  }

  if (e.was_applied && !e.was_effective && e.application_quality < 40) {
    signals.push({
      ...base,
      signal_type: "likely_misapplied_pattern",
      severity: "medium",
      confidence: 0.5,
      summary: `Canon pattern applied but ineffective (quality: ${e.application_quality})`,
      explanation: "Pattern usage did not produce expected quality. May need review or deprecation.",
      routing_target: "canon_evolution",
      aggregation_key: makeAggKey(e.organization_id, "canon_misapplied", e.stage),
      aggregation_count: 1,
    });
  }

  if (!e.was_applied && e.was_effective) {
    signals.push({
      ...base,
      signal_type: "ignored_but_effective_guidance",
      severity: "low",
      confidence: 0.4,
      summary: "Canon guidance was not applied but outcome was still effective",
      explanation: "Guidance may be redundant or agents found alternative successful paths.",
      routing_target: "canon_evolution",
      aggregation_key: makeAggKey(e.organization_id, "canon_ignored_ok", e.stage),
      aggregation_count: 1,
    });
  }

  if (e.application_quality < 25 && e.was_applied) {
    signals.push({
      ...base,
      signal_type: "likely_stale_pattern",
      severity: "medium",
      confidence: 0.45,
      summary: `Very low application quality (${e.application_quality}) suggests stale canon entries`,
      explanation: "Consistently poor results when applying these patterns indicate they may be outdated.",
      routing_target: "canon_evolution",
      aggregation_key: makeAggKey(e.organization_id, "canon_stale", e.stage),
      aggregation_count: 1,
    });
  }

  return signals;
}

export function generateFromRecoveryOutcome(e: RecoveryOutcomeEvidence): LearningSignal[] {
  const signals: LearningSignal[] = [];
  const base = {
    organization_id: e.organization_id,
    source_type: "recovery_result" as LearningSourceType,
    source_id: e.recovery_hook_id,
    initiative_id: e.initiative_id || null,
    stage: e.stage || "",
    related_action_id: e.action_id || null,
    related_outcome_id: null,
    related_canon_entry_ids: [],
    related_agent_id: null,
    related_policy_decision_id: null,
    related_recovery_hook_id: e.recovery_hook_id,
    metadata: { recovery_type: e.recovery_type, retry_count: e.retry_count },
  };

  if (e.outcome === "success") {
    signals.push({
      ...base,
      signal_type: "recovery_success_pattern",
      severity: "info",
      confidence: computeConfidence(1, 0.6),
      summary: `Recovery (${e.recovery_type}) succeeded for hook ${e.recovery_hook_id}`,
      explanation: "Recovery action resolved the issue. Pattern may be reusable.",
      routing_target: "recovery_tuning",
      aggregation_key: makeAggKey(e.organization_id, "recovery_ok", e.stage, e.recovery_type),
      aggregation_count: 1,
    });
  }

  if (e.outcome === "failed") {
    signals.push({
      ...base,
      signal_type: "recovery_failure_pattern",
      severity: (e.retry_count || 0) >= 3 ? "high" : "medium",
      confidence: computeConfidence(e.retry_count || 1, 0.45),
      summary: `Recovery (${e.recovery_type}) failed${e.retry_count ? ` after ${e.retry_count} retries` : ""}`,
      explanation: "Recovery did not resolve the issue. Escalation or alternative strategy may be needed.",
      routing_target: "recovery_tuning",
      aggregation_key: makeAggKey(e.organization_id, "recovery_fail", e.stage, e.recovery_type),
      aggregation_count: e.retry_count || 1,
    });
  }

  return signals;
}

export function generateFromApprovalDecision(e: ApprovalDecisionEvidence): LearningSignal[] {
  const signals: LearningSignal[] = [];

  if (e.decision === "rejected" && (e.rejection_count || 1) >= 2) {
    signals.push({
      organization_id: e.organization_id,
      source_type: "approval_decision",
      source_id: e.approval_id,
      initiative_id: e.initiative_id || null,
      stage: e.stage || "",
      signal_type: "policy_friction_signal",
      severity: severityFromRisk(e.risk_level),
      confidence: computeConfidence(e.rejection_count || 1, 0.5),
      summary: `Approval repeatedly rejected in stage ${e.stage || "unknown"} (${e.rejection_count} times)`,
      explanation: "Frequent rejections suggest policy misalignment or environment-specific issues.",
      related_action_id: e.action_id || null,
      related_outcome_id: null,
      related_canon_entry_ids: [],
      related_agent_id: null,
      related_policy_decision_id: null,
      related_recovery_hook_id: null,
      routing_target: "policy_tuning",
      aggregation_key: makeAggKey(e.organization_id, "approval_rejected", e.stage),
      aggregation_count: e.rejection_count || 1,
      metadata: { decision: e.decision, risk_level: e.risk_level },
    });
  }

  return signals;
}
