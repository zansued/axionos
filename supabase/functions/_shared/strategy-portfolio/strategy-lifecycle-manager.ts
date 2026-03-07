/**
 * Strategy Lifecycle Manager — Sprint 33
 * Governs lifecycle transitions for strategy portfolio members.
 * Pure functions. No DB access.
 */

export type LifecycleStatus =
  | "proposed"
  | "experimental"
  | "active"
  | "degrading"
  | "deprecated"
  | "archived";

export interface LifecycleTransitionRequest {
  member_id: string;
  strategy_family_id: string;
  current_status: LifecycleStatus;
  target_status: LifecycleStatus;
  reason: string;
  evidence_refs: Record<string, any>[];
}

export interface LifecycleTransitionResult {
  allowed: boolean;
  member_id: string;
  from_status: LifecycleStatus;
  to_status: LifecycleStatus;
  reason: string;
  rejection_reason?: string;
}

// Valid transitions
const VALID_TRANSITIONS: Record<LifecycleStatus, LifecycleStatus[]> = {
  proposed: ["experimental", "active", "deprecated"],
  experimental: ["active", "degrading", "deprecated"],
  active: ["degrading", "deprecated"],
  degrading: ["active", "deprecated", "archived"],
  deprecated: ["archived"],
  archived: [], // terminal
};

const FORBIDDEN_MUTATION_FAMILIES = [
  "pipeline_topology",
  "governance_rules",
  "billing_logic",
  "plan_enforcement",
  "execution_contracts",
  "hard_safety_constraints",
];

export function validateTransition(request: LifecycleTransitionRequest): LifecycleTransitionResult {
  const base = {
    member_id: request.member_id,
    from_status: request.current_status,
    to_status: request.target_status,
    reason: request.reason,
  };

  // Check valid transition
  const validTargets = VALID_TRANSITIONS[request.current_status] || [];
  if (!validTargets.includes(request.target_status)) {
    return {
      ...base,
      allowed: false,
      rejection_reason: `Invalid transition from "${request.current_status}" to "${request.target_status}". Valid targets: ${validTargets.join(", ") || "none"}`,
    };
  }

  // Promotion from experimental → active requires evidence
  if (request.current_status === "experimental" && request.target_status === "active") {
    if (request.evidence_refs.length < 1) {
      return {
        ...base,
        allowed: false,
        rejection_reason: "Promotion from experimental to active requires at least one evidence reference",
      };
    }
  }

  return { ...base, allowed: true };
}

export function shouldAutoDemote(
  performanceScore: number | null,
  stabilityScore: number | null,
  harmfulRate: number,
  sampleSize: number,
): boolean {
  if (sampleSize < 10) return false;
  if (performanceScore !== null && performanceScore < 0.2) return true;
  if (stabilityScore !== null && stabilityScore < 0.2) return true;
  if (harmfulRate > 0.4) return true;
  return false;
}

export function isForbiddenFamily(familyKey: string): boolean {
  return FORBIDDEN_MUTATION_FAMILIES.some(f => familyKey.includes(f));
}

export function getValidTransitions(status: LifecycleStatus): LifecycleStatus[] {
  return VALID_TRANSITIONS[status] || [];
}
