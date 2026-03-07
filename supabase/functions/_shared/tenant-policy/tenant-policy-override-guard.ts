// Tenant Policy Override Guard — AxionOS Sprint 29
// Validates that tenant/workspace local overrides stay within declared bounds.

export interface OverrideRequest {
  key: string;
  requested_delta: number;
}

export interface OverrideLimits {
  validation_sensitivity_bias?: number;
  retry_escalation_bias?: number;
  predictive_checkpoint_sensitivity_bias?: number;
  human_review_threshold_bias?: number;
  context_enrichment_level_bias?: number;
  prompt_experimentation_exposure_cap?: number;
}

export interface OverrideGuardResult {
  allowed_overrides: Record<string, number>;
  blocked_overrides: string[];
  reason_codes: string[];
}

// Forbidden override keys that must never be modified by tenant tuning
const FORBIDDEN_OVERRIDE_KEYS = new Set([
  "reorder_pipeline_stages",
  "skip_mandatory_validation",
  "disable_governance_gates",
  "alter_billing",
  "alter_plans",
  "alter_enforcement",
  "override_safety_contracts",
  "mutate_pipeline_topology",
  "mutate_governance_rules",
  "bypass_review_gate",
  "delete_evidence",
]);

// Maximum absolute delta any tenant override can request
const MAX_ABSOLUTE_DELTA = 0.3;

// Allowed override keys with their max bounds
const ALLOWED_OVERRIDE_KEYS: Record<string, { min: number; max: number }> = {
  validation_sensitivity_bias: { min: -0.3, max: 0.3 },
  retry_escalation_bias: { min: -2, max: 2 },
  predictive_checkpoint_sensitivity_bias: { min: -0.3, max: 0.3 },
  human_review_threshold_bias: { min: -0.3, max: 0.2 },
  context_enrichment_level_bias: { min: -0.2, max: 0.3 },
  prompt_experimentation_exposure_cap: { min: 0, max: 0.3 },
};

/**
 * Validate and clamp tenant override requests against declared limits.
 */
export function guardOverrides(
  requests: OverrideRequest[],
  declaredLimits: Record<string, unknown>,
): OverrideGuardResult {
  const allowed: Record<string, number> = {};
  const blocked: string[] = [];
  const reasons: string[] = [];

  for (const req of requests) {
    // Block forbidden keys
    if (FORBIDDEN_OVERRIDE_KEYS.has(req.key)) {
      blocked.push(req.key);
      reasons.push(`forbidden_override_${req.key}`);
      continue;
    }

    // Check if key is in allowed set
    const bounds = ALLOWED_OVERRIDE_KEYS[req.key];
    if (!bounds) {
      blocked.push(req.key);
      reasons.push(`unknown_override_key_${req.key}`);
      continue;
    }

    // Check declared limit
    const declaredLimit = declaredLimits[req.key];
    const maxAllowed = typeof declaredLimit === "number" ? Math.min(Math.abs(declaredLimit), MAX_ABSOLUTE_DELTA) : MAX_ABSOLUTE_DELTA;

    // Clamp to bounds
    let clamped = Math.max(bounds.min, Math.min(bounds.max, req.requested_delta));
    if (Math.abs(clamped) > maxAllowed) {
      clamped = clamped > 0 ? maxAllowed : -maxAllowed;
      reasons.push(`clamped_${req.key}_to_${clamped}`);
    }

    allowed[req.key] = clamped;
  }

  return { allowed_overrides: allowed, blocked_overrides: blocked, reason_codes: reasons };
}

/**
 * Check if a set of override limits contains any forbidden keys.
 */
export function validateOverrideLimits(limits: Record<string, unknown>): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  for (const key of Object.keys(limits)) {
    if (FORBIDDEN_OVERRIDE_KEYS.has(key)) {
      violations.push(key);
    }
  }
  return { valid: violations.length === 0, violations };
}
