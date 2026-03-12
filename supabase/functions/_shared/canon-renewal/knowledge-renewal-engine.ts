/**
 * Knowledge Renewal Engine — Sprint 183
 * Governs renewal triggers, revalidation workflows, confidence recovery,
 * and renewal proposals for aging/decaying institutional knowledge.
 *
 * SAFETY: Advisory-first. Never silently mutates canon entries.
 * All confidence changes are evidence-backed and explainable.
 */

// ─── Trigger Types ───

export type RenewalTriggerType =
  | "stale_knowledge"
  | "confidence_decay"
  | "runtime_mismatch"
  | "superseded_signal"
  | "negative_feedback_accumulation"
  | "low_recent_usage"
  | "lineage_weakening"
  | "distillation_stale";

export type TriggerStatus = "pending" | "acknowledged" | "in_progress" | "resolved" | "dismissed";

export interface RenewalTrigger {
  target_entry_id: string;
  target_type: string;
  trigger_type: RenewalTriggerType;
  reason: string;
  strength: number; // 0–1
  evidence_refs: Array<{ type: string; ref: string; detail?: string }>;
  status: TriggerStatus;
}

// ─── Renewal Modes ───

export type RenewalMode =
  | "light_revalidation"
  | "source_refresh"
  | "redistillation"
  | "competitive_revalidation";

// ─── Revalidation Outcomes ───

export type RevalidationOutcome =
  | "renewed"
  | "revalidated"
  | "confidence_restored"
  | "confidence_reduced"
  | "needs_human_review"
  | "superseded"
  | "deprecated";

// ─── Workflow ───

export type WorkflowStatus = "pending" | "in_progress" | "completed" | "failed" | "escalated";

export interface RevalidationWorkflow {
  trigger_id: string | null;
  target_entry_id: string;
  target_type: string;
  renewal_mode: RenewalMode;
  status: WorkflowStatus;
  outcome: RevalidationOutcome | null;
  confidence_before: number | null;
  confidence_after: number | null;
  evidence_summary: Record<string, unknown>;
  revalidation_steps: RevalidationStep[];
  explanation: string;
}

export interface RevalidationStep {
  step: string;
  status: "pending" | "completed" | "skipped" | "failed";
  result?: string;
  evidence?: Record<string, unknown>;
}

// ─── Renewal Proposals ───

export type RenewalProposalType =
  | "refresh_source_evidence"
  | "rerun_distillation"
  | "restore_confidence"
  | "supersede_with_stronger"
  | "reopen_governance_review"
  | "deprecate_entry";

export interface RenewalProposal {
  workflow_id: string | null;
  target_entry_id: string;
  proposal_type: RenewalProposalType;
  urgency: "low" | "medium" | "high";
  recommended_action: string;
  rationale: string;
  evidence_refs: Array<{ type: string; ref: string; detail?: string }>;
}

// ─── Trigger Detection ───

export interface TriggerDetectionInput {
  entry_id: string;
  confidence_score: number;
  age_days: number;
  recent_usage_count: number;
  negative_feedback_count: number;
  positive_feedback_count: number;
  source_reliability_score: number;
  last_revalidated_days_ago: number | null;
  has_stronger_competitor: boolean;
  distillation_age_days: number | null;
}

export function detectRenewalTriggers(input: TriggerDetectionInput): RenewalTrigger[] {
  const triggers: RenewalTrigger[] = [];

  // Stale knowledge: >180 days old with no recent revalidation
  if (input.age_days > 180 && (input.last_revalidated_days_ago === null || input.last_revalidated_days_ago > 90)) {
    triggers.push({
      target_entry_id: input.entry_id,
      target_type: "canon_entry",
      trigger_type: "stale_knowledge",
      reason: `Entry is ${input.age_days} days old without recent revalidation.`,
      strength: Math.min(1, input.age_days / 365),
      evidence_refs: [{ type: "age", ref: input.entry_id, detail: `${input.age_days} days` }],
      status: "pending",
    });
  }

  // Confidence decay: score below 0.4
  if (input.confidence_score < 0.4) {
    triggers.push({
      target_entry_id: input.entry_id,
      target_type: "canon_entry",
      trigger_type: "confidence_decay",
      reason: `Confidence score dropped to ${input.confidence_score}.`,
      strength: 1 - input.confidence_score,
      evidence_refs: [{ type: "confidence", ref: input.entry_id, detail: `${input.confidence_score}` }],
      status: "pending",
    });
  }

  // Low recent usage
  if (input.recent_usage_count < 2 && input.age_days > 60) {
    triggers.push({
      target_entry_id: input.entry_id,
      target_type: "canon_entry",
      trigger_type: "low_recent_usage",
      reason: `Only ${input.recent_usage_count} uses in recent period despite ${input.age_days} days of existence.`,
      strength: Math.min(1, 0.3 + (input.age_days / 365) * 0.5),
      evidence_refs: [{ type: "usage", ref: input.entry_id, detail: `${input.recent_usage_count} recent uses` }],
      status: "pending",
    });
  }

  // Negative feedback accumulation
  const totalFeedback = input.negative_feedback_count + input.positive_feedback_count;
  if (totalFeedback > 0 && input.negative_feedback_count / totalFeedback > 0.5) {
    triggers.push({
      target_entry_id: input.entry_id,
      target_type: "canon_entry",
      trigger_type: "negative_feedback_accumulation",
      reason: `${input.negative_feedback_count}/${totalFeedback} feedback is negative.`,
      strength: input.negative_feedback_count / totalFeedback,
      evidence_refs: [{ type: "feedback", ref: input.entry_id, detail: `${input.negative_feedback_count} negative of ${totalFeedback}` }],
      status: "pending",
    });
  }

  // Lineage weakening: source reliability dropped
  if (input.source_reliability_score < 30) {
    triggers.push({
      target_entry_id: input.entry_id,
      target_type: "canon_entry",
      trigger_type: "lineage_weakening",
      reason: `Source reliability score is ${input.source_reliability_score}/100.`,
      strength: 1 - (input.source_reliability_score / 100),
      evidence_refs: [{ type: "source_reliability", ref: input.entry_id, detail: `${input.source_reliability_score}` }],
      status: "pending",
    });
  }

  // Superseded signal
  if (input.has_stronger_competitor) {
    triggers.push({
      target_entry_id: input.entry_id,
      target_type: "canon_entry",
      trigger_type: "superseded_signal",
      reason: "A stronger competing pattern has been identified.",
      strength: 0.7,
      evidence_refs: [{ type: "competition", ref: input.entry_id }],
      status: "pending",
    });
  }

  // Distillation stale
  if (input.distillation_age_days !== null && input.distillation_age_days > 120) {
    triggers.push({
      target_entry_id: input.entry_id,
      target_type: "canon_entry",
      trigger_type: "distillation_stale",
      reason: `Distillation is ${input.distillation_age_days} days old.`,
      strength: Math.min(1, input.distillation_age_days / 365),
      evidence_refs: [{ type: "distillation_age", ref: input.entry_id, detail: `${input.distillation_age_days} days` }],
      status: "pending",
    });
  }

  return triggers;
}

// ─── Revalidation Workflow Builder ───

export function buildRevalidationWorkflow(
  trigger: RenewalTrigger,
  mode: RenewalMode,
  confidenceBefore: number | null,
): RevalidationWorkflow {
  const steps = getStepsForMode(mode);

  return {
    trigger_id: null, // set after DB insert of trigger
    target_entry_id: trigger.target_entry_id,
    target_type: trigger.target_type,
    renewal_mode: mode,
    status: "pending",
    outcome: null,
    confidence_before: confidenceBefore,
    confidence_after: null,
    evidence_summary: {},
    revalidation_steps: steps,
    explanation: `Revalidation initiated due to: ${trigger.reason}`,
  };
}

function getStepsForMode(mode: RenewalMode): RevalidationStep[] {
  switch (mode) {
    case "light_revalidation":
      return [
        { step: "check_current_confidence", status: "pending" },
        { step: "review_recent_usage", status: "pending" },
        { step: "check_feedback_signals", status: "pending" },
        { step: "assess_outcome", status: "pending" },
      ];
    case "source_refresh":
      return [
        { step: "check_current_confidence", status: "pending" },
        { step: "evaluate_source_reliability", status: "pending" },
        { step: "search_newer_sources", status: "pending" },
        { step: "compare_evidence", status: "pending" },
        { step: "assess_outcome", status: "pending" },
      ];
    case "redistillation":
      return [
        { step: "check_current_confidence", status: "pending" },
        { step: "gather_all_evidence", status: "pending" },
        { step: "regenerate_distillation", status: "pending" },
        { step: "compare_fidelity", status: "pending" },
        { step: "assess_outcome", status: "pending" },
      ];
    case "competitive_revalidation":
      return [
        { step: "check_current_confidence", status: "pending" },
        { step: "identify_competitors", status: "pending" },
        { step: "compare_patterns", status: "pending" },
        { step: "evaluate_relative_strength", status: "pending" },
        { step: "assess_supersession", status: "pending" },
        { step: "assess_outcome", status: "pending" },
      ];
  }
}

// ─── Determine Recommended Mode ───

export function recommendRenewalMode(trigger: RenewalTrigger): RenewalMode {
  switch (trigger.trigger_type) {
    case "stale_knowledge":
    case "low_recent_usage":
      return "light_revalidation";
    case "lineage_weakening":
    case "distillation_stale":
      return trigger.trigger_type === "distillation_stale" ? "redistillation" : "source_refresh";
    case "superseded_signal":
      return "competitive_revalidation";
    case "confidence_decay":
    case "negative_feedback_accumulation":
    case "runtime_mismatch":
      return trigger.strength > 0.7 ? "source_refresh" : "light_revalidation";
    default:
      return "light_revalidation";
  }
}

// ─── Confidence Recovery Assessment ───

export interface ConfidenceRecoveryInput {
  current_confidence: number;
  new_evidence_strength: number; // 0–1
  renewed_recurrence_count: number;
  successful_runtime_usage: number;
  distillation_fidelity: number; // 0–1
  reinforcement_signal_count: number;
  source_trust_score: number; // 0–100
}

export interface ConfidenceRecoveryResult {
  new_confidence: number;
  recovery_delta: number;
  recovery_factors: Array<{ factor: string; contribution: number }>;
  explanation: string;
  can_recover: boolean;
}

export function assessConfidenceRecovery(input: ConfidenceRecoveryInput): ConfidenceRecoveryResult {
  const factors: Array<{ factor: string; contribution: number }> = [];

  // New evidence (max +0.15)
  const evidenceContrib = Math.min(0.15, input.new_evidence_strength * 0.15);
  factors.push({ factor: "new_evidence", contribution: evidenceContrib });

  // Recurrence (max +0.10)
  const recurrenceContrib = Math.min(0.10, input.renewed_recurrence_count * 0.02);
  factors.push({ factor: "renewed_recurrence", contribution: recurrenceContrib });

  // Runtime success (max +0.12)
  const runtimeContrib = Math.min(0.12, input.successful_runtime_usage * 0.03);
  factors.push({ factor: "runtime_success", contribution: runtimeContrib });

  // Distillation fidelity (max +0.08)
  const distillContrib = input.distillation_fidelity * 0.08;
  factors.push({ factor: "distillation_fidelity", contribution: distillContrib });

  // Reinforcement signals (max +0.10)
  const reinforceContrib = Math.min(0.10, input.reinforcement_signal_count * 0.02);
  factors.push({ factor: "reinforcement_signals", contribution: reinforceContrib });

  // Source trust penalty/bonus
  const trustModifier = (input.source_trust_score - 50) / 500; // -0.10 to +0.10
  factors.push({ factor: "source_trust", contribution: trustModifier });

  const totalDelta = factors.reduce((s, f) => s + f.contribution, 0);
  const newConfidence = Math.max(0, Math.min(1, input.current_confidence + totalDelta));
  const canRecover = totalDelta > 0.05;

  return {
    new_confidence: Math.round(newConfidence * 10000) / 10000,
    recovery_delta: Math.round(totalDelta * 10000) / 10000,
    recovery_factors: factors,
    explanation: canRecover
      ? `Confidence can recover by ${(totalDelta * 100).toFixed(1)}% based on ${factors.filter(f => f.contribution > 0).length} positive factors.`
      : `Insufficient evidence for confidence recovery (delta: ${(totalDelta * 100).toFixed(1)}%).`,
    can_recover: canRecover,
  };
}

// ─── Renewal Proposal Generator ───

export function generateRenewalProposal(
  trigger: RenewalTrigger,
  workflowOutcome: RevalidationOutcome | null,
): RenewalProposal | null {
  // Only generate proposals for outcomes that need governance
  if (workflowOutcome === "renewed" || workflowOutcome === "revalidated" || workflowOutcome === "confidence_restored") {
    return null; // no proposal needed, resolved
  }

  let proposalType: RenewalProposalType;
  let urgency: "low" | "medium" | "high";
  let recommendedAction: string;
  let rationale: string;

  switch (workflowOutcome) {
    case "needs_human_review":
      proposalType = "reopen_governance_review";
      urgency = "medium";
      recommendedAction = "Steward review required to determine renewal path.";
      rationale = `Automated revalidation could not resolve trigger: ${trigger.reason}`;
      break;
    case "superseded":
      proposalType = "supersede_with_stronger";
      urgency = "medium";
      recommendedAction = "Supersede this entry with the identified stronger pattern.";
      rationale = `Competitive revalidation found a superior pattern. Original: ${trigger.reason}`;
      break;
    case "deprecated":
      proposalType = "deprecate_entry";
      urgency = "low";
      recommendedAction = "Deprecate this entry — evidence no longer supports it.";
      rationale = `Entry failed revalidation: ${trigger.reason}`;
      break;
    case "confidence_reduced":
      proposalType = "refresh_source_evidence";
      urgency = trigger.strength > 0.7 ? "high" : "medium";
      recommendedAction = "Gather fresh evidence to support or deprecate this entry.";
      rationale = `Confidence reduced after revalidation: ${trigger.reason}`;
      break;
    default:
      // Pre-workflow proposal based on trigger alone
      if (trigger.trigger_type === "distillation_stale") {
        proposalType = "rerun_distillation";
        urgency = "low";
        recommendedAction = "Re-run distillation with updated source material.";
        rationale = trigger.reason;
      } else if (trigger.trigger_type === "superseded_signal") {
        proposalType = "supersede_with_stronger";
        urgency = "medium";
        recommendedAction = "Evaluate and potentially supersede with stronger pattern.";
        rationale = trigger.reason;
      } else {
        proposalType = "refresh_source_evidence";
        urgency = trigger.strength > 0.7 ? "high" : "low";
        recommendedAction = "Refresh source evidence and re-evaluate.";
        rationale = trigger.reason;
      }
  }

  return {
    workflow_id: null,
    target_entry_id: trigger.target_entry_id,
    proposal_type: proposalType,
    urgency,
    recommended_action: recommendedAction,
    rationale,
    evidence_refs: trigger.evidence_refs,
  };
}

// ─── Determine Outcome ───

export function determineRevalidationOutcome(
  confidenceBefore: number,
  confidenceAfter: number,
  hasStrongerCompetitor: boolean,
  evidenceStrength: number,
): RevalidationOutcome {
  if (hasStrongerCompetitor && evidenceStrength > 0.7) return "superseded";
  if (confidenceAfter >= 0.7 && confidenceAfter > confidenceBefore) return "confidence_restored";
  if (confidenceAfter >= 0.5 && confidenceAfter >= confidenceBefore) return "revalidated";
  if (confidenceAfter >= 0.5 && confidenceAfter > confidenceBefore) return "renewed";
  if (confidenceAfter < 0.2) return "deprecated";
  if (confidenceAfter < confidenceBefore) return "confidence_reduced";
  return "needs_human_review";
}
