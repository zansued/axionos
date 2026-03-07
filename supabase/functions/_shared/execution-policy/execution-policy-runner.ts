// Execution Policy Runner — AxionOS Sprint 27
// Applies selected policy at bounded runtime checkpoints.

import { type AdjustmentSet, computeAdjustments } from "./execution-policy-adjuster.ts";

export interface PolicyApplication {
  policy_id: string;
  policy_name: string;
  policy_mode: string;
  applied_mode: "advisory_only" | "bounded_auto_safe";
  adjustments: AdjustmentSet;
  adjustments_applied: string[];
  blocked_actions: string[];
  reason_codes: string[];
  checkpoint: string;
}

export interface RunnerContext {
  organization_id: string;
  pipeline_job_id?: string;
  checkpoint: "pipeline_bootstrap" | "pre_expensive_stage" | "pre_deploy" | "post_retry_escalation" | "validation_sensitive_transition";
  context_class: string;
  feature_flags?: Record<string, boolean>;
}

// Feature flag for auto-apply
const DEFAULT_AUTO_APPLY_FLAG = "execution_policy_auto_apply";

const FORBIDDEN_MUTATIONS = new Set([
  "mutate_pipeline_topology",
  "mutate_governance_rules",
  "mutate_billing",
  "mutate_plans",
  "mutate_enforcement",
  "skip_validation_gate",
  "bypass_review_gate",
  "delete_evidence",
]);

/**
 * Apply execution policy at a runtime checkpoint.
 * Returns the adjustments to use and audit info.
 */
export function applyExecutionPolicy(
  policy: {
    id: string;
    policy_name: string;
    policy_mode: string;
    policy_scope: string;
    allowed_adjustments: Record<string, unknown>;
    confidence_score: number | null;
    status: string;
  },
  ctx: RunnerContext,
): PolicyApplication {
  const reasons: string[] = [];

  // Validate policy is active
  if (policy.status !== "active") {
    reasons.push("policy_not_active_advisory_only");
  }

  // Check forbidden mutations in allowed_adjustments
  for (const key of Object.keys(policy.allowed_adjustments)) {
    if (FORBIDDEN_MUTATIONS.has(key)) {
      reasons.push(`blocked_forbidden_mutation_${key}`);
    }
  }

  // Determine application mode
  const autoApplyEnabled = ctx.feature_flags?.[DEFAULT_AUTO_APPLY_FLAG] ?? false;
  const confidenceHigh = (policy.confidence_score ?? 0) >= 0.6;
  const scopeNarrow = policy.policy_scope !== "global";

  let appliedMode: "advisory_only" | "bounded_auto_safe" = "advisory_only";

  if (autoApplyEnabled && confidenceHigh && policy.status === "active") {
    appliedMode = "bounded_auto_safe";
    reasons.push("auto_apply_enabled_confidence_sufficient");
  } else {
    if (!autoApplyEnabled) reasons.push("auto_apply_disabled");
    if (!confidenceHigh) reasons.push("confidence_below_threshold");
  }

  // Broad global policies with low confidence stay advisory
  if (policy.policy_scope === "global" && (policy.confidence_score ?? 0) < 0.5) {
    appliedMode = "advisory_only";
    reasons.push("broad_scope_low_confidence_forced_advisory");
  }

  // Compute adjustments
  const { adjustments, applied_overrides, blocked_actions } = computeAdjustments(
    policy.policy_mode,
    policy.allowed_adjustments,
  );

  return {
    policy_id: policy.id,
    policy_name: policy.policy_name,
    policy_mode: policy.policy_mode,
    applied_mode: appliedMode,
    adjustments,
    adjustments_applied: applied_overrides,
    blocked_actions: blocked_actions,
    reason_codes: reasons,
    checkpoint: ctx.checkpoint,
  };
}

/**
 * Validate that an adjustment set does not contain forbidden mutations.
 */
export function validateAdjustments(adjustments: Record<string, unknown>): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  for (const key of Object.keys(adjustments)) {
    if (FORBIDDEN_MUTATIONS.has(key)) {
      violations.push(key);
    }
  }
  return { valid: violations.length === 0, violations };
}

/**
 * Safe fallback when policy application fails.
 */
export function fallbackApplication(ctx: RunnerContext): PolicyApplication {
  const { adjustments } = computeAdjustments("balanced_default", {});
  return {
    policy_id: "fallback-default",
    policy_name: "Fallback Balanced Default",
    policy_mode: "balanced_default",
    applied_mode: "advisory_only",
    adjustments,
    adjustments_applied: [],
    blocked_actions: [],
    reason_codes: ["fallback_after_error"],
    checkpoint: ctx.checkpoint,
  };
}
