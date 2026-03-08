/**
 * Policy Conflict Resolution Analyzer — Sprint 62
 * Detects policy incompatibilities, unfair arrangements, and restriction collisions.
 */

export interface ConflictInput {
  policy_alignment_score: number;
  fairness_score: number;
  enforceability_score: number;
  restriction_collision_count: number;
}

export interface ConflictResult {
  conflict_score: number;
  multi_party_risk_score: number;
  conflicts_detected: boolean;
  rationale: string[];
}

export function analyzeConflicts(input: ConflictInput): ConflictResult {
  const rationale: string[] = [];
  let conflict = (1 - input.policy_alignment_score) * 0.4 + (1 - input.fairness_score) * 0.3;

  if (input.restriction_collision_count > 0) { conflict += 0.2; rationale.push(`${input.restriction_collision_count}_restriction_collisions`); }
  if (input.enforceability_score < 0.3) { conflict += 0.1; rationale.push('weak_enforceability'); }

  const risk = conflict * 0.7 + (1 - input.enforceability_score) * 0.3;

  return {
    conflict_score: Math.round(Math.min(1, conflict) * 10000) / 10000,
    multi_party_risk_score: Math.round(Math.min(1, risk) * 10000) / 10000,
    conflicts_detected: conflict > 0.3,
    rationale,
  };
}
