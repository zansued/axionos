// Repair Policy Engine — AxionOS Sprint 23
// Selects best repair strategy using historical evidence, memory, and policy profiles.

export interface RepairContext {
  organization_id: string;
  stage_key: string;
  error_signature: string;
  error_category: string;
  error_message: string;
  agent_type?: string;
  model_provider?: string;
  model_name?: string;
  recent_retry_count: number;
}

export interface PolicyProfile {
  id: string;
  preferred_strategy: string;
  fallback_strategy: string | null;
  confidence: number;
  support_count: number;
  failure_count: number;
  avg_retry_count: number;
  avg_repair_cost_usd: number;
  status: string;
}

export interface MemoryEvidence {
  error_patterns: Array<{ error_category: string; success_rate: number; successful_strategies: string[] }>;
  strategy_effectiveness: Array<{ repair_strategy: string; success_rate: number; attempts_total: number }>;
  recent_decisions: Array<{ selected_strategy: string; outcome_status: string }>;
}

export interface RepairPolicyDecision {
  selected_strategy: string;
  fallback_strategy: string | null;
  confidence: number;
  reason_codes: string[];
  evidence_refs: Array<{ type: string; id?: string; detail: string }>;
  recommend_human_review: boolean;
}

const DEFAULT_STRATEGY = "ai_contextual_patch";
const HUMAN_REVIEW_CONFIDENCE_THRESHOLD = 0.3;
const MAX_RETRIES_BEFORE_SWITCH = 2;
const MAX_RETRIES_BEFORE_ESCALATE = 4;

/**
 * Select best repair strategy given context, policy profile, and memory evidence.
 * Pure function — no side effects, no DB calls.
 */
export function selectRepairPolicy(
  ctx: RepairContext,
  profile: PolicyProfile | null,
  evidence: MemoryEvidence,
): RepairPolicyDecision {
  const reasons: string[] = [];
  const refs: Array<{ type: string; id?: string; detail: string }> = [];

  // 1. Check retry escalation
  if (ctx.recent_retry_count >= MAX_RETRIES_BEFORE_ESCALATE) {
    reasons.push("max_retries_exceeded");
    return {
      selected_strategy: DEFAULT_STRATEGY,
      fallback_strategy: null,
      confidence: 0.2,
      reason_codes: [...reasons, "escalate_to_human"],
      evidence_refs: refs,
      recommend_human_review: true,
    };
  }

  // 2. If profile exists and is active, use it
  if (profile && profile.status === "active") {
    const profileConfidence = profile.confidence;
    let strategy = profile.preferred_strategy;
    let fallback = profile.fallback_strategy;

    // If retries exceed threshold, switch to fallback
    if (ctx.recent_retry_count >= MAX_RETRIES_BEFORE_SWITCH && fallback) {
      reasons.push("retry_threshold_switch_to_fallback");
      strategy = fallback;
      fallback = DEFAULT_STRATEGY;
    } else {
      reasons.push("policy_profile_match");
    }

    refs.push({ type: "policy_profile", id: profile.id, detail: `confidence=${profileConfidence}, support=${profile.support_count}` });

    return {
      selected_strategy: strategy,
      fallback_strategy: fallback,
      confidence: Math.min(profileConfidence, 1),
      reason_codes: reasons,
      evidence_refs: refs,
      recommend_human_review: profileConfidence < HUMAN_REVIEW_CONFIDENCE_THRESHOLD,
    };
  }

  // 3. Use memory evidence — find best strategy from effectiveness data
  const effective = evidence.strategy_effectiveness
    .filter((s) => s.attempts_total >= 3 && s.success_rate > 50)
    .sort((a, b) => b.success_rate - a.success_rate);

  if (effective.length > 0) {
    const best = effective[0];
    reasons.push("memory_evidence_match");
    refs.push({ type: "strategy_effectiveness", detail: `strategy=${best.repair_strategy}, rate=${best.success_rate}%` });

    const second = effective.length > 1 ? effective[1].repair_strategy : DEFAULT_STRATEGY;
    const conf = Math.min(best.success_rate / 100, 0.9);

    return {
      selected_strategy: best.repair_strategy,
      fallback_strategy: second,
      confidence: conf,
      reason_codes: reasons,
      evidence_refs: refs,
      recommend_human_review: conf < HUMAN_REVIEW_CONFIDENCE_THRESHOLD,
    };
  }

  // 4. Use error pattern strategies
  const matchingPattern = evidence.error_patterns.find((p) => p.error_category === ctx.error_category);
  if (matchingPattern && matchingPattern.successful_strategies.length > 0) {
    reasons.push("error_pattern_match");
    refs.push({ type: "error_pattern", detail: `category=${matchingPattern.error_category}, strategies=${matchingPattern.successful_strategies.join(",")}` });

    return {
      selected_strategy: matchingPattern.successful_strategies[0],
      fallback_strategy: matchingPattern.successful_strategies[1] || DEFAULT_STRATEGY,
      confidence: Math.min(matchingPattern.success_rate / 100, 0.7),
      reason_codes: reasons,
      evidence_refs: refs,
      recommend_human_review: matchingPattern.success_rate < 40,
    };
  }

  // 5. Fallback to default
  reasons.push("no_evidence_default_fallback");
  return {
    selected_strategy: DEFAULT_STRATEGY,
    fallback_strategy: null,
    confidence: 0.3,
    reason_codes: reasons,
    evidence_refs: refs,
    recommend_human_review: true,
  };
}

/**
 * Determine retry path action based on context.
 */
export type RetryAction = "retry_same" | "retry_modified_prompt" | "switch_strategy" | "escalate_prevention" | "escalate_human";

export function determineRetryPath(retryCount: number, lastOutcome: string, hasAlternativeStrategy: boolean): RetryAction {
  if (retryCount === 0) return "retry_same";
  if (retryCount === 1 && lastOutcome === "failed") return "retry_modified_prompt";
  if (retryCount >= 2 && retryCount < 4 && hasAlternativeStrategy) return "switch_strategy";
  if (retryCount >= 4) return "escalate_human";
  return "escalate_prevention";
}
