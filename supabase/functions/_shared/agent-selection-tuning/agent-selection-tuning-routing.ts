/**
 * Agent Selection Tuning Routing — Sprint 158
 * Routes agent selection tuning proposals to appropriate governance review queues.
 */

import type {
  AgentSelectionTuningProposalRecord,
  AgentSelectionTuningProposalType,
} from "./agent-selection-tuning-proposal-types.ts";

export type AgentSelectionRoutingTarget =
  | "agent_governance_review"
  | "capability_owner_review"
  | "fallback_chain_review"
  | "instability_alert_queue"
  | "selection_expansion_review"
  | "deferred_observation";

const ROUTING_MAP: Record<AgentSelectionTuningProposalType, AgentSelectionRoutingTarget> = {
  prefer_agent: "capability_owner_review",
  deprioritize_agent: "agent_governance_review",
  restrict_agent_scope: "agent_governance_review",
  expand_agent_scope: "selection_expansion_review",
  adjust_capability_weight: "capability_owner_review",
  adjust_fallback_order: "fallback_chain_review",
  flag_agent_instability: "instability_alert_queue",
  request_selection_review: "agent_governance_review",
};

export function resolveRoutingTarget(proposal: AgentSelectionTuningProposalRecord): AgentSelectionRoutingTarget {
  if (proposal.severity === "critical") return "agent_governance_review";
  if (proposal.confidence < 0.25) return "deferred_observation";
  return ROUTING_MAP[proposal.proposal_type] || "agent_governance_review";
}

export function routeProposals(
  proposals: AgentSelectionTuningProposalRecord[],
): Array<AgentSelectionTuningProposalRecord & { routing_target: AgentSelectionRoutingTarget }> {
  return proposals.map(p => ({
    ...p,
    routing_target: resolveRoutingTarget(p),
  }));
}

export function groupByRoutingTarget(
  proposals: AgentSelectionTuningProposalRecord[],
): Record<AgentSelectionRoutingTarget, AgentSelectionTuningProposalRecord[]> {
  const groups: Record<string, AgentSelectionTuningProposalRecord[]> = {};
  for (const p of proposals) {
    const target = resolveRoutingTarget(p);
    if (!groups[target]) groups[target] = [];
    groups[target].push(p);
  }
  return groups as Record<AgentSelectionRoutingTarget, AgentSelectionTuningProposalRecord[]>;
}

export function routingSummary(
  proposals: AgentSelectionTuningProposalRecord[],
): Array<{ target: AgentSelectionRoutingTarget; count: number; max_severity: string }> {
  const grouped = groupByRoutingTarget(proposals);
  const sevOrder: Record<string, number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };

  return Object.entries(grouped).map(([target, items]) => ({
    target: target as AgentSelectionRoutingTarget,
    count: items.length,
    max_severity: items.reduce((best, p) =>
      (sevOrder[p.severity] || 0) > (sevOrder[best] || 0) ? p.severity : best,
    "info"),
  }));
}
