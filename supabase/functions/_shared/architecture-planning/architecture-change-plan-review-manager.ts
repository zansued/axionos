/**
 * Architecture Change Plan Review Manager — Sprint 39
 * Manages review lifecycle for architecture change plans.
 * Pure functions. No DB access.
 */

export type PlanStatus = "draft" | "reviewed" | "ready_for_rollout" | "blocked" | "rejected" | "archived";
export type ReviewStatus = "reviewed" | "ready_for_rollout" | "blocked" | "rejected" | "archived";

const VALID_PLAN_TRANSITIONS: Record<PlanStatus, PlanStatus[]> = {
  draft: ["reviewed", "rejected", "archived"],
  reviewed: ["ready_for_rollout", "blocked", "rejected", "archived"],
  ready_for_rollout: ["blocked", "rejected", "archived"],
  blocked: ["reviewed", "rejected", "archived"],
  rejected: ["archived"],
  archived: [],
};

const REVIEW_TO_PLAN_STATUS: Record<ReviewStatus, PlanStatus> = {
  reviewed: "reviewed",
  ready_for_rollout: "ready_for_rollout",
  blocked: "blocked",
  rejected: "rejected",
  archived: "archived",
};

export interface PlanReviewInput {
  plan_id: string;
  current_status: PlanStatus;
  target_review_status: ReviewStatus;
  review_notes?: string;
  blocker_reasons?: string[];
  linked_changes?: Record<string, any>;
}

export interface PlanReviewResult {
  allowed: boolean;
  rejection_reason: string | null;
  new_plan_status: PlanStatus;
}

export function validatePlanReviewTransition(input: PlanReviewInput): PlanReviewResult {
  const targetPlanStatus = REVIEW_TO_PLAN_STATUS[input.target_review_status];
  if (!targetPlanStatus) {
    return { allowed: false, rejection_reason: `Invalid review status: ${input.target_review_status}`, new_plan_status: input.current_status };
  }

  const allowed = VALID_PLAN_TRANSITIONS[input.current_status];
  if (!allowed || !allowed.includes(targetPlanStatus)) {
    return {
      allowed: false,
      rejection_reason: `Transition from ${input.current_status} to ${targetPlanStatus} not allowed`,
      new_plan_status: input.current_status,
    };
  }

  // Blocked requires reasons
  if (input.target_review_status === "blocked" && (!input.blocker_reasons || input.blocker_reasons.length === 0)) {
    return { allowed: false, rejection_reason: "Blocker reasons required when blocking a plan", new_plan_status: input.current_status };
  }

  return { allowed: true, rejection_reason: null, new_plan_status: targetPlanStatus };
}
