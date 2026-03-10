/**
 * Autonomy Ladder Manager — Sprint 121
 * Manages autonomy level transitions based on evidence thresholds.
 */

export interface LadderLevel {
  level: number;
  level_name: string;
  min_evidence_score: number;
  max_incident_rate: number;
  granted_actions: string[];
  restricted_actions: string[];
}

export const DEFAULT_LADDER: LadderLevel[] = [
  { level: 0, level_name: "manual_only", min_evidence_score: 0, max_incident_rate: 1, granted_actions: [], restricted_actions: ["*"] },
  { level: 1, level_name: "assisted", min_evidence_score: 0.3, max_incident_rate: 0.5, granted_actions: ["suggest"], restricted_actions: ["execute", "deploy", "approve"] },
  { level: 2, level_name: "supervised", min_evidence_score: 0.5, max_incident_rate: 0.3, granted_actions: ["suggest", "execute_low_risk"], restricted_actions: ["deploy", "approve"] },
  { level: 3, level_name: "bounded_auto", min_evidence_score: 0.7, max_incident_rate: 0.15, granted_actions: ["suggest", "execute_low_risk", "execute_medium_risk"], restricted_actions: ["deploy_critical", "approve_structural"] },
  { level: 4, level_name: "trusted_auto", min_evidence_score: 0.85, max_incident_rate: 0.05, granted_actions: ["suggest", "execute_low_risk", "execute_medium_risk", "deploy_standard"], restricted_actions: ["approve_structural"] },
  { level: 5, level_name: "full_bounded", min_evidence_score: 0.95, max_incident_rate: 0.02, granted_actions: ["suggest", "execute_low_risk", "execute_medium_risk", "deploy_standard", "deploy_guarded"], restricted_actions: ["approve_structural", "mutate_architecture"] },
];

export interface LadderEvaluation {
  recommended_level: number;
  current_level: number;
  direction: "upgrade" | "downgrade" | "stable";
  reason: string;
  eligible_actions: string[];
  blocked_actions: string[];
}

export function evaluateLadderPosition(
  currentLevel: number,
  evidenceScore: number,
  incidentRate: number,
  ladder: LadderLevel[] = DEFAULT_LADDER,
): LadderEvaluation {
  let bestLevel = 0;

  for (const step of ladder) {
    if (evidenceScore >= step.min_evidence_score && incidentRate <= step.max_incident_rate) {
      bestLevel = step.level;
    }
  }

  const direction = bestLevel > currentLevel ? "upgrade" : bestLevel < currentLevel ? "downgrade" : "stable";
  const targetStep = ladder.find((s) => s.level === bestLevel) || ladder[0];

  let reason = "Stable — evidence and incidents within current level bounds.";
  if (direction === "upgrade") reason = `Evidence score (${evidenceScore}) and incident rate (${incidentRate}) qualify for level ${bestLevel}.`;
  if (direction === "downgrade") reason = `Evidence (${evidenceScore}) or incident rate (${incidentRate}) no longer meets level ${currentLevel} requirements.`;

  return {
    recommended_level: bestLevel,
    current_level: currentLevel,
    direction,
    reason,
    eligible_actions: targetStep.granted_actions,
    blocked_actions: targetStep.restricted_actions,
  };
}
