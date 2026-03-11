/**
 * Canon Evolution Proposal Generator — Sprint 156
 * Converts aggregated learning signals into governed canon evolution proposals.
 * Rules are explicit and inspectable — no opaque ML scoring.
 */

import type { LearningSignal } from "../learning/learning-signal-types.ts";
import type {
  CanonEvolutionProposalRecord,
  CanonEvolutionProposalType,
  CanonEvolutionTargetType,
  CanonEvolutionSeverity,
} from "./canon-evolution-proposal-types.ts";

// ── Signal-to-proposal mapping rules ──

interface ProposalRule {
  signalTypes: string[];
  proposalType: CanonEvolutionProposalType;
  targetType: CanonEvolutionTargetType;
  minConfidence: number;
  minCount: number;
  severityMap: (signals: LearningSignal[]) => CanonEvolutionSeverity;
  recommendation: (signals: LearningSignal[]) => string;
}

const PROPOSAL_RULES: ProposalRule[] = [
  {
    signalTypes: ["high_value_pattern", "repeated_success_pattern"],
    proposalType: "promote_pattern",
    targetType: "pattern",
    minConfidence: 0.5,
    minCount: 2,
    severityMap: () => "info",
    recommendation: (ss) =>
      `Promote this pattern to broader usage guidance — ${ss.length} positive signals across ${new Set(ss.map(s => s.initiative_id).filter(Boolean)).size || 1} initiative(s).`,
  },
  {
    signalTypes: ["high_value_pattern"],
    proposalType: "enrich_pattern",
    targetType: "canon_entry",
    minConfidence: 0.6,
    minCount: 3,
    severityMap: () => "low",
    recommendation: (ss) =>
      `Enrich existing canon entry with additional operational context from ${ss.length} high-value applications.`,
  },
  {
    signalTypes: ["repeated_failure_pattern", "unstable_action_pattern"],
    proposalType: "revise_pattern",
    targetType: "pattern",
    minConfidence: 0.4,
    minCount: 2,
    severityMap: (ss) => ss.some(s => s.severity === "critical") ? "critical" : "high",
    recommendation: (ss) =>
      `Revise this pattern due to ${ss.length} negative outcome(s). Repeated failures indicate the current guidance may be incorrect or incomplete.`,
  },
  {
    signalTypes: ["likely_stale_pattern"],
    proposalType: "mark_stale",
    targetType: "canon_entry",
    minConfidence: 0.35,
    minCount: 2,
    severityMap: () => "medium",
    recommendation: () =>
      "Mark this canon entry as stale and require steward review before further use.",
  },
  {
    signalTypes: ["likely_misapplied_pattern"],
    proposalType: "raise_review",
    targetType: "canon_entry",
    minConfidence: 0.3,
    minCount: 1,
    severityMap: () => "medium",
    recommendation: () =>
      "Raise for steward review — pattern may be misapplied or incorrectly scoped.",
  },
  {
    signalTypes: ["low_value_pattern"],
    proposalType: "deprecate_pattern",
    targetType: "pattern",
    minConfidence: 0.5,
    minCount: 3,
    severityMap: () => "medium",
    recommendation: (ss) =>
      `Consider deprecating this pattern — ${ss.length} low-value signals suggest it no longer provides meaningful guidance.`,
  },
  {
    signalTypes: ["recovery_success_pattern"],
    proposalType: "enrich_pattern",
    targetType: "playbook",
    minConfidence: 0.5,
    minCount: 2,
    severityMap: () => "info",
    recommendation: (ss) =>
      `Enrich recovery playbook based on ${ss.length} successful recovery outcomes.`,
  },
  {
    signalTypes: ["recovery_failure_pattern"],
    proposalType: "revise_pattern",
    targetType: "playbook",
    minConfidence: 0.4,
    minCount: 2,
    severityMap: (ss) => ss.some(s => s.severity === "high" || s.severity === "critical") ? "high" : "medium",
    recommendation: () =>
      "Revise recovery playbook — repeated recovery failures indicate the current strategy is ineffective.",
  },
  {
    signalTypes: ["policy_friction_signal"],
    proposalType: "raise_review",
    targetType: "rule",
    minConfidence: 0.4,
    minCount: 2,
    severityMap: () => "medium",
    recommendation: (ss) =>
      `Raise policy rule for review — ${ss.length} friction signals detected, suggesting misalignment with operational needs.`,
  },
  {
    signalTypes: ["ignored_but_effective_guidance"],
    proposalType: "raise_review",
    targetType: "convention",
    minConfidence: 0.3,
    minCount: 2,
    severityMap: () => "low",
    recommendation: () =>
      "Review convention — guidance is being ignored but outcomes are still positive. May be redundant.",
  },
];

// ── Core generator ──

export interface ProposalGenerationInput {
  organization_id: string;
  signals: LearningSignal[];
  existing_canon_entry_ids?: string[];
}

export interface ProposalGenerationResult {
  proposals: CanonEvolutionProposalRecord[];
  skipped_rules: string[];
  signal_count: number;
}

export function generateProposalsFromSignals(input: ProposalGenerationInput): ProposalGenerationResult {
  const { organization_id, signals } = input;
  const proposals: CanonEvolutionProposalRecord[] = [];
  const skipped: string[] = [];

  for (const rule of PROPOSAL_RULES) {
    const matching = signals.filter(s => rule.signalTypes.includes(s.signal_type));
    if (matching.length < rule.minCount) {
      skipped.push(`${rule.proposalType}: need ${rule.minCount} signals, found ${matching.length}`);
      continue;
    }

    const avgConfidence = matching.reduce((sum, s) => sum + s.confidence, 0) / matching.length;
    if (avgConfidence < rule.minConfidence) {
      skipped.push(`${rule.proposalType}: avg confidence ${avgConfidence.toFixed(2)} below threshold ${rule.minConfidence}`);
      continue;
    }

    const canonEntryIds = [...new Set(matching.flatMap(s => s.related_canon_entry_ids || []))];
    const initiativeIds = [...new Set(matching.map(s => s.initiative_id).filter(Boolean) as string[])];
    const stages = [...new Set(matching.map(s => s.stage).filter(Boolean))];

    proposals.push({
      organization_id,
      proposal_type: rule.proposalType,
      target_type: rule.targetType,
      target_id: canonEntryIds[0] || null,
      related_learning_signal_ids: matching.map(s => s.id).filter(Boolean) as string[],
      related_canon_entry_ids: canonEntryIds,
      related_pattern_ids: [],
      initiative_ids: initiativeIds,
      stage_scope: stages.join(", ") || "all",
      evidence_summary: buildEvidenceSummary(matching),
      rationale: buildRationale(rule, matching),
      confidence: Math.round(avgConfidence * 100) / 100,
      severity: rule.severityMap(matching),
      recommendation: rule.recommendation(matching),
      review_status: "proposed",
      proposed_by_actor_type: "learning_feedback_loop",
      aggregation_key: `${organization_id}::${rule.proposalType}::${canonEntryIds.join(",")}`,
      aggregation_count: matching.length,
      metadata: {
        rule_id: rule.proposalType,
        signal_types: rule.signalTypes,
        avg_confidence: avgConfidence,
        signal_count: matching.length,
      },
    });
  }

  return { proposals, skipped_rules: skipped, signal_count: signals.length };
}

function buildEvidenceSummary(signals: LearningSignal[]): string {
  const typeGroups: Record<string, number> = {};
  for (const s of signals) {
    typeGroups[s.signal_type] = (typeGroups[s.signal_type] || 0) + 1;
  }
  const parts = Object.entries(typeGroups).map(([t, c]) => `${c}x ${t}`);
  return `Based on ${signals.length} learning signal(s): ${parts.join(", ")}. ` +
    `Confidence range: ${Math.min(...signals.map(s => s.confidence)).toFixed(2)}–${Math.max(...signals.map(s => s.confidence)).toFixed(2)}.`;
}

function buildRationale(rule: ProposalRule, signals: LearningSignal[]): string {
  const stages = [...new Set(signals.map(s => s.stage).filter(Boolean))];
  const initiatives = [...new Set(signals.map(s => s.initiative_id).filter(Boolean))];
  return `${signals.length} operational signal(s) of type [${rule.signalTypes.join(", ")}] ` +
    `detected across ${stages.length || 1} stage(s) and ${initiatives.length || 1} initiative(s). ` +
    `Rule: ${rule.proposalType} triggered with min count=${rule.minCount}, min confidence=${rule.minConfidence}.`;
}
