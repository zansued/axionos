/**
 * Reflective Audit Explainer — Sprint 113
 * Generates human-readable explanations for revision audits.
 */

import type { ValidationResult } from "./reflective-validation-runner.ts";
import { synthesizeAudit } from "./revision-audit-synthesizer.ts";

export interface AuditExplanation {
  title: string;
  verdict_label: string;
  verdict_color: "green" | "yellow" | "orange" | "red" | "gray";
  narrative: string;
  key_findings: string[];
  risk_summary: string;
  recommendation: string;
  confidence_label: string;
  scores: {
    local_improvement: number;
    displacement_penalty: number;
    regression_penalty: number;
    net_effectiveness: number;
    confidence: number;
  };
}

const VERDICT_LABELS: Record<string, { label: string; color: AuditExplanation["verdict_color"] }> = {
  improved: { label: "Validated Improvement", color: "green" },
  neutral: { label: "No Significant Change", color: "yellow" },
  displaced: { label: "Problem Displaced", color: "orange" },
  regressed: { label: "Regression Detected", color: "red" },
  inconclusive: { label: "Inconclusive", color: "gray" },
};

export function explainRevisionAudit(result: ValidationResult): AuditExplanation {
  const synthesis = synthesizeAudit(result);
  const meta = VERDICT_LABELS[result.verdict] || VERDICT_LABELS.inconclusive;

  const confLabel = result.confidence_score >= 0.7 ? "High"
    : result.confidence_score >= 0.4 ? "Moderate" : "Low";

  return {
    title: `Revision Audit: ${result.revision_event_id.slice(0, 8)}`,
    verdict_label: meta.label,
    verdict_color: meta.color,
    narrative: synthesis.narrative,
    key_findings: synthesis.key_findings,
    risk_summary: synthesis.risk_summary,
    recommendation: synthesis.recommendation,
    confidence_label: confLabel,
    scores: {
      local_improvement: result.effectiveness.local_improvement,
      displacement_penalty: result.effectiveness.displacement_penalty,
      regression_penalty: result.effectiveness.regression_penalty,
      net_effectiveness: result.effectiveness.net_score,
      confidence: result.confidence_score,
    },
  };
}
