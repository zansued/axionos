// Execution Policy Adjuster — AxionOS Sprint 27
// Computes bounded runtime adjustments from an execution policy.

export interface AdjustmentSet {
  validation_sensitivity: number;     // 0.0-1.0 (default 0.5)
  retry_escalation_threshold: number; // max retries before escalation (default 3)
  predictive_checkpoint_sensitivity: number; // 0.0-1.0 (default 0.5)
  context_enrichment_level: "minimal" | "standard" | "extended";
  repair_strategy_conservatism: number; // 0.0-1.0 (default 0.5)
  prompt_experimentation_limit: number; // 0.0-1.0 exposure (default 0.1)
  human_review_escalation_threshold: number; // risk score (default 0.8)
  deploy_hardening_intensity: number; // 0.0-1.0 (default 0.5)
}

export const DEFAULT_ADJUSTMENTS: AdjustmentSet = {
  validation_sensitivity: 0.5,
  retry_escalation_threshold: 3,
  predictive_checkpoint_sensitivity: 0.5,
  context_enrichment_level: "standard",
  repair_strategy_conservatism: 0.5,
  prompt_experimentation_limit: 0.1,
  human_review_escalation_threshold: 0.8,
  deploy_hardening_intensity: 0.5,
};

// Predefined adjustments per policy mode
const MODE_ADJUSTMENTS: Record<string, Partial<AdjustmentSet>> = {
  balanced_default: {},
  high_quality: {
    validation_sensitivity: 0.8,
    repair_strategy_conservatism: 0.7,
    prompt_experimentation_limit: 0.05,
    deploy_hardening_intensity: 0.7,
    human_review_escalation_threshold: 0.6,
  },
  cost_optimized: {
    validation_sensitivity: 0.3,
    retry_escalation_threshold: 2,
    context_enrichment_level: "minimal",
    repair_strategy_conservatism: 0.3,
    prompt_experimentation_limit: 0.15,
    deploy_hardening_intensity: 0.3,
  },
  rapid_iteration: {
    validation_sensitivity: 0.3,
    retry_escalation_threshold: 2,
    context_enrichment_level: "minimal",
    repair_strategy_conservatism: 0.3,
    prompt_experimentation_limit: 0.2,
    deploy_hardening_intensity: 0.3,
    human_review_escalation_threshold: 0.9,
  },
  risk_sensitive: {
    validation_sensitivity: 0.9,
    predictive_checkpoint_sensitivity: 0.8,
    repair_strategy_conservatism: 0.8,
    prompt_experimentation_limit: 0.02,
    human_review_escalation_threshold: 0.5,
    deploy_hardening_intensity: 0.8,
    context_enrichment_level: "extended",
  },
  deploy_hardened: {
    validation_sensitivity: 0.9,
    deploy_hardening_intensity: 0.95,
    repair_strategy_conservatism: 0.8,
    prompt_experimentation_limit: 0.0,
    human_review_escalation_threshold: 0.5,
    context_enrichment_level: "extended",
  },
  repair_conservative: {
    repair_strategy_conservatism: 0.9,
    retry_escalation_threshold: 2,
    predictive_checkpoint_sensitivity: 0.7,
    validation_sensitivity: 0.7,
    prompt_experimentation_limit: 0.02,
  },
  validation_heavy: {
    validation_sensitivity: 0.95,
    predictive_checkpoint_sensitivity: 0.8,
    context_enrichment_level: "extended",
    deploy_hardening_intensity: 0.7,
    human_review_escalation_threshold: 0.6,
  },
};

// Hard limits that cannot be exceeded by any policy
const HARD_LIMITS: Partial<AdjustmentSet> = {
  retry_escalation_threshold: 1, // minimum
  prompt_experimentation_limit: 0.3, // maximum
};

const FORBIDDEN_ACTIONS = new Set([
  "reorder_pipeline_stages",
  "skip_mandatory_validation",
  "disable_governance_gates",
  "alter_billing",
  "alter_plans",
  "alter_enforcement",
  "override_safety_contracts",
]);

/**
 * Compute bounded adjustments for a given policy mode.
 * Merges mode defaults with any custom allowed_adjustments, respecting hard limits.
 */
export function computeAdjustments(
  policy_mode: string,
  allowed_adjustments: Record<string, unknown>,
): { adjustments: AdjustmentSet; applied_overrides: string[]; blocked_actions: string[] } {
  const base = { ...DEFAULT_ADJUSTMENTS };
  const modeOverrides = MODE_ADJUSTMENTS[policy_mode] || {};
  const applied: string[] = [];
  const blocked: string[] = [];

  // Apply mode defaults
  for (const [key, value] of Object.entries(modeOverrides)) {
    (base as any)[key] = value;
    applied.push(`mode_${key}`);
  }

  // Apply custom overrides from allowed_adjustments
  for (const [key, value] of Object.entries(allowed_adjustments)) {
    if (FORBIDDEN_ACTIONS.has(key)) {
      blocked.push(key);
      continue;
    }
    if (key in base) {
      (base as any)[key] = value;
      applied.push(`custom_${key}`);
    }
  }

  // Enforce hard limits
  if (base.retry_escalation_threshold < (HARD_LIMITS.retry_escalation_threshold ?? 1)) {
    base.retry_escalation_threshold = HARD_LIMITS.retry_escalation_threshold ?? 1;
  }
  if (base.prompt_experimentation_limit > (HARD_LIMITS.prompt_experimentation_limit ?? 0.3)) {
    base.prompt_experimentation_limit = HARD_LIMITS.prompt_experimentation_limit ?? 0.3;
  }

  return { adjustments: base, applied_overrides: applied, blocked_actions: blocked };
}
