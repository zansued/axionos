/**
 * Conflict Severity Assessor
 * Calculates severity, urgency, and blast radius.
 */

export interface SeverityAssessment {
  severity: "low" | "medium" | "high" | "critical";
  urgency: "low" | "normal" | "high" | "critical";
  blast_radius: "local" | "cross_context" | "organizational" | "platform";
  score: number;
}

export function assessSeverity(
  conflictType: string,
  involvedDomains: string[],
  involvedSubjects: Array<{ type: string }>,
  rawSeverity?: string,
  rawUrgency?: string
): SeverityAssessment {
  let score = 0;

  // Base score from type
  const typeWeights: Record<string, number> = {
    compliance: 0.8,
    doctrine: 0.7,
    jurisdiction: 0.6,
    policy: 0.5,
    priority: 0.4,
    resource: 0.4,
    sequencing: 0.3,
    interpretation: 0.3,
  };
  score += typeWeights[conflictType] || 0.4;

  // Amplify by scope
  score += Math.min(0.2, involvedDomains.length * 0.05);
  score += Math.min(0.2, involvedSubjects.length * 0.03);

  score = Math.min(1.0, score);

  let severity: SeverityAssessment["severity"] = "low";
  if (score >= 0.8) severity = "critical";
  else if (score >= 0.6) severity = "high";
  else if (score >= 0.4) severity = "medium";

  // Override with explicit if provided
  if (rawSeverity && ["low", "medium", "high", "critical"].includes(rawSeverity)) {
    severity = rawSeverity as SeverityAssessment["severity"];
  }

  let urgency: SeverityAssessment["urgency"] = "normal";
  if (severity === "critical") urgency = "critical";
  else if (severity === "high") urgency = "high";
  if (rawUrgency && ["low", "normal", "high", "critical"].includes(rawUrgency)) {
    urgency = rawUrgency as SeverityAssessment["urgency"];
  }

  let blast_radius: SeverityAssessment["blast_radius"] = "local";
  if (involvedDomains.length > 3) blast_radius = "platform";
  else if (involvedDomains.length > 2) blast_radius = "organizational";
  else if (involvedDomains.length > 1) blast_radius = "cross_context";

  return { severity, urgency, blast_radius, score: Number(score.toFixed(3)) };
}
