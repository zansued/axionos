/**
 * Continuity Plan Advisor — Sprint 102
 * Suggests fallback and recovery plans based on fragility findings.
 */

import { FragilityFinding } from "./fragility-detector.ts";

export interface ContinuityRecommendation {
  priority: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  suggested_disruption_type: string;
  related_asset: string;
}

export function generateContinuityRecommendations(findings: FragilityFinding[]): ContinuityRecommendation[] {
  const recs: ContinuityRecommendation[] = [];

  const spofs = findings.filter((f) => f.finding_type === "single_point_of_failure");
  for (const s of spofs) {
    recs.push({
      priority: "critical",
      title: `Create continuity plan for SPOF: ${s.asset_code}`,
      description: `${s.description} A continuity plan with fallback sequence is urgently needed.`,
      suggested_disruption_type: "service_failure",
      related_asset: s.asset_code,
    });
  }

  const noFallback = findings.filter((f) => f.finding_type === "no_fallback" && f.severity === "high");
  for (const nf of noFallback) {
    recs.push({
      priority: "high",
      title: `Define fallback for: ${nf.asset_code}`,
      description: nf.description,
      suggested_disruption_type: "dependency_loss",
      related_asset: nf.asset_code,
    });
  }

  const highRecovery = findings.filter((f) => f.finding_type === "high_recovery_complexity");
  for (const hr of highRecovery) {
    recs.push({
      priority: "high",
      title: `Simplify recovery for: ${hr.asset_code}`,
      description: `${hr.description} Consider pre-staging recovery artifacts or creating runbooks.`,
      suggested_disruption_type: "recovery_delay",
      related_asset: hr.asset_code,
    });
  }

  if (recs.length === 0) {
    recs.push({
      priority: "low",
      title: "Continuity posture is healthy",
      description: "No critical fragilities detected. Continue periodic assessment.",
      suggested_disruption_type: "none",
      related_asset: "",
    });
  }

  return recs;
}
