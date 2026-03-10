/**
 * Revision Audit Synthesizer — Sprint 113
 * Synthesizes audit narratives from reflective validation results.
 */

import type { ValidationResult } from "./reflective-validation-runner.ts";

export interface AuditSynthesis {
  narrative: string;
  key_findings: string[];
  risk_summary: string;
  recommendation: string;
}

export function synthesizeAudit(result: ValidationResult): AuditSynthesis {
  const findings: string[] = [];

  // Outcome comparison
  const imp = result.outcome_comparison.local_improvement_score;
  if (imp > 0.1) findings.push(`Local improvement detected (score: ${imp})`);
  else if (imp < -0.05) findings.push(`Local degradation detected (score: ${imp})`);
  else findings.push("No significant local change observed");

  // Displacement
  if (result.displacement_signals.length > 0) {
    const surfaces = result.displacement_signals.map(s => s.displaced_surface).join(", ");
    findings.push(`Problem displacement detected in: ${surfaces}`);
  }

  // Regressions
  if (result.regression_links.length > 0) {
    findings.push(`${result.regression_links.length} regression link(s) identified`);
  }

  // Effectiveness
  findings.push(`Net effectiveness: ${result.effectiveness.assessment} (score: ${result.effectiveness.net_score})`);

  const verdictMessages: Record<string, string> = {
    improved: "The revision produced measurable, non-displacing improvement.",
    neutral: "The revision had no significant net effect on system quality.",
    displaced: "The revision fixed one area but displaced problems to adjacent surfaces.",
    regressed: "The revision introduced regressions that offset or exceed local gains.",
    inconclusive: "Insufficient evidence to determine revision effectiveness.",
  };

  const riskMessages: Record<string, string> = {
    improved: "Low risk. Continue monitoring for delayed displacement.",
    neutral: "Moderate risk. Evaluate whether the revision was necessary.",
    displaced: "High risk. The displaced problems may cascade further.",
    regressed: "High risk. Consider rollback or targeted remediation.",
    inconclusive: "Unknown risk. Gather additional evidence before concluding.",
  };

  const recommendations: Record<string, string> = {
    improved: "Accept revision. Update canon with successful pattern.",
    neutral: "Review whether revision scope was appropriate.",
    displaced: "Investigate displaced surfaces. Consider broader remediation.",
    regressed: "Escalate for human review. Evaluate rollback feasibility.",
    inconclusive: "Defer judgment. Collect more runtime data.",
  };

  return {
    narrative: verdictMessages[result.verdict] || verdictMessages.inconclusive,
    key_findings: findings,
    risk_summary: riskMessages[result.verdict] || riskMessages.inconclusive,
    recommendation: recommendations[result.verdict] || recommendations.inconclusive,
  };
}
