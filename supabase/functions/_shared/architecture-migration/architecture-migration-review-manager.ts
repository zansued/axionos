/**
 * Architecture Migration Review Manager — Sprint 42
 *
 * Review lifecycle for migration executions.
 */

export type MigrationReviewStatus = "approved" | "preparing" | "checkpoint_ready" | "executing" | "paused" | "completed" | "rolled_back" | "failed" | "archived";

const VALID_TRANSITIONS: Record<string, MigrationReviewStatus[]> = {
  approved: ["preparing"],
  preparing: ["checkpoint_ready", "failed"],
  checkpoint_ready: ["executing", "paused", "failed"],
  executing: ["checkpoint_ready", "paused", "completed", "rolled_back", "failed"],
  paused: ["checkpoint_ready", "executing", "rolled_back", "failed", "archived"],
  completed: ["archived"],
  rolled_back: ["archived"],
  failed: ["archived"],
};

export function canTransitionReview(current: string, target: MigrationReviewStatus): boolean {
  return (VALID_TRANSITIONS[current] || []).includes(target);
}

export function getValidReviewTransitions(current: string): MigrationReviewStatus[] {
  return VALID_TRANSITIONS[current] || [];
}
