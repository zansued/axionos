/**
 * Capability Exposure Classifier — Sprint 57
 * Assigns bounded exposure classes based on readiness, criticality, trust, and policy factors.
 */

export interface ExposureClassInput {
  capability_name: string;
  criticality_score: number;
  dependency_sensitivity_score: number;
  safety_gate_score: number;
  trust_gate_score: number;
  policy_gate_score: number;
  auditability_score: number;
  current_readiness_score: number;
}

export type ExposureClass = 'never_expose' | 'internal_only' | 'partner_limited' | 'sandbox_only' | 'controlled_future_candidate';

export interface ExposureClassification {
  capability_name: string;
  exposure_class: ExposureClass;
  exposure_class_confidence_score: number;
  classification_factors: string[];
  gate_summary: { safety: number; trust: number; policy: number; auditability: number };
}

export function classifyExposure(inputs: ExposureClassInput[]): ExposureClassification[] {
  return inputs.map(input => {
    const factors: string[] = [];
    const gates = {
      safety: input.safety_gate_score,
      trust: input.trust_gate_score,
      policy: input.policy_gate_score,
      auditability: input.auditability_score,
    };

    if (input.criticality_score > 0.9) {
      factors.push('extreme_criticality');
      return { capability_name: input.capability_name, exposure_class: 'never_expose' as ExposureClass, exposure_class_confidence_score: 0.95, classification_factors: factors, gate_summary: gates };
    }

    if (input.dependency_sensitivity_score > 0.85) {
      factors.push('high_dependency_sensitivity');
      return { capability_name: input.capability_name, exposure_class: 'internal_only' as ExposureClass, exposure_class_confidence_score: 0.9, classification_factors: factors, gate_summary: gates };
    }

    const minGate = Math.min(gates.safety, gates.trust, gates.policy, gates.auditability);
    if (minGate < 0.3) {
      factors.push('critical_gate_failure');
      return { capability_name: input.capability_name, exposure_class: 'internal_only' as ExposureClass, exposure_class_confidence_score: 0.85, classification_factors: factors, gate_summary: gates };
    }

    if (minGate < 0.5 || input.current_readiness_score < 0.5) {
      factors.push('partial_gate_readiness');
      const conf = (minGate + input.current_readiness_score) / 2;
      return { capability_name: input.capability_name, exposure_class: 'partner_limited' as ExposureClass, exposure_class_confidence_score: Math.round(conf * 10000) / 10000, classification_factors: factors, gate_summary: gates };
    }

    if (input.current_readiness_score < 0.7) {
      factors.push('sandbox_readiness_level');
      return { capability_name: input.capability_name, exposure_class: 'sandbox_only' as ExposureClass, exposure_class_confidence_score: Math.round(input.current_readiness_score * 10000) / 10000, classification_factors: factors, gate_summary: gates };
    }

    factors.push('meets_controlled_candidate_criteria');
    const confidence = (gates.safety * 0.3 + gates.trust * 0.25 + gates.policy * 0.25 + gates.auditability * 0.2);
    return { capability_name: input.capability_name, exposure_class: 'controlled_future_candidate' as ExposureClass, exposure_class_confidence_score: Math.round(confidence * 10000) / 10000, classification_factors: factors, gate_summary: gates };
  });
}
