/**
 * Canon Evolution Routing — Sprint 156
 * Routes generated canon evolution proposals to appropriate governance targets.
 * Proposals are NEVER applied directly — they are routed for governed review.
 */

import type { CanonEvolutionProposalRecord } from "./canon-evolution-proposal-types.ts";

export type EvolutionRoutingTarget =
  | "steward_review_queue"
  | "governance_review_queue"
  | "canon_deprecation_queue"
  | "pattern_enrichment_queue"
  | "anti_pattern_alert_queue"
  | "deferred_observation";

export interface RoutingDecision {
  target: EvolutionRoutingTarget;
  priority: "immediate" | "standard" | "low";
  reason: string;
  requires_human_review: boolean;
}

/**
 * Determine where a canon evolution proposal should be routed for review.
 * All routes require human review — no autonomous mutation.
 */
export function routeProposal(proposal: CanonEvolutionProposalRecord): RoutingDecision {
  // Anti-pattern alerts always get immediate routing
  if (proposal.proposal_type === "anti_pattern_alert") {
    return {
      target: "anti_pattern_alert_queue",
      priority: proposal.severity === "critical" ? "immediate" : "standard",
      reason: "Anti-pattern alert requires immediate steward attention.",
      requires_human_review: true,
    };
  }

  // Deprecation proposals
  if (proposal.proposal_type === "deprecate_pattern" || proposal.proposal_type === "mark_stale") {
    return {
      target: "canon_deprecation_queue",
      priority: proposal.confidence >= 0.7 ? "standard" : "low",
      reason: `Deprecation/stale proposal with confidence ${proposal.confidence}.`,
      requires_human_review: true,
    };
  }

  // Revision proposals from failures
  if (proposal.proposal_type === "revise_pattern") {
    return {
      target: "steward_review_queue",
      priority: proposal.severity === "critical" || proposal.severity === "high" ? "immediate" : "standard",
      reason: "Pattern revision needed based on negative operational outcomes.",
      requires_human_review: true,
    };
  }

  // Promotion/enrichment proposals
  if (proposal.proposal_type === "promote_pattern" || proposal.proposal_type === "enrich_pattern") {
    return {
      target: "pattern_enrichment_queue",
      priority: "standard",
      reason: "Positive evidence supports pattern promotion or enrichment.",
      requires_human_review: true,
    };
  }

  // Low-confidence or weak proposals
  if (proposal.confidence < 0.3) {
    return {
      target: "deferred_observation",
      priority: "low",
      reason: `Low confidence (${proposal.confidence}) — deferred for further evidence accumulation.`,
      requires_human_review: true,
    };
  }

  // Default: governance review
  return {
    target: "governance_review_queue",
    priority: "standard",
    reason: "General canon evolution proposal routed for governance review.",
    requires_human_review: true,
  };
}

/**
 * Generate proposal summary statistics for inspectability.
 */
export function summarizeProposals(proposals: CanonEvolutionProposalRecord[]): Record<string, unknown> {
  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const byStage: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  const highConfidence: CanonEvolutionProposalRecord[] = [];
  const highRisk: CanonEvolutionProposalRecord[] = [];

  for (const p of proposals) {
    byType[p.proposal_type] = (byType[p.proposal_type] || 0) + 1;
    byStatus[p.review_status] = (byStatus[p.review_status] || 0) + 1;
    bySeverity[p.severity] = (bySeverity[p.severity] || 0) + 1;
    if (p.stage_scope) {
      for (const s of p.stage_scope.split(", ")) {
        byStage[s] = (byStage[s] || 0) + 1;
      }
    }
    if (p.confidence >= 0.7) highConfidence.push(p);
    if (p.severity === "critical" || p.severity === "high") highRisk.push(p);
  }

  return {
    total: proposals.length,
    by_type: byType,
    by_status: byStatus,
    by_stage: byStage,
    by_severity: bySeverity,
    high_confidence_count: highConfidence.length,
    high_risk_count: highRisk.length,
  };
}
