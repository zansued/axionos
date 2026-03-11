/**
 * recovery-posture-assessor.ts
 * Assesses recovery readiness for a given incident.
 */

export interface RecoveryInput {
  incident_type: string;
  severity: string;
  containment_applied: boolean;
  rollback_recommended: boolean;
}

export interface RecoveryAssessment {
  recovery_readiness: string;
  rollback_viable: boolean;
  integrity_check_needed: boolean;
  recommended_steps: string[];
  posture_score: number;
}

export function assessRecoveryPosture(input: RecoveryInput): RecoveryAssessment {
  let score = 80;
  const steps: string[] = [];

  if (input.severity === "critical") { score -= 30; steps.push("Escalate to platform admin immediately."); }
  else if (input.severity === "high") { score -= 15; steps.push("Review incident with operator."); }

  if (!input.containment_applied) { score -= 10; steps.push("Apply containment before recovery."); }
  if (input.rollback_recommended) { score -= 5; steps.push("Execute rollback advisory."); }

  steps.push("Verify integrity of affected surfaces.");
  steps.push("Confirm recovery completion and close incident.");

  const readiness = score >= 70 ? "ready" : score >= 40 ? "degraded" : "at_risk";

  return {
    recovery_readiness: readiness,
    rollback_viable: true,
    integrity_check_needed: input.severity === "critical" || input.severity === "high",
    recommended_steps: steps,
    posture_score: Math.max(0, score),
  };
}
