/**
 * Continuity Explainer — Sprint 102
 * Explains risk, affected assets, fallback, and recovery suggestions.
 */

import { FragilityFinding } from "./fragility-detector.ts";
import { ResilienceScores } from "./resilience-scorer.ts";

export interface ContinuityExplanation {
  headline: string;
  risk_posture: string;
  top_fragilities: string[];
  fallback_status: string;
  recovery_guidance: string;
  governance_note: string;
}

export function explainContinuityPosture(
  scores: ResilienceScores,
  findings: FragilityFinding[]
): ContinuityExplanation {
  const critical = findings.filter((f) => f.severity === "critical");
  const high = findings.filter((f) => f.severity === "high");

  const riskPosture =
    critical.length > 0
      ? "CRITICAL — Immediate attention required. Single points of failure or unprotected critical assets detected."
      : high.length > 0
      ? "HIGH — Significant fragilities exist. Continuity plans should be reviewed and tested."
      : scores.resilience_score < 0.5
      ? "MODERATE — Resilience is below threshold. Gradual improvement recommended."
      : "NOMINAL — Resilience posture is within acceptable bounds.";

  return {
    headline: `Resilience: ${(scores.resilience_score * 100).toFixed(0)}% | Continuity: ${(scores.continuity_score * 100).toFixed(0)}% | Fallback: ${(scores.fallback_readiness_score * 100).toFixed(0)}%`,
    risk_posture: riskPosture,
    top_fragilities: findings.slice(0, 5).map((f) => `[${f.severity.toUpperCase()}] ${f.description}`),
    fallback_status: scores.fallback_readiness_score >= 0.7
      ? "Fallback coverage is adequate."
      : `Fallback readiness at ${(scores.fallback_readiness_score * 100).toFixed(0)}% — gaps need attention.`,
    recovery_guidance: scores.memory_recovery_score >= 0.7
      ? "Memory and state recovery posture is healthy."
      : "Memory recovery capabilities need strengthening — institutional memory may be at risk during disruptions.",
    governance_note: "All continuity plans are advisory. Activation requires human approval for critical disruptions.",
  };
}
