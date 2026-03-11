/**
 * Agent Selection Tuning Proposal Generator — Sprint 158
 * Rule-based generation of governed agent selection tuning proposals from learning signals.
 */

import type { AggregatedAgentSignalGroup } from "./agent-selection-tuning-aggregation.ts";
import type {
  AgentSelectionTuningProposalRecord,
  AgentSelectionTuningProposalType,
  AgentSelectionSeverity,
} from "./agent-selection-tuning-proposal-types.ts";

// ── Generation rules ──

interface GenerationRule {
  signal_type: string;
  min_count: number;
  min_avg_confidence: number;
  proposal_type: AgentSelectionTuningProposalType;
  severity_fn: (g: AggregatedAgentSignalGroup) => AgentSelectionSeverity;
  recommendation_fn: (g: AggregatedAgentSignalGroup) => string;
  rationale_fn: (g: AggregatedAgentSignalGroup) => string;
}

const GENERATION_RULES: GenerationRule[] = [
  {
    signal_type: "agent_selection_success",
    min_count: 3,
    min_avg_confidence: 0.5,
    proposal_type: "prefer_agent",
    severity_fn: () => "low",
    recommendation_fn: (g) =>
      `Prefer agent ${g.agent_ids[0] || "unknown"} for ${g.stages.join(", ")} stage actions (${g.count} successes)`,
    rationale_fn: (g) =>
      `${g.count} successful selections for agent ${g.agent_ids[0] || "unknown"} in ${g.stages.join(", ")} with avg confidence ${g.avg_confidence}.`,
  },
  {
    signal_type: "agent_selection_failure",
    min_count: 2,
    min_avg_confidence: 0.4,
    proposal_type: "deprioritize_agent",
    severity_fn: (g) => g.max_severity === "critical" ? "high" : g.count >= 4 ? "high" : "medium",
    recommendation_fn: (g) =>
      `Deprioritize agent ${g.agent_ids[0] || "unknown"} for ${g.stages.join(", ")} stage actions (${g.count} failures)`,
    rationale_fn: (g) =>
      `${g.count} selection failures for agent ${g.agent_ids[0] || "unknown"}. Max severity: ${g.max_severity}.`,
  },
  {
    signal_type: "repeated_failure_pattern",
    min_count: 2,
    min_avg_confidence: 0.4,
    proposal_type: "restrict_agent_scope",
    severity_fn: (g) => g.max_severity === "critical" ? "critical" : g.count >= 4 ? "high" : "medium",
    recommendation_fn: (g) =>
      `Restrict agent ${g.agent_ids[0] || "unknown"} from ${g.stages.join(", ")} actions due to repeated failures (${g.count})`,
    rationale_fn: (g) =>
      `${g.count} repeated failure patterns tied to agent ${g.agent_ids[0] || "unknown"} in ${g.stages.join(", ")}.`,
  },
  {
    signal_type: "repeated_success_pattern",
    min_count: 3,
    min_avg_confidence: 0.5,
    proposal_type: "expand_agent_scope",
    severity_fn: () => "low",
    recommendation_fn: (g) =>
      `Consider expanding scope for agent ${g.agent_ids[0] || "unknown"} — consistently successful in ${g.stages.join(", ")} (${g.count} successes)`,
    rationale_fn: (g) =>
      `${g.count} repeated success patterns for agent ${g.agent_ids[0] || "unknown"} with avg confidence ${g.avg_confidence}.`,
  },
  {
    signal_type: "unstable_action_pattern",
    min_count: 2,
    min_avg_confidence: 0.3,
    proposal_type: "flag_agent_instability",
    severity_fn: (g) => g.max_severity === "critical" ? "high" : "medium",
    recommendation_fn: (g) =>
      `Flag agent instability for ${g.agent_ids[0] || "unknown"} in ${g.stages.join(", ")} (${g.count} unstable patterns)`,
    rationale_fn: (g) =>
      `${g.count} unstable action patterns tied to agent ${g.agent_ids[0] || "unknown"}. Selection stability may be compromised.`,
  },
  {
    signal_type: "recovery_success_pattern",
    min_count: 3,
    min_avg_confidence: 0.5,
    proposal_type: "adjust_fallback_order",
    severity_fn: () => "low",
    recommendation_fn: (g) =>
      `Move agent ${g.agent_ids[0] || "unknown"} earlier in fallback order for recovery in ${g.stages.join(", ")} (${g.count} recovery successes)`,
    rationale_fn: (g) =>
      `${g.count} recovery successes by agent ${g.agent_ids[0] || "unknown"}. Consider promoting in fallback chain.`,
  },
  {
    signal_type: "recovery_failure_pattern",
    min_count: 2,
    min_avg_confidence: 0.4,
    proposal_type: "deprioritize_agent",
    severity_fn: (g) => g.count >= 4 ? "high" : "medium",
    recommendation_fn: (g) =>
      `Deprioritize agent ${g.agent_ids[0] || "unknown"} for recovery actions — repeated recovery failures (${g.count})`,
    rationale_fn: (g) =>
      `${g.count} recovery failure patterns for agent ${g.agent_ids[0] || "unknown"}. Recovery routing may need adjustment.`,
  },
];

/**
 * Generate agent selection tuning proposals from aggregated signal groups.
 */
export function generateAgentSelectionTuningProposals(
  organizationId: string,
  groups: AggregatedAgentSignalGroup[],
): AgentSelectionTuningProposalRecord[] {
  const proposals: AgentSelectionTuningProposalRecord[] = [];

  for (const group of groups) {
    for (const rule of GENERATION_RULES) {
      if (group.signal_type !== rule.signal_type) continue;
      if (group.count < rule.min_count) continue;
      if (group.avg_confidence < rule.min_avg_confidence) continue;

      const severity = rule.severity_fn(group);
      const confidence = computeProposalConfidence(group);

      proposals.push({
        organization_id: organizationId,
        proposal_type: rule.proposal_type,
        target_selection_scope: inferTargetScope(group),
        target_agent_id: group.agent_ids[0] || null,
        target_stage_scope: group.stages[0] || null,
        target_action_type_scope: null,
        target_capability_scope: null,
        related_learning_signal_ids: group.signals.map(s => s.id).filter(Boolean) as string[],
        related_action_ids: group.action_ids,
        related_outcome_ids: group.outcome_ids,
        related_agent_decision_ids: [],
        initiative_ids: group.initiative_ids,
        environment_scope: null,
        evidence_summary: rule.rationale_fn(group),
        rationale: rule.rationale_fn(group),
        confidence,
        severity,
        recommendation: rule.recommendation_fn(group),
        review_status: "proposed",
        proposed_by_actor_type: "system_learning_loop",
        aggregation_key: group.key,
        aggregation_count: group.count,
        metadata: {
          source_signal_type: group.signal_type,
          stages: group.stages,
          agent_ids: group.agent_ids,
          max_severity: group.max_severity,
        },
      });
      break;
    }
  }

  return proposals;
}

function computeProposalConfidence(group: AggregatedAgentSignalGroup): number {
  let base = group.avg_confidence;
  if (group.count >= 10) base = Math.min(1, base + 0.15);
  else if (group.count >= 5) base = Math.min(1, base + 0.1);
  else if (group.count >= 3) base = Math.min(1, base + 0.05);
  if (group.stages.length <= 1) base = Math.max(0, base - 0.05);
  return Math.round(base * 100) / 100;
}

function inferTargetScope(group: AggregatedAgentSignalGroup): "stage" | "capability" | "global" {
  if (group.stages.length === 1) return "stage";
  if (group.stages.length > 2) return "global";
  return "capability";
}

/**
 * Downgrade weak proposals to request_selection_review.
 */
export function downgradeWeakProposals(
  proposals: AgentSelectionTuningProposalRecord[],
  minConfidence = 0.3,
): AgentSelectionTuningProposalRecord[] {
  return proposals.map(p => {
    if (p.confidence < minConfidence && p.proposal_type !== "request_selection_review") {
      return {
        ...p,
        proposal_type: "request_selection_review" as const,
        recommendation: `[Low confidence] ${p.recommendation}. Evidence may be insufficient — manual review recommended.`,
        metadata: { ...p.metadata, downgraded_from: p.proposal_type },
      };
    }
    return p;
  });
}
