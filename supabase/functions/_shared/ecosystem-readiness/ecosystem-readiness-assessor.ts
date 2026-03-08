/**
 * Ecosystem Readiness Assessor — Sprint 56
 * Evaluates readiness by capability, domain, or policy family.
 */

export interface ReadinessInput {
  capability_name: string;
  capability_domain: string;
  safety_prerequisite_score: number;
  policy_readiness_score: number;
  trust_requirement_score: number;
  auditability_score: number;
  blast_radius_readiness_score: number;
  internal_criticality_score: number;
  dependency_sensitivity_score: number;
}

export interface ReadinessAssessmentResult {
  capability_name: string;
  capability_domain: string;
  ecosystem_readiness_score: number;
  readiness_status: 'ready' | 'conditionally_ready' | 'not_ready' | 'premature';
  readiness_breakdown: {
    safety: number;
    policy: number;
    trust: number;
    auditability: number;
    blast_radius: number;
  };
  limiting_factors: string[];
  confidence_score: number;
}

export function assessReadiness(inputs: ReadinessInput[]): ReadinessAssessmentResult[] {
  return inputs.map(input => {
    const breakdown = {
      safety: input.safety_prerequisite_score,
      policy: input.policy_readiness_score,
      trust: input.trust_requirement_score,
      auditability: input.auditability_score,
      blast_radius: input.blast_radius_readiness_score,
    };

    // Weighted composite
    const raw = breakdown.safety * 0.3 + breakdown.policy * 0.2 + breakdown.trust * 0.2 + breakdown.auditability * 0.15 + breakdown.blast_radius * 0.15;

    // Penalize high criticality / dependency
    const criticalityPenalty = input.internal_criticality_score > 0.7 ? (input.internal_criticality_score - 0.7) * 0.5 : 0;
    const depPenalty = input.dependency_sensitivity_score > 0.7 ? (input.dependency_sensitivity_score - 0.7) * 0.4 : 0;
    const score = Math.max(0, Math.min(1, raw - criticalityPenalty - depPenalty));

    const limiting: string[] = [];
    if (breakdown.safety < 0.5) limiting.push('insufficient_safety_prerequisites');
    if (breakdown.policy < 0.5) limiting.push('insufficient_policy_readiness');
    if (breakdown.trust < 0.5) limiting.push('insufficient_trust_model');
    if (breakdown.auditability < 0.5) limiting.push('insufficient_auditability');
    if (breakdown.blast_radius < 0.5) limiting.push('high_blast_radius_risk');

    let status: ReadinessAssessmentResult['readiness_status'];
    if (score >= 0.8 && limiting.length === 0) status = 'ready';
    else if (score >= 0.6 && limiting.length <= 1) status = 'conditionally_ready';
    else if (score >= 0.3) status = 'not_ready';
    else status = 'premature';

    // Confidence penalized by inconsistencies
    const minDim = Math.min(breakdown.safety, breakdown.policy, breakdown.trust, breakdown.auditability, breakdown.blast_radius);
    const maxDim = Math.max(breakdown.safety, breakdown.policy, breakdown.trust, breakdown.auditability, breakdown.blast_radius);
    const spread = maxDim - minDim;
    const confidence = Math.max(0.1, 1 - spread * 0.5);

    return {
      capability_name: input.capability_name,
      capability_domain: input.capability_domain,
      ecosystem_readiness_score: Math.round(score * 10000) / 10000,
      readiness_status: status,
      readiness_breakdown: breakdown,
      limiting_factors: limiting,
      confidence_score: Math.round(confidence * 10000) / 10000,
    };
  });
}
