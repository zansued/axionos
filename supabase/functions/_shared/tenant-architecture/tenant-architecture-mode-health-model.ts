/**
 * Tenant Architecture Mode Health Model — Sprint 47
 * Health model for tenant-aware architecture modes.
 */

export interface ModeHealthInput {
  active_mode_count: number;
  total_mode_count: number;
  fragmentation_risk_score: number;
  divergence_drift_score: number;
  mode_stability_score: number;
  specialization_value_score: number;
  architecture_fitness_score: number;
  anti_fragmentation_violations: number;
}

export interface ModeHealthOutput {
  architecture_mode_coherence_index: number;
  tenant_divergence_index: number;
  anti_fragmentation_integrity_index: number;
  mode_stability_index: number;
  scope_specialization_value_index: number;
  architecture_mode_fitness_index: number;
  overall_health_score: number;
  health_status: "healthy" | "watch" | "degrading" | "critical";
}

export function computeModeHealth(input: ModeHealthInput): ModeHealthOutput {
  const coherence = input.total_mode_count > 0
    ? Math.max(0, 1 - (input.active_mode_count / Math.max(input.total_mode_count, 10)))
    : 1;

  const divergence = 1 - Math.min(1, input.divergence_drift_score);
  const antiFragIntegrity = input.anti_fragmentation_violations === 0 ? 1 : Math.max(0, 1 - input.anti_fragmentation_violations * 0.2);
  const stability = Math.min(1, Math.max(0, input.mode_stability_score));
  const specialization = Math.min(1, Math.max(0, input.specialization_value_score));
  const fitness = Math.min(1, Math.max(0, input.architecture_fitness_score));

  const overall = (
    coherence * 0.15 +
    divergence * 0.2 +
    antiFragIntegrity * 0.2 +
    stability * 0.15 +
    specialization * 0.1 +
    fitness * 0.2
  );

  let status: ModeHealthOutput["health_status"];
  if (overall >= 0.75) status = "healthy";
  else if (overall >= 0.55) status = "watch";
  else if (overall >= 0.35) status = "degrading";
  else status = "critical";

  return {
    architecture_mode_coherence_index: coherence,
    tenant_divergence_index: divergence,
    anti_fragmentation_integrity_index: antiFragIntegrity,
    mode_stability_index: stability,
    scope_specialization_value_index: specialization,
    architecture_mode_fitness_index: fitness,
    overall_health_score: overall,
    health_status: status,
  };
}
