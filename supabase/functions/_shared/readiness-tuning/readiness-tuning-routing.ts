/**
 * Readiness Tuning Routing — Sprint 159
 * Routes readiness tuning proposals to appropriate governance review queues.
 */

import type {
  ReadinessTuningProposalRecord,
  ReadinessTuningProposalType,
} from "./readiness-tuning-proposal-types.ts";

export type ReadinessTuningRoutingTarget =
  | "readiness_governance_review"
  | "stage_owner_review"
  | "threshold_calibration_queue"
  | "environment_split_review"
  | "low_value_check_review"
  | "deferred_observation";

const ROUTING_MAP: Record<ReadinessTuningProposalType, ReadinessTuningRoutingTarget> = {
  relax_readiness_check: "readiness_governance_review",
  tighten_readiness_check: "readiness_governance_review",
  promote_warning_to_blocker: "stage_owner_review",
  demote_blocker_to_warning: "stage_owner_review",
  adjust_threshold: "threshold_calibration_queue",
  split_rule_by_environment: "environment_split_review",
  split_rule_by_stage: "stage_owner_review",
  remove_low_value_check: "low_value_check_review",
  add_review_for_check: "readiness_governance_review",
  request_readiness_review: "readiness_governance_review",
};

export function resolveRoutingTarget(proposal: ReadinessTuningProposalRecord): ReadinessTuningRoutingTarget {
  if (proposal.severity === "critical") return "readiness_governance_review";
  if (proposal.confidence < 0.25) return "deferred_observation";
  return ROUTING_MAP[proposal.proposal_type] || "readiness_governance_review";
}

export function routeProposals(
  proposals: ReadinessTuningProposalRecord[],
): Array<ReadinessTuningProposalRecord & { routing_target: ReadinessTuningRoutingTarget }> {
  return proposals.map(p => ({
    ...p,
    routing_target: resolveRoutingTarget(p),
  }));
}

export function groupByRoutingTarget(
  proposals: ReadinessTuningProposalRecord[],
): Record<ReadinessTuningRoutingTarget, ReadinessTuningProposalRecord[]> {
  const groups: Record<string, ReadinessTuningProposalRecord[]> = {};
  for (const p of proposals) {
    const target = resolveRoutingTarget(p);
    if (!groups[target]) groups[target] = [];
    groups[target].push(p);
  }
  return groups as Record<ReadinessTuningRoutingTarget, ReadinessTuningProposalRecord[]>;
}

export function routingSummary(
  proposals: ReadinessTuningProposalRecord[],
): Array<{ target: ReadinessTuningRoutingTarget; count: number; max_severity: string }> {
  const grouped = groupByRoutingTarget(proposals);
  const sevOrder: Record<string, number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };

  return Object.entries(grouped).map(([target, items]) => ({
    target: target as ReadinessTuningRoutingTarget,
    count: items.length,
    max_severity: items.reduce((best, p) =>
      (sevOrder[p.severity] || 0) > (sevOrder[best] || 0) ? p.severity : best,
    "info"),
  }));
}
