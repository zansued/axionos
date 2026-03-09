/**
 * Boundary Violation Detector — Sprint 101
 * Detects attempts to cross boundaries improperly.
 */

export interface ViolationDetectionInput {
  boundary_type: string;
  transfer_decision: string;
  signal_type: string;
  source_scope: string;
  target_scope: string;
  sensitivity: string;
}

export interface DetectedViolation {
  violation_type: string;
  severity: "low" | "moderate" | "high" | "critical";
  summary: string;
}

export function detectViolations(input: ViolationDetectionInput): DetectedViolation[] {
  const violations: DetectedViolation[] = [];

  // Hard boundary crossing attempt
  if (input.boundary_type === "hard" && input.transfer_decision !== "denied") {
    violations.push({
      violation_type: "hard_boundary_bypass",
      severity: "critical",
      summary: `Attempt to bypass hard boundary between "${input.source_scope}" and "${input.target_scope}" for signal "${input.signal_type}".`,
    });
  }

  // Critical data crossing any boundary without anonymization
  if (input.sensitivity === "critical" && input.transfer_decision === "allowed") {
    violations.push({
      violation_type: "critical_data_leak",
      severity: "critical",
      summary: `Critical-sensitivity signal "${input.signal_type}" was allowed to cross boundary without transformation.`,
    });
  }

  // High-sensitivity data on aggregate-only boundary without aggregation
  if (input.boundary_type === "aggregate_only" && input.sensitivity === "high" && input.transfer_decision === "allowed") {
    violations.push({
      violation_type: "aggregate_boundary_raw_transfer",
      severity: "high",
      summary: `High-sensitivity signal transferred raw through aggregate-only boundary.`,
    });
  }

  // Denied but repeated attempts (would need history — flag as warning)
  if (input.transfer_decision === "denied" && input.sensitivity === "critical") {
    violations.push({
      violation_type: "suspicious_denied_attempt",
      severity: "moderate",
      summary: `Denied transfer of critical signal "${input.signal_type}" — flagged for monitoring.`,
    });
  }

  return violations;
}
