/**
 * Tenant-Adaptive Regression Detector — Sprint 125
 * Wraps the core regression detector with tenant-specific thresholds.
 */

export interface TenantRegressionProfile {
  profile_type: "conservative" | "balanced" | "aggressive";
  validation_failure_threshold: number;
  rollback_rate_threshold: number;
  guardrail_breach_threshold: number;
  incident_threshold: number;
  evidence_trend_threshold: number;
  autonomy_upgrade_modifier: number;
}

export const DEFAULT_PROFILES: Record<string, TenantRegressionProfile> = {
  conservative: {
    profile_type: "conservative",
    validation_failure_threshold: 0.2,
    rollback_rate_threshold: 1,
    guardrail_breach_threshold: 0,
    incident_threshold: 1,
    evidence_trend_threshold: -0.05,
    autonomy_upgrade_modifier: 0.5,
  },
  balanced: {
    profile_type: "balanced",
    validation_failure_threshold: 0.4,
    rollback_rate_threshold: 2,
    guardrail_breach_threshold: 0,
    incident_threshold: 3,
    evidence_trend_threshold: -0.15,
    autonomy_upgrade_modifier: 1.0,
  },
  aggressive: {
    profile_type: "aggressive",
    validation_failure_threshold: 0.6,
    rollback_rate_threshold: 4,
    guardrail_breach_threshold: 1,
    incident_threshold: 5,
    evidence_trend_threshold: -0.25,
    autonomy_upgrade_modifier: 1.5,
  },
};

export interface AdaptiveRegressionInput {
  recent_incident_count: number;
  recent_rollback_count: number;
  validation_failure_rate: number;
  evidence_score_trend: number;
  guardrail_breach_count: number;
  window_days: number;
}

export interface AdaptiveRegressionSignal {
  regression_detected: boolean;
  severity: "low" | "medium" | "high" | "critical";
  triggers: string[];
  recommended_action: string;
  profile_applied: string;
}

export function detectAdaptiveRegression(
  input: AdaptiveRegressionInput,
  profile: TenantRegressionProfile = DEFAULT_PROFILES.balanced,
): AdaptiveRegressionSignal {
  const triggers: string[] = [];

  if (input.guardrail_breach_count > profile.guardrail_breach_threshold)
    triggers.push(`${input.guardrail_breach_count} guardrail breach(es) > threshold ${profile.guardrail_breach_threshold}`);

  if (input.recent_incident_count > profile.incident_threshold)
    triggers.push(`${input.recent_incident_count} incidents > threshold ${profile.incident_threshold}`);

  if (input.recent_rollback_count > profile.rollback_rate_threshold)
    triggers.push(`${input.recent_rollback_count} rollbacks > threshold ${profile.rollback_rate_threshold}`);

  if (input.validation_failure_rate > profile.validation_failure_threshold)
    triggers.push(`Validation failure ${(input.validation_failure_rate * 100).toFixed(0)}% > ${(profile.validation_failure_threshold * 100).toFixed(0)}%`);

  if (input.evidence_score_trend < profile.evidence_trend_threshold)
    triggers.push(`Evidence trend ${input.evidence_score_trend.toFixed(2)} < ${profile.evidence_trend_threshold}`);

  if (triggers.length === 0) {
    return {
      regression_detected: false,
      severity: "low",
      triggers: [],
      recommended_action: "No regression detected under current profile.",
      profile_applied: profile.profile_type,
    };
  }

  const severity =
    input.guardrail_breach_count > profile.guardrail_breach_threshold || triggers.length >= 3
      ? "critical"
      : triggers.length >= 2
        ? "high"
        : input.recent_incident_count > profile.incident_threshold
          ? "medium"
          : "low";

  const action =
    severity === "critical"
      ? "Immediate downgrade recommended."
      : severity === "high"
        ? "Downgrade to next lower level."
        : "Monitor closely; consider downgrade if trend continues.";

  return {
    regression_detected: true,
    severity,
    triggers,
    recommended_action: action,
    profile_applied: profile.profile_type,
  };
}
