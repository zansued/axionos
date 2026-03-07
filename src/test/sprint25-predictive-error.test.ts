import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════════
// INLINE IMPLEMENTATIONS (mirrors shared modules for testing)
// ═══════════════════════════════════════════════════════════

// ─── Types ───

type RiskBand = "low" | "moderate" | "high" | "critical";
type CheckpointType = "pre_stage" | "pre_expensive_stage" | "post_retry" | "pre_deploy_transition" | "pre_repair";
type CheckpointDecision = "proceed" | "proceed_with_guard" | "recommend_review" | "pause_for_review";
type ActionType = "strategy_fallback" | "prompt_fallback" | "extra_validation" | "extra_context" | "human_review" | "pause_execution";
type ActionMode = "advisory_only" | "bounded_auto_safe";
type PredictionOutcome = "accurate" | "false_positive" | "false_negative" | "helpful_inconclusive" | "harmful_friction";

interface ErrorPatternMatch {
  pattern_id: string;
  error_category: string;
  error_signature: string;
  frequency: number;
  success_rate: number;
  severity: string;
  similarity: number;
}

interface PredictiveContext {
  stage_key: string;
  agent_type?: string;
  model_provider?: string;
  context_signature?: string;
}

interface RecommendedAction {
  action_type: string;
  action_mode: ActionMode;
  reason: string;
}

interface PredictiveEvidence {
  source: string;
  ref_id: string;
  relevance: number;
  detail: string;
}

// ─── Risk Engine ───

function computeRiskBand(score: number): RiskBand {
  if (score >= 0.8) return "critical";
  if (score >= 0.6) return "high";
  if (score >= 0.35) return "moderate";
  return "low";
}

function computeRiskScore(
  ctx: PredictiveContext,
  patterns: ErrorPatternMatch[],
  retryCount: number,
  memorySignals: { avg_relevance: number; failure_count: number } | null,
) {
  const explanations: string[] = [];
  const evidence: PredictiveEvidence[] = [];
  const failureTypes: string[] = [];
  let rawScore = 0;
  let confidenceFactors = 0;
  let confidenceSum = 0;

  for (const p of patterns) {
    const patternRisk = (1 - p.success_rate / 100) * p.similarity;
    if (patternRisk > 0.1) {
      rawScore += patternRisk * 0.4;
      failureTypes.push(p.error_category);
      explanations.push(`pattern_match:${p.error_category}`);
      evidence.push({ source: "error_pattern", ref_id: p.pattern_id, relevance: p.similarity, detail: `${p.error_signature}` });
      confidenceFactors++;
      confidenceSum += Math.min(1, p.frequency / 10);
    }
  }

  if (retryCount > 0) {
    const retryRisk = Math.min(retryCount / 5, 1) * 0.3;
    rawScore += retryRisk;
    explanations.push(`retry_escalation:${retryCount}`);
    confidenceFactors++;
    confidenceSum += Math.min(1, retryCount / 3);
  }

  if (memorySignals && memorySignals.failure_count > 0) {
    const memRisk = Math.min(memorySignals.failure_count / 10, 1) * 0.2 * memorySignals.avg_relevance;
    rawScore += memRisk;
    explanations.push(`memory_failure_signal:${memorySignals.failure_count}`);
    confidenceFactors++;
    confidenceSum += memorySignals.avg_relevance;
  }

  const expensiveStages = ["pipeline-build", "pipeline-deploy", "pipeline-ci", "pipeline-runtime-validation"];
  if (expensiveStages.includes(ctx.stage_key)) {
    rawScore *= 1.15;
    explanations.push("expensive_stage_sensitivity");
  }

  const risk_score = Math.min(Math.round(rawScore * 1000) / 1000, 1.0);
  const confidence_score = confidenceFactors > 0 ? Math.round((confidenceSum / confidenceFactors) * 1000) / 1000 : 0;
  const risk_band = computeRiskBand(risk_score);
  const recommended_actions = computeRecommendedActions(risk_band, confidence_score, explanations);

  return { risk_score, risk_band, predicted_failure_types: [...new Set(failureTypes)], confidence_score, explanation_codes: explanations, evidence_refs: evidence, recommended_actions };
}

function computeRecommendedActions(band: RiskBand, confidence: number, explanations: string[]): RecommendedAction[] {
  const actions: RecommendedAction[] = [];
  if (band === "critical") {
    actions.push({ action_type: "human_review", action_mode: "advisory_only", reason: "critical_risk_threshold" });
    actions.push({ action_type: "pause_execution", action_mode: "advisory_only", reason: "critical_risk_pause" });
  }
  if (band === "high") {
    actions.push({ action_type: "extra_validation", action_mode: "bounded_auto_safe", reason: "high_risk_extra_check" });
    if (confidence >= 0.5) actions.push({ action_type: "strategy_fallback", action_mode: "bounded_auto_safe", reason: "high_confidence_fallback" });
  }
  if (band === "moderate" && explanations.some(e => e.startsWith("retry_escalation"))) {
    actions.push({ action_type: "prompt_fallback", action_mode: "bounded_auto_safe", reason: "retry_prompted_fallback" });
  }
  return actions;
}

// ─── Checkpoint ───

function resolveCheckpointType(stage_key: string, retryCount: number): CheckpointType {
  if (retryCount > 2) return "post_retry";
  if (stage_key.includes("deploy")) return "pre_deploy_transition";
  if (stage_key.includes("repair")) return "pre_repair";
  if (["pipeline-build", "pipeline-deploy", "pipeline-ci", "pipeline-runtime-validation", "pipeline-architecture"].includes(stage_key)) return "pre_expensive_stage";
  return "pre_stage";
}

function evaluateCheckpoint(input: { risk_band: RiskBand; confidence_score: number; has_blocking_actions: boolean; checkpoint_type: CheckpointType }): { decision: CheckpointDecision; reason: string } {
  const { risk_band, confidence_score, has_blocking_actions, checkpoint_type } = input;
  if (risk_band === "critical" && confidence_score >= 0.5) return { decision: "pause_for_review", reason: "critical_risk_high_confidence" };
  if (risk_band === "critical") return { decision: "recommend_review", reason: "critical_risk_low_confidence" };
  if (risk_band === "high" && has_blocking_actions) return { decision: "proceed_with_guard", reason: "high_risk_with_guards" };
  if (risk_band === "high") return { decision: "recommend_review", reason: "high_risk_no_guards" };
  if (risk_band === "moderate") return { decision: "proceed_with_guard", reason: "moderate_risk" };
  return { decision: "proceed", reason: "low_risk" };
}

// ─── Preventive Action Engine ───

const AUTO_SAFE_ACTIONS = new Set(["extra_validation", "extra_context", "strategy_fallback", "prompt_fallback"]);
const NEVER_AUTO_ACTIONS = new Set(["pause_execution", "human_review"]);

function classifyActions(recommended: RecommendedAction[], riskBand: RiskBand) {
  return recommended.map(r => {
    const isSafe = AUTO_SAFE_ACTIONS.has(r.action_type) && !NEVER_AUTO_ACTIONS.has(r.action_type) && riskBand !== "critical";
    return { action_type: r.action_type, action_mode: isSafe ? "bounded_auto_safe" : "advisory_only", reason: r.reason, safe_to_auto_apply: isSafe };
  });
}

// ─── Outcome Tracker ───

function classifyOutcome(riskBand: RiskBand, actualFailed: boolean, actionApplied: boolean, actionOutcome: string | null): PredictionOutcome {
  const predicted_failure = riskBand === "high" || riskBand === "critical";
  if (predicted_failure && actualFailed) return "accurate";
  if (predicted_failure && !actualFailed) {
    if (actionApplied && actionOutcome === "helpful") return "accurate";
    return "false_positive";
  }
  if (!predicted_failure && actualFailed) return "false_negative";
  if (actionApplied && actionOutcome === "harmful") return "harmful_friction";
  return "accurate";
}

function computeQualityMetrics(outcomes: PredictionOutcome[]) {
  const total = outcomes.length;
  if (total === 0) return { total: 0, accurate: 0, false_positive: 0, false_negative: 0, harmful: 0, precision_proxy: 0, false_positive_rate: 0, false_negative_rate: 0 };
  const accurate = outcomes.filter(o => o === "accurate").length;
  const fp = outcomes.filter(o => o === "false_positive").length;
  const fn = outcomes.filter(o => o === "false_negative").length;
  const harmful = outcomes.filter(o => o === "harmful_friction").length;
  return { total, accurate, false_positive: fp, false_negative: fn, harmful, precision_proxy: Math.round((accurate / total) * 1000) / 1000, false_positive_rate: Math.round((fp / total) * 1000) / 1000, false_negative_rate: Math.round((fn / total) * 1000) / 1000 };
}

// ─── Evidence Builder ───

function buildEvidenceRefs(sources: { type: string; ref_id: string; relevance: number; summary: string }[]): PredictiveEvidence[] {
  return sources.filter(s => s.relevance > 0.1).sort((a, b) => b.relevance - a.relevance).slice(0, 20).map(s => ({ source: s.type, ref_id: s.ref_id, relevance: s.relevance, detail: s.summary }));
}

function deduplicateEvidence(evidence: PredictiveEvidence[]): PredictiveEvidence[] {
  const seen = new Set<string>();
  return evidence.filter(e => { const k = `${e.source}:${e.ref_id}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

// ═══════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════

const baseCtx: PredictiveContext = { stage_key: "pipeline-validation", agent_type: "build_agent" };
const makePattern = (overrides: Partial<ErrorPatternMatch> = {}): ErrorPatternMatch => ({
  pattern_id: "p-1", error_category: "typescript_error", error_signature: "TS2345", frequency: 15, success_rate: 40, severity: "high", similarity: 0.8, ...overrides,
});

// ═══════════════════════════════════════════════════════════
// 1. RISK ENGINE TESTS
// ═══════════════════════════════════════════════════════════

describe("Sprint 25 §1 — Predictive Risk Engine", () => {
  it("returns low risk with no patterns and no retries", () => {
    const result = computeRiskScore(baseCtx, [], 0, null);
    expect(result.risk_score).toBe(0);
    expect(result.risk_band).toBe("low");
  });

  it("computes risk from error patterns", () => {
    const result = computeRiskScore(baseCtx, [makePattern()], 0, null);
    expect(result.risk_score).toBeGreaterThan(0);
    expect(result.predicted_failure_types).toContain("typescript_error");
  });

  it("increases risk with retries", () => {
    const noRetry = computeRiskScore(baseCtx, [makePattern()], 0, null);
    const withRetry = computeRiskScore(baseCtx, [makePattern()], 3, null);
    expect(withRetry.risk_score).toBeGreaterThan(noRetry.risk_score);
  });

  it("increases risk with memory failure signals", () => {
    const noMem = computeRiskScore(baseCtx, [makePattern()], 0, null);
    const withMem = computeRiskScore(baseCtx, [makePattern()], 0, { avg_relevance: 0.8, failure_count: 5 });
    expect(withMem.risk_score).toBeGreaterThan(noMem.risk_score);
  });

  it("applies expensive stage sensitivity", () => {
    const normal = computeRiskScore({ stage_key: "pipeline-planning" }, [makePattern()], 0, null);
    const expensive = computeRiskScore({ stage_key: "pipeline-build" }, [makePattern()], 0, null);
    expect(expensive.risk_score).toBeGreaterThan(normal.risk_score);
  });

  it("risk_score bounded 0-1", () => {
    const massive = Array.from({ length: 20 }, (_, i) => makePattern({ pattern_id: `p-${i}`, success_rate: 5 }));
    const result = computeRiskScore(baseCtx, massive, 10, { avg_relevance: 1, failure_count: 100 });
    expect(result.risk_score).toBeLessThanOrEqual(1);
    expect(result.risk_score).toBeGreaterThanOrEqual(0);
  });

  it("includes explanation codes", () => {
    const result = computeRiskScore(baseCtx, [makePattern()], 2, null);
    expect(result.explanation_codes.some(c => c.startsWith("pattern_match"))).toBe(true);
    expect(result.explanation_codes.some(c => c.startsWith("retry_escalation"))).toBe(true);
  });

  it("includes evidence refs", () => {
    const result = computeRiskScore(baseCtx, [makePattern()], 0, null);
    expect(result.evidence_refs.length).toBeGreaterThan(0);
    expect(result.evidence_refs[0].source).toBe("error_pattern");
  });

  it("is deterministic", () => {
    const a = computeRiskScore(baseCtx, [makePattern()], 1, null);
    const b = computeRiskScore(baseCtx, [makePattern()], 1, null);
    expect(a.risk_score).toBe(b.risk_score);
    expect(a.risk_band).toBe(b.risk_band);
  });

  describe("Risk bands", () => {
    it("low < 0.35", () => expect(computeRiskBand(0.2)).toBe("low"));
    it("moderate 0.35-0.6", () => expect(computeRiskBand(0.5)).toBe("moderate"));
    it("high 0.6-0.8", () => expect(computeRiskBand(0.7)).toBe("high"));
    it("critical >= 0.8", () => expect(computeRiskBand(0.9)).toBe("critical"));
  });
});

// ═══════════════════════════════════════════════════════════
// 2. CHECKPOINT TESTS
// ═══════════════════════════════════════════════════════════

describe("Sprint 25 §2 — Checkpoint Runner", () => {
  it("resolves pre_stage for normal stages", () => {
    expect(resolveCheckpointType("pipeline-planning", 0)).toBe("pre_stage");
  });

  it("resolves pre_expensive_stage for build", () => {
    expect(resolveCheckpointType("pipeline-build", 0)).toBe("pre_expensive_stage");
  });

  it("resolves post_retry for high retries", () => {
    expect(resolveCheckpointType("pipeline-build", 3)).toBe("post_retry");
  });

  it("resolves pre_deploy_transition for deploy stages", () => {
    expect(resolveCheckpointType("pipeline-deploy", 0)).toBe("pre_deploy_transition");
  });

  it("resolves pre_repair for repair stages", () => {
    expect(resolveCheckpointType("pipeline-repair", 0)).toBe("pre_repair");
  });

  it("pauses for critical + high confidence", () => {
    const r = evaluateCheckpoint({ risk_band: "critical", confidence_score: 0.7, has_blocking_actions: false, checkpoint_type: "pre_stage" });
    expect(r.decision).toBe("pause_for_review");
  });

  it("recommends review for critical + low confidence", () => {
    const r = evaluateCheckpoint({ risk_band: "critical", confidence_score: 0.3, has_blocking_actions: false, checkpoint_type: "pre_stage" });
    expect(r.decision).toBe("recommend_review");
  });

  it("proceeds with guard for high + blocking", () => {
    const r = evaluateCheckpoint({ risk_band: "high", confidence_score: 0.5, has_blocking_actions: true, checkpoint_type: "pre_stage" });
    expect(r.decision).toBe("proceed_with_guard");
  });

  it("proceeds for low risk", () => {
    const r = evaluateCheckpoint({ risk_band: "low", confidence_score: 0.5, has_blocking_actions: false, checkpoint_type: "pre_stage" });
    expect(r.decision).toBe("proceed");
  });
});

// ═══════════════════════════════════════════════════════════
// 3. PREVENTIVE ACTION ENGINE TESTS
// ═══════════════════════════════════════════════════════════

describe("Sprint 25 §3 — Preventive Action Engine", () => {
  it("classifies safe actions as bounded_auto_safe", () => {
    const actions: RecommendedAction[] = [{ action_type: "extra_validation", action_mode: "bounded_auto_safe", reason: "test" }];
    const classified = classifyActions(actions, "high");
    expect(classified[0].safe_to_auto_apply).toBe(true);
    expect(classified[0].action_mode).toBe("bounded_auto_safe");
  });

  it("classifies human_review as advisory_only", () => {
    const actions: RecommendedAction[] = [{ action_type: "human_review", action_mode: "advisory_only", reason: "test" }];
    const classified = classifyActions(actions, "high");
    expect(classified[0].safe_to_auto_apply).toBe(false);
    expect(classified[0].action_mode).toBe("advisory_only");
  });

  it("classifies pause_execution as advisory_only", () => {
    const actions: RecommendedAction[] = [{ action_type: "pause_execution", action_mode: "advisory_only", reason: "test" }];
    const classified = classifyActions(actions, "high");
    expect(classified[0].safe_to_auto_apply).toBe(false);
  });

  it("downgrades safe actions to advisory in critical band", () => {
    const actions: RecommendedAction[] = [{ action_type: "extra_validation", action_mode: "bounded_auto_safe", reason: "test" }];
    const classified = classifyActions(actions, "critical");
    expect(classified[0].safe_to_auto_apply).toBe(false);
  });

  it("strategy_fallback is auto-safe in non-critical", () => {
    const actions: RecommendedAction[] = [{ action_type: "strategy_fallback", action_mode: "bounded_auto_safe", reason: "test" }];
    const classified = classifyActions(actions, "high");
    expect(classified[0].safe_to_auto_apply).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// 4. OUTCOME TRACKER TESTS
// ═══════════════════════════════════════════════════════════

describe("Sprint 25 §4 — Outcome Tracker", () => {
  it("accurate when predicted high + actual failure", () => {
    expect(classifyOutcome("high", true, false, null)).toBe("accurate");
  });

  it("false_positive when predicted high + no failure", () => {
    expect(classifyOutcome("high", false, false, null)).toBe("false_positive");
  });

  it("accurate when predicted high + action prevented failure", () => {
    expect(classifyOutcome("high", false, true, "helpful")).toBe("accurate");
  });

  it("false_negative when predicted low + actual failure", () => {
    expect(classifyOutcome("low", true, false, null)).toBe("false_negative");
  });

  it("harmful_friction when action was harmful", () => {
    expect(classifyOutcome("low", false, true, "harmful")).toBe("harmful_friction");
  });

  it("accurate for low risk + no failure", () => {
    expect(classifyOutcome("low", false, false, null)).toBe("accurate");
  });

  describe("Quality metrics", () => {
    it("empty returns zeroes", () => {
      const m = computeQualityMetrics([]);
      expect(m.total).toBe(0);
      expect(m.precision_proxy).toBe(0);
    });

    it("computes correct metrics", () => {
      const m = computeQualityMetrics(["accurate", "accurate", "false_positive", "false_negative", "harmful_friction"]);
      expect(m.total).toBe(5);
      expect(m.accurate).toBe(2);
      expect(m.false_positive).toBe(1);
      expect(m.false_negative).toBe(1);
      expect(m.harmful).toBe(1);
      expect(m.precision_proxy).toBe(0.4);
    });
  });
});

// ═══════════════════════════════════════════════════════════
// 5. EVIDENCE BUILDER TESTS
// ═══════════════════════════════════════════════════════════

describe("Sprint 25 §5 — Evidence Builder", () => {
  it("filters low relevance sources", () => {
    const refs = buildEvidenceRefs([{ type: "error_pattern", ref_id: "1", relevance: 0.05, summary: "x" }]);
    expect(refs).toHaveLength(0);
  });

  it("sorts by relevance descending", () => {
    const refs = buildEvidenceRefs([
      { type: "a", ref_id: "1", relevance: 0.5, summary: "x" },
      { type: "b", ref_id: "2", relevance: 0.9, summary: "y" },
    ]);
    expect(refs[0].source).toBe("b");
  });

  it("limits to 20", () => {
    const sources = Array.from({ length: 30 }, (_, i) => ({ type: "t", ref_id: `${i}`, relevance: 0.5, summary: "x" }));
    expect(buildEvidenceRefs(sources)).toHaveLength(20);
  });

  it("deduplicates by source:ref_id", () => {
    const evidence: PredictiveEvidence[] = [
      { source: "a", ref_id: "1", relevance: 0.5, detail: "x" },
      { source: "a", ref_id: "1", relevance: 0.5, detail: "x" },
      { source: "b", ref_id: "2", relevance: 0.5, detail: "y" },
    ];
    expect(deduplicateEvidence(evidence)).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════
// 6. SAFETY TESTS
// ═══════════════════════════════════════════════════════════

describe("Sprint 25 §6 — Safety & Non-interference", () => {
  it("human_review is never auto-safe", () => {
    expect(NEVER_AUTO_ACTIONS.has("human_review")).toBe(true);
  });

  it("pause_execution is never auto-safe", () => {
    expect(NEVER_AUTO_ACTIONS.has("pause_execution")).toBe(true);
  });

  it("critical band downgrades all actions to advisory", () => {
    const all: RecommendedAction[] = [
      { action_type: "extra_validation", action_mode: "bounded_auto_safe", reason: "x" },
      { action_type: "strategy_fallback", action_mode: "bounded_auto_safe", reason: "x" },
    ];
    const classified = classifyActions(all, "critical");
    expect(classified.every(a => !a.safe_to_auto_apply)).toBe(true);
  });

  it("risk engine cannot produce scores > 1", () => {
    const huge = Array.from({ length: 50 }, (_, i) => makePattern({ pattern_id: `p-${i}`, success_rate: 1, frequency: 100 }));
    const r = computeRiskScore(baseCtx, huge, 100, { avg_relevance: 1, failure_count: 1000 });
    expect(r.risk_score).toBeLessThanOrEqual(1);
  });

  it("empty context returns safe defaults", () => {
    const r = computeRiskScore({ stage_key: "" }, [], 0, null);
    expect(r.risk_band).toBe("low");
    expect(r.recommended_actions).toHaveLength(0);
  });

  const FORBIDDEN = ["mutate_pipeline", "mutate_governance", "mutate_billing", "delete_history", "bypass_review"];
  FORBIDDEN.forEach(f => {
    it(`recommended actions never include ${f}`, () => {
      const r = computeRiskScore(baseCtx, [makePattern({ success_rate: 1 })], 10, { avg_relevance: 1, failure_count: 100 });
      expect(r.recommended_actions.every(a => a.action_type !== f)).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════
// 7. RECOMMENDED ACTIONS TESTS
// ═══════════════════════════════════════════════════════════

describe("Sprint 25 §7 — Recommended Actions", () => {
  it("critical risk recommends human_review + pause", () => {
    const actions = computeRecommendedActions("critical", 0.8, []);
    expect(actions.some(a => a.action_type === "human_review")).toBe(true);
    expect(actions.some(a => a.action_type === "pause_execution")).toBe(true);
  });

  it("high risk recommends extra_validation", () => {
    const actions = computeRecommendedActions("high", 0.6, []);
    expect(actions.some(a => a.action_type === "extra_validation")).toBe(true);
  });

  it("high risk + high confidence recommends strategy_fallback", () => {
    const actions = computeRecommendedActions("high", 0.7, []);
    expect(actions.some(a => a.action_type === "strategy_fallback")).toBe(true);
  });

  it("moderate + retry recommends prompt_fallback", () => {
    const actions = computeRecommendedActions("moderate", 0.5, ["retry_escalation:3"]);
    expect(actions.some(a => a.action_type === "prompt_fallback")).toBe(true);
  });

  it("low risk recommends nothing", () => {
    const actions = computeRecommendedActions("low", 0.5, []);
    expect(actions).toHaveLength(0);
  });
});
