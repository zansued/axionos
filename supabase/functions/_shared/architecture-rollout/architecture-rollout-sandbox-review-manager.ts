/**
 * Architecture Rollout Sandbox Review Manager — Sprint 40
 * Manages review lifecycle for sandbox outcomes.
 * Pure functions. No DB access.
 */

export type SandboxStatus = "draft" | "prepared" | "active" | "completed" | "blocked" | "expired" | "archived";
export type SandboxReviewStatus = "reviewed" | "migration_ready" | "blocked" | "rejected" | "archived";

const VALID_SANDBOX_TRANSITIONS: Record<SandboxStatus, SandboxStatus[]> = {
  draft: ["prepared", "archived"],
  prepared: ["active", "blocked", "archived"],
  active: ["completed", "blocked", "expired", "archived"],
  completed: ["archived"],
  blocked: ["prepared", "archived"],
  expired: ["archived"],
  archived: [],
};

const REVIEW_TO_SANDBOX_STATUS: Record<SandboxReviewStatus, SandboxStatus> = {
  reviewed: "completed",
  migration_ready: "completed",
  blocked: "blocked",
  rejected: "archived",
  archived: "archived",
};

export interface SandboxReviewInput {
  sandbox_id: string;
  current_status: SandboxStatus;
  target_review_status: SandboxReviewStatus;
  review_notes?: string;
  blocker_reasons?: string[];
}

export interface SandboxReviewResult {
  allowed: boolean;
  rejection_reason: string | null;
  new_sandbox_status: SandboxStatus;
}

export function validateSandboxReviewTransition(input: SandboxReviewInput): SandboxReviewResult {
  const targetStatus = REVIEW_TO_SANDBOX_STATUS[input.target_review_status];
  if (!targetStatus) {
    return { allowed: false, rejection_reason: `Invalid review status: ${input.target_review_status}`, new_sandbox_status: input.current_status };
  }

  const allowed = VALID_SANDBOX_TRANSITIONS[input.current_status];
  if (!allowed || !allowed.includes(targetStatus)) {
    return { allowed: false, rejection_reason: `Transition from ${input.current_status} to ${targetStatus} not allowed`, new_sandbox_status: input.current_status };
  }

  if (input.target_review_status === "blocked" && (!input.blocker_reasons || input.blocker_reasons.length === 0)) {
    return { allowed: false, rejection_reason: "Blocker reasons required when blocking a sandbox", new_sandbox_status: input.current_status };
  }

  return { allowed: true, rejection_reason: null, new_sandbox_status: targetStatus };
}
