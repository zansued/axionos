// Execution Policy Selector — AxionOS Sprint 27
// Deterministic policy selection based on context class and active profiles.

export interface PolicyProfile {
  id: string;
  policy_name: string;
  policy_mode: string;
  policy_scope: string;
  allowed_adjustments: Record<string, unknown>;
  default_priority: number | null;
  confidence_score: number | null;
  support_count: number;
  status: string;
}

export interface SelectionInput {
  context_class: string;
  confidence_score: number;
  organization_id: string;
  initiative_type?: string;
  workspace_id?: string;
}

export interface SelectionResult {
  selected_policy: PolicyProfile | null;
  selection_mode: "exact_match" | "scope_fallback" | "default_fallback";
  reason_codes: string[];
  candidates_evaluated: number;
}

const DEFAULT_POLICY: PolicyProfile = {
  id: "default-balanced",
  policy_name: "Balanced Default",
  policy_mode: "balanced_default",
  policy_scope: "global",
  allowed_adjustments: {},
  default_priority: 0,
  confidence_score: 1.0,
  support_count: 999,
  status: "active",
};

/**
 * Select the best execution policy for the given context.
 * Resolution order: execution_context > workspace > initiative_type > global > default.
 */
export function selectExecutionPolicy(
  profiles: PolicyProfile[],
  input: SelectionInput,
): SelectionResult {
  const reasons: string[] = [];

  // Filter active only
  const active = profiles.filter((p) => p.status === "active");
  if (active.length === 0) {
    reasons.push("no_active_profiles_using_default");
    return {
      selected_policy: DEFAULT_POLICY,
      selection_mode: "default_fallback",
      reason_codes: reasons,
      candidates_evaluated: profiles.length,
    };
  }

  // Try exact match by policy_mode == context_class
  const exactMatches = active.filter((p) => p.policy_mode === input.context_class);

  // Resolution by scope precedence
  const scopeOrder = ["execution_context", "workspace", "initiative_type", "global"];

  for (const scope of scopeOrder) {
    const scopeMatches = exactMatches.filter((p) => p.policy_scope === scope);
    if (scopeMatches.length > 0) {
      // Pick by highest priority, then highest confidence
      const selected = scopeMatches.sort((a, b) => {
        const pDiff = (b.default_priority ?? 0) - (a.default_priority ?? 0);
        if (pDiff !== 0) return pDiff;
        return (b.confidence_score ?? 0) - (a.confidence_score ?? 0);
      })[0];
      reasons.push(`exact_match_scope_${scope}`);
      return {
        selected_policy: selected,
        selection_mode: "exact_match",
        reason_codes: reasons,
        candidates_evaluated: active.length,
      };
    }
  }

  // Fallback: try any active global policy
  const globalFallback = active
    .filter((p) => p.policy_scope === "global")
    .sort((a, b) => (b.default_priority ?? 0) - (a.default_priority ?? 0));

  if (globalFallback.length > 0) {
    reasons.push("scope_fallback_global");
    return {
      selected_policy: globalFallback[0],
      selection_mode: "scope_fallback",
      reason_codes: reasons,
      candidates_evaluated: active.length,
    };
  }

  // Ultimate fallback
  reasons.push("no_matching_policy_using_default");
  return {
    selected_policy: DEFAULT_POLICY,
    selection_mode: "default_fallback",
    reason_codes: reasons,
    candidates_evaluated: active.length,
  };
}
