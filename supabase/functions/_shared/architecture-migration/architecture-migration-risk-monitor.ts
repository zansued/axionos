/**
 * Architecture Migration Risk Monitor — Sprint 42
 *
 * Continuous risk monitoring during migration execution.
 */

export interface MigrationHealthSnapshot {
  migration_id: string;
  phase_number: number;
  degradation_vs_baseline: number; // 0-1
  repair_burden_increase: number; // 0-1
  validation_failure_increase: number; // 0-1
  tenant_impact_drift: number; // 0-1
  observability_blind_spots: number;
  rollback_trigger_proximity: number; // 0-1
  policy_strategy_side_effects: string[];
  checkpoint_drift: number; // 0-1
}

export interface MigrationRiskAssessment {
  risk_level: "low" | "moderate" | "high" | "critical";
  risk_flags: string[];
  recommendation: "continue" | "monitor_closely" | "pause" | "rollback";
  rationale: string[];
}

export function assessMigrationRisk(snapshot: MigrationHealthSnapshot): MigrationRiskAssessment {
  const flags: string[] = [];
  const rationale: string[] = [];

  if (snapshot.degradation_vs_baseline > 0.3) {
    flags.push("high_degradation");
    rationale.push(`Degradation ${(snapshot.degradation_vs_baseline * 100).toFixed(0)}% vs baseline`);
  }
  if (snapshot.repair_burden_increase > 0.25) {
    flags.push("repair_burden_spike");
    rationale.push(`Repair burden increased ${(snapshot.repair_burden_increase * 100).toFixed(0)}%`);
  }
  if (snapshot.validation_failure_increase > 0.2) {
    flags.push("validation_failures");
    rationale.push(`Validation failures up ${(snapshot.validation_failure_increase * 100).toFixed(0)}%`);
  }
  if (snapshot.tenant_impact_drift > 0.3) {
    flags.push("tenant_impact");
    rationale.push(`Tenant impact drift ${(snapshot.tenant_impact_drift * 100).toFixed(0)}%`);
  }
  if (snapshot.rollback_trigger_proximity > 0.8) {
    flags.push("rollback_imminent");
    rationale.push("Near rollback trigger threshold");
  }
  if (snapshot.policy_strategy_side_effects.length > 0) {
    flags.push("side_effects");
    rationale.push(`Side effects: ${snapshot.policy_strategy_side_effects.join(", ")}`);
  }
  if (snapshot.observability_blind_spots > 2) {
    flags.push("observability_gaps");
    rationale.push(`${snapshot.observability_blind_spots} observability blind spots`);
  }

  const criticalFlags = ["rollback_imminent", "high_degradation"];
  const highFlags = ["repair_burden_spike", "tenant_impact", "validation_failures"];

  const hasCritical = flags.some(f => criticalFlags.includes(f));
  const hasHigh = flags.some(f => highFlags.includes(f));

  if (hasCritical) return { risk_level: "critical", risk_flags: flags, recommendation: "rollback", rationale };
  if (hasHigh) return { risk_level: "high", risk_flags: flags, recommendation: "pause", rationale };
  if (flags.length > 0) return { risk_level: "moderate", risk_flags: flags, recommendation: "monitor_closely", rationale };
  return { risk_level: "low", risk_flags: [], recommendation: "continue", rationale: ["No risk signals detected"] };
}
