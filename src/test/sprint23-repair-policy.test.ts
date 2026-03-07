import { describe, it, expect } from "vitest";

// ─── Inline implementations for testing (mirrors shared modules) ───

// repair-policy-engine.ts
interface RepairContext {
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

interface PolicyProfile {
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

interface MemoryEvidence {
  error_patterns: Array<{ error_category: string; success_rate: number; successful_strategies: string[] }>;
  strategy_effectiveness: Array<{ repair_strategy: string; success_rate: number; attempts_total: number }>;
  recent_decisions: Array<{ selected_strategy: string; outcome_status: string }>;
}

interface RepairPolicyDecision {
  selected_strategy: string;
  fallback_strategy: string | null;
  confidence: number;
  reason_codes: string[];
  evidence_refs: Array<{ type: string; id?: string; detail: string }>;
  recommend_human_review: boolean;
}

const DEFAULT_STRATEGY = "ai_contextual_patch";

function selectRepairPolicy(ctx: RepairContext, profile: PolicyProfile | null, evidence: MemoryEvidence): RepairPolicyDecision {
  const reasons: string[] = [];
  const refs: Array<{ type: string; id?: string; detail: string }> = [];

  if (ctx.recent_retry_count >= 4) {
    reasons.push("max_retries_exceeded");
    return { selected_strategy: DEFAULT_STRATEGY, fallback_strategy: null, confidence: 0.2, reason_codes: [...reasons, "escalate_to_human"], evidence_refs: refs, recommend_human_review: true };
  }

  if (profile && profile.status === "active") {
    let strategy = profile.preferred_strategy;
    let fallback = profile.fallback_strategy;
    if (ctx.recent_retry_count >= 2 && fallback) {
      reasons.push("retry_threshold_switch_to_fallback");
      strategy = fallback;
      fallback = DEFAULT_STRATEGY;
    } else {
      reasons.push("policy_profile_match");
    }
    refs.push({ type: "policy_profile", id: profile.id, detail: `confidence=${profile.confidence}` });
    return { selected_strategy: strategy, fallback_strategy: fallback, confidence: Math.min(profile.confidence, 1), reason_codes: reasons, evidence_refs: refs, recommend_human_review: profile.confidence < 0.3 };
  }

  const effective = evidence.strategy_effectiveness.filter((s) => s.attempts_total >= 3 && s.success_rate > 50).sort((a, b) => b.success_rate - a.success_rate);
  if (effective.length > 0) {
    const best = effective[0];
    reasons.push("memory_evidence_match");
    refs.push({ type: "strategy_effectiveness", detail: `strategy=${best.repair_strategy}, rate=${best.success_rate}%` });
    const second = effective.length > 1 ? effective[1].repair_strategy : DEFAULT_STRATEGY;
    const conf = Math.min(best.success_rate / 100, 0.9);
    return { selected_strategy: best.repair_strategy, fallback_strategy: second, confidence: conf, reason_codes: reasons, evidence_refs: refs, recommend_human_review: conf < 0.3 };
  }

  const matchingPattern = evidence.error_patterns.find((p) => p.error_category === ctx.error_category);
  if (matchingPattern && matchingPattern.successful_strategies.length > 0) {
    reasons.push("error_pattern_match");
    return { selected_strategy: matchingPattern.successful_strategies[0], fallback_strategy: matchingPattern.successful_strategies[1] || DEFAULT_STRATEGY, confidence: Math.min(matchingPattern.success_rate / 100, 0.7), reason_codes: reasons, evidence_refs: refs, recommend_human_review: matchingPattern.success_rate < 40 };
  }

  reasons.push("no_evidence_default_fallback");
  return { selected_strategy: DEFAULT_STRATEGY, fallback_strategy: null, confidence: 0.3, reason_codes: reasons, evidence_refs: refs, recommend_human_review: true };
}

// retry-path-intelligence.ts
type RetryAction = "retry_same_strategy" | "retry_modified_prompt" | "switch_strategy" | "escalate_to_prevention" | "escalate_to_human";
interface RetryContext2 { retry_count: number; last_outcome: string; same_strategy_failures: number; has_alternative_strategy: boolean; has_prevention_candidate: boolean; error_is_novel: boolean; }

function computeRetryAction(ctx: RetryContext2): RetryAction {
  if (ctx.retry_count === 0) return "retry_same_strategy";
  if (ctx.last_outcome === "resolved") return "retry_same_strategy";
  if (ctx.same_strategy_failures === 1) return "retry_modified_prompt";
  if (ctx.same_strategy_failures >= 2 && ctx.has_alternative_strategy) return "switch_strategy";
  if (ctx.retry_count >= 3 && ctx.has_prevention_candidate) return "escalate_to_prevention";
  if (ctx.retry_count >= 4 || (ctx.error_is_novel && ctx.same_strategy_failures >= 2)) return "escalate_to_human";
  return ctx.has_alternative_strategy ? "switch_strategy" : "escalate_to_human";
}

function isRetryLoopUnproductive(outcomes: string[]): boolean {
  if (outcomes.length < 3) return false;
  return outcomes.slice(-3).every((o) => o === "failed");
}

// repair-policy-updater.ts
const MAX_CONFIDENCE = 0.95;
const MIN_CONFIDENCE = 0.05;
const SUCCESS_BOOST = 0.03;
const FAILURE_PENALTY = 0.05;

interface PolicyUpdateInput {
  profile_id: string;
  current_preferred: string;
  current_fallback: string | null;
  current_confidence: number;
  current_support: number;
  current_failures: number;
  outcome: "resolved" | "failed" | "escalated";
  strategy_used: string;
  retry_count: number;
  cost_usd: number;
  duration_ms: number;
}

interface PolicyAdjustment {
  adjustment_type: string;
  adjustment_reason: Record<string, unknown>;
  previous_state: Record<string, unknown>;
  new_state: Record<string, unknown>;
  bounded_delta: Record<string, unknown>;
}

function computePolicyAdjustment(input: PolicyUpdateInput): PolicyAdjustment | null {
  const prev = { confidence: input.current_confidence, preferred_strategy: input.current_preferred, fallback_strategy: input.current_fallback, support_count: input.current_support, failure_count: input.current_failures };
  const newSupport = input.outcome === "resolved" ? input.current_support + 1 : input.current_support;
  const newFailures = input.outcome === "failed" ? input.current_failures + 1 : input.current_failures;

  if (newFailures >= 10 && newSupport < newFailures) {
    return { adjustment_type: "deprecate_policy", adjustment_reason: { reason: "excessive_failures" }, previous_state: prev, new_state: { ...prev, status: "deprecated", failure_count: newFailures }, bounded_delta: { status_change: "deprecated" } };
  }

  const total = newSupport + newFailures;
  if (total >= 5 && newFailures / total >= 0.5) {
    const newConf = Math.max(input.current_confidence - FAILURE_PENALTY, MIN_CONFIDENCE);
    return { adjustment_type: "watch_flag", adjustment_reason: { reason: "high_failure_ratio" }, previous_state: prev, new_state: { ...prev, status: "watch", confidence: newConf, failure_count: newFailures, support_count: newSupport }, bounded_delta: { confidence_delta: newConf - input.current_confidence } };
  }

  if (input.outcome === "resolved") {
    const newConf = Math.min(input.current_confidence + SUCCESS_BOOST, MAX_CONFIDENCE);
    if (newConf === input.current_confidence) return null;
    return { adjustment_type: "promote_strategy", adjustment_reason: { reason: "successful_resolution" }, previous_state: prev, new_state: { ...prev, confidence: newConf, support_count: newSupport }, bounded_delta: { confidence_delta: SUCCESS_BOOST } };
  }

  if (input.outcome === "failed") {
    const newConf = Math.max(input.current_confidence - FAILURE_PENALTY, MIN_CONFIDENCE);
    return { adjustment_type: "demote_strategy", adjustment_reason: { reason: "failed_resolution" }, previous_state: prev, new_state: { ...prev, confidence: newConf, failure_count: newFailures }, bounded_delta: { confidence_delta: -FAILURE_PENALTY } };
  }

  return null;
}

function isAdjustmentBounded(adj: PolicyAdjustment): boolean {
  const forbidden = ["mutate_pipeline", "mutate_governance", "mutate_billing", "auto_promote_agent", "delete_history"];
  return !Object.keys(adj.new_state).some((k) => forbidden.includes(k));
}

// ═══════════════════════════════════════════════════════════
//  TESTS
// ═══════════════════════════════════════════════════════════

const baseCtx: RepairContext = {
  organization_id: "org-1",
  stage_key: "pipeline-validation",
  error_signature: "TS2345::type_mismatch",
  error_category: "typescript_error",
  error_message: "Type 'string' is not assignable to type 'number'",
  recent_retry_count: 0,
};

const emptyEvidence: MemoryEvidence = { error_patterns: [], strategy_effectiveness: [], recent_decisions: [] };

const activeProfile: PolicyProfile = {
  id: "prof-1",
  preferred_strategy: "type_safe_patching",
  fallback_strategy: "import_correction",
  confidence: 0.8,
  support_count: 15,
  failure_count: 3,
  avg_retry_count: 1.2,
  avg_repair_cost_usd: 0.05,
  status: "active",
};

// ─── Policy Engine Tests ───

describe("Sprint 23 — Repair Policy Engine", () => {
  describe("selectRepairPolicy", () => {
    it("uses policy profile when active", () => {
      const result = selectRepairPolicy(baseCtx, activeProfile, emptyEvidence);
      expect(result.selected_strategy).toBe("type_safe_patching");
      expect(result.reason_codes).toContain("policy_profile_match");
      expect(result.confidence).toBe(0.8);
    });

    it("switches to fallback when retries >= 2", () => {
      const ctx = { ...baseCtx, recent_retry_count: 2 };
      const result = selectRepairPolicy(ctx, activeProfile, emptyEvidence);
      expect(result.selected_strategy).toBe("import_correction");
      expect(result.reason_codes).toContain("retry_threshold_switch_to_fallback");
    });

    it("escalates to human when retries >= 4", () => {
      const ctx = { ...baseCtx, recent_retry_count: 4 };
      const result = selectRepairPolicy(ctx, activeProfile, emptyEvidence);
      expect(result.recommend_human_review).toBe(true);
      expect(result.reason_codes).toContain("max_retries_exceeded");
    });

    it("uses memory evidence when no profile", () => {
      const evidence: MemoryEvidence = {
        error_patterns: [],
        strategy_effectiveness: [
          { repair_strategy: "dependency_resolution", success_rate: 85, attempts_total: 20 },
          { repair_strategy: "config_repair", success_rate: 70, attempts_total: 10 },
        ],
        recent_decisions: [],
      };
      const result = selectRepairPolicy(baseCtx, null, evidence);
      expect(result.selected_strategy).toBe("dependency_resolution");
      expect(result.reason_codes).toContain("memory_evidence_match");
    });

    it("uses error pattern when no profile or effectiveness", () => {
      const evidence: MemoryEvidence = {
        error_patterns: [{ error_category: "typescript_error", success_rate: 75, successful_strategies: ["type_safe_patching", "ai_contextual_patch"] }],
        strategy_effectiveness: [],
        recent_decisions: [],
      };
      const result = selectRepairPolicy(baseCtx, null, evidence);
      expect(result.selected_strategy).toBe("type_safe_patching");
      expect(result.reason_codes).toContain("error_pattern_match");
    });

    it("falls back to default with no evidence", () => {
      const result = selectRepairPolicy(baseCtx, null, emptyEvidence);
      expect(result.selected_strategy).toBe("ai_contextual_patch");
      expect(result.reason_codes).toContain("no_evidence_default_fallback");
      expect(result.recommend_human_review).toBe(true);
    });

    it("recommends human review for low confidence profiles", () => {
      const lowConfProfile = { ...activeProfile, confidence: 0.2 };
      const result = selectRepairPolicy(baseCtx, lowConfProfile, emptyEvidence);
      expect(result.recommend_human_review).toBe(true);
    });

    it("skips low-sample effectiveness data", () => {
      const evidence: MemoryEvidence = {
        error_patterns: [],
        strategy_effectiveness: [{ repair_strategy: "config_repair", success_rate: 100, attempts_total: 1 }],
        recent_decisions: [],
      };
      const result = selectRepairPolicy(baseCtx, null, evidence);
      expect(result.selected_strategy).toBe("ai_contextual_patch"); // skipped due to < 3 attempts
    });

    it("skips low success rate effectiveness", () => {
      const evidence: MemoryEvidence = {
        error_patterns: [],
        strategy_effectiveness: [{ repair_strategy: "config_repair", success_rate: 30, attempts_total: 10 }],
        recent_decisions: [],
      };
      const result = selectRepairPolicy(baseCtx, null, evidence);
      expect(result.selected_strategy).toBe("ai_contextual_patch");
    });

    it("does not use deprecated profile", () => {
      const deprecated = { ...activeProfile, status: "deprecated" };
      const result = selectRepairPolicy(baseCtx, deprecated, emptyEvidence);
      expect(result.reason_codes).not.toContain("policy_profile_match");
    });
  });
});

// ─── Retry Path Intelligence Tests ───

describe("Sprint 23 — Retry Path Intelligence", () => {
  it("first attempt returns retry_same_strategy", () => {
    expect(computeRetryAction({ retry_count: 0, last_outcome: "failed", same_strategy_failures: 0, has_alternative_strategy: true, has_prevention_candidate: false, error_is_novel: false })).toBe("retry_same_strategy");
  });

  it("1 failure returns retry_modified_prompt", () => {
    expect(computeRetryAction({ retry_count: 1, last_outcome: "failed", same_strategy_failures: 1, has_alternative_strategy: true, has_prevention_candidate: false, error_is_novel: false })).toBe("retry_modified_prompt");
  });

  it("2+ same failures with alternative returns switch_strategy", () => {
    expect(computeRetryAction({ retry_count: 2, last_outcome: "failed", same_strategy_failures: 2, has_alternative_strategy: true, has_prevention_candidate: false, error_is_novel: false })).toBe("switch_strategy");
  });

  it("3+ retries with prevention candidate escalates to prevention", () => {
    expect(computeRetryAction({ retry_count: 3, last_outcome: "failed", same_strategy_failures: 3, has_alternative_strategy: false, has_prevention_candidate: true, error_is_novel: false })).toBe("escalate_to_prevention");
  });

  it("4+ retries escalates to human", () => {
    expect(computeRetryAction({ retry_count: 4, last_outcome: "failed", same_strategy_failures: 4, has_alternative_strategy: false, has_prevention_candidate: false, error_is_novel: false })).toBe("escalate_to_human");
  });

  it("novel error with 2+ failures escalates to human", () => {
    expect(computeRetryAction({ retry_count: 2, last_outcome: "failed", same_strategy_failures: 2, has_alternative_strategy: false, has_prevention_candidate: false, error_is_novel: true })).toBe("escalate_to_human");
  });

  it("detects unproductive retry loop", () => {
    expect(isRetryLoopUnproductive(["failed", "failed", "failed"])).toBe(true);
    expect(isRetryLoopUnproductive(["failed", "resolved", "failed"])).toBe(false);
    expect(isRetryLoopUnproductive(["failed", "failed"])).toBe(false);
  });
});

// ─── Policy Updater Tests ───

describe("Sprint 23 — Repair Policy Updater", () => {
  const baseInput: PolicyUpdateInput = {
    profile_id: "prof-1",
    current_preferred: "type_safe_patching",
    current_fallback: "import_correction",
    current_confidence: 0.5,
    current_support: 10,
    current_failures: 3,
    outcome: "resolved",
    strategy_used: "type_safe_patching",
    retry_count: 1,
    cost_usd: 0.05,
    duration_ms: 1500,
  };

  it("boosts confidence on success", () => {
    const adj = computePolicyAdjustment(baseInput);
    expect(adj).not.toBeNull();
    expect(adj!.adjustment_type).toBe("promote_strategy");
    expect((adj!.new_state as any).confidence).toBeCloseTo(0.53);
  });

  it("demotes on failure", () => {
    const adj = computePolicyAdjustment({ ...baseInput, outcome: "failed" });
    expect(adj).not.toBeNull();
    expect(adj!.adjustment_type).toBe("demote_strategy");
    expect((adj!.new_state as any).confidence).toBeCloseTo(0.45);
  });

  it("flags watch on high failure ratio", () => {
    const adj = computePolicyAdjustment({ ...baseInput, current_support: 2, current_failures: 4, outcome: "failed" });
    expect(adj).not.toBeNull();
    expect(adj!.adjustment_type).toBe("watch_flag");
  });

  it("deprecates on excessive failures", () => {
    const adj = computePolicyAdjustment({ ...baseInput, current_support: 3, current_failures: 9, outcome: "failed" });
    expect(adj).not.toBeNull();
    expect(adj!.adjustment_type).toBe("deprecate_policy");
  });

  it("respects confidence bounds", () => {
    const adj1 = computePolicyAdjustment({ ...baseInput, current_confidence: MAX_CONFIDENCE });
    expect(adj1).toBeNull(); // already at max

    const adj2 = computePolicyAdjustment({ ...baseInput, current_confidence: MIN_CONFIDENCE, outcome: "failed" });
    expect(adj2).not.toBeNull();
    expect((adj2!.new_state as any).confidence).toBe(MIN_CONFIDENCE); // can't go below
  });

  it("returns null on escalated outcome", () => {
    const adj = computePolicyAdjustment({ ...baseInput, outcome: "escalated" });
    expect(adj).toBeNull();
  });

  it("all adjustments are bounded", () => {
    const adj = computePolicyAdjustment(baseInput);
    expect(adj).not.toBeNull();
    expect(isAdjustmentBounded(adj!)).toBe(true);
  });
});

// ─── Safety Guard Tests ───

describe("Sprint 23 — Safety Guards", () => {
  it("rejects adjustments with forbidden mutations", () => {
    const badAdj: PolicyAdjustment = {
      adjustment_type: "promote_strategy",
      adjustment_reason: {},
      previous_state: {},
      new_state: { mutate_pipeline: true },
      bounded_delta: {},
    };
    expect(isAdjustmentBounded(badAdj)).toBe(false);
  });

  it("rejects mutate_governance", () => {
    const badAdj: PolicyAdjustment = { adjustment_type: "promote_strategy", adjustment_reason: {}, previous_state: {}, new_state: { mutate_governance: true }, bounded_delta: {} };
    expect(isAdjustmentBounded(badAdj)).toBe(false);
  });

  it("rejects mutate_billing", () => {
    const badAdj: PolicyAdjustment = { adjustment_type: "promote_strategy", adjustment_reason: {}, previous_state: {}, new_state: { mutate_billing: true }, bounded_delta: {} };
    expect(isAdjustmentBounded(badAdj)).toBe(false);
  });

  it("rejects delete_history", () => {
    const badAdj: PolicyAdjustment = { adjustment_type: "promote_strategy", adjustment_reason: {}, previous_state: {}, new_state: { delete_history: true }, bounded_delta: {} };
    expect(isAdjustmentBounded(badAdj)).toBe(false);
  });

  it("allows valid adjustments", () => {
    const goodAdj: PolicyAdjustment = { adjustment_type: "promote_strategy", adjustment_reason: { reason: "success" }, previous_state: { confidence: 0.5 }, new_state: { confidence: 0.53, support_count: 11 }, bounded_delta: { confidence_delta: 0.03 } };
    expect(isAdjustmentBounded(goodAdj)).toBe(true);
  });

  it("selectRepairPolicy never returns forbidden mutation fields", () => {
    const result = selectRepairPolicy(baseCtx, activeProfile, emptyEvidence);
    const keys = Object.keys(result);
    const forbidden = ["mutate_pipeline", "mutate_governance", "mutate_billing", "auto_promote_agent"];
    forbidden.forEach((f) => expect(keys).not.toContain(f));
  });
});
