/**
 * Policy Tuning Routing — Sprint 157
 * Routes policy tuning proposals to appropriate governance review queues.
 */

import type { PolicyTuningProposalRecord, PolicyTuningProposalType } from "./policy-tuning-proposal-types.ts";

export type PolicyTuningRoutingTarget =
  | "governance_review_queue"
  | "policy_owner_review"
  | "risk_committee_review"
  | "approval_policy_review"
  | "execution_mode_review"
  | "deferred_observation";

const ROUTING_MAP: Record<PolicyTuningProposalType, PolicyTuningRoutingTarget> = {
  relax_policy_rule: "policy_owner_review",
  tighten_policy_rule: "governance_review_queue",
  adjust_risk_threshold: "risk_committee_review",
  adjust_execution_mode_rule: "execution_mode_review",
  adjust_approval_requirement: "approval_policy_review",
  flag_policy_friction: "governance_review_queue",
  flag_policy_leniency: "risk_committee_review",
  request_policy_review: "governance_review_queue",
};

export function resolveRoutingTarget(proposal: PolicyTuningProposalRecord): PolicyTuningRoutingTarget {
  // High-severity always goes to governance review
  if (proposal.severity === "critical") return "governance_review_queue";
  // Low confidence gets deferred
  if (proposal.confidence < 0.25) return "deferred_observation";
  return ROUTING_MAP[proposal.proposal_type] || "governance_review_queue";
}

export function routeProposals(
  proposals: PolicyTuningProposalRecord[],
): Array<PolicyTuningProposalRecord & { routing_target: PolicyTuningRoutingTarget }> {
  return proposals.map(p => ({
    ...p,
    routing_target: resolveRoutingTarget(p),
  }));
}

export function groupByRoutingTarget(
  proposals: PolicyTuningProposalRecord[],
): Record<PolicyTuningRoutingTarget, PolicyTuningProposalRecord[]> {
  const groups: Record<string, PolicyTuningProposalRecord[]> = {};
  for (const p of proposals) {
    const target = resolveRoutingTarget(p);
    if (!groups[target]) groups[target] = [];
    groups[target].push(p);
  }
  return groups as Record<PolicyTuningRoutingTarget, PolicyTuningProposalRecord[]>;
}

/**
 * Summary of proposals by routing target for inspection.
 */
export function routingSummary(
  proposals: PolicyTuningProposalRecord[],
): Array<{ target: PolicyTuningRoutingTarget; count: number; max_severity: string }> {
  const grouped = groupByRoutingTarget(proposals);
  const sevOrder: Record<string, number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };

  return Object.entries(grouped).map(([target, items]) => ({
    target: target as PolicyTuningRoutingTarget,
    count: items.length,
    max_severity: items.reduce((best, p) =>
      (sevOrder[p.severity] || 0) > (sevOrder[best] || 0) ? p.severity : best,
    "info"),
  }));
}
