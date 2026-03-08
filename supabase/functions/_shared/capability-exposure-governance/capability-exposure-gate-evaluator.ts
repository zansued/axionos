/**
 * Capability Exposure Gate Evaluator — Sprint 57
 * Evaluates safety, trust, auditability, and policy gate readiness.
 */

export interface GateInput {
  capability_name: string;
  safety_prerequisite_score: number;
  trust_requirement_score: number;
  policy_readiness_score: number;
  auditability_score: number;
  dependency_sensitivity_score: number;
  criticality_score: number;
}

export interface GateEvaluation {
  capability_name: string;
  safety_gate_score: number;
  trust_gate_score: number;
  policy_gate_score: number;
  auditability_gate_score: number;
  overall_gate_score: number;
  gates_passed: string[];
  gates_failed: string[];
  bounded_exposure_readiness_score: number;
  blast_radius_constraint_score: number;
}

const GATE_THRESHOLD = 0.5;

export function evaluateGates(inputs: GateInput[]): GateEvaluation[] {
  return inputs.map(input => {
    const passed: string[] = [];
    const failed: string[] = [];

    if (input.safety_prerequisite_score >= GATE_THRESHOLD) passed.push('safety'); else failed.push('safety');
    if (input.trust_requirement_score >= GATE_THRESHOLD) passed.push('trust'); else failed.push('trust');
    if (input.policy_readiness_score >= GATE_THRESHOLD) passed.push('policy'); else failed.push('policy');
    if (input.auditability_score >= GATE_THRESHOLD) passed.push('auditability'); else failed.push('auditability');

    const overall = input.safety_prerequisite_score * 0.3 + input.trust_requirement_score * 0.25 + input.policy_readiness_score * 0.25 + input.auditability_score * 0.2;
    const critPenalty = input.criticality_score > 0.7 ? (input.criticality_score - 0.7) * 0.5 : 0;
    const depPenalty = input.dependency_sensitivity_score > 0.7 ? (input.dependency_sensitivity_score - 0.7) * 0.4 : 0;
    const boundedReadiness = Math.max(0, Math.min(1, overall - critPenalty - depPenalty));
    const blastRadius = Math.max(0, 1 - input.criticality_score * 0.4 - input.dependency_sensitivity_score * 0.3 - (1 - input.auditability_score) * 0.3);

    return {
      capability_name: input.capability_name,
      safety_gate_score: input.safety_prerequisite_score,
      trust_gate_score: input.trust_requirement_score,
      policy_gate_score: input.policy_readiness_score,
      auditability_gate_score: input.auditability_score,
      overall_gate_score: Math.round(overall * 10000) / 10000,
      gates_passed: passed,
      gates_failed: failed,
      bounded_exposure_readiness_score: Math.round(boundedReadiness * 10000) / 10000,
      blast_radius_constraint_score: Math.round(blastRadius * 10000) / 10000,
    };
  });
}
