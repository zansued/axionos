// Execution Policy Feedback — AxionOS Sprint 27
// Bounded feedback loops for policy improvement.

export interface OutcomeRecord {
  execution_policy_profile_id: string;
  outcome_status: "helpful" | "neutral" | "harmful" | "inconclusive";
  outcome_metrics?: {
    success_rate_delta?: number;
    cost_delta?: number;
    retry_delta?: number;
    repair_burden_delta?: number;
    validation_failure_delta?: number;
    deploy_success_delta?: number;
    time_to_resolution_delta?: number;
  };
}

export interface PolicyState {
  id: string;
  status: string;
  confidence_score: number | null;
  support_count: number;
  policy_scope: string;
}

export interface FeedbackAction {
  policy_id: string;
  recommended_status: string;
  confidence_adjustment: number;
  support_adjustment: number;
  reason_codes: string[];
}

// Thresholds
const HARMFUL_THRESHOLD = 3;          // harmful outcomes before deprecation
const HELPFUL_THRESHOLD = 5;          // helpful outcomes for promotion consideration
const LOW_CONFIDENCE_FOR_BROAD = 0.4; // broad scope needs higher confidence
const CONFIDENCE_BOOST = 0.05;
const CONFIDENCE_PENALTY = 0.1;
const MAX_CONFIDENCE = 1.0;
const MIN_CONFIDENCE = 0.0;

/**
 * Compute feedback action for a policy based on accumulated outcomes.
 */
export function computeFeedbackAction(
  policy: PolicyState,
  outcomes: OutcomeRecord[],
): FeedbackAction {
  const reasons: string[] = [];
  let confidenceAdj = 0;
  let supportAdj = 0;
  let recommendedStatus = policy.status;

  const relevant = outcomes.filter((o) => o.execution_policy_profile_id === policy.id);
  const helpful = relevant.filter((o) => o.outcome_status === "helpful").length;
  const harmful = relevant.filter((o) => o.outcome_status === "harmful").length;
  const neutral = relevant.filter((o) => o.outcome_status === "neutral").length;
  const total = relevant.length;

  if (total === 0) {
    reasons.push("no_outcomes_no_change");
    return { policy_id: policy.id, recommended_status: recommendedStatus, confidence_adjustment: 0, support_adjustment: 0, reason_codes: reasons };
  }

  supportAdj = total;

  // Harmful pattern detection
  if (harmful >= HARMFUL_THRESHOLD) {
    recommendedStatus = "deprecated";
    confidenceAdj = -CONFIDENCE_PENALTY * harmful;
    reasons.push("repeated_harmful_outcomes_deprecate");
  } else if (harmful > 0 && harmful > helpful) {
    recommendedStatus = "watch";
    confidenceAdj = -CONFIDENCE_PENALTY * harmful;
    reasons.push("more_harmful_than_helpful_watch");
  }

  // Helpful pattern detection
  if (helpful >= HELPFUL_THRESHOLD && harmful === 0) {
    confidenceAdj = CONFIDENCE_BOOST * helpful;
    if (policy.status === "draft" || policy.status === "watch") {
      recommendedStatus = "active";
      reasons.push("repeated_helpful_outcomes_promote");
    } else {
      reasons.push("policy_confirmed_helpful");
    }
  }

  // Broad scope with low confidence stays constrained
  if (policy.policy_scope === "global" && (policy.confidence_score ?? 0) + confidenceAdj < LOW_CONFIDENCE_FOR_BROAD) {
    if (recommendedStatus === "active") {
      recommendedStatus = "watch";
      reasons.push("broad_scope_low_confidence_constrained");
    }
  }

  // Clamp confidence
  const newConfidence = Math.max(MIN_CONFIDENCE, Math.min(MAX_CONFIDENCE, (policy.confidence_score ?? 0.5) + confidenceAdj));
  confidenceAdj = newConfidence - (policy.confidence_score ?? 0.5);

  // Never auto-expand scope
  reasons.push("scope_preserved");

  return {
    policy_id: policy.id,
    recommended_status: recommendedStatus,
    confidence_adjustment: Math.round(confidenceAdj * 100) / 100,
    support_adjustment: supportAdj,
    reason_codes: reasons,
  };
}

/**
 * Validate that feedback does not break safety rules.
 */
export function validateFeedbackAction(action: FeedbackAction): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  
  const validStatuses = ["draft", "active", "watch", "deprecated"];
  if (!validStatuses.includes(action.recommended_status)) {
    violations.push(`invalid_status_${action.recommended_status}`);
  }

  return { valid: violations.length === 0, violations };
}
