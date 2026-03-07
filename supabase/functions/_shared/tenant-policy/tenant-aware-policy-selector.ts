// Tenant-Aware Policy Selector — AxionOS Sprint 29
// Extends execution policy selection to consider tenant/workspace preferences.

import { type SelectionResult, selectExecutionPolicy, type PolicyProfile } from "../execution-policy/execution-policy-selector.ts";
import { type TenantPreference, type TuningResult, computeTenantTuning, type TuningInput } from "./tenant-policy-tuning-engine.ts";

export interface TenantAwareSelectionInput {
  organization_id: string;
  workspace_id?: string;
  context_class: string;
  confidence_score: number;
  initiative_type?: string;
  global_profiles: PolicyProfile[];
  tenant_preferences: TenantPreference[];
  tenant_outcomes: Array<{ policy_id: string; context_class: string; helpful: number; harmful: number; neutral: number; total: number }>;
  global_ranking?: Array<{ policy_id: string; policy_mode: string; composite_score: number }>;
  local_failure_rate?: number;
  local_cost_pressure?: number;
  local_deploy_criticality?: number;
}

export interface TenantAwareSelectionResult {
  selected_policy: PolicyProfile | null;
  selection_mode: "global_default" | "tenant_tuned" | "workspace_tuned";
  global_selection: SelectionResult;
  tuning: TuningResult | null;
  reason_codes: string[];
}

/**
 * Select the best execution policy considering both global and tenant preferences.
 */
export function selectTenantAwarePolicy(input: TenantAwareSelectionInput): TenantAwareSelectionResult {
  const reasons: string[] = [];

  // Step 1: Get global selection as baseline
  const globalSelection = selectExecutionPolicy(input.global_profiles, {
    context_class: input.context_class,
    confidence_score: input.confidence_score,
    organization_id: input.organization_id,
    initiative_type: input.initiative_type,
    workspace_id: input.workspace_id,
  });

  // Step 2: Check if tenant tuning is available
  const activePrefs = input.tenant_preferences.filter((p) => p.status === "active");
  if (activePrefs.length === 0) {
    reasons.push("no_active_tenant_preferences_using_global");
    return {
      selected_policy: globalSelection.selected_policy,
      selection_mode: "global_default",
      global_selection: globalSelection,
      tuning: null,
      reason_codes: [...globalSelection.reason_codes, ...reasons],
    };
  }

  // Step 3: Compute tenant tuning
  const globalRanking = input.global_ranking || input.global_profiles
    .filter((p) => p.status === "active")
    .map((p) => ({
      policy_id: p.id,
      policy_mode: p.policy_mode,
      composite_score: (p.confidence_score ?? 0.5) * 0.5 + ((p.default_priority ?? 0) / 10) * 0.5,
    }));

  const tuningInput: TuningInput = {
    organization_id: input.organization_id,
    workspace_id: input.workspace_id,
    context_class: input.context_class,
    global_policy_ranking: globalRanking,
    tenant_preferences: activePrefs,
    tenant_outcomes: input.tenant_outcomes,
    local_failure_rate: input.local_failure_rate,
    local_cost_pressure: input.local_cost_pressure,
    local_deploy_criticality: input.local_deploy_criticality,
  };

  const tuning = computeTenantTuning(tuningInput);

  // Step 4: Validate tuning confidence
  if (tuning.confidence_score < 0.3) {
    reasons.push("tenant_tuning_low_confidence_fallback_to_global");
    return {
      selected_policy: globalSelection.selected_policy,
      selection_mode: "global_default",
      global_selection: globalSelection,
      tuning,
      reason_codes: [...globalSelection.reason_codes, ...tuning.reason_codes, ...reasons],
    };
  }

  // Step 5: Select from tuned ordering
  const topTuned = tuning.tuned_policy_order[0];
  if (!topTuned) {
    reasons.push("empty_tuned_order_fallback_to_global");
    return {
      selected_policy: globalSelection.selected_policy,
      selection_mode: "global_default",
      global_selection: globalSelection,
      tuning,
      reason_codes: [...globalSelection.reason_codes, ...tuning.reason_codes, ...reasons],
    };
  }

  const tunedPolicy = input.global_profiles.find((p) => p.id === topTuned.policy_id) || null;
  if (!tunedPolicy || tunedPolicy.status !== "active") {
    reasons.push("tuned_policy_not_active_fallback_to_global");
    return {
      selected_policy: globalSelection.selected_policy,
      selection_mode: "global_default",
      global_selection: globalSelection,
      tuning,
      reason_codes: [...globalSelection.reason_codes, ...tuning.reason_codes, ...reasons],
    };
  }

  const selectionMode = topTuned.tuning_source === "workspace"
    ? "workspace_tuned"
    : topTuned.tuning_source === "organization"
      ? "tenant_tuned"
      : "global_default";

  reasons.push(`tenant_tuned_selected_${tunedPolicy.policy_mode}`);

  return {
    selected_policy: tunedPolicy,
    selection_mode: selectionMode,
    global_selection: globalSelection,
    tuning,
    reason_codes: [...globalSelection.reason_codes, ...tuning.reason_codes, ...reasons],
  };
}
