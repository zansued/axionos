/**
 * Signal Shareability Classifier — Sprint 101
 * Classifies whether a signal is local, shareable, anonymized, aggregated, or prohibited.
 */

export type ShareabilityClass = "local" | "shareable" | "anonymized" | "aggregated" | "prohibited";

export interface SignalClassification {
  signal_type: string;
  shareability: ShareabilityClass;
  sensitivity: "low" | "standard" | "high" | "critical";
  reason: string;
}

const PROHIBITED_SIGNALS = ["raw_user_data", "auth_tokens", "private_keys", "pii_raw"];
const HIGH_SENSITIVITY = ["tenant_config", "billing_data", "compliance_records", "audit_raw"];
const AGGREGATE_ONLY = ["performance_metrics", "error_patterns", "usage_stats", "learning_records"];

export function classifySignal(signalType: string, payload?: Record<string, unknown>): SignalClassification {
  if (PROHIBITED_SIGNALS.includes(signalType)) {
    return { signal_type: signalType, shareability: "prohibited", sensitivity: "critical", reason: `Signal "${signalType}" is classified as prohibited — cannot cross any boundary.` };
  }

  if (HIGH_SENSITIVITY.includes(signalType)) {
    return { signal_type: signalType, shareability: "anonymized", sensitivity: "high", reason: `Signal "${signalType}" is high-sensitivity — requires anonymization before crossing boundaries.` };
  }

  if (AGGREGATE_ONLY.includes(signalType)) {
    return { signal_type: signalType, shareability: "aggregated", sensitivity: "standard", reason: `Signal "${signalType}" can only be shared in aggregated form.` };
  }

  // Check payload for PII markers
  if (payload && (payload.contains_pii === true || payload.sensitivity === "high")) {
    return { signal_type: signalType, shareability: "anonymized", sensitivity: "high", reason: `Payload flags indicate high sensitivity — anonymization required.` };
  }

  return { signal_type: signalType, shareability: "shareable", sensitivity: "low", reason: `Signal "${signalType}" is classified as shareable with standard controls.` };
}
