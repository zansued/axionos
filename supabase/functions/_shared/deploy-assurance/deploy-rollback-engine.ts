/**
 * Deploy Rollback Engine — Sprint 3 (Deploy Assurance)
 * 
 * Evidence-based rollback decision engine.
 * Advisory-first: produces recommendations, never auto-executes.
 * 
 * Integrates with existing:
 * - runtime-feedback/rollback-linker.ts (Sprint 119)
 * - platform-stabilization/platform-stabilization-rollback-engine.ts (Sprint 34)
 * - initiative-state-machine.ts (Sprint 204)
 * - deploy-feedback-loop.ts (Sprint 216)
 */

import type { RegressionSignal, HealthRecommendation, StabilityWindow } from "./post-deploy-health-monitor.ts";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface RollbackDecisionInput {
  deploy_id: string;
  initiative_id: string;
  organization_id: string;
  stability_window: StabilityWindow;
  health_recommendation: HealthRecommendation;
  previous_deploy_id?: string | null;
  triggered_by: "system_advisory" | "operator_request" | "governance_escalation";
}

export interface RollbackDecision {
  decision_id: string;
  deploy_id: string;
  initiative_id: string;
  organization_id: string;
  action: "rollback_approved" | "rollback_deferred" | "rollback_rejected" | "needs_human_approval";
  rollback_target: string | null;
  confidence: number;
  reason: string;
  evidence_summary: RollbackEvidence;
  requires_approval: boolean;
  approval_level: "auto" | "operator" | "governance";
  reversible: boolean;
  decided_at: string;
}

export interface RollbackEvidence {
  regression_count: number;
  critical_signal_count: number;
  stability_score: number;
  stability_status: string;
  health_action: string;
  signals: RegressionSignal[];
  baseline_comparison: string;
}

export interface RollbackOutcome {
  decision_id: string;
  deploy_id: string;
  organization_id: string;
  outcome_status: "rolled_back" | "rollback_failed" | "rollback_cancelled" | "deferred";
  rolled_back_to: string | null;
  outcome_notes: string;
  completed_at: string;
  audit_trail: RollbackAuditEntry[];
}

export interface RollbackAuditEntry {
  step: string;
  status: "success" | "failed" | "skipped";
  detail: string;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════
// Rollback Policy Thresholds
// ═══════════════════════════════════════════════════════════════

export const ROLLBACK_POLICY = {
  /** Score below which rollback is strongly recommended */
  SCORE_THRESHOLD: 30,
  /** Critical signals that bypass operator approval */
  AUTO_ROLLBACK_CRITICAL_SIGNALS: 3,
  /** Always require human approval above this confidence */
  REQUIRE_APPROVAL_ABOVE_CONFIDENCE: 0.95,
  /** Minimum confidence to recommend rollback */
  MIN_ROLLBACK_CONFIDENCE: 0.5,
} as const;

// ═══════════════════════════════════════════════════════════════
// Core Functions
// ═══════════════════════════════════════════════════════════════

/**
 * Build evidence summary from stability window and regression signals.
 */
export function buildRollbackEvidence(
  window: StabilityWindow,
  healthAction: string,
): RollbackEvidence {
  return {
    regression_count: window.regression_signals.length,
    critical_signal_count: window.regression_signals.filter(s => s.severity === "critical").length,
    stability_score: window.stability_score,
    stability_status: window.status,
    health_action: healthAction,
    signals: window.regression_signals,
    baseline_comparison: window.stability_score >= 80
      ? "within_baseline"
      : window.stability_score >= 50
        ? "below_baseline"
        : "far_below_baseline",
  };
}

/**
 * Evaluate whether rollback should proceed based on evidence.
 * Advisory-first: always marks requires_approval=true for structural changes.
 */
export function evaluateRollbackDecision(input: RollbackDecisionInput): RollbackDecision {
  const now = new Date().toISOString();
  const decisionId = `rd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const evidence = buildRollbackEvidence(input.stability_window, input.health_recommendation.action);

  // Determine action and approval level
  let action: RollbackDecision["action"];
  let approvalLevel: RollbackDecision["approval_level"];
  let requiresApproval: boolean;
  let confidence = input.health_recommendation.confidence;
  let reason: string;

  if (input.health_recommendation.action === "rollback_urgent" &&
      evidence.critical_signal_count >= ROLLBACK_POLICY.AUTO_ROLLBACK_CRITICAL_SIGNALS) {
    // Critical threshold breached — still advisory, but flagged as urgent
    action = "needs_human_approval";
    approvalLevel = "operator";
    requiresApproval = true;
    reason = `URGENT: ${evidence.critical_signal_count} critical signals. Score: ${evidence.stability_score}. Immediate operator decision required.`;
  } else if (input.health_recommendation.action === "rollback_urgent" || input.health_recommendation.action === "rollback_advisory") {
    action = "needs_human_approval";
    approvalLevel = evidence.critical_signal_count > 0 ? "operator" : "governance";
    requiresApproval = true;
    reason = `Rollback recommended. Score: ${evidence.stability_score}. ${evidence.regression_count} regression(s) detected.`;
  } else if (input.health_recommendation.action === "investigate") {
    action = "rollback_deferred";
    approvalLevel = "auto";
    requiresApproval = false;
    confidence = Math.min(confidence, 0.5);
    reason = `Investigation needed before rollback decision. Score: ${evidence.stability_score}.`;
  } else {
    action = "rollback_rejected";
    approvalLevel = "auto";
    requiresApproval = false;
    reason = `No rollback needed. Score: ${evidence.stability_score}. Status: ${evidence.stability_status}.`;
  }

  // Operator-requested rollbacks always need approval but are pre-approved for processing
  if (input.triggered_by === "operator_request") {
    action = "needs_human_approval";
    approvalLevel = "operator";
    requiresApproval = true;
    reason = `Operator-requested rollback. Evidence: score=${evidence.stability_score}, regressions=${evidence.regression_count}.`;
  }

  return {
    decision_id: decisionId,
    deploy_id: input.deploy_id,
    initiative_id: input.initiative_id,
    organization_id: input.organization_id,
    action,
    rollback_target: input.previous_deploy_id || null,
    confidence,
    reason,
    evidence_summary: evidence,
    requires_approval: requiresApproval,
    approval_level: approvalLevel,
    reversible: true,
    decided_at: now,
  };
}

/**
 * Build a rollback outcome record after execution or cancellation.
 */
export function buildRollbackOutcome(
  decision: RollbackDecision,
  status: RollbackOutcome["outcome_status"],
  notes: string,
  auditSteps: RollbackAuditEntry[],
): RollbackOutcome {
  return {
    decision_id: decision.decision_id,
    deploy_id: decision.deploy_id,
    organization_id: decision.organization_id,
    outcome_status: status,
    rolled_back_to: status === "rolled_back" ? decision.rollback_target : null,
    outcome_notes: notes,
    completed_at: new Date().toISOString(),
    audit_trail: auditSteps,
  };
}
