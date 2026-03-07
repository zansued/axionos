/**
 * Platform Calibration Guardrails — Sprint 31
 *
 * Validates whether a calibration proposal is safe to apply.
 * Pure functions. No DB access.
 */

import type { CalibrationProposal, CalibrationParameter } from "./platform-calibration-proposal-engine.ts";

export interface GuardrailResult {
  allowed: boolean;
  violations: string[];
  warnings: string[];
}

// Parameter families that may NEVER be auto-calibrated
const FORBIDDEN_FAMILIES = new Set([
  "pipeline_topology",
  "governance_rules",
  "billing_logic",
  "plan_enforcement",
  "execution_contracts",
  "hard_safety_constraints",
]);

// Max absolute delta per application
const MAX_ABSOLUTE_DELTA = 0.2;

export function validateProposal(
  proposal: CalibrationProposal,
  parameter: CalibrationParameter | undefined,
): GuardrailResult {
  const violations: string[] = [];
  const warnings: string[] = [];

  // 1. Parameter must exist in registry
  if (!parameter) {
    violations.push("parameter_not_in_registry");
    return { allowed: false, violations, warnings };
  }

  // 2. Frozen parameters cannot be changed
  if (parameter.status === "frozen") {
    violations.push("parameter_is_frozen");
    return { allowed: false, violations, warnings };
  }

  // 3. Deprecated parameters cannot be reactivated
  if (parameter.status === "deprecated") {
    violations.push("parameter_is_deprecated");
    return { allowed: false, violations, warnings };
  }

  // 4. Forbidden family check
  if (FORBIDDEN_FAMILIES.has(parameter.parameter_family)) {
    violations.push("forbidden_parameter_family");
    return { allowed: false, violations, warnings };
  }

  // 5. Proposed value within allowed range
  const proposedVal = proposal.proposed_value.value;
  if (proposedVal < parameter.allowed_range.min || proposedVal > parameter.allowed_range.max) {
    violations.push("proposed_value_outside_allowed_range");
  }

  // 6. Delta within max
  const currentVal = proposal.current_value.value;
  const delta = Math.abs(proposedVal - currentVal);
  if (delta > MAX_ABSOLUTE_DELTA) {
    violations.push("delta_exceeds_max_allowed");
  }

  // 7. bounded_auto requires eligible mode
  if (proposal.proposal_mode === "bounded_auto_candidate" && parameter.calibration_mode !== "bounded_auto") {
    violations.push("parameter_not_eligible_for_auto");
  }

  // 8. Rollback guard must be defined
  if (!proposal.rollback_guard || !proposal.rollback_guard.max_observation_window_hours) {
    violations.push("missing_rollback_guard");
  }

  // Warnings for edge cases
  if (proposal.confidence_score < 0.4) {
    warnings.push("low_confidence_proposal");
  }

  if (parameter.status === "watch") {
    warnings.push("parameter_under_watch");
  }

  if (parameter.parameter_scope === "global" && proposal.confidence_score < 0.6) {
    warnings.push("broad_scope_low_confidence");
  }

  return {
    allowed: violations.length === 0,
    violations,
    warnings,
  };
}

export function validateBatch(
  proposals: CalibrationProposal[],
  parameters: Map<string, CalibrationParameter>,
): Map<string, GuardrailResult> {
  const results = new Map<string, GuardrailResult>();
  for (const p of proposals) {
    results.set(p.parameter_key, validateProposal(p, parameters.get(p.parameter_key)));
  }
  return results;
}
