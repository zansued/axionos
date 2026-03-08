/**
 * Architecture Rollout Readiness Assessor — Sprint 39
 * Evaluates whether a plan is ready for human-approved rollout.
 * Pure functions. No DB access.
 */

export interface ReadinessInput {
  simulation_confidence: number;
  blast_radius_size: "small" | "medium" | "large" | "critical";
  dependency_completeness: boolean;
  rollback_blueprint_present: boolean;
  validation_blueprint_present: boolean;
  tenant_scope_affected: boolean;
  high_risk_node_count: number;
  blocked_dependency_count: number;
  plan_status: string;
}

export interface ReadinessResult {
  readiness_score: number;
  readiness_status: "ready" | "needs_review" | "blocked" | "insufficient";
  blocking_reasons: string[];
  recommended_rollout_mode: string;
  review_requirements: string[];
}

const BLAST_RADIUS_PENALTIES: Record<string, number> = {
  small: 0,
  medium: 0.1,
  large: 0.25,
  critical: 0.5,
};

export function assessReadiness(input: ReadinessInput): ReadinessResult {
  let score = input.simulation_confidence;
  const blocking: string[] = [];
  const reviewReqs: string[] = [];

  // Blast radius penalty
  score -= BLAST_RADIUS_PENALTIES[input.blast_radius_size] || 0;

  // Missing artifacts
  if (!input.rollback_blueprint_present) {
    score -= 0.15;
    blocking.push("Rollback blueprint missing");
  }
  if (!input.validation_blueprint_present) {
    score -= 0.1;
    blocking.push("Validation blueprint missing");
  }
  if (!input.dependency_completeness) {
    score -= 0.1;
    blocking.push("Dependency graph incomplete");
  }

  // Blocked dependencies
  if (input.blocked_dependency_count > 0) {
    score -= 0.3;
    blocking.push(`${input.blocked_dependency_count} blocked dependencies`);
  }

  // Tenant impact
  if (input.tenant_scope_affected) {
    score -= 0.1;
    reviewReqs.push("Tenant isolation review required");
  }

  // High-risk nodes
  if (input.high_risk_node_count > 2) {
    score -= 0.1;
    reviewReqs.push(`${input.high_risk_node_count} high-risk nodes require manual review`);
  }

  score = Math.max(0, Math.min(1, score));

  // Determine status
  let status: ReadinessResult["readiness_status"];
  if (blocking.length > 0 || input.blocked_dependency_count > 0) {
    status = "blocked";
  } else if (score >= 0.7) {
    status = "ready";
  } else if (score >= 0.4) {
    status = "needs_review";
  } else {
    status = "insufficient";
  }

  // Recommended rollout mode
  let rolloutMode = "advisory_plan_only";
  if (status === "ready" && score >= 0.8 && !input.tenant_scope_affected) {
    rolloutMode = "manual_staged_rollout";
  } else if (status === "ready" && input.tenant_scope_affected) {
    rolloutMode = "tenant_limited_rollout";
  } else if (status === "needs_review") {
    rolloutMode = "high_review_required";
  }

  if (input.blast_radius_size === "critical") {
    rolloutMode = "high_review_required";
    reviewReqs.push("Critical blast radius requires elevated review");
  }

  return {
    readiness_score: Math.round(score * 100) / 100,
    readiness_status: status,
    blocking_reasons: blocking,
    recommended_rollout_mode: rolloutMode,
    review_requirements: reviewReqs,
  };
}
