/**
 * Kernel Integrity Snapshotter — Sprint 114
 * Computes a composite kernel integrity snapshot from sub-scores.
 */

export interface KernelSnapshotInput {
  legibility_score: number;
  governance_integrity_score: number;
  architectural_coherence_score: number;
  bloat_score: number;
  corrosion_score: number;
  existential_drift_score: number;
  mutation_pressure_score: number;
}

export interface KernelSnapshot {
  legibility_score: number;
  governance_integrity_score: number;
  architectural_coherence_score: number;
  bloat_score: number;
  corrosion_score: number;
  existential_drift_score: number;
  mutation_pressure_score: number;
  overall_health_score: number;
  posture: "healthy" | "stable" | "degrading" | "critical";
  rationale: string[];
}

const WEIGHTS = {
  legibility: 0.15,
  governance: 0.20,
  coherence: 0.15,
  bloat_penalty: 0.15,
  corrosion_penalty: 0.20,
  drift_penalty: 0.10,
  pressure_penalty: 0.05,
};

export function computeKernelSnapshot(input: KernelSnapshotInput): KernelSnapshot {
  const rationale: string[] = [];

  const positive = input.legibility_score * WEIGHTS.legibility
    + input.governance_integrity_score * WEIGHTS.governance
    + input.architectural_coherence_score * WEIGHTS.coherence;

  const negative = input.bloat_score * WEIGHTS.bloat_penalty
    + input.corrosion_score * WEIGHTS.corrosion_penalty
    + input.existential_drift_score * WEIGHTS.drift_penalty
    + input.mutation_pressure_score * WEIGHTS.pressure_penalty;

  const health = Math.max(0, Math.min(1, positive - negative));

  if (input.bloat_score > 0.6) rationale.push("high_bloat");
  if (input.corrosion_score > 0.5) rationale.push("active_corrosion");
  if (input.existential_drift_score > 0.4) rationale.push("existential_drift_detected");
  if (input.governance_integrity_score < 0.5) rationale.push("governance_weakening");
  if (input.legibility_score < 0.4) rationale.push("low_legibility");
  if (input.mutation_pressure_score > 0.7) rationale.push("excessive_mutation_pressure");

  let posture: KernelSnapshot["posture"] = "healthy";
  if (health < 0.3) posture = "critical";
  else if (health < 0.5) posture = "degrading";
  else if (health < 0.7) posture = "stable";

  return {
    ...input,
    overall_health_score: Math.round(health * 10000) / 10000,
    posture,
    rationale,
  };
}
