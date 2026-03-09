/**
 * Escalation Policy Router
 * Determines when to escalate to a higher institutional authority.
 */

export interface EscalationDecision {
  shouldEscalate: boolean;
  reason: string;
  targetLevel: "workspace_admin" | "tenant_owner" | "platform_reviewer" | "platform_admin";
  urgency: string;
}

export function evaluateEscalation(
  severity: string,
  urgency: string,
  blastRadius: string,
  conflictType: string,
  resolutionAttempts: number
): EscalationDecision {
  // Critical severity always escalates
  if (severity === "critical") {
    return {
      shouldEscalate: true,
      reason: "Critical severity requires immediate escalation.",
      targetLevel: "platform_admin",
      urgency: "critical",
    };
  }

  // High severity with wide blast radius
  if (severity === "high" && (blastRadius === "organizational" || blastRadius === "platform")) {
    return {
      shouldEscalate: true,
      reason: "High severity with wide blast radius requires escalation.",
      targetLevel: "platform_reviewer",
      urgency: "high",
    };
  }

  // Multiple failed resolution attempts
  if (resolutionAttempts >= 3) {
    return {
      shouldEscalate: true,
      reason: `${resolutionAttempts} resolution attempts without success. Escalating.`,
      targetLevel: "tenant_owner",
      urgency: urgency,
    };
  }

  // Compliance conflicts always need review
  if (conflictType === "compliance" && severity !== "low") {
    return {
      shouldEscalate: true,
      reason: "Compliance conflicts require institutional review.",
      targetLevel: "platform_reviewer",
      urgency: "high",
    };
  }

  return {
    shouldEscalate: false,
    reason: "No escalation required at this time.",
    targetLevel: "workspace_admin",
    urgency: "normal",
  };
}
