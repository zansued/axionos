/**
 * Canon Lifecycle Manager — Sprint 115
 * Manages lifecycle transitions with validation rules.
 */

export type LifecycleStatus = "draft" | "proposed" | "approved" | "experimental" | "contested" | "deprecated" | "archived" | "superseded";

const ALLOWED_TRANSITIONS: Record<LifecycleStatus, LifecycleStatus[]> = {
  draft: ["proposed", "archived"],
  proposed: ["draft", "approved", "experimental", "rejected" as any],
  approved: ["contested", "deprecated", "superseded"],
  experimental: ["approved", "deprecated", "archived"],
  contested: ["approved", "deprecated", "archived"],
  deprecated: ["archived"],
  archived: [],
  superseded: [],
};

export interface TransitionResult {
  allowed: boolean;
  from: string;
  to: string;
  reason: string;
}

export function validateTransition(from: LifecycleStatus, to: LifecycleStatus): TransitionResult {
  const allowed = ALLOWED_TRANSITIONS[from]?.includes(to) || false;
  return {
    allowed,
    from,
    to,
    reason: allowed
      ? `Transition from '${from}' to '${to}' is valid`
      : `Transition from '${from}' to '${to}' is not allowed. Valid targets: ${ALLOWED_TRANSITIONS[from]?.join(", ") || "none"}`,
  };
}

export function getAvailableTransitions(current: LifecycleStatus): LifecycleStatus[] {
  return ALLOWED_TRANSITIONS[current] || [];
}
