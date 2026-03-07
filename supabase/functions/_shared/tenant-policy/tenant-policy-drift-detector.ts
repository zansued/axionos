// Tenant Policy Drift Detector — AxionOS Sprint 29
// Detects when local tuning becomes harmful, stale, or overfitting.

export interface DriftInput {
  preference: {
    id: string;
    preference_name: string;
    preference_scope: string;
    confidence_score: number | null;
    support_count: number;
    status: string;
    updated_at: string;
  };
  outcomes: Array<{
    outcome_status: string;
    applied_mode: string;
    created_at: string;
  }>;
  global_helpful_rate: number;
  global_harmful_rate: number;
}

export interface DriftSignal {
  signal_type: "harmful_drift" | "stale_profile" | "overfit_local" | "divergence_from_global" | "low_sample_tuning";
  severity: "low" | "medium" | "high";
  description: string;
  recommended_action: "watch" | "deprecate" | "rollback_to_default" | "tighten_limits";
  confidence: number;
}

export interface DriftResult {
  signals: DriftSignal[];
  overall_health: "healthy" | "warning" | "critical";
  reason_codes: string[];
}

const STALE_DAYS = 30;
const MIN_SAMPLE_SIZE = 5;
const HARMFUL_THRESHOLD = 0.35;
const DIVERGENCE_THRESHOLD = 0.25;

/**
 * Detect drift signals for a tenant preference profile.
 */
export function detectTenantDrift(input: DriftInput): DriftResult {
  const signals: DriftSignal[] = [];
  const reasons: string[] = [];

  const { preference, outcomes } = input;

  // 1. Check for harmful drift
  if (outcomes.length >= MIN_SAMPLE_SIZE) {
    const harmful = outcomes.filter((o) => o.outcome_status === "harmful").length;
    const harmfulRate = harmful / outcomes.length;

    if (harmfulRate > HARMFUL_THRESHOLD) {
      signals.push({
        signal_type: "harmful_drift",
        severity: harmfulRate > 0.5 ? "high" : "medium",
        description: `${(harmfulRate * 100).toFixed(0)}% harmful outcomes for "${preference.preference_name}"`,
        recommended_action: harmfulRate > 0.5 ? "deprecate" : "rollback_to_default",
        confidence: Math.min(1, outcomes.length / 10),
      });
      reasons.push("harmful_outcome_rate_exceeded");
    }
  }

  // 2. Check for stale profile
  const daysSinceUpdate = (Date.now() - new Date(preference.updated_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceUpdate > STALE_DAYS && preference.status === "active") {
    signals.push({
      signal_type: "stale_profile",
      severity: daysSinceUpdate > 60 ? "medium" : "low",
      description: `Profile "${preference.preference_name}" not updated in ${Math.round(daysSinceUpdate)} days`,
      recommended_action: "watch",
      confidence: 0.7,
    });
    reasons.push("stale_preference_profile");
  }

  // 3. Check for overfit (low sample but high confidence)
  if (preference.support_count < MIN_SAMPLE_SIZE && (preference.confidence_score ?? 0) > 0.7) {
    signals.push({
      signal_type: "overfit_local",
      severity: "medium",
      description: `Profile "${preference.preference_name}" has high confidence (${preference.confidence_score}) with only ${preference.support_count} support samples`,
      recommended_action: "tighten_limits",
      confidence: 0.8,
    });
    reasons.push("overfit_low_sample_high_confidence");
  }

  // 4. Check for low-sample tuning
  if (outcomes.length < MIN_SAMPLE_SIZE && preference.status === "active") {
    signals.push({
      signal_type: "low_sample_tuning",
      severity: "low",
      description: `Only ${outcomes.length} outcomes recorded for active profile "${preference.preference_name}"`,
      recommended_action: "watch",
      confidence: 0.6,
    });
    reasons.push("low_sample_active_tuning");
  }

  // 5. Check divergence from global
  if (outcomes.length >= MIN_SAMPLE_SIZE) {
    const localHelpfulRate = outcomes.filter((o) => o.outcome_status === "helpful").length / outcomes.length;
    const divergence = input.global_helpful_rate - localHelpfulRate;

    if (divergence > DIVERGENCE_THRESHOLD) {
      signals.push({
        signal_type: "divergence_from_global",
        severity: divergence > 0.4 ? "high" : "medium",
        description: `Local helpful rate (${(localHelpfulRate * 100).toFixed(0)}%) significantly below global (${(input.global_helpful_rate * 100).toFixed(0)}%)`,
        recommended_action: divergence > 0.4 ? "rollback_to_default" : "tighten_limits",
        confidence: Math.min(1, outcomes.length / 10),
      });
      reasons.push("divergence_from_global_performance");
    }
  }

  // Overall health
  const highSeverity = signals.filter((s) => s.severity === "high").length;
  const medSeverity = signals.filter((s) => s.severity === "medium").length;
  const overall = highSeverity > 0 ? "critical" : medSeverity > 0 ? "warning" : "healthy";

  return { signals, overall_health: overall, reason_codes: reasons };
}
