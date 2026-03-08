/**
 * Tenant Architecture Mode Explainer — Sprint 47
 * Explains tenant-aware architecture mode decisions.
 */

export interface ModeExplanation {
  selected_mode: string | null;
  scope_description: string;
  envelope_description: string;
  anti_fragmentation_status: string;
  divergence_risks: string[];
  consolidation_triggers: string[];
  recovery_notes: string[];
  safety_notes: string[];
}

export function explainModeDecision(params: {
  selected_mode_key: string | null;
  scope_ref: Record<string, unknown>;
  envelope_controls: Array<{ control_type: string; control_value: unknown }>;
  fragmentation_risk_score: number;
  divergence_flags: string[];
  recommendations: string[];
  rationale_codes: string[];
}): ModeExplanation {
  const scope_parts: string[] = [];
  if (params.scope_ref.organization_id) scope_parts.push(`org:${params.scope_ref.organization_id}`);
  if (params.scope_ref.workspace_id) scope_parts.push(`ws:${params.scope_ref.workspace_id}`);
  if (params.scope_ref.context_class) scope_parts.push(`ctx:${params.scope_ref.context_class}`);

  const envelope_desc = params.envelope_controls.length > 0
    ? `${params.envelope_controls.length} controls active: ${params.envelope_controls.map((c) => c.control_type).join(", ")}`
    : "No envelope controls active";

  const fragStatus = params.fragmentation_risk_score < 0.3 ? "low_risk"
    : params.fragmentation_risk_score < 0.6 ? "moderate_risk"
    : "high_risk";

  const consolidation_triggers: string[] = [];
  if (params.fragmentation_risk_score > 0.6) consolidation_triggers.push("high_fragmentation_risk_requires_consolidation");
  if (params.divergence_flags.length > 2) consolidation_triggers.push("multiple_divergence_flags_detected");

  return {
    selected_mode: params.selected_mode_key,
    scope_description: scope_parts.join(" / ") || "global",
    envelope_description: envelope_desc,
    anti_fragmentation_status: fragStatus,
    divergence_risks: params.divergence_flags,
    consolidation_triggers,
    recovery_notes: params.recommendations,
    safety_notes: [
      "tenant_architecture_modes_cannot_fork_platform",
      "cannot_mutate_governance_billing_plans_enforcement",
      "cannot_override_tenant_isolation",
      "all_outputs_bounded_explainable_review_driven",
    ],
  };
}
