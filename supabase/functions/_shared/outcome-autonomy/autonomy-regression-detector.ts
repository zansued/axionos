/**
 * Autonomy Regression Detector — Sprint 121
 * Detects conditions that should trigger autonomy level regression.
 */

export interface RegressionInput {
  recent_incident_count: number;
  recent_rollback_count: number;
  validation_failure_rate: number;
  evidence_score_trend: number; // negative = declining
  guardrail_breach_count: number;
  window_days: number;
}

export interface RegressionSignal {
  regression_detected: boolean;
  severity: "low" | "medium" | "high" | "critical";
  triggers: string[];
  recommended_action: string;
}

export function detectRegression(input: RegressionInput): RegressionSignal {
  const triggers: string[] = [];

  if (input.guardrail_breach_count > 0) triggers.push(`${input.guardrail_breach_count} guardrail breach(es) in ${input.window_days}d`);
  if (input.recent_incident_count > 3) triggers.push(`${input.recent_incident_count} incidents in ${input.window_days}d`);
  if (input.recent_rollback_count > 2) triggers.push(`${input.recent_rollback_count} rollbacks in ${input.window_days}d`);
  if (input.validation_failure_rate > 0.4) triggers.push(`Validation failure rate ${(input.validation_failure_rate * 100).toFixed(0)}%`);
  if (input.evidence_score_trend < -0.15) triggers.push(`Evidence score declining (${input.evidence_score_trend.toFixed(2)})`);

  if (triggers.length === 0) {
    return { regression_detected: false, severity: "low", triggers: [], recommended_action: "No regression detected." };
  }

  const severity = input.guardrail_breach_count > 0 || triggers.length >= 3 ? "critical"
    : triggers.length >= 2 ? "high"
    : input.recent_incident_count > 3 ? "medium"
    : "low";

  const action = severity === "critical" ? "Immediate downgrade recommended."
    : severity === "high" ? "Downgrade to next lower level."
    : "Monitor closely; consider downgrade if trend continues.";

  return { regression_detected: true, severity, triggers, recommended_action: action };
}
