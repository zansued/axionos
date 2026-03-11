/**
 * Policy Tuning Proposal Generator — Sprint 157
 * Rule-based generation of governed policy tuning proposals from learning signals.
 */

import type { LearningSignal } from "../learning/learning-signal-types.ts";
import type { AggregatedSignalGroup } from "./policy-tuning-aggregation.ts";
import type { PolicyTuningProposalRecord, PolicyTuningProposalType, PolicyTuningSeverity } from "./policy-tuning-proposal-types.ts";

// ── Generation rules ──

interface GenerationRule {
  signal_type: string;
  min_count: number;
  min_avg_confidence: number;
  proposal_type: PolicyTuningProposalType;
  severity_fn: (group: AggregatedSignalGroup) => PolicyTuningSeverity;
  recommendation_fn: (group: AggregatedSignalGroup) => string;
  rationale_fn: (group: AggregatedSignalGroup) => string;
}

const GENERATION_RULES: GenerationRule[] = [
  {
    signal_type: "policy_friction_signal",
    min_count: 2,
    min_avg_confidence: 0.3,
    proposal_type: "flag_policy_friction",
    severity_fn: (g) => g.count >= 5 ? "high" : g.count >= 3 ? "medium" : "low",
    recommendation_fn: (g) =>
      `Review policy causing repeated friction across ${g.stages.join(", ")} stages (${g.count} occurrences)`,
    rationale_fn: (g) =>
      `${g.count} policy friction signals detected with avg confidence ${g.avg_confidence}. Stages: ${g.stages.join(", ")}.`,
  },
  {
    signal_type: "repeated_failure_pattern",
    min_count: 2,
    min_avg_confidence: 0.4,
    proposal_type: "tighten_policy_rule",
    severity_fn: (g) => g.max_severity === "critical" ? "critical" : g.count >= 4 ? "high" : "medium",
    recommendation_fn: (g) =>
      `Tighten execution policy for actions with repeated failures (${g.count} occurrences, severity ${g.max_severity})`,
    rationale_fn: (g) =>
      `${g.count} repeated failure patterns detected. Max severity: ${g.max_severity}. Consider restricting auto-execution for affected action types.`,
  },
  {
    signal_type: "repeated_success_pattern",
    min_count: 3,
    min_avg_confidence: 0.5,
    proposal_type: "relax_policy_rule",
    severity_fn: () => "low",
    recommendation_fn: (g) =>
      `Consider relaxing policy restrictions for consistently successful action pattern (${g.count} successes)`,
    rationale_fn: (g) =>
      `${g.count} repeated success patterns with avg confidence ${g.avg_confidence}. These actions consistently succeed and may be over-restricted.`,
  },
  {
    signal_type: "unstable_action_pattern",
    min_count: 2,
    min_avg_confidence: 0.3,
    proposal_type: "adjust_risk_threshold",
    severity_fn: (g) => g.max_severity === "critical" ? "high" : "medium",
    recommendation_fn: (g) =>
      `Adjust risk threshold for unstable action pattern (${g.count} occurrences across ${g.stages.join(", ")})`,
    rationale_fn: (g) =>
      `${g.count} unstable action patterns detected. Current risk classification may not reflect actual volatility.`,
  },
  {
    signal_type: "recovery_success_pattern",
    min_count: 3,
    min_avg_confidence: 0.5,
    proposal_type: "adjust_execution_mode_rule",
    severity_fn: () => "low",
    recommendation_fn: (g) =>
      `Consider allowing auto-execution for recovery actions that consistently succeed (${g.count} successes)`,
    rationale_fn: (g) =>
      `${g.count} recovery success patterns. Bounded auto-repair may be safe to relax for this action type.`,
  },
  {
    signal_type: "recovery_failure_pattern",
    min_count: 2,
    min_avg_confidence: 0.4,
    proposal_type: "tighten_policy_rule",
    severity_fn: (g) => g.count >= 4 ? "high" : "medium",
    recommendation_fn: (g) =>
      `Tighten recovery policy due to repeated recovery failures (${g.count} failures)`,
    rationale_fn: (g) =>
      `${g.count} recovery failure patterns. Current recovery policy may be too permissive.`,
  },
  {
    signal_type: "readiness_false_positive",
    min_count: 2,
    min_avg_confidence: 0.4,
    proposal_type: "adjust_risk_threshold",
    severity_fn: (g) => g.count >= 3 ? "high" : "medium",
    recommendation_fn: (g) =>
      `Adjust readiness/risk assessment threshold due to repeated false positives (${g.count} occurrences)`,
    rationale_fn: (g) =>
      `${g.count} readiness false positives. System approved actions that subsequently failed, suggesting risk thresholds are too lenient.`,
  },
  {
    signal_type: "readiness_false_negative",
    min_count: 2,
    min_avg_confidence: 0.4,
    proposal_type: "adjust_approval_requirement",
    severity_fn: () => "medium",
    recommendation_fn: (g) =>
      `Review approval requirements — readiness blocked actions that would have succeeded (${g.count} false negatives)`,
    rationale_fn: (g) =>
      `${g.count} readiness false negatives. Actions were blocked or required approval but would have succeeded, suggesting over-restriction.`,
  },
  {
    signal_type: "agent_selection_failure",
    min_count: 2,
    min_avg_confidence: 0.3,
    proposal_type: "request_policy_review",
    severity_fn: (g) => g.count >= 4 ? "high" : "medium",
    recommendation_fn: (g) =>
      `Request policy review for agent selection rules contributing to repeated failures (${g.count} occurrences)`,
    rationale_fn: (g) =>
      `${g.count} agent selection failures. Policy routing or capability matching rules may need adjustment.`,
  },
];

/**
 * Generate policy tuning proposals from aggregated signal groups.
 */
export function generatePolicyTuningProposals(
  organizationId: string,
  groups: AggregatedSignalGroup[],
): PolicyTuningProposalRecord[] {
  const proposals: PolicyTuningProposalRecord[] = [];

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
        target_policy_scope: inferTargetScope(group),
        target_policy_object_id: null,
        related_learning_signal_ids: group.signals.map(s => s.id).filter(Boolean) as string[],
        related_action_ids: group.signals.map(s => s.related_action_id).filter(Boolean) as string[],
        related_outcome_ids: group.signals.map(s => s.related_outcome_id).filter(Boolean) as string[],
        related_policy_decision_ids: group.signals.map(s => s.related_policy_decision_id).filter(Boolean) as string[],
        related_approval_request_ids: [],
        initiative_ids: group.initiative_ids,
        stage_scope: group.stages[0] || "unknown",
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
          max_severity: group.max_severity,
        },
      });
      break; // one proposal per group
    }
  }

  return proposals;
}

function computeProposalConfidence(group: AggregatedSignalGroup): number {
  let base = group.avg_confidence;
  // Boost for volume
  if (group.count >= 10) base = Math.min(1, base + 0.15);
  else if (group.count >= 5) base = Math.min(1, base + 0.1);
  else if (group.count >= 3) base = Math.min(1, base + 0.05);
  // Penalize single-stage evidence
  if (group.stages.length <= 1) base = Math.max(0, base - 0.05);
  return Math.round(base * 100) / 100;
}

function inferTargetScope(group: AggregatedSignalGroup): "stage" | "action_type" | "global" {
  if (group.stages.length === 1) return "stage";
  if (group.stages.length > 2) return "global";
  return "action_type";
}

/**
 * Handle weak or contradictory evidence by downgrading to request_policy_review.
 */
export function downgradeWeakProposals(
  proposals: PolicyTuningProposalRecord[],
  minConfidence: number = 0.3,
): PolicyTuningProposalRecord[] {
  return proposals.map(p => {
    if (p.confidence < minConfidence && p.proposal_type !== "request_policy_review") {
      return {
        ...p,
        proposal_type: "request_policy_review" as const,
        recommendation: `[Low confidence] ${p.recommendation}. Evidence may be insufficient — manual review recommended.`,
        metadata: { ...p.metadata, downgraded_from: p.proposal_type },
      };
    }
    return p;
  });
}
