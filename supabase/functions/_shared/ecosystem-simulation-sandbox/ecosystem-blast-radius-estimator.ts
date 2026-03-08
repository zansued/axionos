/**
 * Ecosystem Blast Radius Estimator — Sprint 59
 * Estimates possible blast radius and containment posture of future activation paths.
 */

export interface BlastRadiusInput {
  dependency_sensitivity_score: number;
  internal_criticality_score: number;
  isolation_boundary_strength: number;
  rollback_feasibility: number;
}

export interface BlastRadiusResult {
  blast_radius_score: number;
  containment_quality_score: number;
  risk_factors: string[];
}

export function estimateBlastRadius(input: BlastRadiusInput): BlastRadiusResult {
  const factors: string[] = [];
  const raw = input.dependency_sensitivity_score * 0.4 + input.internal_criticality_score * 0.3 + (1 - input.isolation_boundary_strength) * 0.3;
  const containment = input.isolation_boundary_strength * 0.5 + input.rollback_feasibility * 0.5;

  if (raw > 0.6) factors.push('large_blast_radius');
  if (input.isolation_boundary_strength < 0.4) factors.push('weak_isolation');
  if (input.rollback_feasibility < 0.4) factors.push('low_rollback_feasibility');

  return {
    blast_radius_score: Math.round(Math.min(1, raw) * 10000) / 10000,
    containment_quality_score: Math.round(Math.min(1, containment) * 10000) / 10000,
    risk_factors: factors,
  };
}
