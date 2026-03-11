/**
 * blue-team-detector.ts
 * Detects anomalies and suspicious patterns from runtime signals.
 */

export interface DetectionInput {
  signal_type: string;
  target_surface: string;
  evidence: Record<string, unknown>;
}

export interface DetectionResult {
  detected: boolean;
  category: string;
  severity: string;
  description: string;
  confidence: number;
}

const DETECTION_RULES: Record<string, { severity: string; description: string }> = {
  contract_anomaly: { severity: "medium", description: "Unexpected contract input or output deviation detected." },
  tenant_scope_violation_attempt: { severity: "high", description: "Attempt to access data outside tenant boundary." },
  unsafe_runtime_action: { severity: "high", description: "Runtime action requested outside safe execution boundaries." },
  repeated_validation_escape: { severity: "medium", description: "Repeated attempts to bypass validation gates." },
  insecure_artifact_signal: { severity: "medium", description: "Generated artifact flagged with security concerns." },
  suspicious_retrieval_context: { severity: "medium", description: "Retrieval context contains suspicious or poisoned entries." },
  observability_gap: { severity: "low", description: "Gap detected in observability coverage." },
  degraded_recovery_posture: { severity: "high", description: "Recovery or rollback mechanisms are degraded." },
};

export function detect(input: DetectionInput): DetectionResult {
  const rule = DETECTION_RULES[input.signal_type];
  if (!rule) {
    return { detected: false, category: "unknown", severity: "low", description: "No matching detection rule.", confidence: 0 };
  }
  return {
    detected: true,
    category: input.signal_type,
    severity: rule.severity,
    description: `${rule.description} Surface: ${input.target_surface}.`,
    confidence: 0.75,
  };
}

export const DETECTION_CATEGORIES = Object.keys(DETECTION_RULES);
