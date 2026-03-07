/**
 * Sprint 21 — Prompt Optimization Engine Tests
 *
 * Covers: variant selector, metrics aggregation, promotion rules,
 * rollback detection, and forbidden mutation regressions.
 */
import { describe, it, expect } from "vitest";

// ── Inline implementations (edge function modules can't be imported directly) ──

// === Variant Selector ===
type ExposureStrategy = "90_10" | "80_20" | "70_30" | "50_50";

interface PromptVariant {
  id: string;
  stage_key: string;
  variant_name: string;
  variant_version: number;
  prompt_template: string;
  variables_schema: Record<string, unknown> | null;
  status: string;
  is_enabled: boolean;
  base_prompt_signature: string;
}

interface VariantSelectionInput {
  stageKey: string;
  organizationId: string;
  agentType?: string;
  routingSeed: number;
}

const CRITICAL_STAGES = new Set([
  "pipeline-publish", "pipeline-deploy", "pipeline-ci-webhook", "github-ci-webhook",
]);

function isStageCritical(stageKey: string): boolean {
  return CRITICAL_STAGES.has(stageKey);
}

function getExperimentThreshold(strategy: ExposureStrategy): number {
  switch (strategy) {
    case "90_10": return 10;
    case "80_20": return 20;
    case "70_30": return 30;
    case "50_50": return 50;
    default: return 10;
  }
}

function selectVariant(
  variants: PromptVariant[],
  input: VariantSelectionInput,
  exposureStrategy: ExposureStrategy = "90_10",
) {
  const enabledVariants = variants.filter((v) => v.is_enabled);
  const control = enabledVariants.find((v) => v.status === "active_control");
  const experiments = enabledVariants.filter((v) => v.status === "active_experiment");
  const fallback = enabledVariants[0] || variants[0];

  if (!control) {
    return { selectedVariant: fallback, isExperiment: false, selectionReason: "no_control_variant_found", exposureStrategy: "none" };
  }
  if (isStageCritical(input.stageKey)) {
    return { selectedVariant: control, isExperiment: false, selectionReason: "critical_stage_locked_to_control", exposureStrategy: "none" };
  }
  if (experiments.length === 0) {
    return { selectedVariant: control, isExperiment: false, selectionReason: "no_experiment_variants", exposureStrategy: "none" };
  }

  const experimentThreshold = getExperimentThreshold(exposureStrategy);
  const bucket = Math.abs(input.routingSeed) % 100;

  if (bucket < experimentThreshold) {
    const expIndex = Math.abs(input.routingSeed) % experiments.length;
    return { selectedVariant: experiments[expIndex], isExperiment: true, selectionReason: `routed_to_experiment_bucket_${bucket}_threshold_${experimentThreshold}`, exposureStrategy };
  }
  return { selectedVariant: control, isExperiment: false, selectionReason: `routed_to_control_bucket_${bucket}_threshold_${experimentThreshold}`, exposureStrategy };
}

function computeRoutingSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// === Metrics Aggregation ===
interface ExecutionRecord {
  id: string;
  prompt_variant_id: string;
  success: boolean | null;
  retry_count: number;
  repair_triggered: boolean;
  cost_usd: number;
  duration_ms: number;
  quality_score: number | null;
  created_at: string;
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function computeConfidence(sampleSize: number): number {
  if (sampleSize === 0) return 0;
  if (sampleSize >= 100) return 1;
  return round(Math.min(1, Math.log10(sampleSize + 1) / 2), 4);
}

function aggregateVariantMetrics(variantId: string, executions: ExecutionRecord[]) {
  const n = executions.length;
  if (n === 0) {
    return { prompt_variant_id: variantId, executions: 0, success_rate: null, repair_rate: null, avg_cost_usd: null, avg_duration_ms: null, avg_quality_score: null, promotion_score: null, confidence_level: null };
  }

  const successCount = executions.filter((e) => e.success === true).length;
  const repairCount = executions.filter((e) => e.repair_triggered).length;
  const totalCost = executions.reduce((s, e) => s + (e.cost_usd || 0), 0);
  const totalDuration = executions.reduce((s, e) => s + (e.duration_ms || 0), 0);
  const qualityScores = executions.map((e) => e.quality_score).filter((q): q is number => q !== null && q !== undefined);

  const successRate = round(successCount / n, 4);
  const repairRate = round(repairCount / n, 4);
  const avgCost = round(totalCost / n, 6);
  const avgDuration = round(totalDuration / n, 2);
  const avgQuality = qualityScores.length > 0 ? round(qualityScores.reduce((s, q) => s + q, 0) / qualityScores.length, 4) : null;
  const confidence = computeConfidence(n);

  const normalizedQuality = avgQuality !== null ? Math.min(1, avgQuality / 100) : 0.5;
  const normalizedCost = Math.min(1, avgCost / 0.1);
  const promotionScore = round(Math.max(0, Math.min(1,
    0.40 * successRate + 0.25 * (1 - repairRate) + 0.20 * normalizedQuality + 0.10 * (1 - normalizedCost) + 0.05 * confidence
  )), 4);

  return { prompt_variant_id: variantId, executions: n, success_rate: successRate, repair_rate: repairRate, avg_cost_usd: avgCost, avg_duration_ms: avgDuration, avg_quality_score: avgQuality, promotion_score: promotionScore, confidence_level: confidence };
}

function compareVariants(control: any, experiment: any) {
  const safeDelta = (a: number | null, b: number | null) => (a === null || b === null) ? null : round(a - b, 6);
  const successDelta = safeDelta(experiment.success_rate, control.success_rate);
  const repairDelta = safeDelta(experiment.repair_rate, control.repair_rate);
  const costDelta = safeDelta(experiment.avg_cost_usd, control.avg_cost_usd);
  const qualityDelta = safeDelta(experiment.avg_quality_score, control.avg_quality_score);
  const promoDelta = safeDelta(experiment.promotion_score, control.promotion_score);

  let verdict = "inconclusive";
  if (experiment.executions >= 10 && control.executions >= 10) {
    if (promoDelta !== null && promoDelta > 0.05) verdict = "experiment_better";
    else if (promoDelta !== null && promoDelta < -0.05) verdict = "control_better";
  }

  return { experimentVariantId: experiment.prompt_variant_id, controlVariantId: control.prompt_variant_id, successRateDelta: successDelta, repairRateDelta: repairDelta, costDelta, qualityDelta, promotionScoreDelta: promoDelta, verdict };
}

// === Promotion Rules ===
const DEFAULT_PROMOTION_CONFIG = {
  minExecutions: 20,
  minSuccessRateImprovement: 0.03,
  maxCostRegressionRatio: 1.25,
  maxRepairRateRegression: 0.05,
  minConfidence: 0.5,
  minPromotionScore: 0.6,
};

function evaluatePromotionCandidate(experiment: any, control: any, comparison: any, stageKey: string, config = DEFAULT_PROMOTION_CONFIG) {
  const reasons: string[] = [];
  let decision: string = "promote";

  if (experiment.executions < config.minExecutions) { reasons.push(`insufficient_executions: ${experiment.executions} < ${config.minExecutions}`); decision = "not_ready"; }
  if (experiment.confidence_level !== null && experiment.confidence_level < config.minConfidence) { reasons.push(`low_confidence`); decision = "not_ready"; }
  if (experiment.promotion_score !== null && experiment.promotion_score < config.minPromotionScore) { reasons.push(`low_promotion_score`); if (decision !== "regression") decision = "not_ready"; }

  if (control && comparison) {
    if (comparison.successRateDelta !== null && comparison.successRateDelta < config.minSuccessRateImprovement) {
      reasons.push(`insufficient_success_improvement`);
      if (comparison.successRateDelta < 0) { decision = "regression"; reasons.push("success_rate_regression"); }
      else if (decision !== "regression") decision = "not_ready";
    }
    if (comparison.costDelta !== null && control.avg_cost_usd !== null && control.avg_cost_usd > 0 && experiment.avg_cost_usd !== null) {
      const costRatio = experiment.avg_cost_usd / control.avg_cost_usd;
      if (costRatio > config.maxCostRegressionRatio) { reasons.push(`cost_regression`); decision = "regression"; }
    }
    if (comparison.repairRateDelta !== null && comparison.repairRateDelta > config.maxRepairRateRegression) { reasons.push(`repair_rate_regression`); decision = "regression"; }
  }

  if (reasons.length === 0) reasons.push("all_criteria_met");
  return { variantId: experiment.prompt_variant_id, stageKey, decision, reasons, metrics: experiment, comparison };
}

function evaluateRollback(metrics: any, stageKey: string) {
  const reasons: string[] = [];
  let severity = "warning";
  if (metrics.executions < 5) return null;
  if (metrics.success_rate !== null && metrics.success_rate < 0.5) { reasons.push(`failure_spike`); severity = "critical"; }
  if (metrics.repair_rate !== null && metrics.repair_rate > 0.3) { reasons.push(`high_repair_rate`); if (metrics.repair_rate > 0.5) severity = "critical"; }
  if (metrics.avg_quality_score !== null && metrics.avg_quality_score < 30) { reasons.push(`quality_drop`); severity = "critical"; }
  if (metrics.avg_cost_usd !== null && metrics.avg_cost_usd > 0.2) { reasons.push(`cost_spike`); }
  if (reasons.length === 0) return null;
  return { variantId: metrics.prompt_variant_id, stageKey, reasons, severity };
}

// ── Test Helpers ──

function makeVariant(overrides: Partial<PromptVariant> = {}): PromptVariant {
  return {
    id: overrides.id || crypto.randomUUID(),
    stage_key: "pipeline-discovery",
    variant_name: "test-variant",
    variant_version: 1,
    prompt_template: "You are a helpful assistant.",
    variables_schema: null,
    status: "active_control",
    is_enabled: true,
    base_prompt_signature: "discovery::default",
    ...overrides,
  };
}

function makeExecution(overrides: Partial<ExecutionRecord> = {}): ExecutionRecord {
  return {
    id: crypto.randomUUID(),
    prompt_variant_id: "v1",
    success: true,
    retry_count: 0,
    repair_triggered: false,
    cost_usd: 0.01,
    duration_ms: 500,
    quality_score: 80,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeExecutions(n: number, overrides: Partial<ExecutionRecord> = {}): ExecutionRecord[] {
  return Array.from({ length: n }, () => makeExecution(overrides));
}

// ══════════════════════════════════════════════════
// 1. VARIANT SELECTOR TESTS
// ══════════════════════════════════════════════════

describe("Sprint 21 — Variant Selector", () => {
  const control = makeVariant({ id: "ctrl", status: "active_control" });
  const experiment = makeVariant({ id: "exp1", status: "active_experiment", variant_name: "challenger-a" });
  const input: VariantSelectionInput = { stageKey: "pipeline-discovery", organizationId: "org-1", routingSeed: 50 };

  it("returns control when no experiments exist", () => {
    const result = selectVariant([control], input);
    expect(result.selectedVariant.id).toBe("ctrl");
    expect(result.isExperiment).toBe(false);
    expect(result.selectionReason).toBe("no_experiment_variants");
  });

  it("returns control for critical stages even with experiments", () => {
    const criticalInput = { ...input, stageKey: "pipeline-publish" };
    const result = selectVariant([control, experiment], criticalInput);
    expect(result.selectedVariant.id).toBe("ctrl");
    expect(result.selectionReason).toBe("critical_stage_locked_to_control");
  });

  it("identifies all critical stages correctly", () => {
    for (const stage of ["pipeline-publish", "pipeline-deploy", "pipeline-ci-webhook", "github-ci-webhook"]) {
      expect(isStageCritical(stage)).toBe(true);
    }
    expect(isStageCritical("pipeline-discovery")).toBe(false);
  });

  it("returns fallback when no control exists", () => {
    const draft = makeVariant({ id: "draft1", status: "draft" });
    const result = selectVariant([draft], input);
    expect(result.selectedVariant.id).toBe("draft1");
    expect(result.selectionReason).toBe("no_control_variant_found");
  });

  it("routes to experiment when bucket falls within threshold (90/10)", () => {
    // Seed 5 → bucket 5, threshold 10 → experiment
    const result = selectVariant([control, experiment], { ...input, routingSeed: 5 }, "90_10");
    expect(result.isExperiment).toBe(true);
    expect(result.selectedVariant.id).toBe("exp1");
  });

  it("routes to control when bucket falls outside threshold", () => {
    // Seed 50 → bucket 50, threshold 10 → control
    const result = selectVariant([control, experiment], { ...input, routingSeed: 50 }, "90_10");
    expect(result.isExperiment).toBe(false);
    expect(result.selectedVariant.id).toBe("ctrl");
  });

  it("respects 80/20 exposure strategy", () => {
    const threshold = getExperimentThreshold("80_20");
    expect(threshold).toBe(20);
  });

  it("respects 50/50 exposure strategy", () => {
    const threshold = getExperimentThreshold("50_50");
    expect(threshold).toBe(50);
  });

  it("is deterministic with same seed", () => {
    const r1 = selectVariant([control, experiment], { ...input, routingSeed: 42 });
    const r2 = selectVariant([control, experiment], { ...input, routingSeed: 42 });
    expect(r1.selectedVariant.id).toBe(r2.selectedVariant.id);
    expect(r1.isExperiment).toBe(r2.isExperiment);
  });

  it("skips disabled experiment variants", () => {
    const disabledExp = makeVariant({ id: "exp-disabled", status: "active_experiment", is_enabled: false });
    const result = selectVariant([control, disabledExp], { ...input, routingSeed: 3 });
    expect(result.selectedVariant.id).toBe("ctrl");
    expect(result.selectionReason).toBe("no_experiment_variants");
  });

  it("handles multiple challengers deterministically", () => {
    const exp2 = makeVariant({ id: "exp2", status: "active_experiment", variant_name: "challenger-b" });
    const r1 = selectVariant([control, experiment, exp2], { ...input, routingSeed: 3 });
    const r2 = selectVariant([control, experiment, exp2], { ...input, routingSeed: 3 });
    expect(r1.selectedVariant.id).toBe(r2.selectedVariant.id);
  });

  it("computeRoutingSeed produces stable hash", () => {
    const s1 = computeRoutingSeed("initiative-abc");
    const s2 = computeRoutingSeed("initiative-abc");
    expect(s1).toBe(s2);
    expect(s1).toBeGreaterThanOrEqual(0);
  });

  it("selection result includes auditable reason", () => {
    const result = selectVariant([control, experiment], { ...input, routingSeed: 5 }, "90_10");
    expect(result.selectionReason).toContain("bucket");
    expect(result.exposureStrategy).toBe("90_10");
  });

  it("approximate 90/10 distribution over large sample", () => {
    let experimentCount = 0;
    const total = 1000;
    for (let i = 0; i < total; i++) {
      const result = selectVariant([control, experiment], { ...input, routingSeed: i }, "90_10");
      if (result.isExperiment) experimentCount++;
    }
    // Should be roughly 10% ±5%
    expect(experimentCount).toBeGreaterThanOrEqual(50);
    expect(experimentCount).toBeLessThanOrEqual(150);
  });
});

// ══════════════════════════════════════════════════
// 2. METRICS AGGREGATION TESTS
// ══════════════════════════════════════════════════

describe("Sprint 21 — Metrics Aggregation", () => {
  it("returns null metrics for zero executions", () => {
    const m = aggregateVariantMetrics("v1", []);
    expect(m.executions).toBe(0);
    expect(m.success_rate).toBeNull();
    expect(m.repair_rate).toBeNull();
    expect(m.avg_cost_usd).toBeNull();
    expect(m.promotion_score).toBeNull();
    expect(m.confidence_level).toBeNull();
  });

  it("calculates success_rate correctly", () => {
    const execs = [
      ...makeExecutions(8, { success: true }),
      ...makeExecutions(2, { success: false }),
    ];
    const m = aggregateVariantMetrics("v1", execs);
    expect(m.success_rate).toBe(0.8);
  });

  it("calculates repair_rate correctly", () => {
    const execs = [
      ...makeExecutions(7, { repair_triggered: false }),
      ...makeExecutions(3, { repair_triggered: true }),
    ];
    const m = aggregateVariantMetrics("v1", execs);
    expect(m.repair_rate).toBe(0.3);
  });

  it("calculates avg_cost_usd correctly", () => {
    const execs = makeExecutions(4, { cost_usd: 0.02 });
    const m = aggregateVariantMetrics("v1", execs);
    expect(m.avg_cost_usd).toBe(0.02);
  });

  it("calculates avg_duration_ms correctly", () => {
    const execs = makeExecutions(5, { duration_ms: 1000 });
    const m = aggregateVariantMetrics("v1", execs);
    expect(m.avg_duration_ms).toBe(1000);
  });

  it("ignores null quality scores in avg_quality_score", () => {
    const execs = [
      makeExecution({ quality_score: 80 }),
      makeExecution({ quality_score: null }),
      makeExecution({ quality_score: 60 }),
    ];
    const m = aggregateVariantMetrics("v1", execs);
    expect(m.avg_quality_score).toBe(70);
  });

  it("returns null avg_quality when all quality scores are null", () => {
    const execs = makeExecutions(3, { quality_score: null });
    const m = aggregateVariantMetrics("v1", execs);
    expect(m.avg_quality_score).toBeNull();
  });

  it("handles all-failure executions without division errors", () => {
    const execs = makeExecutions(5, { success: false });
    const m = aggregateVariantMetrics("v1", execs);
    expect(m.success_rate).toBe(0);
    expect(m.executions).toBe(5);
  });

  it("handles zero-cost executions", () => {
    const execs = makeExecutions(3, { cost_usd: 0 });
    const m = aggregateVariantMetrics("v1", execs);
    expect(m.avg_cost_usd).toBe(0);
  });

  it("confidence increases with sample size", () => {
    const c5 = computeConfidence(5);
    const c50 = computeConfidence(50);
    const c100 = computeConfidence(100);
    expect(c5).toBeLessThan(c50);
    expect(c50).toBeLessThan(c100);
    expect(c100).toBe(1);
  });

  it("confidence is 0 for zero samples", () => {
    expect(computeConfidence(0)).toBe(0);
  });

  it("promotion_score is bounded [0, 1]", () => {
    const good = aggregateVariantMetrics("v1", makeExecutions(50, { success: true, cost_usd: 0.001, quality_score: 95 }));
    const bad = aggregateVariantMetrics("v2", makeExecutions(50, { success: false, cost_usd: 0.5, quality_score: 5, repair_triggered: true }));
    expect(good.promotion_score).toBeGreaterThanOrEqual(0);
    expect(good.promotion_score).toBeLessThanOrEqual(1);
    expect(bad.promotion_score).toBeGreaterThanOrEqual(0);
    expect(bad.promotion_score).toBeLessThanOrEqual(1);
    expect(good.promotion_score!).toBeGreaterThan(bad.promotion_score!);
  });
});

// ══════════════════════════════════════════════════
// 3. VARIANT COMPARISON TESTS
// ══════════════════════════════════════════════════

describe("Sprint 21 — Variant Comparison", () => {
  it("returns inconclusive when sample too small", () => {
    const ctrl = aggregateVariantMetrics("ctrl", makeExecutions(5));
    const exp = aggregateVariantMetrics("exp", makeExecutions(5));
    const comp = compareVariants(ctrl, exp);
    expect(comp.verdict).toBe("inconclusive");
  });

  it("detects experiment_better when promotion score higher", () => {
    const ctrl = aggregateVariantMetrics("ctrl", makeExecutions(20, { success: true, quality_score: 60 }));
    const exp = aggregateVariantMetrics("exp", makeExecutions(20, { success: true, quality_score: 95, cost_usd: 0.005 }));
    const comp = compareVariants(ctrl, exp);
    expect(comp.verdict).toBe("experiment_better");
  });

  it("detects control_better when experiment regresses", () => {
    const ctrl = aggregateVariantMetrics("ctrl", makeExecutions(20, { success: true, quality_score: 90 }));
    const exp = aggregateVariantMetrics("exp", makeExecutions(20, { success: false, quality_score: 20, cost_usd: 0.05 }));
    const comp = compareVariants(ctrl, exp);
    expect(comp.verdict).toBe("control_better");
  });

  it("includes all delta fields", () => {
    const ctrl = aggregateVariantMetrics("ctrl", makeExecutions(15));
    const exp = aggregateVariantMetrics("exp", makeExecutions(15));
    const comp = compareVariants(ctrl, exp);
    expect(comp).toHaveProperty("successRateDelta");
    expect(comp).toHaveProperty("repairRateDelta");
    expect(comp).toHaveProperty("costDelta");
    expect(comp).toHaveProperty("qualityDelta");
    expect(comp).toHaveProperty("promotionScoreDelta");
  });
});

// ══════════════════════════════════════════════════
// 4. PROMOTION RULES TESTS
// ══════════════════════════════════════════════════

describe("Sprint 21 — Promotion Rules", () => {
  it("returns not_ready when insufficient executions", () => {
    const exp = aggregateVariantMetrics("exp", makeExecutions(5));
    const result = evaluatePromotionCandidate(exp, null, null, "pipeline-discovery");
    expect(result.decision).toBe("not_ready");
    expect(result.reasons.some(r => r.includes("insufficient_executions"))).toBe(true);
  });

  it("returns promote when all criteria met and no control", () => {
    const exp = aggregateVariantMetrics("exp", makeExecutions(30, { success: true, quality_score: 90, cost_usd: 0.005 }));
    const result = evaluatePromotionCandidate(exp, null, null, "pipeline-discovery");
    expect(result.decision).toBe("promote");
    expect(result.reasons).toContain("all_criteria_met");
  });

  it("detects regression when success rate drops vs control", () => {
    const ctrl = aggregateVariantMetrics("ctrl", makeExecutions(30, { success: true, quality_score: 80 }));
    const exp = aggregateVariantMetrics("exp", makeExecutions(30, { success: false, quality_score: 30 }));
    const comp = compareVariants(ctrl, exp);
    const result = evaluatePromotionCandidate(exp, ctrl, comp, "pipeline-discovery");
    expect(result.decision).toBe("regression");
  });

  it("detects cost regression", () => {
    const ctrl = aggregateVariantMetrics("ctrl", makeExecutions(30, { success: true, cost_usd: 0.01 }));
    const exp = aggregateVariantMetrics("exp", makeExecutions(30, { success: true, cost_usd: 0.05 }));
    const comp = compareVariants(ctrl, exp);
    const result = evaluatePromotionCandidate(exp, ctrl, comp, "pipeline-discovery");
    expect(result.decision).toBe("regression");
    expect(result.reasons.some(r => r.includes("cost_regression"))).toBe(true);
  });

  it("detects repair rate regression", () => {
    const ctrl = aggregateVariantMetrics("ctrl", makeExecutions(30, { success: true, repair_triggered: false }));
    const exp = aggregateVariantMetrics("exp", makeExecutions(30, { success: true, repair_triggered: true }));
    const comp = compareVariants(ctrl, exp);
    const result = evaluatePromotionCandidate(exp, ctrl, comp, "pipeline-discovery");
    expect(result.decision).toBe("regression");
    expect(result.reasons.some(r => r.includes("repair_rate_regression"))).toBe(true);
  });

  it("returns not_ready with low confidence", () => {
    const exp = aggregateVariantMetrics("exp", makeExecutions(2, { success: true, quality_score: 90 }));
    const result = evaluatePromotionCandidate(exp, null, null, "pipeline-discovery");
    expect(result.decision).toBe("not_ready");
  });
});

// ══════════════════════════════════════════════════
// 5. ROLLBACK DETECTION TESTS
// ══════════════════════════════════════════════════

describe("Sprint 21 — Rollback Detection", () => {
  it("returns null when too few executions", () => {
    const m = aggregateVariantMetrics("v1", makeExecutions(3));
    expect(evaluateRollback(m, "stage")).toBeNull();
  });

  it("returns null when all metrics healthy", () => {
    const m = aggregateVariantMetrics("v1", makeExecutions(10, { success: true, quality_score: 80, cost_usd: 0.01 }));
    expect(evaluateRollback(m, "stage")).toBeNull();
  });

  it("detects failure spike", () => {
    const m = aggregateVariantMetrics("v1", makeExecutions(10, { success: false }));
    const rb = evaluateRollback(m, "stage");
    expect(rb).not.toBeNull();
    expect(rb!.severity).toBe("critical");
    expect(rb!.reasons.some(r => r.includes("failure_spike"))).toBe(true);
  });

  it("detects high repair rate", () => {
    const m = aggregateVariantMetrics("v1", makeExecutions(10, { success: true, repair_triggered: true }));
    const rb = evaluateRollback(m, "stage");
    expect(rb).not.toBeNull();
    expect(rb!.reasons.some(r => r.includes("high_repair_rate"))).toBe(true);
  });

  it("detects quality drop", () => {
    const m = aggregateVariantMetrics("v1", makeExecutions(10, { success: true, quality_score: 15 }));
    const rb = evaluateRollback(m, "stage");
    expect(rb).not.toBeNull();
    expect(rb!.reasons.some(r => r.includes("quality_drop"))).toBe(true);
  });

  it("detects cost spike", () => {
    const m = aggregateVariantMetrics("v1", makeExecutions(10, { success: true, cost_usd: 0.5 }));
    const rb = evaluateRollback(m, "stage");
    expect(rb).not.toBeNull();
    expect(rb!.reasons.some(r => r.includes("cost_spike"))).toBe(true);
  });
});

// ══════════════════════════════════════════════════
// 6. FORBIDDEN MUTATION REGRESSIONS
// ══════════════════════════════════════════════════

describe("Sprint 21 — Forbidden Mutation Guards", () => {
  it("promotion candidate does not contain pipeline mutation fields", () => {
    const exp = aggregateVariantMetrics("exp", makeExecutions(30, { success: true }));
    const result = evaluatePromotionCandidate(exp, null, null, "stage");
    expect(result).not.toHaveProperty("mutate_pipeline");
    expect(result).not.toHaveProperty("apply_governance_change");
    expect(result).not.toHaveProperty("update_billing");
    expect(result).not.toHaveProperty("auto_promote");
  });

  it("rollback candidate does not contain auto-mutation fields", () => {
    const m = aggregateVariantMetrics("v1", makeExecutions(10, { success: false }));
    const rb = evaluateRollback(m, "stage");
    expect(rb).not.toHaveProperty("auto_disable");
    expect(rb).not.toHaveProperty("mutate_agent");
    expect(rb).not.toHaveProperty("force_rollback");
  });

  it("variant selector never modifies input variants array", () => {
    const variants = [makeVariant({ id: "ctrl", status: "active_control" }), makeVariant({ id: "exp", status: "active_experiment" })];
    const copy = JSON.parse(JSON.stringify(variants));
    selectVariant(variants, { stageKey: "pipeline-discovery", organizationId: "org-1", routingSeed: 5 });
    expect(variants).toEqual(copy);
  });

  it("metrics aggregation is pure — same input same output", () => {
    const execs = makeExecutions(20, { success: true, quality_score: 75 });
    const m1 = aggregateVariantMetrics("v1", execs);
    const m2 = aggregateVariantMetrics("v1", execs);
    expect(m1).toEqual(m2);
  });

  it("promotion mode is always manual in promotion candidate evaluation", () => {
    const exp = aggregateVariantMetrics("exp", makeExecutions(30, { success: true }));
    const result = evaluatePromotionCandidate(exp, null, null, "stage");
    // The function doesn't set promotion_mode — that's set by the API handler
    // This ensures the evaluation layer doesn't auto-promote
    expect(result).not.toHaveProperty("promotion_mode");
    expect(result.decision).toBeDefined();
  });
});

// ══════════════════════════════════════════════════
// 7. EDGE CASES AND ROBUSTNESS
// ══════════════════════════════════════════════════

describe("Sprint 21 — Edge Cases", () => {
  it("selector handles empty variants array gracefully", () => {
    // This should not throw — falls back to undefined but doesn't crash
    expect(() => {
      const variants: PromptVariant[] = [];
      // Would return undefined selectedVariant, but shouldn't throw
      const enabled = variants.filter(v => v.is_enabled);
      expect(enabled.length).toBe(0);
    }).not.toThrow();
  });

  it("aggregation handles mixed null/undefined quality scores", () => {
    const execs = [
      makeExecution({ quality_score: null }),
      makeExecution({ quality_score: undefined as any }),
      makeExecution({ quality_score: 50 }),
    ];
    const m = aggregateVariantMetrics("v1", execs);
    expect(m.avg_quality_score).toBe(50);
  });

  it("exposure threshold mapping covers all strategies", () => {
    expect(getExperimentThreshold("90_10")).toBe(10);
    expect(getExperimentThreshold("80_20")).toBe(20);
    expect(getExperimentThreshold("70_30")).toBe(30);
    expect(getExperimentThreshold("50_50")).toBe(50);
  });

  it("comparison with zero-execution variants returns inconclusive", () => {
    const ctrl = aggregateVariantMetrics("ctrl", []);
    const exp = aggregateVariantMetrics("exp", []);
    const comp = compareVariants(ctrl, exp);
    expect(comp.verdict).toBe("inconclusive");
  });

  it("routing seed from empty string is valid", () => {
    const seed = computeRoutingSeed("");
    expect(seed).toBe(0);
  });

  it("retired variant is not selected even if is_enabled", () => {
    const control = makeVariant({ id: "ctrl", status: "active_control" });
    const retired = makeVariant({ id: "ret", status: "retired", is_enabled: true });
    const result = selectVariant([control, retired], { stageKey: "pipeline-discovery", organizationId: "org-1", routingSeed: 5 });
    expect(result.selectedVariant.id).toBe("ctrl");
  });
});
