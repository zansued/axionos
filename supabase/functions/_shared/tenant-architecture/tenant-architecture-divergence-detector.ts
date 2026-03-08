/**
 * Tenant Architecture Divergence Detector — Sprint 47
 * Detects tenant architecture divergence drift.
 */

export interface DivergenceInput {
  organization_id: string;
  workspace_id?: string;
  active_mode_key: string;
  global_default_mode_key: string;
  local_exception_count: number;
  mode_selection_confidence: number;
  mode_stability_history: Array<{ mode_key: string; timestamp: string }>;
  override_count: number;
}

export interface DivergenceResult {
  divergence_drift_score: number;
  affected_scopes: string[];
  drift_reason_codes: string[];
  risk_flags: string[];
  recommendations: string[];
}

export function detectDivergenceDrift(input: DivergenceInput): DivergenceResult {
  let drift = 0;
  const reasons: string[] = [];
  const risks: string[] = [];
  const recommendations: string[] = [];
  const scopes: string[] = [input.organization_id];
  if (input.workspace_id) scopes.push(input.workspace_id);

  // Divergence from global default
  if (input.active_mode_key !== input.global_default_mode_key) {
    drift += 0.2;
    reasons.push("mode_diverges_from_global_default");
  }

  // Repeated local exceptions
  if (input.local_exception_count > 5) {
    drift += 0.15;
    reasons.push("excessive_local_exceptions");
    recommendations.push("consolidate_exceptions_into_mode_definition");
  }

  // Low confidence selection
  if (input.mode_selection_confidence < 0.4) {
    drift += 0.15;
    reasons.push("chronic_low_confidence_selection");
    risks.push("unstable_mode_selection");
    recommendations.push("increase_evidence_or_return_to_default");
  }

  // Mode instability (frequent changes)
  if (input.mode_stability_history.length > 0) {
    const uniqueModes = new Set(input.mode_stability_history.map((h) => h.mode_key)).size;
    if (uniqueModes > 3) {
      drift += 0.2;
      reasons.push("mode_instability_frequent_changes");
      risks.push("oscillating_architecture_mode");
      recommendations.push("stabilize_mode_selection_before_further_changes");
    }
  }

  // Excessive overrides
  if (input.override_count > 8) {
    drift += 0.15;
    reasons.push("growing_override_mismatch");
    recommendations.push("tighten_override_limits");
  }

  drift = Math.min(1, drift);

  if (drift > 0.6) {
    risks.push("high_divergence_risk");
    recommendations.push("force_return_to_balanced_default");
  }

  return {
    divergence_drift_score: drift,
    affected_scopes: scopes,
    drift_reason_codes: reasons,
    risk_flags: risks,
    recommendations,
  };
}
