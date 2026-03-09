/**
 * Authority Contestation Detector
 * Detects overlapping, disputed, or illegitimate authority claims.
 */

export interface AuthorityClaim {
  id: string;
  subject_ref: string;
  authority_level: string;
  scope_ref: string;
  decision_type: string;
  precedence_rank: number;
}

export interface ContestationResult {
  hasContestation: boolean;
  contestationType: string;
  severity: string;
  claimants: AuthorityClaim[];
  explanation: string;
}

export function detectContestation(claims: AuthorityClaim[]): ContestationResult {
  if (claims.length <= 1) {
    return { hasContestation: false, contestationType: "none", severity: "low", claimants: [], explanation: "No overlapping claims." };
  }

  // Check for formal vs formal overlap
  const formals = claims.filter(c => c.authority_level === "formal");
  if (formals.length > 1) {
    return {
      hasContestation: true,
      contestationType: "dual_formal_authority",
      severity: "critical",
      claimants: formals,
      explanation: `${formals.length} formal authority claims on the same decision scope — critical jurisdictional conflict.`,
    };
  }

  // Check for emergency vs formal conflict
  const emergencies = claims.filter(c => c.authority_level === "emergency");
  if (emergencies.length > 0 && formals.length > 0) {
    return {
      hasContestation: true,
      contestationType: "emergency_vs_formal",
      severity: "high",
      claimants: [...emergencies, ...formals],
      explanation: "Emergency authority invoked alongside existing formal authority — requires review.",
    };
  }

  // General overlap
  const uniqueSubjects = new Set(claims.map(c => c.subject_ref));
  if (uniqueSubjects.size > 1) {
    return {
      hasContestation: true,
      contestationType: "overlapping_delegation",
      severity: "medium",
      claimants: claims,
      explanation: `${uniqueSubjects.size} actors claim authority over the same decision scope.`,
    };
  }

  return { hasContestation: false, contestationType: "none", severity: "low", claimants: [], explanation: "No contestation detected." };
}
