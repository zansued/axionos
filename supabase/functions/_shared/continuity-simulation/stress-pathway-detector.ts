/**
 * Stress Pathway Detector — Sprint 110
 * Identifies where disruption accumulates and becomes structural.
 */

export interface StressPoint {
  stress_type: string;
  severity: string;
  stress_summary: string;
  payload: Record<string, unknown>;
}

export function detectStressPoints(
  scenario_type: string,
  scenario_severity: number,
  subject_type: string
): StressPoint[] {
  const points: StressPoint[] = [];

  const severityLabel = scenario_severity >= 0.8 ? "critical"
    : scenario_severity >= 0.6 ? "high"
    : scenario_severity >= 0.4 ? "medium"
    : "low";

  // Primary stress from scenario type
  const typeStress: Record<string, StressPoint> = {
    regulatory_shift: { stress_type: "compliance_overload", severity: severityLabel, stress_summary: "Regulatory changes force rapid compliance adaptation", payload: { domain: "compliance" } },
    political_shift: { stress_type: "legitimacy_pressure", severity: severityLabel, stress_summary: "Political environment destabilizes institutional legitimacy", payload: { domain: "governance" } },
    technological_disruption: { stress_type: "capability_obsolescence", severity: severityLabel, stress_summary: "Core capabilities face technological displacement", payload: { domain: "technology" } },
    budget_collapse: { stress_type: "resource_scarcity", severity: severityLabel, stress_summary: "Financial constraints force structural contraction", payload: { domain: "finance" } },
    talent_loss: { stress_type: "knowledge_drain", severity: severityLabel, stress_summary: "Critical expertise leaves the institution", payload: { domain: "human_capital" } },
    trust_erosion: { stress_type: "stakeholder_withdrawal", severity: severityLabel, stress_summary: "Trust degradation reduces institutional support base", payload: { domain: "reputation" } },
    dependency_failure: { stress_type: "supply_chain_break", severity: severityLabel, stress_summary: "Critical dependency becomes unavailable", payload: { domain: "operations" } },
    mission_drift_compound: { stress_type: "identity_dissolution", severity: severityLabel, stress_summary: "Accumulated drift erodes institutional purpose", payload: { domain: "mission" } },
  };

  if (typeStress[scenario_type]) points.push(typeStress[scenario_type]);

  // Cascading stress
  if (scenario_severity >= 0.6) {
    points.push({
      stress_type: "cascade_propagation",
      severity: scenario_severity >= 0.8 ? "high" : "medium",
      stress_summary: "Primary disruption cascades into adjacent institutional functions",
      payload: { affected_subject_type: subject_type },
    });
  }

  if (scenario_severity >= 0.8) {
    points.push({
      stress_type: "structural_integrity_risk",
      severity: "critical",
      stress_summary: "Institutional structure faces potential irreversible damage",
      payload: { threshold: "critical" },
    });
  }

  return points;
}
