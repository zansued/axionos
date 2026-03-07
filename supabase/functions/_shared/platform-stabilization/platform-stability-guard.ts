// Platform Stability Guard — Sprint 34
// Validates and recommends bounded stabilization responses.

import { DriftSignal } from "./platform-drift-detector.ts";
import { OscillationSignal } from "./platform-oscillation-detector.ts";

export interface StabilizationProposal {
  action_type: string;
  target_scope: string;
  target_entities: string[];
  trigger_signals: string[];
  bounded_delta: Record<string, unknown>;
  expected_outcome: string;
  rollback_guard: Record<string, unknown>;
  expiry_hours: number;
  action_mode: "advisory" | "manual_apply" | "bounded_auto";
}

// Forbidden mutation targets — stabilization must NEVER touch these
const FORBIDDEN_TARGETS = new Set([
  "pipeline_topology",
  "stage_ordering",
  "governance_rules",
  "billing_logic",
  "plan_enforcement",
  "execution_contracts",
  "hard_safety_constraints",
  "strategy_family_definitions",
  "execution_policy_definitions",
]);

export interface GuardResult {
  allowed: boolean;
  violations: string[];
  warnings: string[];
}

export function validateStabilizationTarget(proposal: StabilizationProposal): GuardResult {
  const violations: string[] = [];
  const warnings: string[] = [];

  // Check forbidden targets
  for (const entity of proposal.target_entities) {
    if (FORBIDDEN_TARGETS.has(entity)) {
      violations.push(`forbidden_target_${entity}`);
    }
  }

  // Bounded auto requires high confidence context
  if (proposal.action_mode === "bounded_auto" && proposal.expiry_hours > 168) {
    warnings.push("bounded_auto_long_expiry");
  }

  // Must have rollback guard
  if (!proposal.rollback_guard || Object.keys(proposal.rollback_guard).length === 0) {
    violations.push("missing_rollback_guard");
  }

  return {
    allowed: violations.length === 0,
    violations,
    warnings,
  };
}

/**
 * Generate stabilization proposals from drift and oscillation signals.
 */
export function generateStabilizationProposals(
  driftSignals: DriftSignal[],
  oscillationSignals: OscillationSignal[],
): StabilizationProposal[] {
  const proposals: StabilizationProposal[] = [];

  // From drift signals
  for (const drift of driftSignals) {
    if (drift.severity === "low") continue;

    const actionMap: Record<string, { action: string; delta: Record<string, unknown>; expiry: number }> = {
      policy_churn: { action: "freeze_policy_transitions", delta: { freeze_duration_hours: 24 }, expiry: 24 },
      strategy_churn: { action: "freeze_strategy_transitions", delta: { freeze_duration_hours: 24 }, expiry: 24 },
      calibration_volatility: { action: "widen_confidence_requirements", delta: { confidence_increase: 0.1 }, expiry: 48 },
      harmful_outcomes: { action: "force_advisory_mode", delta: { advisory_only: true }, expiry: 72 },
      recommendation_overload: { action: "suppress_low_value_recommendations", delta: { min_confidence_threshold: 0.7 }, expiry: 48 },
      tenant_divergence: { action: "pause_tenant_tuning", delta: { pause: true }, expiry: 24 },
      retry_burden: { action: "reduce_experimental_exposure", delta: { max_exposure: 0.1 }, expiry: 48 },
      health_volatility: { action: "restore_balanced_default", delta: { restore: true }, expiry: 72 },
      portfolio_conflicts: { action: "reduce_experimental_exposure", delta: { max_exposure: 0.05 }, expiry: 24 },
      context_variance: { action: "increase_evidence_threshold", delta: { evidence_increase: 0.15 }, expiry: 48 },
    };

    const mapped = actionMap[drift.drift_type];
    if (!mapped) continue;

    const proposal: StabilizationProposal = {
      action_type: mapped.action,
      target_scope: drift.affected_scope,
      target_entities: [drift.affected_scope],
      trigger_signals: [drift.drift_type],
      bounded_delta: mapped.delta,
      expected_outcome: drift.expected_stabilization_target,
      rollback_guard: { restore_previous: true, max_duration_hours: mapped.expiry },
      expiry_hours: mapped.expiry,
      action_mode: drift.severity === "critical" ? "manual_apply" : "advisory",
    };

    const guard = validateStabilizationTarget(proposal);
    if (guard.allowed) {
      proposals.push(proposal);
    }
  }

  // From oscillation signals
  for (const osc of oscillationSignals) {
    if (osc.severity === "low") continue;

    const proposal: StabilizationProposal = {
      action_type: osc.recommended_suppression_action,
      target_scope: osc.oscillation_pattern,
      target_entities: osc.affected_entities.slice(0, 10),
      trigger_signals: [osc.oscillation_pattern],
      bounded_delta: { suppress_oscillation: true, cooldown_hours: 24 },
      expected_outcome: `suppress_${osc.oscillation_pattern}`,
      rollback_guard: { restore_previous: true, max_duration_hours: 48 },
      expiry_hours: 48,
      action_mode: osc.severity === "critical" ? "manual_apply" : "advisory",
    };

    const guard = validateStabilizationTarget(proposal);
    if (guard.allowed) {
      proposals.push(proposal);
    }
  }

  return proposals;
}
