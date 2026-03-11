/**
 * Readiness Tuning Proposal Generator — Sprint 159
 * Rule-based generation of governed readiness tuning proposals from learning signals.
 */

import type { AggregatedReadinessSignalGroup } from "./readiness-tuning-aggregation.ts";
import type {
  ReadinessTuningProposalRecord,
  ReadinessTuningProposalType,
  ReadinessTuningSeverity,
} from "./readiness-tuning-proposal-types.ts";

// ── Generation rules ──

interface GenerationRule {
  signal_type: string;
  min_count: number;
  min_avg_confidence: number;
  proposal_type: ReadinessTuningProposalType;
  severity_fn: (g: AggregatedReadinessSignalGroup) => ReadinessTuningSeverity;
  recommendation_fn: (g: AggregatedReadinessSignalGroup) => string;
  rationale_fn: (g: AggregatedReadinessSignalGroup) => string;
}

const GENERATION_RULES: GenerationRule[] = [
  {
    signal_type: "readiness_false_positive",
    min_count: 2,
    min_avg_confidence: 0.4,
    proposal_type: "tighten_readiness_check",
    severity_fn: (g) => g.max_severity === "critical" ? "high" : g.count >= 4 ? "high" : "medium",
    recommendation_fn: (g) =>
      `Tighten readiness check for ${g.stages.join(", ")} stage — ${g.count} false positives (readiness passed but execution failed)`,
    rationale_fn: (g) =>
      `${g.count} readiness false positives in ${g.stages.join(", ")}. Readiness evaluated as complete but subsequent execution failed. Max severity: ${g.max_severity}.`,
  },
  {
    signal_type: "readiness_false_negative",
    min_count: 2,
    min_avg_confidence: 0.4,
    proposal_type: "relax_readiness_check",
    severity_fn: (g) => g.count >= 4 ? "medium" : "low",
    recommendation_fn: (g) =>
      `Relax readiness check for ${g.stages.join(", ")} stage — ${g.count} false negatives (readiness blocked but manual execution succeeded safely)`,
    rationale_fn: (g) =>
      `${g.count} readiness false negatives in ${g.stages.join(", ")}. Readiness blocked execution but actions succeeded when manually executed.`,
  },
  {
    signal_type: "repeated_failure_pattern",
    min_count: 2,
    min_avg_confidence: 0.4,
    proposal_type: "promote_warning_to_blocker",
    severity_fn: (g) => g.max_severity === "critical" ? "critical" : g.count >= 4 ? "high" : "medium",
    recommendation_fn: (g) =>
      `Promote warning to blocker in ${g.stages.join(", ")} — ${g.count} repeated failures after warnings-only readiness`,
    rationale_fn: (g) =>
      `${g.count} repeated failure patterns in ${g.stages.join(", ")} where readiness only issued warnings. Promoting to blocker may prevent future failures.`,
  },
  {
    signal_type: "repeated_success_pattern",
    min_count: 3,
    min_avg_confidence: 0.5,
    proposal_type: "demote_blocker_to_warning",
    severity_fn: () => "low",
    recommendation_fn: (g) =>
      `Demote blocker to warning in ${g.stages.join(", ")} — ${g.count} repeated safe successes after manual override of blocker`,
    rationale_fn: (g) =>
      `${g.count} repeated success patterns in ${g.stages.join(", ")} where blocker was overridden and execution succeeded safely.`,
  },
  {
    signal_type: "recovery_failure_pattern",
    min_count: 2,
    min_avg_confidence: 0.4,
    proposal_type: "adjust_threshold",
    severity_fn: (g) => g.max_severity === "critical" ? "high" : "medium",
    recommendation_fn: (g) =>
      `Adjust readiness threshold for ${g.stages.join(", ")} — ${g.count} recovery failures caused by readiness misses`,
    rationale_fn: (g) =>
      `${g.count} recovery failures in ${g.stages.join(", ")} linked to readiness evaluation gaps. Threshold calibration may reduce recovery needs.`,
  },
  {
    signal_type: "recovery_success_pattern",
    min_count: 3,
    min_avg_confidence: 0.5,
    proposal_type: "remove_low_value_check",
    severity_fn: () => "low",
    recommendation_fn: (g) =>
      `Consider removing low-value readiness check in ${g.stages.join(", ")} — ${g.count} recovery successes indicate check may be noise`,
    rationale_fn: (g) =>
      `${g.count} recovery successes in ${g.stages.join(", ")} suggest the associated readiness check produces blocking without preventing actual issues.`,
  },
  {
    signal_type: "unstable_action_pattern",
    min_count: 2,
    min_avg_confidence: 0.3,
    proposal_type: "split_rule_by_environment",
    severity_fn: (g) => g.max_severity === "critical" ? "high" : "medium",
    recommendation_fn: (g) =>
      `Split readiness rule by environment for ${g.stages.join(", ")} — ${g.count} unstable patterns suggest environment-specific behavior`,
    rationale_fn: (g) =>
      `${g.count} unstable action patterns in ${g.stages.join(", ")}. Readiness rule may behave differently across environments.`,
  },
  {
    signal_type: "policy_friction_signal",
    min_count: 2,
    min_avg_confidence: 0.4,
    proposal_type: "add_review_for_check",
    severity_fn: (g) => g.count >= 4 ? "medium" : "low",
    recommendation_fn: (g) =>
      `Add review for readiness check in ${g.stages.join(", ")} — ${g.count} policy friction signals may indicate readiness miscalibration`,
    rationale_fn: (g) =>
      `${g.count} policy friction signals in ${g.stages.join(", ")} correlated with readiness evaluation. Check may need governance review.`,
  },
];

/**
 * Generate readiness tuning proposals from aggregated signal groups.
 */
export function generateReadinessTuningProposals(
  organizationId: string,
  groups: AggregatedReadinessSignalGroup[],
): ReadinessTuningProposalRecord[] {
  const proposals: ReadinessTuningProposalRecord[] = [];

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
        target_stage_scope: group.stages[0] || null,
        target_readiness_check_id: group.check_ids[0] || null,
        target_threshold_id: null,
        target_rule_scope: inferTargetScope(group),
        related_learning_signal_ids: group.signals.map(s => s.id).filter(Boolean) as string[],
        related_readiness_result_ids: [],
        related_action_ids: group.action_ids,
        related_outcome_ids: group.outcome_ids,
        related_recovery_hook_ids: group.recovery_hook_ids,
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
          check_ids: group.check_ids,
          max_severity: group.max_severity,
        },
      });
      break;
    }
  }

  return proposals;
}

function computeProposalConfidence(group: AggregatedReadinessSignalGroup): number {
  let base = group.avg_confidence;
  if (group.count >= 10) base = Math.min(1, base + 0.15);
  else if (group.count >= 5) base = Math.min(1, base + 0.1);
  else if (group.count >= 3) base = Math.min(1, base + 0.05);
  if (group.stages.length <= 1) base = Math.max(0, base - 0.05);
  return Math.round(base * 100) / 100;
}

function inferTargetScope(group: AggregatedReadinessSignalGroup): "stage" | "check" | "global" | "threshold" | "environment" {
  if (group.check_ids.length === 1) return "check";
  if (group.stages.length === 1) return "stage";
  if (group.stages.length > 2) return "global";
  return "stage";
}

/**
 * Downgrade weak proposals to request_readiness_review.
 */
export function downgradeWeakProposals(
  proposals: ReadinessTuningProposalRecord[],
  minConfidence = 0.3,
): ReadinessTuningProposalRecord[] {
  return proposals.map(p => {
    if (p.confidence < minConfidence && p.proposal_type !== "request_readiness_review") {
      return {
        ...p,
        proposal_type: "request_readiness_review" as const,
        recommendation: `[Low confidence] ${p.recommendation}. Evidence may be insufficient — manual review recommended.`,
        metadata: { ...p.metadata, downgraded_from: p.proposal_type },
      };
    }
    return p;
  });
}
