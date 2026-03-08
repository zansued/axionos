/**
 * Marketplace Pilot Interaction Monitor — Sprint 60
 * Tracks bounded pilot interactions, usage patterns, and deviations.
 */

export interface InteractionSummary {
  total_interactions: number;
  by_type: Record<string, number>;
  anomaly_count: number;
  avg_policy_compliance: number;
  avg_trust_stability: number;
  deviation_alerts: string[];
}

export function summarizeInteractions(interactions: any[]): InteractionSummary {
  const byType: Record<string, number> = {};
  let anomalyCount = 0;
  let policySum = 0;
  let trustSum = 0;
  const alerts: string[] = [];

  for (const i of interactions) {
    byType[i.interaction_type] = (byType[i.interaction_type] || 0) + 1;
    const flags = Array.isArray(i.anomaly_flags) ? i.anomaly_flags : [];
    if (flags.length > 0) anomalyCount++;
    policySum += Number(i.policy_compliance_score || 0);
    trustSum += Number(i.trust_stability_score || 0);
  }

  const n = interactions.length || 1;
  const avgPolicy = policySum / n;
  const avgTrust = trustSum / n;

  if (avgPolicy < 0.5) alerts.push('low_avg_policy_compliance');
  if (avgTrust < 0.5) alerts.push('low_avg_trust_stability');
  if (anomalyCount > n * 0.1) alerts.push('high_anomaly_rate');

  return {
    total_interactions: interactions.length,
    by_type: byType,
    anomaly_count: anomalyCount,
    avg_policy_compliance: Math.round(avgPolicy * 10000) / 10000,
    avg_trust_stability: Math.round(avgTrust * 10000) / 10000,
    deviation_alerts: alerts,
  };
}
