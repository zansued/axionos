/**
 * Emergency Authority Guard
 * Ensures emergency pathways are constrained, explainable, and reviewable.
 */

export interface EmergencyRequest {
  actorRef: string;
  domainId: string;
  decisionType: string;
  justification: string;
  requestedDurationHours: number;
}

export interface EmergencyGuardResult {
  allowed: boolean;
  maxDurationHours: number;
  requiresPostReview: boolean;
  constraints: string[];
  explanation: string;
}

const MAX_EMERGENCY_HOURS = 72;

export function evaluateEmergencyAuthority(req: EmergencyRequest): EmergencyGuardResult {
  const constraints: string[] = [];

  if (!req.justification || req.justification.length < 10) {
    return {
      allowed: false,
      maxDurationHours: 0,
      requiresPostReview: false,
      constraints: ["Emergency authority requires a substantive justification."],
      explanation: "Denied: insufficient justification for emergency authority.",
    };
  }

  const duration = Math.min(req.requestedDurationHours, MAX_EMERGENCY_HOURS);
  constraints.push(`Time-bounded to ${duration} hours.`);
  constraints.push("Post-action review is mandatory.");
  constraints.push("All actions taken under emergency authority are fully audited.");
  constraints.push("Emergency authority does not override prohibited rights.");

  return {
    allowed: true,
    maxDurationHours: duration,
    requiresPostReview: true,
    constraints,
    explanation: `Emergency authority granted for ${duration}h with mandatory post-review.`,
  };
}
