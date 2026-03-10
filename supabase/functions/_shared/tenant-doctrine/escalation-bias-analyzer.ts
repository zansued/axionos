/**
 * Escalation Bias Analyzer
 * Analyzes organizational escalation patterns and incident response posture.
 */

export interface EscalationProfile {
  escalation_speed: string;
  auto_escalation_threshold: number;
  human_review_preference: number;
  incident_response_bias: string;
}

export function analyzeEscalationBias(
  incidentEvents: any[],
  approvalEvents: any[],
  escalationEvents: any[]
): EscalationProfile {
  const totalIncidents = incidentEvents.length || 1;
  const escalationRate = escalationEvents.length / totalIncidents;
  const approvalRate = approvalEvents.length / Math.max(totalIncidents + approvalEvents.length, 1);

  const speed = escalationRate > 0.5 ? 'fast' : escalationRate > 0.2 ? 'moderate' : 'slow';
  const autoThreshold = escalationRate > 0.5 ? 0.5 : escalationRate > 0.2 ? 0.7 : 0.9;
  const humanPref = approvalRate > 0.6 ? 0.8 : approvalRate > 0.3 ? 0.5 : 0.3;
  const responseBias = escalationRate > 0.4 && approvalRate > 0.5 ? 'cautious' :
    escalationRate < 0.2 ? 'autonomous' : 'balanced';

  return {
    escalation_speed: speed,
    auto_escalation_threshold: Math.round(autoThreshold * 100) / 100,
    human_review_preference: Math.round(humanPref * 100) / 100,
    incident_response_bias: responseBias,
  };
}
