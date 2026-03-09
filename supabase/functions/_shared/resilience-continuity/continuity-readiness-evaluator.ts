/**
 * Continuity Readiness Evaluator — Sprint 102
 * Measures real readiness, not just documentation.
 */

export interface PlanReadinessInput {
  plan_status: string;
  has_fallback_sequence: boolean;
  has_recovery_sequence: boolean;
  has_activation_criteria: boolean;
  last_tested_at?: string | null;
  linked_incidents: number;
}

export interface ReadinessResult {
  readiness_score: number;
  gaps: string[];
  recommendation: string;
}

export function evaluatePlanReadiness(input: PlanReadinessInput): ReadinessResult {
  let score = 0;
  const gaps: string[] = [];

  if (input.plan_status === "active") score += 0.2;
  else gaps.push("Plan is not active.");

  if (input.has_fallback_sequence) score += 0.2;
  else gaps.push("No fallback sequence defined.");

  if (input.has_recovery_sequence) score += 0.2;
  else gaps.push("No recovery sequence defined.");

  if (input.has_activation_criteria) score += 0.15;
  else gaps.push("No activation criteria specified.");

  if (input.last_tested_at) {
    const daysSince = (Date.now() - new Date(input.last_tested_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 90) score += 0.15;
    else if (daysSince < 180) score += 0.08;
    else gaps.push("Plan not tested in over 6 months.");
  } else {
    gaps.push("Plan has never been tested.");
  }

  if (input.linked_incidents > 0) score += 0.1;

  return {
    readiness_score: Math.round(Math.min(1, score) * 1000) / 1000,
    gaps,
    recommendation: gaps.length === 0
      ? "Plan is well-prepared."
      : `Address ${gaps.length} gap(s): ${gaps[0]}`,
  };
}
