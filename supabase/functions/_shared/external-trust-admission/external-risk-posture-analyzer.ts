/**
 * External Risk Posture Analyzer — Sprint 58
 * Evaluates risk and restriction posture for external actors.
 */

export interface RiskPostureInput {
  identity_confidence_score: number;
  evidence_completeness_score: number;
  auditability_score: number;
  policy_alignment_score: number;
  risk_score: number;
  external_actor_type: string;
}

export interface RiskPostureResult {
  overall_risk_posture: string;
  restriction_pressure: number;
  bounded_participation_viability_score: number;
  risk_factors: string[];
}

export function analyzeRiskPosture(input: RiskPostureInput): RiskPostureResult {
  const factors: string[] = [];
  let restrictionPressure = 0;

  if (input.identity_confidence_score < 0.3) { restrictionPressure += 0.3; factors.push('weak_identity'); }
  if (input.evidence_completeness_score < 0.3) { restrictionPressure += 0.2; factors.push('weak_evidence'); }
  if (input.auditability_score < 0.3) { restrictionPressure += 0.25; factors.push('weak_auditability'); }
  if (input.risk_score > 0.7) { restrictionPressure += 0.25; factors.push('high_risk'); }
  if (input.policy_alignment_score < 0.3) { restrictionPressure += 0.15; factors.push('weak_policy_alignment'); }
  if (input.external_actor_type === 'unknown') { restrictionPressure += 0.1; factors.push('unknown_actor_type'); }

  restrictionPressure = Math.min(1, restrictionPressure);

  const viability = Math.max(0, 1 - restrictionPressure);

  let posture = 'moderate';
  if (restrictionPressure > 0.7) posture = 'critical';
  else if (restrictionPressure > 0.5) posture = 'high';
  else if (restrictionPressure > 0.3) posture = 'moderate';
  else posture = 'low';

  return {
    overall_risk_posture: posture,
    restriction_pressure: Math.round(restrictionPressure * 10000) / 10000,
    bounded_participation_viability_score: Math.round(viability * 10000) / 10000,
    risk_factors: factors,
  };
}
