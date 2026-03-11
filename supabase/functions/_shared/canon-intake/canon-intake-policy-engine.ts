/**
 * Canon Intake Policy Engine — Sprint 139
 * Enforces intake policies: no raw-to-canon, candidate-first, audit trail.
 */

export interface IntakePolicyCheck {
  source_trust_tier: string;
  candidate_has_review: boolean;
  candidate_trial_status: string;
  candidate_conflict: boolean;
  promotion_requested: boolean;
}

export interface IntakePolicyResult {
  allowed: boolean;
  enforced_rules: string[];
  violations: string[];
  recommendation: string;
}

export function enforceIntakePolicy(check: IntakePolicyCheck): IntakePolicyResult {
  const violations: string[] = [];
  const enforced: string[] = [];

  // Rule 1: No direct raw-to-canon
  if (check.promotion_requested && check.source_trust_tier === "unknown") {
    violations.push("no_promotion_from_unknown_source");
  }
  enforced.push("no_raw_to_canon");

  // Rule 2: Candidate must have review before promotion
  if (check.promotion_requested && !check.candidate_has_review) {
    violations.push("promotion_requires_review");
  }
  enforced.push("candidate_first");

  // Rule 3: Conflicting candidates blocked from promotion
  if (check.promotion_requested && check.candidate_conflict) {
    violations.push("conflict_blocks_promotion");
  }
  enforced.push("conflict_gate");

  // Rule 4: Trial must complete before promotion
  if (check.promotion_requested && check.candidate_trial_status === "in_progress") {
    violations.push("trial_must_complete");
  }
  enforced.push("trial_gate");

  const allowed = violations.length === 0;
  let recommendation = "proceed";
  if (!allowed) {
    recommendation = violations.length > 2 ? "reject" : "requires_remediation";
  }

  return { allowed, enforced_rules: enforced, violations, recommendation };
}
