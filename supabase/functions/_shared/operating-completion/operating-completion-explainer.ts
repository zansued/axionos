/**
 * Operating Completion Explainer — Sprint 65
 * Returns structured explanations for completion posture, certification readiness, residual risks, and baseline recommendations.
 */

export interface CompletionExplanation {
  summary: string;
  completion_posture: string;
  certification_posture: string;
  key_findings: string[];
  safety_constraints: string[];
}

export function explainCompletionPosture(params: {
  completion_score: number;
  round_enough_score: number;
  certification_readiness_score: number;
  residual_risk_score: number;
  gap_count: number;
  certification_count: number;
}): CompletionExplanation {
  const findings: string[] = [];

  if (params.round_enough_score >= 0.65) findings.push('Platform meets round-enough threshold for mature baseline.');
  else findings.push(`Platform round-enough score (${(params.round_enough_score * 100).toFixed(1)}%) is below certification threshold.`);

  if (params.residual_risk_score > 0.4) findings.push(`Residual risk is elevated (${(params.residual_risk_score * 100).toFixed(1)}%). Review required.`);
  if (params.gap_count > 0) findings.push(`${params.gap_count} completion gap(s) remain open.`);
  if (params.certification_count > 0) findings.push(`${params.certification_count} baseline certification candidate(s) exist.`);

  const completionPosture = params.round_enough_score >= 0.65 ? 'round_enough' : params.round_enough_score >= 0.4 ? 'progressing' : 'incomplete';
  const certPosture = params.certification_readiness_score >= 0.7 ? 'ready' : params.certification_readiness_score >= 0.5 ? 'needs_review' : 'not_ready';

  return {
    summary: `Operating completion at ${(params.completion_score * 100).toFixed(1)}%. ${completionPosture} posture. ${findings.length} finding(s).`,
    completion_posture: completionPosture,
    certification_posture: certPosture,
    key_findings: findings,
    safety_constraints: [
      'Advisory-first only',
      'No autonomous canon closure',
      'No autonomous roadmap closure',
      'No structural remediation without human review',
      'Tenant isolation enforced',
      'Completion means mature baseline, not permanent finality',
    ],
  };
}
