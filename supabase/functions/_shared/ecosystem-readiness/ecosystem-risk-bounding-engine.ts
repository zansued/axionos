/**
 * Ecosystem Risk Bounding Engine — Sprint 56
 * Evaluates bounded externalization risk, dependency sensitivity, and blast radius concerns.
 */

export interface RiskBoundingInput {
  capability_name: string;
  externalization_risk_score: number;
  dependency_sensitivity_score: number;
  internal_criticality_score: number;
  blast_radius_estimate: number;
  isolation_boundary_strength: number;
  rollback_feasibility: number;
}

export interface RiskBoundingResult {
  capability_name: string;
  bounded_risk_score: number;
  blast_radius_readiness_score: number;
  risk_class: 'low' | 'moderate' | 'high' | 'critical';
  risk_factors: string[];
  mitigations_available: string[];
}

export function evaluateRiskBounds(inputs: RiskBoundingInput[]): RiskBoundingResult[] {
  return inputs.map(input => {
    const riskFactors: string[] = [];
    const mitigations: string[] = [];

    if (input.externalization_risk_score > 0.7) riskFactors.push('high_externalization_risk');
    if (input.dependency_sensitivity_score > 0.7) riskFactors.push('high_dependency_sensitivity');
    if (input.blast_radius_estimate > 0.6) riskFactors.push('large_blast_radius');
    if (input.internal_criticality_score > 0.7) riskFactors.push('core_system_dependency');

    if (input.isolation_boundary_strength > 0.7) mitigations.push('strong_isolation_boundary');
    if (input.rollback_feasibility > 0.7) mitigations.push('high_rollback_feasibility');

    const rawRisk = input.externalization_risk_score * 0.3 + input.dependency_sensitivity_score * 0.25 + input.blast_radius_estimate * 0.25 + input.internal_criticality_score * 0.2;
    const mitigation = (input.isolation_boundary_strength * 0.5 + input.rollback_feasibility * 0.5) * 0.3;
    const boundedRisk = Math.max(0, Math.min(1, rawRisk - mitigation));

    const blastRadiusReadiness = Math.max(0, 1 - input.blast_radius_estimate * 0.5 - (1 - input.isolation_boundary_strength) * 0.3 - (1 - input.rollback_feasibility) * 0.2);

    let riskClass: RiskBoundingResult['risk_class'];
    if (boundedRisk >= 0.75) riskClass = 'critical';
    else if (boundedRisk >= 0.5) riskClass = 'high';
    else if (boundedRisk >= 0.25) riskClass = 'moderate';
    else riskClass = 'low';

    return {
      capability_name: input.capability_name,
      bounded_risk_score: Math.round(boundedRisk * 10000) / 10000,
      blast_radius_readiness_score: Math.round(blastRadiusReadiness * 10000) / 10000,
      risk_class: riskClass,
      risk_factors: riskFactors,
      mitigations_available: mitigations,
    };
  });
}
