// Learning Signal Types — AxionOS Sprint 155
// Canonical domain model for structured learning feedback signals.

// ── Source types ──

export type LearningSourceType =
  | "action_outcome"
  | "canon_application"
  | "recovery_result"
  | "approval_decision"
  | "readiness_result"
  | "policy_result"
  | "runtime_signal";

// ── Signal types ──

export type LearningSignalType =
  | "high_value_pattern"
  | "low_value_pattern"
  | "likely_misapplied_pattern"
  | "likely_stale_pattern"
  | "ignored_but_effective_guidance"
  | "repeated_failure_pattern"
  | "repeated_success_pattern"
  | "recovery_success_pattern"
  | "recovery_failure_pattern"
  | "unstable_action_pattern"
  | "policy_friction_signal"
  | "readiness_false_positive"
  | "readiness_false_negative"
  | "agent_selection_success"
  | "agent_selection_failure";

// ── Severity ──

export type SignalSeverity = "critical" | "high" | "medium" | "low" | "info";

// ── Routing targets ──

export type RoutingTarget =
  | "canon_evolution"
  | "policy_tuning"
  | "agent_selection_tuning"
  | "readiness_tuning"
  | "recovery_tuning"
  | "governance_review";

// ── Core model ──

export interface LearningSignal {
  id?: string;
  organization_id: string;
  source_type: LearningSourceType;
  source_id: string | null;
  initiative_id: string | null;
  stage: string;
  signal_type: LearningSignalType;
  severity: SignalSeverity;
  confidence: number; // 0.0–1.0
  summary: string;
  explanation: string;
  related_action_id: string | null;
  related_outcome_id: string | null;
  related_canon_entry_ids: string[];
  related_agent_id: string | null;
  related_policy_decision_id: string | null;
  related_recovery_hook_id: string | null;
  routing_target: RoutingTarget;
  aggregation_key: string | null;
  aggregation_count: number;
  metadata: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

// ── Validation ──

const SOURCE_TYPES: LearningSourceType[] = [
  "action_outcome", "canon_application", "recovery_result",
  "approval_decision", "readiness_result", "policy_result", "runtime_signal",
];

const SIGNAL_TYPES: LearningSignalType[] = [
  "high_value_pattern", "low_value_pattern", "likely_misapplied_pattern",
  "likely_stale_pattern", "ignored_but_effective_guidance",
  "repeated_failure_pattern", "repeated_success_pattern",
  "recovery_success_pattern", "recovery_failure_pattern",
  "unstable_action_pattern", "policy_friction_signal",
  "readiness_false_positive", "readiness_false_negative",
  "agent_selection_success", "agent_selection_failure",
];

const SEVERITIES: SignalSeverity[] = ["critical", "high", "medium", "low", "info"];

const ROUTING_TARGETS: RoutingTarget[] = [
  "canon_evolution", "policy_tuning", "agent_selection_tuning",
  "readiness_tuning", "recovery_tuning", "governance_review",
];

export function validateLearningSignal(
  data: unknown,
): { valid: true; signal: LearningSignal } | { valid: false; errors: string[] } {
  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Learning signal must be an object"] };
  }
  const d = data as Record<string, unknown>;
  const errors: string[] = [];

  if (!d.organization_id || typeof d.organization_id !== "string") errors.push("organization_id required");
  if (!d.source_type || !SOURCE_TYPES.includes(d.source_type as LearningSourceType)) {
    errors.push(`source_type must be one of: ${SOURCE_TYPES.join(", ")}`);
  }
  if (!d.signal_type || !SIGNAL_TYPES.includes(d.signal_type as LearningSignalType)) {
    errors.push(`signal_type must be one of: ${SIGNAL_TYPES.join(", ")}`);
  }
  if (d.severity && !SEVERITIES.includes(d.severity as SignalSeverity)) {
    errors.push(`severity must be one of: ${SEVERITIES.join(", ")}`);
  }
  if (d.routing_target && !ROUTING_TARGETS.includes(d.routing_target as RoutingTarget)) {
    errors.push(`routing_target must be one of: ${ROUTING_TARGETS.join(", ")}`);
  }
  if (typeof d.confidence === "number" && (d.confidence < 0 || d.confidence > 1)) {
    errors.push("confidence must be between 0 and 1");
  }
  if (!d.summary || typeof d.summary !== "string") errors.push("summary required");

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, signal: d as unknown as LearningSignal };
}
