/**
 * Capability Exposure Risk Bounding Engine — Sprint 57
 * Bounds blast radius and limits over-exposure recommendations.
 */

export interface RiskBoundInput {
  capability_name: string;
  externalization_risk_score: number;
  dependency_sensitivity_score: number;
  criticality_score: number;
  blast_radius_estimate: number;
  isolation_strength: number;
  rollback_feasibility: number;
}

export interface RiskBoundResult {
  capability_name: string;
  bounded_risk_score: number;
  blast_radius_constraint_score: number;
  risk_class: 'low' | 'moderate' | 'high' | 'critical';
  risk_factors: string[];
  mitigations: string[];
}

export function boundExposureRisk(inputs: RiskBoundInput[]): RiskBoundResult[] {
  return inputs.map(input => {
    const factors: string[] = [];
    const mitigations: string[] = [];

    if (input.externalization_risk_score > 0.7) factors.push('high_externalization_risk');
    if (input.dependency_sensitivity_score > 0.7) factors.push('high_dependency_sensitivity');
    if (input.blast_radius_estimate > 0.6) factors.push('large_blast_radius');
    if (input.criticality_score > 0.7) factors.push('core_system_dependency');
    if (input.isolation_strength > 0.7) mitigations.push('strong_isolation');
    if (input.rollback_feasibility > 0.7) mitigations.push('high_rollback_feasibility');

    const rawRisk = input.externalization_risk_score * 0.3 + input.dependency_sensitivity_score * 0.25 + input.blast_radius_estimate * 0.25 + input.criticality_score * 0.2;
    const mitigation = (input.isolation_strength * 0.5 + input.rollback_feasibility * 0.5) * 0.3;
    const bounded = Math.max(0, Math.min(1, rawRisk - mitigation));
    const blastConstraint = Math.max(0, 1 - input.blast_radius_estimate * 0.5 - (1 - input.isolation_strength) * 0.3 - (1 - input.rollback_feasibility) * 0.2);

    let riskClass: RiskBoundResult['risk_class'];
    if (bounded >= 0.75) riskClass = 'critical';
    else if (bounded >= 0.5) riskClass = 'high';
    else if (bounded >= 0.25) riskClass = 'moderate';
    else riskClass = 'low';

    return {
      capability_name: input.capability_name,
      bounded_risk_score: Math.round(bounded * 10000) / 10000,
      blast_radius_constraint_score: Math.round(blastConstraint * 10000) / 10000,
      risk_class: riskClass,
      risk_factors: factors,
      mitigations,
    };
  });
}
