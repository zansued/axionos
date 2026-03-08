/**
 * Architecture Pilot Risk Monitor — Sprint 41
 *
 * Monitors pilot health and detects degradation, oscillation,
 * rollback trigger breaches, and cross-scope side effects.
 */

export interface PilotHealthSnapshot {
  pilot_id: string;
  harm_score: number;
  benefit_score: number;
  rollback_signal_count: number;
  oscillation_detected: boolean;
  cross_scope_side_effects: string[];
  sandbox_expectation_drift: number; // 0-1
  baseline_mismatch_detected: boolean;
}

export interface PilotRiskAssessment {
  risk_level: "low" | "moderate" | "high" | "critical";
  risk_flags: string[];
  recommended_action: "continue" | "monitor_closely" | "pause" | "rollback_immediately";
  rationale: string[];
}

export function assessPilotRisk(snapshot: PilotHealthSnapshot): PilotRiskAssessment {
  const flags: string[] = [];
  const rationale: string[] = [];

  if (snapshot.harm_score > 0.3) {
    flags.push("high_harm_score");
    rationale.push(`Harm score ${snapshot.harm_score.toFixed(2)} exceeds threshold`);
  }

  if (snapshot.rollback_signal_count > 3) {
    flags.push("rollback_trigger_breach");
    rationale.push(`${snapshot.rollback_signal_count} rollback signals detected`);
  }

  if (snapshot.oscillation_detected) {
    flags.push("oscillation_detected");
    rationale.push("Unstable oscillation in pilot metrics");
  }

  if (snapshot.cross_scope_side_effects.length > 0) {
    flags.push("cross_scope_side_effects");
    rationale.push(`Side effects in: ${snapshot.cross_scope_side_effects.join(", ")}`);
  }

  if (snapshot.sandbox_expectation_drift > 0.4) {
    flags.push("sandbox_drift");
    rationale.push(`Pilot behavior drifted ${(snapshot.sandbox_expectation_drift * 100).toFixed(0)}% from sandbox expectations`);
  }

  if (snapshot.baseline_mismatch_detected) {
    flags.push("baseline_mismatch");
    rationale.push("Baseline comparison invalid — conditions changed");
  }

  // Determine risk level
  const criticalFlags = ["rollback_trigger_breach", "baseline_mismatch"];
  const highFlags = ["high_harm_score", "oscillation_detected", "cross_scope_side_effects"];

  const hasCritical = flags.some((f) => criticalFlags.includes(f));
  const hasHigh = flags.some((f) => highFlags.includes(f));

  let risk_level: PilotRiskAssessment["risk_level"];
  let recommended_action: PilotRiskAssessment["recommended_action"];

  if (hasCritical) {
    risk_level = "critical";
    recommended_action = "rollback_immediately";
  } else if (hasHigh) {
    risk_level = "high";
    recommended_action = "pause";
  } else if (flags.length > 0) {
    risk_level = "moderate";
    recommended_action = "monitor_closely";
  } else {
    risk_level = "low";
    recommended_action = "continue";
    rationale.push("No risk signals detected");
  }

  return { risk_level, risk_flags: flags, recommended_action, rationale };
}
