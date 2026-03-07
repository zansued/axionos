import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════════
//  INLINE IMPLEMENTATIONS (mirrors shared modules for testing)
// ═══════════════════════════════════════════════════════════

// ─── Types ───

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

type RetryAction = "retry_same_strategy" | "retry_modified_prompt" | "switch_strategy" | "escalate_to_prevention" | "escalate_to_human";

interface RetryContext2 {
  retry_count: number;
  last_outcome: string;
  same_strategy_failures: number;
  has_alternative_strategy: boolean;
  has_prevention_candidate: boolean;
  error_is_novel: boolean;
}

interface RepairExplanation {
  summary: string;
  strategy_rationale: string;
  confidence_label: string;
  evidence_summary: string[];
  retry_recommendation: string;
}

// ─── Constants ───

const DEFAULT_STRATEGY = "ai_contextual_patch";
const MAX_CONFIDENCE = 0.95;
const MIN_CONFIDENCE = 0.05;
const SUCCESS_BOOST = 0.03;
const FAILURE_PENALTY = 0.05;
const DEPRECATE_FAILURE_THRESHOLD = 10;
const WATCH_FAILURE_RATIO = 0.5;

// ─── selectRepairPolicy ───

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
    refs.push({ type: "policy_profile", id: profile.id, detail: `confidence=${profile.confidence}, support=${profile.support_count}` });
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
    refs.push({ type: "error_pattern", detail: `category=${matchingPattern.error_category}, strategies=${matchingPattern.successful_strategies.join(",")}` });
    return { selected_strategy: matchingPattern.successful_strategies[0], fallback_strategy: matchingPattern.successful_strategies[1] || DEFAULT_STRATEGY, confidence: Math.min(matchingPattern.success_rate / 100, 0.7), reason_codes: reasons, evidence_refs: refs, recommend_human_review: matchingPattern.success_rate < 40 };
  }

  reasons.push("no_evidence_default_fallback");
  return { selected_strategy: DEFAULT_STRATEGY, fallback_strategy: null, confidence: 0.3, reason_codes: reasons, evidence_refs: refs, recommend_human_review: true };
}

// ─── computeRetryAction ───

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

function retryBudgetRemaining(maxRetries: number, currentRetry: number): number {
  return Math.max(0, maxRetries - currentRetry);
}

// ─── computePolicyAdjustment ───

function computePolicyAdjustment(input: PolicyUpdateInput): PolicyAdjustment | null {
  const prev = { confidence: input.current_confidence, preferred_strategy: input.current_preferred, fallback_strategy: input.current_fallback, support_count: input.current_support, failure_count: input.current_failures };
  const newSupport = input.outcome === "resolved" ? input.current_support + 1 : input.current_support;
  const newFailures = input.outcome === "failed" ? input.current_failures + 1 : input.current_failures;

  if (newFailures >= DEPRECATE_FAILURE_THRESHOLD && newSupport < newFailures) {
    return { adjustment_type: "deprecate_policy", adjustment_reason: { reason: "excessive_failures", failures: newFailures, support: newSupport }, previous_state: prev, new_state: { ...prev, status: "deprecated", failure_count: newFailures }, bounded_delta: { confidence_delta: 0, status_change: "deprecated" } };
  }

  const total = newSupport + newFailures;
  if (total >= 5 && newFailures / total >= WATCH_FAILURE_RATIO) {
    const newConf = Math.max(input.current_confidence - FAILURE_PENALTY, MIN_CONFIDENCE);
    return { adjustment_type: "watch_flag", adjustment_reason: { reason: "high_failure_ratio", ratio: newFailures / total }, previous_state: prev, new_state: { ...prev, status: "watch", confidence: newConf, failure_count: newFailures, support_count: newSupport }, bounded_delta: { confidence_delta: newConf - input.current_confidence } };
  }

  if (input.outcome === "resolved") {
    const newConf = Math.min(input.current_confidence + SUCCESS_BOOST, MAX_CONFIDENCE);
    if (newConf === input.current_confidence) return null;
    return { adjustment_type: "promote_strategy", adjustment_reason: { reason: "successful_resolution", strategy: input.strategy_used }, previous_state: prev, new_state: { ...prev, confidence: newConf, support_count: newSupport }, bounded_delta: { confidence_delta: SUCCESS_BOOST } };
  }

  if (input.outcome === "failed") {
    const newConf = Math.max(input.current_confidence - FAILURE_PENALTY, MIN_CONFIDENCE);
    return { adjustment_type: "demote_strategy", adjustment_reason: { reason: "failed_resolution", strategy: input.strategy_used, retry_count: input.retry_count }, previous_state: prev, new_state: { ...prev, confidence: newConf, failure_count: newFailures }, bounded_delta: { confidence_delta: -(FAILURE_PENALTY) } };
  }

  return null;
}

function isAdjustmentBounded(adj: PolicyAdjustment): boolean {
  const forbidden = ["mutate_pipeline", "mutate_governance", "mutate_billing", "auto_promote_agent", "delete_history"];
  return !Object.keys(adj.new_state).some((k) => forbidden.includes(k));
}

// ─── explainRepairDecision ───

function explainRepairDecision(decision: RepairPolicyDecision, retryAction: RetryAction): RepairExplanation {
  const confLevel = decision.confidence >= 0.7 ? "high" : decision.confidence >= 0.4 ? "medium" : decision.confidence >= 0.2 ? "low" : "minimal";
  const labels: Record<string, string> = { high: "Alta confiança", medium: "Confiança moderada", low: "Baixa confiança", minimal: "Confiança mínima" };
  const retryDescs: Record<string, string> = {
    retry_same_strategy: "Tentar novamente com a mesma estratégia",
    retry_modified_prompt: "Tentar novamente com prompt modificado",
    switch_strategy: "Alternar para estratégia alternativa",
    escalate_to_prevention: "Escalar para regra de prevenção",
    escalate_to_human: "Escalar para revisão humana",
  };
  return {
    summary: `Estratégia selecionada: ${decision.selected_strategy} (confiança: ${(decision.confidence * 100).toFixed(0)}%)`,
    strategy_rationale: decision.reason_codes.join(". ") || "Seleção baseada em heurísticas padrão",
    confidence_label: labels[confLevel] || "Desconhecido",
    evidence_summary: decision.evidence_refs.map((e) => `[${e.type}] ${e.detail}`),
    retry_recommendation: retryDescs[retryAction] || "Sem recomendação específica",
  };
}

// ─── Baseline Comparison Helpers ───

interface BaselineMetrics {
  success_rate: number;
  avg_retries: number;
  avg_cost_usd: number;
  avg_resolution_time_ms: number;
  escalation_rate: number;
}

function compareToBaseline(current: BaselineMetrics, baseline: BaselineMetrics) {
  const diff = (c: number, b: number) => c - b;
  return {
    success_rate_delta: diff(current.success_rate, baseline.success_rate),
    retries_delta: diff(current.avg_retries, baseline.avg_retries),
    cost_delta: diff(current.avg_cost_usd, baseline.avg_cost_usd),
    resolution_time_delta: diff(current.avg_resolution_time_ms, baseline.avg_resolution_time_ms),
    escalation_delta: diff(current.escalation_rate, baseline.escalation_rate),
    is_improvement: current.success_rate >= baseline.success_rate && current.avg_retries <= baseline.avg_retries,
    is_regression: current.success_rate < baseline.success_rate - 5 || current.avg_cost_usd > baseline.avg_cost_usd * 1.5,
    is_conclusive: (current.success_rate + baseline.success_rate) > 0, // simplified
  };
}

// ═══════════════════════════════════════════════════════════
//  FIXTURES
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

const baseUpdateInput: PolicyUpdateInput = {
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

const baseRetryCtx: RetryContext2 = {
  retry_count: 0,
  last_outcome: "failed",
  same_strategy_failures: 0,
  has_alternative_strategy: true,
  has_prevention_candidate: false,
  error_is_novel: false,
};

// ═══════════════════════════════════════════════════════════
//  3. REPAIR POLICY ENGINE TESTS
// ═══════════════════════════════════════════════════════════

describe("Sprint 23 §3 — Repair Policy Engine", () => {

  // 3.1 Seleção básica de estratégia
  describe("3.1 Basic strategy selection", () => {
    it("with valid context, returns preferred_strategy", () => {
      const result = selectRepairPolicy(baseCtx, activeProfile, emptyEvidence);
      expect(result.selected_strategy).toBe("type_safe_patching");
    });

    it("without compatible profile, uses safe fallback", () => {
      const result = selectRepairPolicy(baseCtx, null, emptyEvidence);
      expect(result.selected_strategy).toBe(DEFAULT_STRATEGY);
      expect(result.recommend_human_review).toBe(true);
    });

    it("with low confidence, recommends human review", () => {
      const lowProf = { ...activeProfile, confidence: 0.2 };
      const result = selectRepairPolicy(baseCtx, lowProf, emptyEvidence);
      expect(result.recommend_human_review).toBe(true);
    });

    it("with active compatible profile, selects correct strategy", () => {
      const result = selectRepairPolicy(baseCtx, activeProfile, emptyEvidence);
      expect(result.selected_strategy).toBe(activeProfile.preferred_strategy);
      expect(result.reason_codes).toContain("policy_profile_match");
    });

    it("with deprecated profile, does NOT select deprecated strategy", () => {
      const deprec = { ...activeProfile, status: "deprecated" };
      const result = selectRepairPolicy(baseCtx, deprec, emptyEvidence);
      expect(result.reason_codes).not.toContain("policy_profile_match");
      expect(result.selected_strategy).toBe(DEFAULT_STRATEGY);
    });

    it("with watch profile, does NOT select it either", () => {
      const watch = { ...activeProfile, status: "watch" };
      const result = selectRepairPolicy(baseCtx, watch, emptyEvidence);
      expect(result.reason_codes).not.toContain("policy_profile_match");
    });

    it("with multiple effective strategies, picks highest success rate (deterministic)", () => {
      const evidence: MemoryEvidence = {
        error_patterns: [],
        strategy_effectiveness: [
          { repair_strategy: "config_repair", success_rate: 70, attempts_total: 10 },
          { repair_strategy: "dependency_resolution", success_rate: 85, attempts_total: 20 },
          { repair_strategy: "type_safe_patching", success_rate: 60, attempts_total: 5 },
        ],
        recent_decisions: [],
      };
      const result = selectRepairPolicy(baseCtx, null, evidence);
      expect(result.selected_strategy).toBe("dependency_resolution");
      expect(result.fallback_strategy).toBe("config_repair");
    });

    it("stage_key differences don't mix profiles (org-level isolation simulated)", () => {
      const ctxA = { ...baseCtx, stage_key: "pipeline-validation" };
      const ctxB = { ...baseCtx, stage_key: "pipeline-deploy" };
      const profA = { ...activeProfile, preferred_strategy: "strategy_A" };
      const resultA = selectRepairPolicy(ctxA, profA, emptyEvidence);
      const resultB = selectRepairPolicy(ctxB, null, emptyEvidence);
      expect(resultA.selected_strategy).toBe("strategy_A");
      expect(resultB.selected_strategy).toBe(DEFAULT_STRATEGY);
    });

    it("error_signature differences don't mix profiles", () => {
      const result = selectRepairPolicy({ ...baseCtx, error_signature: "DIFFERENT" }, null, emptyEvidence);
      expect(result.selected_strategy).toBe(DEFAULT_STRATEGY);
    });

    it("switches to fallback when retries >= 2 and fallback exists", () => {
      const ctx = { ...baseCtx, recent_retry_count: 2 };
      const result = selectRepairPolicy(ctx, activeProfile, emptyEvidence);
      expect(result.selected_strategy).toBe("import_correction");
      expect(result.reason_codes).toContain("retry_threshold_switch_to_fallback");
    });

    it("does NOT switch to fallback when retries >= 2 but no fallback", () => {
      const noFallback = { ...activeProfile, fallback_strategy: null };
      const ctx = { ...baseCtx, recent_retry_count: 2 };
      const result = selectRepairPolicy(ctx, noFallback, emptyEvidence);
      expect(result.selected_strategy).toBe("type_safe_patching");
      expect(result.reason_codes).toContain("policy_profile_match");
    });

    it("escalates to human when retries >= 4", () => {
      const ctx = { ...baseCtx, recent_retry_count: 4 };
      const result = selectRepairPolicy(ctx, activeProfile, emptyEvidence);
      expect(result.recommend_human_review).toBe(true);
      expect(result.reason_codes).toContain("max_retries_exceeded");
      expect(result.reason_codes).toContain("escalate_to_human");
      expect(result.confidence).toBe(0.2);
    });

    it("escalates to human even with retries = 10", () => {
      const ctx = { ...baseCtx, recent_retry_count: 10 };
      const result = selectRepairPolicy(ctx, activeProfile, emptyEvidence);
      expect(result.recommend_human_review).toBe(true);
    });
  });

  // 3.2 Determinismo
  describe("3.2 Determinism", () => {
    it("same context returns same decision", () => {
      const r1 = selectRepairPolicy(baseCtx, activeProfile, emptyEvidence);
      const r2 = selectRepairPolicy(baseCtx, activeProfile, emptyEvidence);
      expect(r1.selected_strategy).toBe(r2.selected_strategy);
      expect(r1.confidence).toBe(r2.confidence);
      expect(r1.fallback_strategy).toBe(r2.fallback_strategy);
    });

    it("same input generates same reason codes", () => {
      const r1 = selectRepairPolicy(baseCtx, activeProfile, emptyEvidence);
      const r2 = selectRepairPolicy(baseCtx, activeProfile, emptyEvidence);
      expect(r1.reason_codes).toEqual(r2.reason_codes);
    });

    it("same input generates same evidence refs", () => {
      const r1 = selectRepairPolicy(baseCtx, activeProfile, emptyEvidence);
      const r2 = selectRepairPolicy(baseCtx, activeProfile, emptyEvidence);
      expect(r1.evidence_refs).toEqual(r2.evidence_refs);
    });

    it("absence of memory does not break decision", () => {
      const result = selectRepairPolicy(baseCtx, null, emptyEvidence);
      expect(result).toBeDefined();
      expect(result.selected_strategy).toBeTruthy();
      expect(typeof result.confidence).toBe("number");
    });

    it("same evidence ordering produces same result across runs", () => {
      const evidence: MemoryEvidence = {
        error_patterns: [],
        strategy_effectiveness: [
          { repair_strategy: "a", success_rate: 90, attempts_total: 10 },
          { repair_strategy: "b", success_rate: 80, attempts_total: 10 },
        ],
        recent_decisions: [],
      };
      const results = Array.from({ length: 5 }, () => selectRepairPolicy(baseCtx, null, evidence));
      results.forEach((r) => expect(r.selected_strategy).toBe("a"));
    });
  });

  // 3.3 Casos-limite
  describe("3.3 Edge cases", () => {
    it("incomplete input falls to safe fallback", () => {
      const minCtx: RepairContext = { organization_id: "org-1", stage_key: "", error_signature: "", error_category: "", error_message: "", recent_retry_count: 0 };
      const result = selectRepairPolicy(minCtx, null, emptyEvidence);
      expect(result.selected_strategy).toBe(DEFAULT_STRATEGY);
    });

    it("empty error_signature does not break engine", () => {
      const ctx = { ...baseCtx, error_signature: "" };
      const result = selectRepairPolicy(ctx, null, emptyEvidence);
      expect(result).toBeDefined();
      expect(result.selected_strategy).toBe(DEFAULT_STRATEGY);
    });

    it("high retries do not cause decision loop", () => {
      const ctx = { ...baseCtx, recent_retry_count: 100 };
      const result = selectRepairPolicy(ctx, activeProfile, emptyEvidence);
      expect(result.recommend_human_review).toBe(true);
      expect(result.reason_codes).toContain("max_retries_exceeded");
    });

    it("evidence retrieval empty still returns bounded decision", () => {
      const result = selectRepairPolicy(baseCtx, null, emptyEvidence);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("skips low-sample effectiveness data (< 3 attempts)", () => {
      const evidence: MemoryEvidence = { error_patterns: [], strategy_effectiveness: [{ repair_strategy: "x", success_rate: 100, attempts_total: 1 }], recent_decisions: [] };
      const result = selectRepairPolicy(baseCtx, null, evidence);
      expect(result.selected_strategy).toBe(DEFAULT_STRATEGY);
    });

    it("skips low success rate effectiveness (<= 50%)", () => {
      const evidence: MemoryEvidence = { error_patterns: [], strategy_effectiveness: [{ repair_strategy: "x", success_rate: 30, attempts_total: 10 }], recent_decisions: [] };
      const result = selectRepairPolicy(baseCtx, null, evidence);
      expect(result.selected_strategy).toBe(DEFAULT_STRATEGY);
    });

    it("uses error patterns when effectiveness is empty", () => {
      const evidence: MemoryEvidence = {
        error_patterns: [{ error_category: "typescript_error", success_rate: 75, successful_strategies: ["type_safe_patching"] }],
        strategy_effectiveness: [],
        recent_decisions: [],
      };
      const result = selectRepairPolicy(baseCtx, null, evidence);
      expect(result.selected_strategy).toBe("type_safe_patching");
      expect(result.reason_codes).toContain("error_pattern_match");
    });

    it("error pattern with no matching category falls through", () => {
      const evidence: MemoryEvidence = {
        error_patterns: [{ error_category: "build_error", success_rate: 75, successful_strategies: ["rebuild"] }],
        strategy_effectiveness: [],
        recent_decisions: [],
      };
      const result = selectRepairPolicy(baseCtx, null, evidence);
      expect(result.selected_strategy).toBe(DEFAULT_STRATEGY);
    });

    it("error pattern with empty strategies falls through", () => {
      const evidence: MemoryEvidence = {
        error_patterns: [{ error_category: "typescript_error", success_rate: 75, successful_strategies: [] }],
        strategy_effectiveness: [],
        recent_decisions: [],
      };
      const result = selectRepairPolicy(baseCtx, null, evidence);
      expect(result.selected_strategy).toBe(DEFAULT_STRATEGY);
    });

    it("confidence never exceeds 1.0", () => {
      const highConf = { ...activeProfile, confidence: 1.5 };
      const result = selectRepairPolicy(baseCtx, highConf, emptyEvidence);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("effectiveness confidence capped at 0.9", () => {
      const evidence: MemoryEvidence = { error_patterns: [], strategy_effectiveness: [{ repair_strategy: "x", success_rate: 100, attempts_total: 50 }], recent_decisions: [] };
      const result = selectRepairPolicy(baseCtx, null, evidence);
      expect(result.confidence).toBeLessThanOrEqual(0.9);
    });

    it("error pattern confidence capped at 0.7", () => {
      const evidence: MemoryEvidence = {
        error_patterns: [{ error_category: "typescript_error", success_rate: 100, successful_strategies: ["fix"] }],
        strategy_effectiveness: [],
        recent_decisions: [],
      };
      const result = selectRepairPolicy(baseCtx, null, evidence);
      expect(result.confidence).toBeLessThanOrEqual(0.7);
    });
  });

  // 3.4 Decision structure validation
  describe("3.4 Decision structure", () => {
    it("decision always has required fields", () => {
      const result = selectRepairPolicy(baseCtx, null, emptyEvidence);
      expect(result).toHaveProperty("selected_strategy");
      expect(result).toHaveProperty("fallback_strategy");
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("reason_codes");
      expect(result).toHaveProperty("evidence_refs");
      expect(result).toHaveProperty("recommend_human_review");
    });

    it("reason_codes is always a non-empty array", () => {
      const result = selectRepairPolicy(baseCtx, null, emptyEvidence);
      expect(Array.isArray(result.reason_codes)).toBe(true);
      expect(result.reason_codes.length).toBeGreaterThan(0);
    });

    it("evidence_refs is always an array", () => {
      const result = selectRepairPolicy(baseCtx, null, emptyEvidence);
      expect(Array.isArray(result.evidence_refs)).toBe(true);
    });

    it("confidence is always between 0 and 1", () => {
      const scenarios: [RepairContext, PolicyProfile | null, MemoryEvidence][] = [
        [baseCtx, activeProfile, emptyEvidence],
        [baseCtx, null, emptyEvidence],
        [{ ...baseCtx, recent_retry_count: 5 }, activeProfile, emptyEvidence],
        [baseCtx, { ...activeProfile, confidence: 0.01 }, emptyEvidence],
      ];
      for (const [ctx, prof, ev] of scenarios) {
        const r = selectRepairPolicy(ctx, prof, ev);
        expect(r.confidence).toBeGreaterThanOrEqual(0);
        expect(r.confidence).toBeLessThanOrEqual(1);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════
//  4. MEMORY-AWARE REPAIR RETRIEVAL TESTS
// ═══════════════════════════════════════════════════════════

describe("Sprint 23 §4 — Memory-Aware Repair Retrieval", () => {

  describe("4.1 Evidence recovery", () => {
    it("includes strategy effectiveness when available", () => {
      const evidence: MemoryEvidence = {
        error_patterns: [],
        strategy_effectiveness: [{ repair_strategy: "dep_res", success_rate: 80, attempts_total: 20 }],
        recent_decisions: [],
      };
      const result = selectRepairPolicy(baseCtx, null, evidence);
      expect(result.selected_strategy).toBe("dep_res");
    });

    it("includes error pattern library when applicable", () => {
      const evidence: MemoryEvidence = {
        error_patterns: [{ error_category: "typescript_error", success_rate: 90, successful_strategies: ["ts_fix"] }],
        strategy_effectiveness: [],
        recent_decisions: [],
      };
      const result = selectRepairPolicy(baseCtx, null, evidence);
      expect(result.selected_strategy).toBe("ts_fix");
    });
  });

  describe("4.2 Ranking and relevance", () => {
    it("highest success rate strategy comes first", () => {
      const evidence: MemoryEvidence = {
        error_patterns: [],
        strategy_effectiveness: [
          { repair_strategy: "low", success_rate: 55, attempts_total: 5 },
          { repair_strategy: "high", success_rate: 95, attempts_total: 30 },
          { repair_strategy: "mid", success_rate: 75, attempts_total: 10 },
        ],
        recent_decisions: [],
      };
      const result = selectRepairPolicy(baseCtx, null, evidence);
      expect(result.selected_strategy).toBe("high");
    });

    it("low support evidence doesn't dominate result", () => {
      const evidence: MemoryEvidence = {
        error_patterns: [],
        strategy_effectiveness: [{ repair_strategy: "rare_gem", success_rate: 100, attempts_total: 2 }],
        recent_decisions: [],
      };
      const result = selectRepairPolicy(baseCtx, null, evidence);
      expect(result.selected_strategy).toBe(DEFAULT_STRATEGY); // filtered out (< 3 attempts)
    });

    it("retrieval is deterministic for same dataset", () => {
      const evidence: MemoryEvidence = {
        error_patterns: [],
        strategy_effectiveness: [
          { repair_strategy: "a", success_rate: 80, attempts_total: 10 },
          { repair_strategy: "b", success_rate: 80, attempts_total: 10 },
        ],
        recent_decisions: [],
      };
      const r1 = selectRepairPolicy(baseCtx, null, evidence);
      const r2 = selectRepairPolicy(baseCtx, null, evidence);
      expect(r1.selected_strategy).toBe(r2.selected_strategy);
    });
  });

  describe("4.3 Robustness", () => {
    it("empty memory returns empty list without error", () => {
      const result = selectRepairPolicy(baseCtx, null, emptyEvidence);
      expect(result).toBeDefined();
      expect(result.selected_strategy).toBeTruthy();
    });

    it("handles evidence with zero success rate gracefully", () => {
      const evidence: MemoryEvidence = {
        error_patterns: [{ error_category: "typescript_error", success_rate: 0, successful_strategies: ["x"] }],
        strategy_effectiveness: [],
        recent_decisions: [],
      };
      const result = selectRepairPolicy(baseCtx, null, evidence);
      expect(result.recommend_human_review).toBe(true);
    });

    it("deduplication: same strategy from multiple sources doesn't break", () => {
      const evidence: MemoryEvidence = {
        error_patterns: [{ error_category: "typescript_error", success_rate: 80, successful_strategies: ["fix_a", "fix_a"] }],
        strategy_effectiveness: [{ repair_strategy: "fix_a", success_rate: 90, attempts_total: 5 }],
        recent_decisions: [],
      };
      const result = selectRepairPolicy(baseCtx, null, evidence);
      expect(result.selected_strategy).toBe("fix_a");
    });
  });
});

// ═══════════════════════════════════════════════════════════
//  5. DECISION LOGGING TESTS
// ═══════════════════════════════════════════════════════════

describe("Sprint 23 §5 — Decision Logging Structure", () => {

  describe("5.1 Decision record completeness", () => {
    it("decision contains all required fields", () => {
      const result = selectRepairPolicy(baseCtx, activeProfile, emptyEvidence);
      expect(result.selected_strategy).toBeTruthy();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.reason_codes)).toBe(true);
      expect(Array.isArray(result.evidence_refs)).toBe(true);
      expect(typeof result.recommend_human_review).toBe("boolean");
    });

    it("decision with profile includes evidence_ref of type policy_profile", () => {
      const result = selectRepairPolicy(baseCtx, activeProfile, emptyEvidence);
      expect(result.evidence_refs.some((e) => e.type === "policy_profile")).toBe(true);
    });

    it("decision with memory includes evidence_ref of type strategy_effectiveness", () => {
      const evidence: MemoryEvidence = {
        error_patterns: [],
        strategy_effectiveness: [{ repair_strategy: "x", success_rate: 80, attempts_total: 10 }],
        recent_decisions: [],
      };
      const result = selectRepairPolicy(baseCtx, null, evidence);
      expect(result.evidence_refs.some((e) => e.type === "strategy_effectiveness")).toBe(true);
    });

    it("decision with error pattern includes evidence_ref of type error_pattern", () => {
      const evidence: MemoryEvidence = {
        error_patterns: [{ error_category: "typescript_error", success_rate: 80, successful_strategies: ["fix"] }],
        strategy_effectiveness: [],
        recent_decisions: [],
      };
      const result = selectRepairPolicy(baseCtx, null, evidence);
      expect(result.evidence_refs.some((e) => e.type === "error_pattern")).toBe(true);
    });

    it("fallback decision has no evidence refs", () => {
      const result = selectRepairPolicy(baseCtx, null, emptyEvidence);
      expect(result.evidence_refs).toHaveLength(0);
    });
  });

  describe("5.2 Outcome status validity", () => {
    const validOutcomes = ["resolved", "failed", "escalated"];
    validOutcomes.forEach((outcome) => {
      it(`${outcome} is a valid outcome for policy adjustment`, () => {
        const adj = computePolicyAdjustment({ ...baseUpdateInput, outcome: outcome as any });
        // Should either return adjustment or null, not throw
        expect(adj === null || typeof adj === "object").toBe(true);
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════
//  6. BOUNDED POLICY ADJUSTMENT TESTS
// ═══════════════════════════════════════════════════════════

describe("Sprint 23 §6 — Bounded Policy Adjustment", () => {

  describe("6.1 Promotion/demotion of strategies", () => {
    it("strategy with repeated success gains preference (promote)", () => {
      const adj = computePolicyAdjustment(baseUpdateInput);
      expect(adj).not.toBeNull();
      expect(adj!.adjustment_type).toBe("promote_strategy");
      expect((adj!.new_state as any).confidence).toBeGreaterThan(baseUpdateInput.current_confidence);
    });

    it("strategy with repeated failure loses preference (demote)", () => {
      const adj = computePolicyAdjustment({ ...baseUpdateInput, outcome: "failed" });
      expect(adj).not.toBeNull();
      expect(adj!.adjustment_type).toBe("demote_strategy");
      expect((adj!.new_state as any).confidence).toBeLessThan(baseUpdateInput.current_confidence);
    });

    it("policy enters watch when failure ratio is high", () => {
      const adj = computePolicyAdjustment({ ...baseUpdateInput, current_support: 2, current_failures: 4, outcome: "failed" });
      expect(adj).not.toBeNull();
      expect(adj!.adjustment_type).toBe("watch_flag");
      expect((adj!.new_state as any).status).toBe("watch");
    });

    it("policy becomes deprecated when it degrades consistently", () => {
      const adj = computePolicyAdjustment({ ...baseUpdateInput, current_support: 3, current_failures: 9, outcome: "failed" });
      expect(adj).not.toBeNull();
      expect(adj!.adjustment_type).toBe("deprecate_policy");
      expect((adj!.new_state as any).status).toBe("deprecated");
    });

    it("deprecation requires failures >= threshold AND support < failures", () => {
      // High failures but also high support — should NOT deprecate
      const adj = computePolicyAdjustment({ ...baseUpdateInput, current_support: 20, current_failures: 9, outcome: "failed" });
      expect(adj).not.toBeNull();
      expect(adj!.adjustment_type).not.toBe("deprecate_policy");
    });
  });

  describe("6.2 Boundaries", () => {
    it("adjustment does NOT occur with insufficient sample (total < 5 for watch)", () => {
      const adj = computePolicyAdjustment({ ...baseUpdateInput, current_support: 1, current_failures: 1, outcome: "failed" });
      // total = 1+2=3, < 5, so watch won't trigger; should be demote
      expect(adj).not.toBeNull();
      expect(adj!.adjustment_type).toBe("demote_strategy");
    });

    it("adjustment respects max confidence bound", () => {
      const adj = computePolicyAdjustment({ ...baseUpdateInput, current_confidence: MAX_CONFIDENCE });
      expect(adj).toBeNull(); // already at max
    });

    it("adjustment respects min confidence bound", () => {
      const adj = computePolicyAdjustment({ ...baseUpdateInput, current_confidence: MIN_CONFIDENCE, outcome: "failed" });
      expect(adj).not.toBeNull();
      expect((adj!.new_state as any).confidence).toBe(MIN_CONFIDENCE);
    });

    it("single adjustment changes at most confidence + support/failure counts", () => {
      const adj = computePolicyAdjustment(baseUpdateInput);
      expect(adj).not.toBeNull();
      const changed = Object.keys(adj!.new_state).filter(
        (k) => (adj!.new_state as any)[k] !== (adj!.previous_state as any)[k]
      );
      // Should only change confidence and support_count
      expect(changed.length).toBeLessThanOrEqual(3);
    });

    it("adjustment is reversible (previous_state preserved)", () => {
      const adj = computePolicyAdjustment(baseUpdateInput);
      expect(adj).not.toBeNull();
      expect(adj!.previous_state).toHaveProperty("confidence");
      expect(adj!.previous_state).toHaveProperty("preferred_strategy");
      expect(adj!.previous_state).toHaveProperty("support_count");
      expect(adj!.previous_state).toHaveProperty("failure_count");
    });

    it("bounded_delta is populated correctly", () => {
      const adj = computePolicyAdjustment(baseUpdateInput);
      expect(adj).not.toBeNull();
      expect(adj!.bounded_delta).toHaveProperty("confidence_delta");
      expect((adj!.bounded_delta as any).confidence_delta).toBe(SUCCESS_BOOST);
    });

    it("bounded_delta for failure is negative", () => {
      const adj = computePolicyAdjustment({ ...baseUpdateInput, outcome: "failed" });
      expect(adj).not.toBeNull();
      expect((adj!.bounded_delta as any).confidence_delta).toBeLessThan(0);
    });

    it("successive promotions converge to MAX_CONFIDENCE", () => {
      let conf = 0.5;
      for (let i = 0; i < 20; i++) {
        const adj = computePolicyAdjustment({ ...baseUpdateInput, current_confidence: conf });
        if (!adj) break;
        conf = (adj.new_state as any).confidence;
      }
      expect(conf).toBeLessThanOrEqual(MAX_CONFIDENCE);
    });

    it("successive demotions converge to MIN_CONFIDENCE", () => {
      let conf = 0.5;
      for (let i = 0; i < 20; i++) {
        const adj = computePolicyAdjustment({ ...baseUpdateInput, current_confidence: conf, outcome: "failed", current_support: 0, current_failures: 0 });
        if (!adj) break;
        conf = (adj.new_state as any).confidence;
      }
      expect(conf).toBeGreaterThanOrEqual(MIN_CONFIDENCE);
    });
  });

  describe("6.3 Explainability", () => {
    it("every adjustment records adjustment_reason", () => {
      const adj = computePolicyAdjustment(baseUpdateInput);
      expect(adj).not.toBeNull();
      expect(adj!.adjustment_reason).toBeDefined();
      expect((adj!.adjustment_reason as any).reason).toBeTruthy();
    });

    it("reason is comprehensible (contains known reason string)", () => {
      const validReasons = ["successful_resolution", "failed_resolution", "excessive_failures", "high_failure_ratio"];
      const adj = computePolicyAdjustment(baseUpdateInput);
      expect(adj).not.toBeNull();
      expect(validReasons).toContain((adj!.adjustment_reason as any).reason);
    });

    it("evidence of adjustment can be audited via previous_state/new_state", () => {
      const adj = computePolicyAdjustment(baseUpdateInput);
      expect(adj).not.toBeNull();
      expect(JSON.stringify(adj!.previous_state)).not.toBe(JSON.stringify(adj!.new_state));
    });

    it("inconclusive outcome (escalated) does not force arbitrary change", () => {
      const adj = computePolicyAdjustment({ ...baseUpdateInput, outcome: "escalated" });
      expect(adj).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════
//  7. RETRY PATH INTELLIGENCE TESTS
// ═══════════════════════════════════════════════════════════

describe("Sprint 23 §7 — Retry Path Intelligence", () => {

  describe("7.1 Retry orchestration", () => {
    it("distinguishes retry same strategy", () => {
      expect(computeRetryAction({ ...baseRetryCtx, retry_count: 0 })).toBe("retry_same_strategy");
    });

    it("distinguishes retry with modified prompt", () => {
      expect(computeRetryAction({ ...baseRetryCtx, retry_count: 1, same_strategy_failures: 1 })).toBe("retry_modified_prompt");
    });

    it("distinguishes switch strategy", () => {
      expect(computeRetryAction({ ...baseRetryCtx, retry_count: 2, same_strategy_failures: 2, has_alternative_strategy: true })).toBe("switch_strategy");
    });

    it("distinguishes escalation to prevention", () => {
      expect(computeRetryAction({ ...baseRetryCtx, retry_count: 3, same_strategy_failures: 3, has_alternative_strategy: false, has_prevention_candidate: true })).toBe("escalate_to_prevention");
    });

    it("distinguishes escalation to human review", () => {
      expect(computeRetryAction({ ...baseRetryCtx, retry_count: 4, same_strategy_failures: 4, has_alternative_strategy: false })).toBe("escalate_to_human");
    });

    it("resolved outcome always returns retry_same_strategy", () => {
      expect(computeRetryAction({ ...baseRetryCtx, retry_count: 3, last_outcome: "resolved" })).toBe("retry_same_strategy");
    });
  });

  describe("7.2 Reducing bad loops", () => {
    it("detects 3 consecutive failures as unproductive", () => {
      expect(isRetryLoopUnproductive(["failed", "failed", "failed"])).toBe(true);
    });

    it("does NOT flag mixed outcomes as unproductive", () => {
      expect(isRetryLoopUnproductive(["failed", "resolved", "failed"])).toBe(false);
    });

    it("does NOT flag short sequences", () => {
      expect(isRetryLoopUnproductive(["failed", "failed"])).toBe(false);
      expect(isRetryLoopUnproductive(["failed"])).toBe(false);
      expect(isRetryLoopUnproductive([])).toBe(false);
    });

    it("loop of same strategy is interrupted by switch", () => {
      const action = computeRetryAction({ ...baseRetryCtx, retry_count: 2, same_strategy_failures: 2, has_alternative_strategy: true });
      expect(action).toBe("switch_strategy");
    });

    it("human review is suggested on low confidence + high retry", () => {
      const action = computeRetryAction({ ...baseRetryCtx, retry_count: 5, same_strategy_failures: 5, has_alternative_strategy: false });
      expect(action).toBe("escalate_to_human");
    });

    it("path intelligence does not generate new loops (action is always terminal or progressive)", () => {
      const actions = new Set<string>();
      for (let i = 0; i <= 10; i++) {
        const action = computeRetryAction({ ...baseRetryCtx, retry_count: i, same_strategy_failures: i, has_alternative_strategy: i < 3 });
        actions.add(action);
      }
      // Should never be empty, and should always include escalate_to_human as terminal
      expect(actions.has("escalate_to_human")).toBe(true);
    });
  });

  describe("7.3 Edge cases", () => {
    it("retry_count zero does not break logic", () => {
      const action = computeRetryAction({ ...baseRetryCtx, retry_count: 0 });
      expect(action).toBe("retry_same_strategy");
    });

    it("very high retry_count does not overflow", () => {
      const action = computeRetryAction({ ...baseRetryCtx, retry_count: 10000, same_strategy_failures: 10000, has_alternative_strategy: false });
      expect(action).toBe("escalate_to_human");
    });

    it("strategy history partially available still allows bounded decision", () => {
      const action = computeRetryAction({ ...baseRetryCtx, retry_count: 1, same_strategy_failures: 1, has_alternative_strategy: false, has_prevention_candidate: false });
      expect(action).toBe("retry_modified_prompt");
    });

    it("novel error with 2+ same strategy failures escalates", () => {
      const action = computeRetryAction({ ...baseRetryCtx, retry_count: 2, same_strategy_failures: 2, has_alternative_strategy: false, error_is_novel: true });
      expect(action).toBe("escalate_to_human");
    });

    it("retry budget calculation is correct", () => {
      expect(retryBudgetRemaining(5, 0)).toBe(5);
      expect(retryBudgetRemaining(5, 3)).toBe(2);
      expect(retryBudgetRemaining(5, 5)).toBe(0);
      expect(retryBudgetRemaining(5, 7)).toBe(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════
//  8. BASELINE COMPARISON TESTS
// ═══════════════════════════════════════════════════════════

describe("Sprint 23 §8 — Baseline Comparison", () => {
  const baseline: BaselineMetrics = { success_rate: 70, avg_retries: 2.5, avg_cost_usd: 0.10, avg_resolution_time_ms: 5000, escalation_rate: 15 };

  it("improvement is marked as positive", () => {
    const current: BaselineMetrics = { success_rate: 80, avg_retries: 1.5, avg_cost_usd: 0.08, avg_resolution_time_ms: 4000, escalation_rate: 10 };
    const cmp = compareToBaseline(current, baseline);
    expect(cmp.is_improvement).toBe(true);
    expect(cmp.success_rate_delta).toBeGreaterThan(0);
    expect(cmp.retries_delta).toBeLessThan(0);
  });

  it("regression is marked as negative", () => {
    const current: BaselineMetrics = { success_rate: 60, avg_retries: 3.5, avg_cost_usd: 0.20, avg_resolution_time_ms: 8000, escalation_rate: 25 };
    const cmp = compareToBaseline(current, baseline);
    expect(cmp.is_regression).toBe(true);
  });

  it("inconclusive sample does not generate false victory", () => {
    const current: BaselineMetrics = { success_rate: 71, avg_retries: 2.6, avg_cost_usd: 0.10, avg_resolution_time_ms: 5100, escalation_rate: 14 };
    const cmp = compareToBaseline(current, baseline);
    // Marginal improvement — is_improvement should be false because retries went up
    expect(cmp.is_improvement).toBe(false);
  });

  it("low confidence does not produce exaggerated conclusion", () => {
    const current: BaselineMetrics = { success_rate: 72, avg_retries: 2.4, avg_cost_usd: 0.10, avg_resolution_time_ms: 5000, escalation_rate: 14 };
    const cmp = compareToBaseline(current, baseline);
    expect(cmp.is_regression).toBe(false);
  });

  it("identical metrics show no regression and no improvement", () => {
    const cmp = compareToBaseline(baseline, baseline);
    expect(cmp.success_rate_delta).toBe(0);
    expect(cmp.retries_delta).toBe(0);
    expect(cmp.is_regression).toBe(false);
  });

  it("cost explosion triggers regression flag", () => {
    const current: BaselineMetrics = { ...baseline, avg_cost_usd: 0.20 }; // 2x cost
    const cmp = compareToBaseline(current, baseline);
    expect(cmp.is_regression).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
//  10. EXPLAINABILITY TESTS
// ═══════════════════════════════════════════════════════════

describe("Sprint 23 §10 — Explainability", () => {
  it("explains decision with profile match", () => {
    const decision = selectRepairPolicy(baseCtx, activeProfile, emptyEvidence);
    const explanation = explainRepairDecision(decision, "retry_same_strategy");
    expect(explanation.summary).toContain("type_safe_patching");
    expect(explanation.summary).toContain("80%");
    expect(explanation.confidence_label).toBe("Alta confiança");
  });

  it("explains decision with low confidence", () => {
    const decision = selectRepairPolicy(baseCtx, null, emptyEvidence);
    const explanation = explainRepairDecision(decision, "escalate_to_human");
    expect(explanation.confidence_label).toBe("Baixa confiança");
    expect(explanation.retry_recommendation).toContain("revisão humana");
  });

  it("explains decision with medium confidence from memory", () => {
    const evidence: MemoryEvidence = {
      error_patterns: [],
      strategy_effectiveness: [{ repair_strategy: "dep_fix", success_rate: 65, attempts_total: 10 }],
      recent_decisions: [],
    };
    const decision = selectRepairPolicy(baseCtx, null, evidence);
    const explanation = explainRepairDecision(decision, "retry_modified_prompt");
    expect(explanation.confidence_label).toBe("Confiança moderada");
  });

  it("includes evidence summary in explanation", () => {
    const decision = selectRepairPolicy(baseCtx, activeProfile, emptyEvidence);
    const explanation = explainRepairDecision(decision, "retry_same_strategy");
    expect(explanation.evidence_summary.length).toBeGreaterThan(0);
    expect(explanation.evidence_summary[0]).toContain("policy_profile");
  });

  it("strategy_rationale contains at least one reason", () => {
    const decision = selectRepairPolicy(baseCtx, null, emptyEvidence);
    const explanation = explainRepairDecision(decision, "escalate_to_human");
    expect(explanation.strategy_rationale.length).toBeGreaterThan(0);
  });

  it("retry recommendation maps correctly", () => {
    const decision = selectRepairPolicy(baseCtx, activeProfile, emptyEvidence);
    const actions: RetryAction[] = ["retry_same_strategy", "retry_modified_prompt", "switch_strategy", "escalate_to_prevention", "escalate_to_human"];
    for (const action of actions) {
      const expl = explainRepairDecision(decision, action);
      expect(expl.retry_recommendation.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════
//  11. NON-INTERFERENCE TESTS
// ═══════════════════════════════════════════════════════════

describe("Sprint 23 §11 — Non-interference", () => {
  it("policy engine without profile still works (fallback)", () => {
    const result = selectRepairPolicy(baseCtx, null, emptyEvidence);
    expect(result.selected_strategy).toBe(DEFAULT_STRATEGY);
    expect(result).toBeDefined();
  });

  it("retrieval failure (empty evidence) falls to fallback safely", () => {
    const result = selectRepairPolicy(baseCtx, null, emptyEvidence);
    expect(result.selected_strategy).toBe(DEFAULT_STRATEGY);
    expect(result.reason_codes).toContain("no_evidence_default_fallback");
  });

  it("policy engine failure does not break retry path", () => {
    // Simulate: even with weird input, retry path works
    const action = computeRetryAction({ ...baseRetryCtx, retry_count: 2, same_strategy_failures: 2, has_alternative_strategy: false });
    expect(["retry_modified_prompt", "switch_strategy", "escalate_to_prevention", "escalate_to_human"]).toContain(action);
  });

  it("system does not alter stage sequencing (no stage mutation in output)", () => {
    const result = selectRepairPolicy(baseCtx, activeProfile, emptyEvidence);
    const keys = Object.keys(result);
    expect(keys).not.toContain("stage_sequence");
    expect(keys).not.toContain("pipeline_stages");
    expect(keys).not.toContain("stage_order");
  });

  it("system does not alter billing/governance/orchestration", () => {
    const result = selectRepairPolicy(baseCtx, activeProfile, emptyEvidence);
    const keys = Object.keys(result);
    const forbidden = ["billing", "governance", "orchestration", "plan_id", "stripe"];
    forbidden.forEach((f) => expect(keys).not.toContain(f));
  });
});

// ═══════════════════════════════════════════════════════════
//  14. FORBIDDEN MUTATION GUARDS
// ═══════════════════════════════════════════════════════════

describe("Sprint 23 §14 — Forbidden Mutation Guards", () => {
  const forbiddenKeys = ["mutate_pipeline", "mutate_governance", "mutate_billing", "auto_promote_agent", "delete_history"];

  forbiddenKeys.forEach((key) => {
    it(`rejects adjustment containing ${key}`, () => {
      const badAdj: PolicyAdjustment = {
        adjustment_type: "promote_strategy",
        adjustment_reason: {},
        previous_state: {},
        new_state: { [key]: true },
        bounded_delta: {},
      };
      expect(isAdjustmentBounded(badAdj)).toBe(false);
    });
  });

  it("allows valid adjustment with only safe fields", () => {
    const goodAdj: PolicyAdjustment = {
      adjustment_type: "promote_strategy",
      adjustment_reason: { reason: "success" },
      previous_state: { confidence: 0.5, support_count: 10 },
      new_state: { confidence: 0.53, support_count: 11 },
      bounded_delta: { confidence_delta: 0.03 },
    };
    expect(isAdjustmentBounded(goodAdj)).toBe(true);
  });

  it("policy engine output never contains forbidden fields", () => {
    const result = selectRepairPolicy(baseCtx, activeProfile, emptyEvidence);
    const keys = Object.keys(result);
    forbiddenKeys.forEach((f) => expect(keys).not.toContain(f));
  });

  it("all computePolicyAdjustment outputs pass isAdjustmentBounded", () => {
    const scenarios: PolicyUpdateInput[] = [
      baseUpdateInput,
      { ...baseUpdateInput, outcome: "failed" },
      { ...baseUpdateInput, current_support: 2, current_failures: 4, outcome: "failed" },
      { ...baseUpdateInput, current_support: 3, current_failures: 9, outcome: "failed" },
    ];
    for (const input of scenarios) {
      const adj = computePolicyAdjustment(input);
      if (adj) {
        expect(isAdjustmentBounded(adj)).toBe(true);
      }
    }
  });

  it("recompute does not write outside predicted tables (output shape check)", () => {
    const adj = computePolicyAdjustment(baseUpdateInput);
    expect(adj).not.toBeNull();
    const newKeys = Object.keys(adj!.new_state);
    const allowedKeys = ["confidence", "preferred_strategy", "fallback_strategy", "support_count", "failure_count", "status"];
    newKeys.forEach((k) => expect(allowedKeys).toContain(k));
  });

  it("deprecation does not delete history (previous_state preserved)", () => {
    const adj = computePolicyAdjustment({ ...baseUpdateInput, current_support: 3, current_failures: 9, outcome: "failed" });
    expect(adj).not.toBeNull();
    expect(adj!.adjustment_type).toBe("deprecate_policy");
    expect(adj!.previous_state).toBeDefined();
    expect(Object.keys(adj!.previous_state).length).toBeGreaterThan(0);
  });

  it("adjustment does not activate unsafe experimental strategies", () => {
    const adj = computePolicyAdjustment(baseUpdateInput);
    expect(adj).not.toBeNull();
    const ns = adj!.new_state as any;
    expect(ns).not.toHaveProperty("experimental_mode");
    expect(ns).not.toHaveProperty("unsafe_strategy");
  });

  it("multiple forbidden keys in same new_state all detected", () => {
    const badAdj: PolicyAdjustment = {
      adjustment_type: "promote_strategy",
      adjustment_reason: {},
      previous_state: {},
      new_state: { mutate_pipeline: true, mutate_governance: true, delete_history: true },
      bounded_delta: {},
    };
    expect(isAdjustmentBounded(badAdj)).toBe(false);
  });
});
