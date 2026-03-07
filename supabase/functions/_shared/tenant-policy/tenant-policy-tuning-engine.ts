// Tenant Policy Tuning Engine — AxionOS Sprint 29
// Combines global portfolio with tenant/workspace preferences to produce tuned policy ordering.

export interface TenantPreference {
  id: string;
  organization_id: string;
  workspace_id: string | null;
  preference_scope: "organization" | "workspace";
  preference_name: string;
  preferred_policy_modes: string[];
  priority_weights: Record<string, number>;
  override_limits: Record<string, unknown>;
  confidence_score: number | null;
  support_count: number;
  status: string;
}

export interface TenantOutcomeSummary {
  policy_id: string;
  context_class: string;
  helpful: number;
  harmful: number;
  neutral: number;
  total: number;
}

export interface TuningInput {
  organization_id: string;
  workspace_id?: string;
  context_class: string;
  global_policy_ranking: Array<{ policy_id: string; policy_mode: string; composite_score: number }>;
  tenant_preferences: TenantPreference[];
  tenant_outcomes: TenantOutcomeSummary[];
  local_failure_rate?: number;
  local_cost_pressure?: number;
  local_deploy_criticality?: number;
  local_repair_burden?: number;
  local_review_burden?: number;
}

export interface TuningResult {
  tuned_policy_order: Array<{ policy_id: string; policy_mode: string; tuned_score: number; tuning_source: "global" | "organization" | "workspace" }>;
  allowed_adjustment_deltas: Record<string, number>;
  confidence_score: number;
  reason_codes: string[];
  evidence_refs: string[];
}

const DEFAULT_PRIORITY_WEIGHTS: Record<string, number> = {
  quality: 0.3,
  cost: 0.25,
  speed: 0.2,
  stability: 0.25,
};

/**
 * Compute tuned policy ordering for a tenant/workspace context.
 */
export function computeTenantTuning(input: TuningInput): TuningResult {
  const reasons: string[] = [];
  const evidenceRefs: string[] = [];

  // Find applicable preference (workspace > org)
  const wsPrefs = input.tenant_preferences.filter(
    (p) => p.status === "active" && p.preference_scope === "workspace" && p.workspace_id === input.workspace_id,
  );
  const orgPrefs = input.tenant_preferences.filter(
    (p) => p.status === "active" && p.preference_scope === "organization",
  );

  const activePreference = wsPrefs[0] || orgPrefs[0] || null;
  const tuningSource: "global" | "organization" | "workspace" = wsPrefs[0]
    ? "workspace"
    : orgPrefs[0]
      ? "organization"
      : "global";

  if (!activePreference) {
    reasons.push("no_active_tenant_preference_using_global");
    return {
      tuned_policy_order: input.global_policy_ranking.map((p) => ({
        policy_id: p.policy_id,
        policy_mode: p.policy_mode,
        tuned_score: p.composite_score,
        tuning_source: "global" as const,
      })),
      allowed_adjustment_deltas: {},
      confidence_score: 1.0,
      reason_codes: reasons,
      evidence_refs: evidenceRefs,
    };
  }

  reasons.push(`using_${tuningSource}_preference_${activePreference.preference_name}`);
  evidenceRefs.push(activePreference.id);

  const weights = { ...DEFAULT_PRIORITY_WEIGHTS, ...activePreference.priority_weights };
  const preferredModes = new Set(activePreference.preferred_policy_modes);

  // Compute tuned scores
  const tuned = input.global_policy_ranking.map((p) => {
    let boost = 0;

    // Boost preferred modes
    if (preferredModes.has(p.policy_mode)) {
      boost += 0.15;
      reasons.push(`preferred_mode_boost_${p.policy_mode}`);
    }

    // Factor in local outcomes
    const localOutcome = input.tenant_outcomes.find(
      (o) => o.policy_id === p.policy_id && o.context_class === input.context_class,
    );
    if (localOutcome && localOutcome.total >= 3) {
      const helpfulRate = localOutcome.helpful / localOutcome.total;
      const harmfulRate = localOutcome.harmful / localOutcome.total;
      boost += (helpfulRate - harmfulRate) * 0.1;
      if (harmfulRate > 0.4) {
        boost -= 0.2;
        reasons.push(`local_harmful_penalty_${p.policy_mode}`);
      }
    }

    // Factor local signals
    if (input.local_cost_pressure && input.local_cost_pressure > 0.7 && p.policy_mode === "cost_optimized") {
      boost += 0.05;
    }
    if (input.local_deploy_criticality && input.local_deploy_criticality > 0.7 && p.policy_mode === "deploy_hardened") {
      boost += 0.05;
    }
    if (input.local_failure_rate && input.local_failure_rate > 0.5 && p.policy_mode === "risk_sensitive") {
      boost += 0.05;
    }

    return {
      policy_id: p.policy_id,
      policy_mode: p.policy_mode,
      tuned_score: Math.max(0, Math.min(1, p.composite_score + boost)),
      tuning_source: tuningSource,
    };
  });

  // Sort by tuned score descending
  tuned.sort((a, b) => b.tuned_score - a.tuned_score);

  // Compute allowed adjustment deltas from override_limits
  const allowedDeltas: Record<string, number> = {};
  const limits = activePreference.override_limits as Record<string, number>;
  for (const [key, maxDelta] of Object.entries(limits)) {
    if (typeof maxDelta === "number") {
      allowedDeltas[key] = Math.min(Math.abs(maxDelta), 0.3); // Hard cap at 0.3 delta
    }
  }

  const confidence = Math.min(1, (activePreference.confidence_score ?? 0.5) * (activePreference.support_count >= 5 ? 1.0 : 0.7));

  return {
    tuned_policy_order: tuned,
    allowed_adjustment_deltas: allowedDeltas,
    confidence_score: confidence,
    reason_codes: [...new Set(reasons)],
    evidence_refs: evidenceRefs,
  };
}
