/**
 * Corrosion Signal Detector — Sprint 114
 * Detects governance erosion, boundary weakening, and integrity degradation.
 */

export interface CorrosionInput {
  governance_override_count: number;
  unenforced_rules_count: number;
  boundary_violations_count: number;
  stale_review_count: number;
  unresolved_drift_count: number;
  repeated_exception_count: number;
}

export interface CorrosionResult {
  corrosion_score: number;
  severity: "low" | "moderate" | "high" | "critical";
  signals: Array<{ type: string; weight: number; description: string }>;
}

export function detectCorrosion(input: CorrosionInput): CorrosionResult {
  const signals: CorrosionResult["signals"] = [];
  let score = 0;

  if (input.governance_override_count > 3) {
    const w = Math.min(0.25, input.governance_override_count * 0.05);
    score += w;
    signals.push({ type: "governance_override_erosion", weight: w, description: `${input.governance_override_count} governance overrides detected` });
  }
  if (input.unenforced_rules_count > 0) {
    const w = Math.min(0.2, input.unenforced_rules_count * 0.04);
    score += w;
    signals.push({ type: "unenforced_rules", weight: w, description: `${input.unenforced_rules_count} rules declared but not enforced` });
  }
  if (input.boundary_violations_count > 0) {
    const w = Math.min(0.3, input.boundary_violations_count * 0.1);
    score += w;
    signals.push({ type: "boundary_violations", weight: w, description: `${input.boundary_violations_count} kernel boundary violations` });
  }
  if (input.stale_review_count > 5) {
    const w = 0.1;
    score += w;
    signals.push({ type: "stale_reviews", weight: w, description: `${input.stale_review_count} stale unresolved reviews` });
  }
  if (input.unresolved_drift_count > 2) {
    const w = Math.min(0.2, input.unresolved_drift_count * 0.05);
    score += w;
    signals.push({ type: "unresolved_drift", weight: w, description: `${input.unresolved_drift_count} unresolved drift cases` });
  }
  if (input.repeated_exception_count > 3) {
    const w = 0.15;
    score += w;
    signals.push({ type: "repeated_exceptions", weight: w, description: `${input.repeated_exception_count} repeated exceptions normalized` });
  }

  score = Math.min(1, score);
  let severity: CorrosionResult["severity"] = "low";
  if (score > 0.7) severity = "critical";
  else if (score > 0.5) severity = "high";
  else if (score > 0.3) severity = "moderate";

  return { corrosion_score: Math.round(score * 10000) / 10000, severity, signals };
}
