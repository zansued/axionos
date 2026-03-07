// Execution Policy Lifecycle Manager — Sprint 28
// Bounded lifecycle transitions with lineage preservation.

export type LifecycleStatus = "candidate" | "active" | "watch" | "limited" | "deprecated";

export interface LifecycleTransition {
  from_status: LifecycleStatus;
  to_status: LifecycleStatus;
  reason_codes: string[];
  evidence_refs: Record<string, unknown>[];
  timestamp: string;
}

const VALID_TRANSITIONS: Record<LifecycleStatus, LifecycleStatus[]> = {
  candidate: ["active"],
  active: ["watch", "limited"],
  watch: ["deprecated", "active"],
  limited: ["active", "deprecated"],
  deprecated: [], // terminal state
};

const FORBIDDEN_MUTATIONS = [
  "pipeline_topology",
  "governance_rules",
  "billing_logic",
  "plan_enforcement",
  "execution_contracts",
  "safety_constraints",
] as const;

/**
 * Validate whether a lifecycle transition is allowed.
 */
export function validateTransition(
  from: LifecycleStatus,
  to: LifecycleStatus,
): { valid: boolean; error?: string } {
  if (from === to) return { valid: false, error: "No-op transition" };

  const allowed = VALID_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    return { valid: false, error: `Transition from ${from} to ${to} is not allowed` };
  }

  return { valid: true };
}

/**
 * Build a lifecycle transition record.
 */
export function buildTransition(
  from: LifecycleStatus,
  to: LifecycleStatus,
  reasonCodes: string[],
  evidenceRefs: Record<string, unknown>[] = [],
): LifecycleTransition | { error: string } {
  const validation = validateTransition(from, to);
  if (!validation.valid) return { error: validation.error! };

  return {
    from_status: from,
    to_status: to,
    reason_codes: reasonCodes,
    evidence_refs: evidenceRefs,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Determine recommended lifecycle status based on evaluation scores.
 */
export function recommendLifecycleStatus(
  currentStatus: LifecycleStatus,
  helpfulRate: number,
  harmfulRate: number,
  sampleSize: number,
  stabilityScore: number,
  isBalancedDefault: boolean,
): { recommended: LifecycleStatus; reason_codes: string[] } {
  // balanced_default is protected from deprecation
  if (isBalancedDefault && currentStatus !== "deprecated") {
    return { recommended: currentStatus, reason_codes: ["balanced_default_protected"] };
  }

  const reasons: string[] = [];

  // Candidate with sufficient positive evidence -> active
  if (currentStatus === "candidate" && sampleSize >= 5 && helpfulRate > 0.6 && harmfulRate < 0.1) {
    reasons.push("sufficient_positive_evidence");
    return { recommended: "active", reason_codes: reasons };
  }

  // Active policy with rising harm -> watch
  if (currentStatus === "active" && harmfulRate > 0.15) {
    reasons.push("harmful_rate_elevated");
    return { recommended: "watch", reason_codes: reasons };
  }

  // Active policy with low stability -> watch
  if (currentStatus === "active" && stabilityScore < 0.4 && sampleSize >= 5) {
    reasons.push("volatile_outcomes");
    return { recommended: "watch", reason_codes: reasons };
  }

  // Watch policy with continued harm -> deprecated
  if (currentStatus === "watch" && harmfulRate > 0.25 && sampleSize >= 5) {
    reasons.push("persistent_harmful_outcomes");
    return { recommended: "deprecated", reason_codes: reasons };
  }

  // Watch policy recovering -> active
  if (currentStatus === "watch" && harmfulRate < 0.05 && helpfulRate > 0.6 && sampleSize >= 5) {
    reasons.push("recovered_positive_outcomes");
    return { recommended: "active", reason_codes: reasons };
  }

  // Limited policy with strong results -> active
  if (currentStatus === "limited" && helpfulRate > 0.7 && harmfulRate < 0.05 && sampleSize >= 5) {
    reasons.push("strong_limited_scope_results");
    return { recommended: "active", reason_codes: reasons };
  }

  // Limited policy with continued harm -> deprecated
  if (currentStatus === "limited" && harmfulRate > 0.3 && sampleSize >= 5) {
    reasons.push("harmful_even_when_limited");
    return { recommended: "deprecated", reason_codes: reasons };
  }

  return { recommended: currentStatus, reason_codes: ["no_change_warranted"] };
}

/**
 * Check that a portfolio action does not mutate forbidden aspects.
 */
export function checkForbiddenMutation(actionDescription: string): boolean {
  const lower = actionDescription.toLowerCase();
  return !FORBIDDEN_MUTATIONS.some((fm) => lower.includes(fm));
}
