/**
 * Marketplace Pilot Risk Monitor — Sprint 60
 * Tracks risk posture, trust degradation, and rollback trigger conditions.
 */

export interface PilotRiskPosture {
  pilot_risk_score: number;
  rollback_trigger_score: number;
  trust_stability_score: number;
  risk_factors: string[];
  rollback_recommended: boolean;
}

export function assessPilotRisk(
  violationRate: number,
  avgPolicyCompliance: number,
  avgTrustStability: number,
  anomalyRate: number
): PilotRiskPosture {
  const factors: string[] = [];
  let risk = 0;

  if (violationRate > 0.2) { risk += 0.3; factors.push('high_violation_rate'); }
  if (avgPolicyCompliance < 0.5) { risk += 0.25; factors.push('low_policy_compliance'); }
  if (avgTrustStability < 0.5) { risk += 0.25; factors.push('low_trust_stability'); }
  if (anomalyRate > 0.15) { risk += 0.2; factors.push('high_anomaly_rate'); }

  risk = Math.min(1, risk);
  const rollbackTrigger = risk > 0.6 ? risk : risk * 0.5;
  const rollbackRecommended = rollbackTrigger > 0.5;

  if (rollbackRecommended) factors.push('rollback_recommended');

  return {
    pilot_risk_score: Math.round(risk * 10000) / 10000,
    rollback_trigger_score: Math.round(rollbackTrigger * 10000) / 10000,
    trust_stability_score: Math.round(avgTrustStability * 10000) / 10000,
    risk_factors: factors,
    rollback_recommended: rollbackRecommended,
  };
}
