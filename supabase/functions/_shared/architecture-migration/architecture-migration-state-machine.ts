/**
 * Architecture Migration State Machine — Sprint 42
 *
 * Deterministic state transitions for migration execution.
 */

export type MigrationState = "draft" | "approved" | "preparing" | "checkpoint_ready" | "executing" | "paused" | "completed" | "rolled_back" | "failed" | "archived";

const VALID_TRANSITIONS: Record<MigrationState, MigrationState[]> = {
  draft: ["approved"],
  approved: ["preparing", "archived"],
  preparing: ["checkpoint_ready", "failed", "archived"],
  checkpoint_ready: ["executing", "paused", "failed", "archived"],
  executing: ["checkpoint_ready", "paused", "completed", "rolled_back", "failed"],
  paused: ["checkpoint_ready", "executing", "rolled_back", "failed", "archived"],
  completed: ["archived"],
  rolled_back: ["archived"],
  failed: ["archived"],
  archived: [],
};

export function canTransition(current: MigrationState, target: MigrationState): boolean {
  return (VALID_TRANSITIONS[current] || []).includes(target);
}

export function getValidTransitions(current: MigrationState): MigrationState[] {
  return VALID_TRANSITIONS[current] || [];
}

export function isTerminal(state: MigrationState): boolean {
  return ["completed", "rolled_back", "failed", "archived"].includes(state);
}

export function isActive(state: MigrationState): boolean {
  return ["preparing", "checkpoint_ready", "executing"].includes(state);
}
