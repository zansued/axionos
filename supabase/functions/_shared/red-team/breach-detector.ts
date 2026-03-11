/**
 * breach-detector.ts
 * Analyzes simulation run logs for boundary breach indicators.
 */

export interface BreachCheckInput {
  run_log: Array<{ step: string; outcome: string; timestamp: string }>;
  failed_items: string[];
  fragile_items: string[];
  threat_domain: string;
}

export interface BreachResult {
  breach_detected: boolean;
  breach_type: string | null;
  severity: string;
  description: string;
  remediation_hint: string;
}

const BREACH_KEYWORDS = [
  "bypass", "escalation", "unauthorized", "violation",
  "cross_tenant", "injection", "poisoning", "mutation",
];

export function detectBreach(input: BreachCheckInput): BreachResult {
  // Check for explicit failures that indicate breach
  if (input.failed_items.length > 0) {
    const hasCriticalFailure = input.failed_items.some(
      (f) => f.includes("boundary") || f.includes("isolation") || f.includes("permission")
    );
    if (hasCriticalFailure) {
      return {
        breach_detected: true,
        breach_type: "boundary_violation",
        severity: "high",
        description: `Critical boundary failure detected in: ${input.failed_items.join(", ")}`,
        remediation_hint: "Review and harden boundary enforcement for affected surfaces.",
      };
    }
  }

  // Check run log for breach indicators
  for (const entry of input.run_log) {
    const outcomeLC = entry.outcome.toLowerCase();
    if (BREACH_KEYWORDS.some((kw) => outcomeLC.includes(kw) && !outcomeLC.includes("blocked") && !outcomeLC.includes("denied") && !outcomeLC.includes("rejected"))) {
      return {
        breach_detected: true,
        breach_type: "simulation_indicator",
        severity: "medium",
        description: `Breach indicator in step "${entry.step}": ${entry.outcome}`,
        remediation_hint: "Investigate the flagged step and reinforce the affected control.",
      };
    }
  }

  return {
    breach_detected: false,
    breach_type: null,
    severity: "none",
    description: "No breach indicators detected.",
    remediation_hint: "",
  };
}
