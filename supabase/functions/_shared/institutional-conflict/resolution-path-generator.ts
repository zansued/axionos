/**
 * Resolution Path Generator
 * Suggests resolution paths with advisory scoring and tradeoff analysis.
 */

import { PrecedentMatch } from "./precedent-matcher.ts";

export interface ResolutionPath {
  path_type: string;
  path_summary: string;
  advisory_score: number;
  precedent_alignment_score: number;
  risk_tradeoff_score: number;
  recommended: boolean;
}

const PATH_TEMPLATES: Record<string, { summary: string; base_score: number }> = {
  mediation: { summary: "Facilitate dialogue between involved parties to reach mutual agreement.", base_score: 0.8 },
  override: { summary: "Apply authoritative override from higher governance level.", base_score: 0.5 },
  exception: { summary: "Grant bounded exception with expiration and review requirement.", base_score: 0.6 },
  deferment: { summary: "Defer resolution pending additional evidence or context.", base_score: 0.4 },
  split_scope: { summary: "Split jurisdiction so each party operates in its own scope.", base_score: 0.7 },
  escalation: { summary: "Escalate to institutional authority for binding resolution.", base_score: 0.3 },
  rollback: { summary: "Rollback to last known-good state before the conflict.", base_score: 0.6 },
};

export function generateResolutionPaths(
  conflictType: string,
  severity: string,
  precedents: PrecedentMatch[]
): ResolutionPath[] {
  const paths: ResolutionPath[] = [];
  const avgPrecedentAlignment = precedents.length > 0
    ? precedents.reduce((s, p) => s + p.alignment_score, 0) / precedents.length
    : 0;

  for (const [pathType, template] of Object.entries(PATH_TEMPLATES)) {
    // Skip rollback for low severity
    if (pathType === "rollback" && severity === "low") continue;
    // Skip override for interpretation conflicts
    if (pathType === "override" && conflictType === "interpretation") continue;

    let advisoryScore = template.base_score;
    // Boost mediation for non-critical
    if (pathType === "mediation" && severity !== "critical") advisoryScore += 0.1;
    // Boost escalation for critical
    if (pathType === "escalation" && severity === "critical") advisoryScore += 0.3;
    // Dampen override for low severity
    if (pathType === "override" && severity === "low") advisoryScore -= 0.3;

    advisoryScore = Math.max(0, Math.min(1.0, advisoryScore));

    const riskTradeoff = pathType === "override" ? 0.7 : pathType === "escalation" ? 0.5 : pathType === "mediation" ? 0.2 : 0.4;

    paths.push({
      path_type: pathType,
      path_summary: template.summary,
      advisory_score: Number(advisoryScore.toFixed(3)),
      precedent_alignment_score: Number(avgPrecedentAlignment.toFixed(3)),
      risk_tradeoff_score: Number(riskTradeoff.toFixed(3)),
      recommended: false,
    });
  }

  // Mark top scorer as recommended
  paths.sort((a, b) => b.advisory_score - a.advisory_score);
  if (paths.length > 0) paths[0].recommended = true;

  return paths;
}
