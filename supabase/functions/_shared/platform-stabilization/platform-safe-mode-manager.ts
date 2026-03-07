// Platform Safe Mode Manager — Sprint 34
// Manages bounded safe-mode profiles for unstable scopes.

export interface SafeModeProfile {
  profile_key: string;
  profile_name: string;
  profile_scope: "global" | "organization" | "workspace" | "context_class";
  stabilization_controls: Record<string, unknown>;
  activation_mode: "manual_only" | "bounded_auto";
}

const DEFAULT_SAFE_MODE_PROFILES: SafeModeProfile[] = [
  {
    profile_key: "balanced_default_recovery",
    profile_name: "Balanced Default Recovery",
    profile_scope: "global",
    stabilization_controls: {
      force_balanced_default: true,
      disable_experimental: true,
      advisory_only: true,
    },
    activation_mode: "manual_only",
  },
  {
    profile_key: "advisory_only_recovery",
    profile_name: "Advisory-Only Recovery",
    profile_scope: "global",
    stabilization_controls: {
      all_actions_advisory: true,
      disable_bounded_auto: true,
    },
    activation_mode: "manual_only",
  },
  {
    profile_key: "low_experimentation_mode",
    profile_name: "Low Experimentation Mode",
    profile_scope: "global",
    stabilization_controls: {
      max_experiment_exposure: 0.05,
      disable_new_variants: true,
    },
    activation_mode: "bounded_auto",
  },
  {
    profile_key: "strict_promotion_guard",
    profile_name: "Strict Promotion Guard",
    profile_scope: "global",
    stabilization_controls: {
      min_confidence_for_promotion: 0.9,
      min_sample_size: 50,
      require_review: true,
    },
    activation_mode: "bounded_auto",
  },
  {
    profile_key: "tenant_tuning_pause",
    profile_name: "Tenant Tuning Pause",
    profile_scope: "organization",
    stabilization_controls: {
      pause_local_tuning: true,
      fallback_to_global: true,
    },
    activation_mode: "manual_only",
  },
  {
    profile_key: "portfolio_consolidation_mode",
    profile_name: "Portfolio Consolidation Mode",
    profile_scope: "global",
    stabilization_controls: {
      freeze_new_strategies: true,
      deprecate_low_performers: true,
      consolidate_duplicates: true,
    },
    activation_mode: "manual_only",
  },
];

export function getDefaultSafeModeProfiles(): SafeModeProfile[] {
  return DEFAULT_SAFE_MODE_PROFILES;
}

/**
 * Select the best safe mode profile for a given instability context.
 */
export function selectSafeModeProfile(
  instabilityType: string,
  profiles: SafeModeProfile[],
): SafeModeProfile | null {
  const mapping: Record<string, string> = {
    policy_churn: "balanced_default_recovery",
    strategy_churn: "portfolio_consolidation_mode",
    calibration_volatility: "strict_promotion_guard",
    harmful_outcomes: "advisory_only_recovery",
    tenant_divergence: "tenant_tuning_pause",
    health_volatility: "balanced_default_recovery",
    portfolio_conflicts: "portfolio_consolidation_mode",
    recommendation_overload: "low_experimentation_mode",
    retry_burden: "advisory_only_recovery",
    context_variance: "strict_promotion_guard",
  };

  const targetKey = mapping[instabilityType];
  if (!targetKey) return null;

  return profiles.find(p => p.profile_key === targetKey) || null;
}
