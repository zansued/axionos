/**
 * failure-memory-explainer.ts
 * Generates human-readable explanations of failure memory and repair intelligence.
 */

export interface FailureExplanation {
  summary: string;
  rootCauseStatus: string;
  repairLandscape: string;
  riskAssessment: string;
  recommendations: string[];
  warnings: string[];
}

export function explainFailurePattern(entry: {
  signature: string;
  failureType: string;
  symptomSummary: string;
  rootCauseHypothesis?: string;
  provenCauses: unknown[];
  successfulRepairs: unknown[];
  failedRepairs: unknown[];
  confidenceScore: number;
  recurrenceScore: number;
  falsFixCount: number;
}): FailureExplanation {
  const recommendations: string[] = [];
  const warnings: string[] = [];

  // Root cause status
  const provenCount = Array.isArray(entry.provenCauses) ? entry.provenCauses.length : 0;
  const rootCauseStatus = provenCount > 0
    ? `${provenCount} proven root cause(s) identified`
    : entry.rootCauseHypothesis
      ? `Hypothesis: ${entry.rootCauseHypothesis} (not yet proven)`
      : 'Root cause unknown — further investigation needed';

  if (provenCount === 0) {
    recommendations.push('Investigate and document root cause to improve repair effectiveness');
  }

  // Repair landscape
  const successCount = Array.isArray(entry.successfulRepairs) ? entry.successfulRepairs.length : 0;
  const failCount = Array.isArray(entry.failedRepairs) ? entry.failedRepairs.length : 0;
  const totalRepairs = successCount + failCount;
  const repairLandscape = totalRepairs === 0
    ? 'No repair attempts recorded'
    : `${successCount}/${totalRepairs} repair attempts successful (${Math.round(successCount / totalRepairs * 100)}% success rate)`;

  // Risk assessment
  let riskLevel = 'low';
  if (entry.recurrenceScore >= 0.8) riskLevel = 'critical';
  else if (entry.recurrenceScore >= 0.5) riskLevel = 'high';
  else if (entry.recurrenceScore >= 0.3) riskLevel = 'medium';

  const riskAssessment = `Risk: ${riskLevel} (recurrence: ${(entry.recurrenceScore * 100).toFixed(0)}%, confidence: ${(entry.confidenceScore * 100).toFixed(0)}%)`;

  // False fix warnings
  if (entry.falsFixCount > 0) {
    warnings.push(`${entry.falsFixCount} false fix(es) recorded — previous repairs may not have addressed root cause`);
  }

  // Recurrence warnings
  if (entry.recurrenceScore >= 0.7) {
    warnings.push('High recurrence — this failure keeps coming back despite repairs');
    recommendations.push('Consider structural prevention rather than repeated repair');
  }

  // Low confidence warnings
  if (entry.confidenceScore < 0.3) {
    warnings.push('Low confidence — insufficient evidence to trust repair guidance');
    recommendations.push('Gather more evidence before relying on repair patterns');
  }

  return {
    summary: `[${entry.failureType}] ${entry.symptomSummary || entry.signature}`,
    rootCauseStatus,
    repairLandscape,
    riskAssessment,
    recommendations,
    warnings,
  };
}
