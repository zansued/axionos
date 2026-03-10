/**
 * Evolution Readiness Analyzer — Sprint 111
 * Determines if a proposal is ready for rollout.
 */

export interface ReadinessInput {
  legitimacy_score: number;
  boundedness_score: number;
  reversibility_score: number;
  has_evidence: boolean;
  has_review: boolean;
  has_approval: boolean;
  has_rollback_plan: boolean;
  kernel_touch_risk: number;
  mission_alignment_score: number;
  status: string;
}

export interface ReadinessResult {
  ready: boolean;
  readiness_score: number;   // 0-100
  readiness_level: string;   // ready, conditionally_ready, not_ready, blocked
  blockers: string[];
  prerequisites_met: boolean;
}

export function analyzeReadiness(input: ReadinessInput): ReadinessResult {
  const blockers: string[] = [];

  if (!input.has_evidence) blockers.push("No supporting evidence");
  if (!input.has_review) blockers.push("No review completed");
  if (!input.has_approval) blockers.push("No approval granted");
  if (!input.has_rollback_plan) blockers.push("No rollback plan");
  if (input.legitimacy_score < 45) blockers.push("Legitimacy score too low");
  if (input.kernel_touch_risk > 60 && !input.has_approval) blockers.push("High kernel risk requires explicit approval");
  if (input.status !== "approved") blockers.push(`Proposal status is '${input.status}', not 'approved'`);

  const prerequisitesMet = input.has_evidence && input.has_review && input.has_rollback_plan;

  let score = 0;
  score += Math.min(input.legitimacy_score * 0.3, 30);
  score += Math.min(input.boundedness_score * 0.2, 20);
  score += Math.min(input.reversibility_score * 0.2, 20);
  score += input.has_evidence ? 10 : 0;
  score += input.has_review ? 10 : 0;
  score += input.has_approval ? 10 : 0;

  const level = blockers.length === 0 && score >= 70 ? "ready"
    : blockers.length <= 1 && score >= 50 ? "conditionally_ready"
    : blockers.length > 3 ? "blocked"
    : "not_ready";

  return {
    ready: level === "ready",
    readiness_score: Math.round(score),
    readiness_level: level,
    blockers,
    prerequisites_met: prerequisitesMet,
  };
}
