// Cross-Stage Policy Runner — AxionOS Sprint 26
// Matches execution context against active policies and applies bounded actions.

export interface PolicyProfile {
  id: string;
  policy_type: string;
  policy_scope: string;
  affected_stages: string[];
  trigger_signature: string;
  policy_payload: Record<string, unknown>;
  confidence_score: number;
  support_count: number;
  status: string;
  action_mode: string;
}

export interface ExecutionContext {
  organization_id: string;
  stage_key: string;
  pipeline_job_id?: string;
  agent_type?: string;
  model_provider?: string;
  recent_retries?: number;
}

export interface PolicyApplicationResult {
  policy_id: string;
  policy_type: string;
  action_mode: "advisory_only" | "bounded_auto_safe";
  action_applied: boolean;
  recommendation: string;
  reason_codes: string[];
  evidence_refs: any[];
}

// Feature flag simulation
const AUTO_APPLY_ENABLED = false;

const FORBIDDEN_MUTATIONS = new Set([
  "mutate_pipeline", "mutate_governance", "mutate_billing",
  "auto_promote_agent", "delete_history", "skip_validation",
  "bypass_review", "alter_enforcement",
]);

/**
 * Match active policies against current execution context.
 */
export function matchPolicies(
  policies: PolicyProfile[],
  ctx: ExecutionContext,
): PolicyProfile[] {
  return policies.filter(p => {
    if (p.status !== "active") return false;
    return p.affected_stages.includes(ctx.stage_key);
  });
}

/**
 * Apply matched policies to execution context.
 * Returns application results (advisory or bounded).
 */
export function applyPolicies(
  matched: PolicyProfile[],
  ctx: ExecutionContext,
  autoApplyFlag: boolean = AUTO_APPLY_ENABLED,
): PolicyApplicationResult[] {
  const results: PolicyApplicationResult[] = [];

  for (const policy of matched) {
    const reasons: string[] = [`policy_match:${policy.trigger_signature}`];
    const recommendation = (policy.policy_payload.recommendation as string) || "Apply cross-stage coordination";

    const isSafe = policy.action_mode === "bounded_auto_safe";
    const shouldApply = isSafe && autoApplyFlag && policy.confidence_score >= 0.6;

    if (shouldApply) {
      reasons.push("auto_applied:bounded_safe");
    } else {
      reasons.push("advisory_recommendation");
    }

    results.push({
      policy_id: policy.id,
      policy_type: policy.type || policy.policy_type,
      action_mode: shouldApply ? "bounded_auto_safe" : "advisory_only",
      action_applied: shouldApply,
      recommendation,
      reason_codes: reasons,
      evidence_refs: [],
    });
  }

  return results;
}

/**
 * Safety guard: ensure no policy action contains forbidden mutations.
 */
export function isPolicyActionSafe(payload: Record<string, unknown>): boolean {
  const keys = Object.keys(payload);
  return !keys.some(k => FORBIDDEN_MUTATIONS.has(k));
}

/**
 * Validate that a policy respects its declared scope.
 */
export function respectsScope(policy: PolicyProfile, targetStage: string): boolean {
  return policy.affected_stages.includes(targetStage);
}

/**
 * Safe fallback when runner encounters errors.
 */
export function fallbackResult(policyId: string): PolicyApplicationResult {
  return {
    policy_id: policyId,
    policy_type: "unknown",
    action_mode: "advisory_only",
    action_applied: false,
    recommendation: "Fallback: policy runner encountered error, advisory mode only",
    reason_codes: ["runner_error_fallback"],
    evidence_refs: [],
  };
}
