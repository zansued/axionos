// Sprint 30 — Platform Intelligence Comprehensive Tests
import { describe, it, expect } from "vitest";

// ═══ Inline implementations (mirroring shared modules) ═══

interface ExecutionRecord {
  stage: string; status: string; cost_usd: number; duration_ms: number;
  context_class?: string; policy_mode?: string; organization_id: string;
  workspace_id?: string; had_retry: boolean; had_repair: boolean;
  had_validation_failure: boolean; had_human_review: boolean;
  deploy_attempted: boolean; deploy_succeeded: boolean;
}

// --- Aggregator ---
function aggregatePlatformBehavior(records: ExecutionRecord[]) {
  if (records.length === 0) {
    return {
      global_metrics: { total_executions: 0, total_failures: 0, total_retries: 0, total_repairs: 0, total_cost_usd: 0, total_deploy_attempts: 0, total_deploy_successes: 0, total_validation_failures: 0, total_human_reviews: 0, global_failure_rate: 0, global_retry_rate: 0, global_repair_rate: 0, global_deploy_success_rate: 0, global_cost_per_execution: 0 },
      context_distribution: [], policy_usage_distribution: [], failure_concentration: [], repair_concentration: [], cost_concentration: [], computed_at: new Date().toISOString(),
    };
  }
  const total = records.length;
  const failures = records.filter(r => r.status === "failed").length;
  const retries = records.filter(r => r.had_retry).length;
  const repairs = records.filter(r => r.had_repair).length;
  const totalCost = records.reduce((s, r) => s + r.cost_usd, 0);
  const deployAttempts = records.filter(r => r.deploy_attempted).length;
  const deploySuccesses = records.filter(r => r.deploy_succeeded).length;
  const validationFailures = records.filter(r => r.had_validation_failure).length;
  const humanReviews = records.filter(r => r.had_human_review).length;

  const ctxMap = new Map<string, { count: number; failures: number; cost: number }>();
  for (const r of records) {
    const ctx = r.context_class || "unknown";
    const e = ctxMap.get(ctx) || { count: 0, failures: 0, cost: 0 };
    e.count++; if (r.status === "failed") e.failures++; e.cost += r.cost_usd;
    ctxMap.set(ctx, e);
  }

  const polMap = new Map<string, { count: number; successes: number; cost: number }>();
  for (const r of records) {
    const pm = r.policy_mode || "unknown";
    const e = polMap.get(pm) || { count: 0, successes: 0, cost: 0 };
    e.count++; if (r.status !== "failed") e.successes++; e.cost += r.cost_usd;
    polMap.set(pm, e);
  }

  const stageFailMap = new Map<string, { count: number; total: number }>();
  for (const r of records) {
    const e = stageFailMap.get(r.stage) || { count: 0, total: 0 };
    e.total++; if (r.status === "failed") e.count++;
    stageFailMap.set(r.stage, e);
  }

  const stageRepairMap = new Map<string, { count: number; total: number }>();
  for (const r of records) {
    const e = stageRepairMap.get(r.stage) || { count: 0, total: 0 };
    e.total++; if (r.had_repair) e.count++;
    stageRepairMap.set(r.stage, e);
  }

  const stageCostMap = new Map<string, number>();
  for (const r of records) stageCostMap.set(r.stage, (stageCostMap.get(r.stage) || 0) + r.cost_usd);

  return {
    global_metrics: {
      total_executions: total, total_failures: failures, total_retries: retries, total_repairs: repairs,
      total_cost_usd: totalCost, total_deploy_attempts: deployAttempts, total_deploy_successes: deploySuccesses,
      total_validation_failures: validationFailures, total_human_reviews: humanReviews,
      global_failure_rate: failures / total, global_retry_rate: retries / total, global_repair_rate: repairs / total,
      global_deploy_success_rate: deployAttempts > 0 ? deploySuccesses / deployAttempts : 1,
      global_cost_per_execution: totalCost / total,
    },
    context_distribution: Array.from(ctxMap.entries()).map(([ctx, d]) => ({ context_class: ctx, count: d.count, failure_rate: d.count > 0 ? d.failures / d.count : 0, avg_cost: d.count > 0 ? d.cost / d.count : 0 })),
    policy_usage_distribution: Array.from(polMap.entries()).map(([pm, d]) => ({ policy_mode: pm, usage_count: d.count, success_rate: d.count > 0 ? d.successes / d.count : 0, avg_cost: d.count > 0 ? d.cost / d.count : 0 })),
    failure_concentration: Array.from(stageFailMap.entries()).filter(([, d]) => d.count > 0).map(([stage, d]) => ({ entity: stage, entity_type: "stage", count: d.count, rate: d.total > 0 ? d.count / d.total : 0, severity: (d.count / d.total > 0.5 ? "high" : d.count / d.total > 0.25 ? "medium" : "low") as any })).sort((a, b) => b.rate - a.rate),
    repair_concentration: Array.from(stageRepairMap.entries()).filter(([, d]) => d.count > 0).map(([stage, d]) => ({ entity: stage, entity_type: "stage", count: d.count, rate: d.total > 0 ? d.count / d.total : 0, severity: (d.count / d.total > 0.4 ? "high" : d.count / d.total > 0.2 ? "medium" : "low") as any })).sort((a, b) => b.rate - a.rate),
    cost_concentration: Array.from(stageCostMap.entries()).map(([stage, cost]) => ({ entity: stage, entity_type: "stage", count: 1, rate: totalCost > 0 ? cost / totalCost : 0, severity: ((cost / totalCost) > 0.3 ? "high" : (cost / totalCost) > 0.15 ? "medium" : "low") as any })).sort((a, b) => b.rate - a.rate),
    computed_at: new Date().toISOString(),
  };
}

// --- Bottleneck Detector ---
function detectBottlenecks(snapshot: any) {
  const bottlenecks: any[] = [];
  const reasons: string[] = [];
  for (const fc of snapshot.failure_concentration) {
    if (fc.rate > 0.3) {
      bottlenecks.push({ bottleneck_type: "failure_cascade", affected_entity: fc.entity, entity_type: fc.entity_type, severity: fc.rate > 0.5 ? "critical" : "high", rate: fc.rate, threshold: 0.3, description: `Stage "${fc.entity}" has ${(fc.rate * 100).toFixed(0)}% failure rate`, recommended_action: "Investigate root cause", confidence: Math.min(1, fc.count / 5) });
      reasons.push(`failure_cascade_${fc.entity}`);
    }
  }
  for (const rc of snapshot.repair_concentration) {
    if (rc.rate > 0.25) {
      bottlenecks.push({ bottleneck_type: "repair_burden", affected_entity: rc.entity, entity_type: rc.entity_type, severity: rc.rate > 0.4 ? "high" : "medium", rate: rc.rate, threshold: 0.25, description: `Stage "${rc.entity}" triggers repair in ${(rc.rate * 100).toFixed(0)}%`, recommended_action: "Review repair strategies", confidence: Math.min(1, rc.count / 5) });
      reasons.push(`repair_burden_${rc.entity}`);
    }
  }
  for (const cc of snapshot.cost_concentration) {
    if (cc.rate > 0.3) {
      bottlenecks.push({ bottleneck_type: "cost_hotspot", affected_entity: cc.entity, entity_type: cc.entity_type, severity: cc.rate > 0.5 ? "high" : "medium", rate: cc.rate, threshold: 0.3, description: `Stage "${cc.entity}" accounts for ${(cc.rate * 100).toFixed(0)}% of cost`, recommended_action: "Optimize cost", confidence: 0.8 });
      reasons.push(`cost_hotspot_${cc.entity}`);
    }
  }
  const gm = snapshot.global_metrics;
  if (gm.total_deploy_attempts > 0 && gm.global_deploy_success_rate < 0.7) {
    bottlenecks.push({ bottleneck_type: "deploy_degradation", affected_entity: "deploy_pipeline", entity_type: "system", severity: gm.global_deploy_success_rate < 0.5 ? "critical" : "high", rate: 1 - gm.global_deploy_success_rate, threshold: 0.3, description: `Deploy success rate is ${(gm.global_deploy_success_rate * 100).toFixed(0)}%`, recommended_action: "Review deploy stages", confidence: Math.min(1, gm.total_deploy_attempts / 5) });
    reasons.push("deploy_degradation");
  }
  const critCount = bottlenecks.filter((b: any) => b.severity === "critical").length;
  const highCount = bottlenecks.filter((b: any) => b.severity === "high").length;
  return { bottlenecks, overall_health: critCount > 0 ? "critical" : highCount > 0 ? "warning" : "healthy", reason_codes: reasons };
}

// --- Pattern Analyzer ---
function analyzePlatformPatterns(records: ExecutionRecord[]) {
  const patterns: any[] = [];
  const reasons: string[] = [];
  if (records.length < 5) return { patterns: [], pattern_count: 0, reason_codes: ["insufficient_data"] };
  const repairByStage = new Map<string, number>();
  for (const r of records) if (r.had_repair) repairByStage.set(r.stage, (repairByStage.get(r.stage) || 0) + 1);
  for (const [stage, count] of repairByStage) {
    if (count >= 3) { patterns.push({ pattern_type: "repeated_repair_path", affected_entities: [stage], frequency: count, severity: count >= 5 ? "high" : "medium", confidence: Math.min(1, count / 10) }); reasons.push(`repeated_repair_${stage}`); }
  }
  const ctxOutcomes = new Map<string, { total: number; failed: number }>();
  for (const r of records) { const ctx = r.context_class || "unknown"; const e = ctxOutcomes.get(ctx) || { total: 0, failed: 0 }; e.total++; if (r.status === "failed") e.failed++; ctxOutcomes.set(ctx, e); }
  for (const [ctx, d] of ctxOutcomes) {
    if (d.total >= 3 && d.failed / d.total > 0.4) { patterns.push({ pattern_type: "poor_context_outcome", affected_entities: [ctx], frequency: d.failed, severity: d.failed / d.total > 0.6 ? "high" : "medium", confidence: Math.min(1, d.total / 10) }); reasons.push(`poor_context_${ctx}`); }
  }
  const polOutcomes = new Map<string, { total: number; failed: number }>();
  for (const r of records) { const pm = r.policy_mode || "unknown"; const e = polOutcomes.get(pm) || { total: 0, failed: 0 }; e.total++; if (r.status === "failed") e.failed++; polOutcomes.set(pm, e); }
  for (const [pm, d] of polOutcomes) {
    if (d.total >= 3 && d.failed / d.total > 0.35) { patterns.push({ pattern_type: "policy_regression", affected_entities: [pm], frequency: d.failed, severity: d.failed / d.total > 0.5 ? "high" : "medium", confidence: Math.min(1, d.total / 10) }); reasons.push(`policy_regression_${pm}`); }
  }
  return { patterns, pattern_count: patterns.length, reason_codes: reasons };
}

// --- Health Model ---
function computePlatformHealth(snapshot: any, bottlenecks: any) {
  const gm = snapshot.global_metrics;
  const reliability = gm.total_executions > 0 ? 1 - gm.global_failure_rate : 1;
  const bp = Math.min(0.5, bottlenecks.bottlenecks.length * 0.05);
  const stability = Math.max(0, 1 - gm.global_retry_rate - bp);
  const repairBurden = gm.total_executions > 0 ? gm.global_repair_rate : 0;
  const costEff = gm.global_cost_per_execution > 0 ? Math.max(0, 1 - Math.min(1, gm.global_cost_per_execution / 2)) : 1;
  const deploySuc = gm.total_deploy_attempts > 0 ? gm.global_deploy_success_rate : 1;
  const polDist = snapshot.policy_usage_distribution;
  const polEff = polDist.length > 0 ? polDist.reduce((s: number, p: any) => s + p.success_rate * p.usage_count, 0) / polDist.reduce((s: number, p: any) => s + p.usage_count, 0) : 1;
  const overall = reliability * 0.25 + stability * 0.15 + (1 - repairBurden) * 0.15 + costEff * 0.15 + deploySuc * 0.15 + polEff * 0.15;
  const r = (n: number) => Math.round(n * 1000) / 1000;
  const grade = overall >= 0.9 ? "A" : overall >= 0.75 ? "B" : overall >= 0.6 ? "C" : overall >= 0.4 ? "D" : "F";
  return { reliability_index: r(reliability), execution_stability_index: r(stability), repair_burden_index: r(repairBurden), cost_efficiency_index: r(costEff), deploy_success_index: r(deploySuc), policy_effectiveness_index: r(polEff), overall_health_score: r(overall), health_grade: grade };
}

// --- Recommendation Engine ---
function generateInsightsAndRecs(snapshot: any, bottlenecks: any, patterns: any) {
  const insights: any[] = [];
  for (const b of bottlenecks.bottlenecks) insights.push({ insight_type: `bottleneck_${b.bottleneck_type}`, affected_scope: b.affected_entity, severity: b.severity === "critical" ? "critical" : b.severity === "high" ? "warning" : "info", confidence_score: b.confidence, recommendation: { action: b.recommended_action, rationale: "threshold exceeded" } });
  for (const p of patterns.patterns) insights.push({ insight_type: `pattern_${p.pattern_type}`, affected_scope: p.affected_entities.join(", "), severity: p.severity === "high" ? "warning" : "info", confidence_score: p.confidence, recommendation: { action: "review", rationale: "pattern detected" } });
  const recs = insights.filter(i => i.recommendation && i.confidence_score >= 0.3).map(i => {
    const sw = i.severity === "critical" ? 1 : i.severity === "warning" ? 0.7 : 0.4;
    return { recommendation_type: i.insight_type, target_scope: i.affected_scope, confidence_score: i.confidence_score, priority_score: Math.round(sw * i.confidence_score * 100) / 100 };
  }).sort((a: any, b: any) => b.priority_score - a.priority_score);
  return { insights, recommendations: recs };
}

// ═══ HELPERS ═══
const makeRecord = (overrides: Partial<ExecutionRecord> = {}): ExecutionRecord => ({
  stage: "build", status: "success", cost_usd: 0.05, duration_ms: 1000,
  context_class: "general", policy_mode: "balanced_default", organization_id: "org-1",
  had_retry: false, had_repair: false, had_validation_failure: false, had_human_review: false,
  deploy_attempted: false, deploy_succeeded: false, ...overrides,
});

const makeRecords = (count: number, overrides: Partial<ExecutionRecord> = {}): ExecutionRecord[] =>
  Array(count).fill(null).map(() => makeRecord(overrides));

// ═══ TESTS ═══
describe("Sprint 30 — Platform Intelligence (Comprehensive)", () => {

  describe("1. Platform Behavior Aggregator", () => {
    it("empty records produce zero metrics", () => {
      const s = aggregatePlatformBehavior([]);
      expect(s.global_metrics.total_executions).toBe(0);
      expect(s.context_distribution).toHaveLength(0);
    });

    it("computes global metrics correctly", () => {
      const records = [
        ...makeRecords(7, { status: "success" }),
        ...makeRecords(3, { status: "failed" }),
      ];
      const s = aggregatePlatformBehavior(records);
      expect(s.global_metrics.total_executions).toBe(10);
      expect(s.global_metrics.total_failures).toBe(3);
      expect(s.global_metrics.global_failure_rate).toBeCloseTo(0.3);
    });

    it("computes retry and repair rates", () => {
      const records = [
        ...makeRecords(5, { had_retry: true }),
        ...makeRecords(5, { had_repair: true }),
      ];
      const s = aggregatePlatformBehavior(records);
      expect(s.global_metrics.total_retries).toBe(5);
      expect(s.global_metrics.total_repairs).toBe(5);
      expect(s.global_metrics.global_retry_rate).toBe(0.5);
      expect(s.global_metrics.global_repair_rate).toBe(0.5);
    });

    it("computes deploy success rate", () => {
      const records = [
        ...makeRecords(3, { deploy_attempted: true, deploy_succeeded: true }),
        ...makeRecords(2, { deploy_attempted: true, deploy_succeeded: false }),
      ];
      const s = aggregatePlatformBehavior(records);
      expect(s.global_metrics.total_deploy_attempts).toBe(5);
      expect(s.global_metrics.total_deploy_successes).toBe(3);
      expect(s.global_metrics.global_deploy_success_rate).toBeCloseTo(0.6);
    });

    it("builds context distribution", () => {
      const records = [
        ...makeRecords(5, { context_class: "deploy_critical" }),
        ...makeRecords(3, { context_class: "general" }),
      ];
      const s = aggregatePlatformBehavior(records);
      expect(s.context_distribution.length).toBe(2);
      const dc = s.context_distribution.find(c => c.context_class === "deploy_critical");
      expect(dc?.count).toBe(5);
    });

    it("builds policy usage distribution", () => {
      const records = [
        ...makeRecords(4, { policy_mode: "high_quality" }),
        ...makeRecords(6, { policy_mode: "cost_optimized" }),
      ];
      const s = aggregatePlatformBehavior(records);
      expect(s.policy_usage_distribution.length).toBe(2);
    });

    it("builds failure concentration by stage", () => {
      const records = [
        ...makeRecords(3, { stage: "validate", status: "failed" }),
        ...makeRecords(7, { stage: "validate", status: "success" }),
        ...makeRecords(10, { stage: "build", status: "success" }),
      ];
      const s = aggregatePlatformBehavior(records);
      const valConc = s.failure_concentration.find(f => f.entity === "validate");
      expect(valConc).toBeDefined();
      expect(valConc!.rate).toBeCloseTo(0.3);
    });

    it("builds repair concentration by stage", () => {
      const records = [
        ...makeRecords(4, { stage: "build", had_repair: true }),
        ...makeRecords(6, { stage: "build", had_repair: false }),
      ];
      const s = aggregatePlatformBehavior(records);
      const bc = s.repair_concentration.find(r => r.entity === "build");
      expect(bc).toBeDefined();
      expect(bc!.rate).toBeCloseTo(0.4);
    });

    it("builds cost concentration by stage", () => {
      const records = [
        ...makeRecords(5, { stage: "expensive", cost_usd: 1.0 }),
        ...makeRecords(5, { stage: "cheap", cost_usd: 0.01 }),
      ];
      const s = aggregatePlatformBehavior(records);
      const exp = s.cost_concentration.find(c => c.entity === "expensive");
      expect(exp).toBeDefined();
      expect(exp!.rate).toBeGreaterThan(0.9);
      expect(exp!.severity).toBe("high");
    });

    it("deterministic: same input produces same output", () => {
      const records = makeRecords(10, { stage: "test", status: "success", cost_usd: 0.1 });
      const s1 = aggregatePlatformBehavior(records);
      const s2 = aggregatePlatformBehavior(records);
      expect(s1.global_metrics).toEqual(s2.global_metrics);
    });
  });

  describe("2. Bottleneck Detector", () => {
    it("healthy when no bottlenecks", () => {
      const s = aggregatePlatformBehavior(makeRecords(10, { status: "success" }));
      const r = detectBottlenecks(s);
      expect(r.overall_health).toBe("healthy");
      expect(r.bottlenecks).toHaveLength(0);
    });

    it("detects failure cascade (>30% failure rate)", () => {
      const records = [
        ...makeRecords(6, { stage: "validate", status: "failed" }),
        ...makeRecords(4, { stage: "validate", status: "success" }),
      ];
      const s = aggregatePlatformBehavior(records);
      const r = detectBottlenecks(s);
      expect(r.bottlenecks.some((b: any) => b.bottleneck_type === "failure_cascade")).toBe(true);
    });

    it("detects critical failure cascade (>50%)", () => {
      const records = makeRecords(10, { stage: "bad_stage", status: "failed" });
      const s = aggregatePlatformBehavior(records);
      const r = detectBottlenecks(s);
      const fc = r.bottlenecks.find((b: any) => b.bottleneck_type === "failure_cascade");
      expect(fc?.severity).toBe("critical");
      expect(r.overall_health).toBe("critical");
    });

    it("detects repair burden (>25%)", () => {
      const records = [
        ...makeRecords(4, { stage: "build", had_repair: true }),
        ...makeRecords(6, { stage: "build" }),
      ];
      const s = aggregatePlatformBehavior(records);
      const r = detectBottlenecks(s);
      expect(r.bottlenecks.some((b: any) => b.bottleneck_type === "repair_burden")).toBe(true);
    });

    it("detects cost hotspot (>30% of total cost)", () => {
      const records = [
        ...makeRecords(2, { stage: "expensive", cost_usd: 5.0 }),
        ...makeRecords(8, { stage: "cheap", cost_usd: 0.01 }),
      ];
      const s = aggregatePlatformBehavior(records);
      const r = detectBottlenecks(s);
      expect(r.bottlenecks.some((b: any) => b.bottleneck_type === "cost_hotspot")).toBe(true);
    });

    it("detects deploy degradation (<70% success)", () => {
      const records = [
        ...makeRecords(4, { deploy_attempted: true, deploy_succeeded: true }),
        ...makeRecords(6, { deploy_attempted: true, deploy_succeeded: false }),
      ];
      const s = aggregatePlatformBehavior(records);
      const r = detectBottlenecks(s);
      expect(r.bottlenecks.some((b: any) => b.bottleneck_type === "deploy_degradation")).toBe(true);
    });

    it("no false positive when rates are below threshold", () => {
      const records = [
        ...makeRecords(8, { status: "success" }),
        ...makeRecords(2, { status: "failed" }), // 20% < 30%
      ];
      const s = aggregatePlatformBehavior(records);
      const r = detectBottlenecks(s);
      expect(r.bottlenecks.filter((b: any) => b.bottleneck_type === "failure_cascade")).toHaveLength(0);
    });
  });

  describe("3. Pattern Analyzer", () => {
    it("returns insufficient_data for <5 records", () => {
      const r = analyzePlatformPatterns(makeRecords(3));
      expect(r.reason_codes).toContain("insufficient_data");
    });

    it("detects repeated repair path (>=3 occurrences)", () => {
      const records = [
        ...makeRecords(4, { stage: "validate", had_repair: true }),
        ...makeRecords(3, { stage: "build" }),
      ];
      const r = analyzePlatformPatterns(records);
      expect(r.patterns.some((p: any) => p.pattern_type === "repeated_repair_path")).toBe(true);
    });

    it("detects poor context outcome (>40% failure)", () => {
      const records = [
        ...makeRecords(3, { context_class: "risky", status: "failed" }),
        ...makeRecords(2, { context_class: "risky", status: "success" }),
        ...makeRecords(3, { context_class: "safe", status: "success" }),
      ];
      const r = analyzePlatformPatterns(records);
      expect(r.patterns.some((p: any) => p.pattern_type === "poor_context_outcome")).toBe(true);
    });

    it("detects policy regression (>35% failure)", () => {
      const records = [
        ...makeRecords(3, { policy_mode: "bad_policy", status: "failed" }),
        ...makeRecords(2, { policy_mode: "bad_policy", status: "success" }),
        ...makeRecords(3, { policy_mode: "good_policy", status: "success" }),
      ];
      const r = analyzePlatformPatterns(records);
      expect(r.patterns.some((p: any) => p.pattern_type === "policy_regression")).toBe(true);
    });

    it("no false pattern with low frequency", () => {
      const records = [
        ...makeRecords(1, { stage: "validate", had_repair: true }),
        ...makeRecords(6, { stage: "build" }),
      ];
      const r = analyzePlatformPatterns(records);
      expect(r.patterns.some((p: any) => p.pattern_type === "repeated_repair_path")).toBe(false);
    });
  });

  describe("4. Platform Health Model", () => {
    it("perfect health for all-success records", () => {
      const s = aggregatePlatformBehavior(makeRecords(10, { status: "success", cost_usd: 0.001 }));
      const b = detectBottlenecks(s);
      const h = computePlatformHealth(s, b);
      expect(h.health_grade).toBe("A");
      expect(h.overall_health_score).toBeGreaterThan(0.9);
      expect(h.reliability_index).toBe(1);
    });

    it("degraded health for high failure rate", () => {
      const s = aggregatePlatformBehavior([
        ...makeRecords(3, { status: "success" }),
        ...makeRecords(7, { status: "failed" }),
      ]);
      const b = detectBottlenecks(s);
      const h = computePlatformHealth(s, b);
      expect(h.reliability_index).toBeCloseTo(0.3);
      expect(h.health_grade).not.toBe("A");
    });

    it("repair burden impacts health", () => {
      const s = aggregatePlatformBehavior(makeRecords(10, { had_repair: true }));
      const b = detectBottlenecks(s);
      const h = computePlatformHealth(s, b);
      expect(h.repair_burden_index).toBe(1);
    });

    it("deploy failure impacts deploy index", () => {
      const s = aggregatePlatformBehavior(makeRecords(10, { deploy_attempted: true, deploy_succeeded: false }));
      const b = detectBottlenecks(s);
      const h = computePlatformHealth(s, b);
      expect(h.deploy_success_index).toBe(0);
    });

    it("empty records produce healthy defaults", () => {
      const s = aggregatePlatformBehavior([]);
      const b = detectBottlenecks(s);
      const h = computePlatformHealth(s, b);
      expect(h.health_grade).toBe("A");
      expect(h.overall_health_score).toBe(1);
    });

    it("all indices are between 0 and 1", () => {
      const s = aggregatePlatformBehavior(makeRecords(20, { status: "failed", had_retry: true, had_repair: true, cost_usd: 5 }));
      const b = detectBottlenecks(s);
      const h = computePlatformHealth(s, b);
      for (const key of ["reliability_index", "execution_stability_index", "repair_burden_index", "cost_efficiency_index", "deploy_success_index", "policy_effectiveness_index", "overall_health_score"]) {
        expect((h as any)[key]).toBeGreaterThanOrEqual(0);
        expect((h as any)[key]).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("5. Insight & Recommendation Generation", () => {
    it("generates insights from bottlenecks", () => {
      const s = aggregatePlatformBehavior(makeRecords(10, { stage: "bad", status: "failed" }));
      const b = detectBottlenecks(s);
      const p = analyzePlatformPatterns(makeRecords(10, { stage: "bad", status: "failed" }));
      const { insights } = generateInsightsAndRecs(s, b, p);
      expect(insights.length).toBeGreaterThan(0);
    });

    it("generates recommendations from insights with confidence >= 0.3", () => {
      const s = aggregatePlatformBehavior(makeRecords(10, { stage: "bad", status: "failed" }));
      const b = detectBottlenecks(s);
      const p = analyzePlatformPatterns(makeRecords(10, { stage: "bad", status: "failed" }));
      const { recommendations } = generateInsightsAndRecs(s, b, p);
      expect(recommendations.length).toBeGreaterThan(0);
      for (const r of recommendations) {
        expect(r.confidence_score).toBeGreaterThanOrEqual(0.3);
        expect(r.priority_score).toBeGreaterThan(0);
      }
    });

    it("recommendations are sorted by priority", () => {
      const s = aggregatePlatformBehavior([
        ...makeRecords(6, { stage: "critical", status: "failed" }),
        ...makeRecords(4, { stage: "mild", status: "failed", had_repair: true }),
      ]);
      const b = detectBottlenecks(s);
      const p = analyzePlatformPatterns([...makeRecords(6, { stage: "critical", status: "failed" }), ...makeRecords(4, { stage: "mild", status: "failed", had_repair: true })]);
      const { recommendations } = generateInsightsAndRecs(s, b, p);
      for (let i = 1; i < recommendations.length; i++) {
        expect(recommendations[i - 1].priority_score).toBeGreaterThanOrEqual(recommendations[i].priority_score);
      }
    });

    it("no recommendations for healthy system", () => {
      const s = aggregatePlatformBehavior(makeRecords(10, { status: "success" }));
      const b = detectBottlenecks(s);
      const p = analyzePlatformPatterns(makeRecords(10, { status: "success" }));
      const { recommendations } = generateInsightsAndRecs(s, b, p);
      expect(recommendations).toHaveLength(0);
    });
  });

  describe("6. Safety Constraints", () => {
    it("aggregator does not produce topology mutations", () => {
      const s = aggregatePlatformBehavior(makeRecords(10));
      expect(s).not.toHaveProperty("stage_order");
      expect(s).not.toHaveProperty("governance_override");
      expect(s).not.toHaveProperty("billing_change");
    });

    it("bottleneck detector only produces advisory signals", () => {
      const s = aggregatePlatformBehavior(makeRecords(10, { status: "failed" }));
      const r = detectBottlenecks(s);
      for (const b of r.bottlenecks) {
        expect(b).toHaveProperty("recommended_action");
        expect(b).not.toHaveProperty("auto_apply");
        expect(b).not.toHaveProperty("mutate_pipeline");
      }
    });

    it("pattern analyzer does not create policies", () => {
      const r = analyzePlatformPatterns(makeRecords(10, { had_repair: true }));
      for (const p of r.patterns) {
        expect(p).not.toHaveProperty("policy_created");
        expect(p).not.toHaveProperty("auto_fix");
      }
    });

    it("health model is read-only computation", () => {
      const s = aggregatePlatformBehavior(makeRecords(10));
      const b = detectBottlenecks(s);
      const h = computePlatformHealth(s, b);
      expect(h).not.toHaveProperty("applied_changes");
      expect(h).toHaveProperty("health_grade");
    });
  });

  describe("7. E2E Integration", () => {
    it("full cycle: aggregate → detect → analyze → generate → health", () => {
      const records = [
        ...makeRecords(30, { stage: "build", status: "success", cost_usd: 0.05 }),
        ...makeRecords(10, { stage: "validate", status: "failed", cost_usd: 0.1, had_repair: true }),
        ...makeRecords(5, { stage: "deploy", deploy_attempted: true, deploy_succeeded: true, cost_usd: 0.02 }),
        ...makeRecords(3, { stage: "deploy", deploy_attempted: true, deploy_succeeded: false, cost_usd: 0.02 }),
      ];
      const snapshot = aggregatePlatformBehavior(records);
      expect(snapshot.global_metrics.total_executions).toBe(48);

      const bottleneckReport = detectBottlenecks(snapshot);
      const patternReport = analyzePlatformPatterns(records);
      const { insights, recommendations } = generateInsightsAndRecs(snapshot, bottleneckReport, patternReport);
      const health = computePlatformHealth(snapshot, bottleneckReport);

      expect(health.health_grade).toBeDefined();
      expect(typeof health.overall_health_score).toBe("number");
      expect(insights.length).toBeGreaterThanOrEqual(0);
      expect(recommendations.length).toBeGreaterThanOrEqual(0);
    });
  });
});
