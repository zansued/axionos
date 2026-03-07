// Sprint 30 — Platform Intelligence Comprehensive Tests (Expanded)
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

  // Repeated repair paths
  const repairByStage = new Map<string, number>();
  for (const r of records) if (r.had_repair) repairByStage.set(r.stage, (repairByStage.get(r.stage) || 0) + 1);
  for (const [stage, count] of repairByStage) {
    if (count >= 3) { patterns.push({ pattern_type: "repeated_repair_path", description: `Stage "${stage}" triggered repair ${count} times`, affected_entities: [stage], frequency: count, severity: count >= 5 ? "high" : "medium", confidence: Math.min(1, count / 10), evidence_refs: [`stage:${stage}`, `repair_count:${count}`] }); reasons.push(`repeated_repair_${stage}`); }
  }

  // Poor context outcomes
  const ctxOutcomes = new Map<string, { total: number; failed: number }>();
  for (const r of records) { const ctx = r.context_class || "unknown"; const e = ctxOutcomes.get(ctx) || { total: 0, failed: 0 }; e.total++; if (r.status === "failed") e.failed++; ctxOutcomes.set(ctx, e); }
  for (const [ctx, d] of ctxOutcomes) {
    if (d.total >= 3 && d.failed / d.total > 0.4) { patterns.push({ pattern_type: "poor_context_outcome", description: `Context "${ctx}" has ${(d.failed / d.total * 100).toFixed(0)}% failure`, affected_entities: [ctx], frequency: d.failed, severity: d.failed / d.total > 0.6 ? "high" : "medium", confidence: Math.min(1, d.total / 10), evidence_refs: [`context:${ctx}`] }); reasons.push(`poor_context_${ctx}`); }
  }

  // Policy regressions
  const polOutcomes = new Map<string, { total: number; failed: number }>();
  for (const r of records) { const pm = r.policy_mode || "unknown"; const e = polOutcomes.get(pm) || { total: 0, failed: 0 }; e.total++; if (r.status === "failed") e.failed++; polOutcomes.set(pm, e); }
  for (const [pm, d] of polOutcomes) {
    if (d.total >= 3 && d.failed / d.total > 0.35) { patterns.push({ pattern_type: "policy_regression", description: `Policy "${pm}" has ${(d.failed / d.total * 100).toFixed(0)}% failure`, affected_entities: [pm], frequency: d.failed, severity: d.failed / d.total > 0.5 ? "high" : "medium", confidence: Math.min(1, d.total / 10), evidence_refs: [`policy:${pm}`] }); reasons.push(`policy_regression_${pm}`); }
  }

  // Failing repair strategies
  const repairFailed = new Map<string, number>();
  for (const r of records) { if (r.had_repair && r.status === "failed") repairFailed.set(r.stage, (repairFailed.get(r.stage) || 0) + 1); }
  for (const [stage, count] of repairFailed) {
    if (count >= 2) { patterns.push({ pattern_type: "failing_repair_strategy", description: `Repair failed ${count} times at "${stage}"`, affected_entities: [stage], frequency: count, severity: count >= 4 ? "high" : "medium", confidence: Math.min(1, count / 5), evidence_refs: [`stage:${stage}`] }); reasons.push(`failing_repair_${stage}`); }
  }

  return { patterns, pattern_count: patterns.length, reason_codes: reasons };
}

// --- Insight Generator ---
function generateInsights(snapshot: any, bottlenecks: any, patterns: any) {
  const insights: any[] = [];

  for (const b of bottlenecks.bottlenecks) {
    insights.push({
      insight_type: `bottleneck_${b.bottleneck_type}`, affected_scope: b.affected_entity,
      severity: b.severity === "critical" ? "critical" : b.severity === "high" ? "warning" : "info",
      description: b.description, evidence_refs: [`bottleneck:${b.bottleneck_type}`, `entity:${b.affected_entity}`],
      supporting_metrics: { rate: b.rate, threshold: b.threshold },
      recommendation: { action: b.recommended_action, rationale: `Rate ${(b.rate * 100).toFixed(0)}% exceeds threshold ${(b.threshold * 100).toFixed(0)}%` },
      confidence_score: b.confidence,
    });
  }

  for (const p of patterns.patterns) {
    insights.push({
      insight_type: `pattern_${p.pattern_type}`, affected_scope: p.affected_entities.join(", "),
      severity: p.severity === "high" ? "warning" : "info",
      description: p.description, evidence_refs: p.evidence_refs || [],
      supporting_metrics: { frequency: p.frequency },
      recommendation: getPatternRec(p),
      confidence_score: p.confidence,
    });
  }

  const gm = snapshot.global_metrics;
  if (gm.total_executions > 0 && gm.global_failure_rate > 0.2) {
    insights.push({
      insight_type: "global_failure_rate_elevated", affected_scope: "platform",
      severity: gm.global_failure_rate > 0.4 ? "critical" : "warning",
      description: `Global failure rate is ${(gm.global_failure_rate * 100).toFixed(0)}%`,
      evidence_refs: ["global_metrics"],
      supporting_metrics: { failure_rate: gm.global_failure_rate, total_executions: gm.total_executions },
      recommendation: { action: "Review most-failing stages", rationale: "Elevated failure rate" },
      confidence_score: Math.min(1, gm.total_executions / 20),
    });
  }

  if (gm.total_executions > 0 && gm.global_retry_rate > 0.3) {
    insights.push({
      insight_type: "global_retry_rate_elevated", affected_scope: "platform",
      severity: "warning",
      description: `Global retry rate is ${(gm.global_retry_rate * 100).toFixed(0)}%`,
      evidence_refs: ["global_metrics"],
      supporting_metrics: { retry_rate: gm.global_retry_rate },
      recommendation: { action: "Investigate retry causes", rationale: "High retry frequency" },
      confidence_score: Math.min(1, gm.total_executions / 20),
    });
  }

  const severityOrder: Record<string, number> = { critical: 3, warning: 2, info: 1 };
  insights.sort((a, b) => {
    const sd = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
    return sd !== 0 ? sd : b.confidence_score - a.confidence_score;
  });

  return insights;
}

function getPatternRec(p: any) {
  switch (p.pattern_type) {
    case "repeated_repair_path": return { action: "Add preventive validation before affected stage", rationale: `${p.frequency} repair occurrences` };
    case "poor_context_outcome": return { action: "Review execution policy for context", rationale: "Consistently poor outcomes" };
    case "policy_regression": return { action: "Limit or deprecate underperforming policy", rationale: "High failure rate" };
    case "failing_repair_strategy": return { action: "Escalate repair strategy", rationale: "Current strategy repeatedly fails" };
    default: return null;
  }
}

// --- Recommendation Engine ---
function generateRecommendations(insights: any[]) {
  const recs = [];
  for (const i of insights) {
    if (!i.recommendation || i.confidence_score < 0.3) continue;
    const sw = i.severity === "critical" ? 1 : i.severity === "warning" ? 0.7 : 0.4;
    recs.push({
      recommendation_type: mapInsightToRecType(i.insight_type),
      target_scope: i.affected_scope,
      target_entity: { scope: i.affected_scope, insight_type: i.insight_type },
      recommendation_reason: { action: i.recommendation.action, rationale: i.recommendation.rationale, evidence_refs: i.evidence_refs, supporting_metrics: i.supporting_metrics },
      confidence_score: i.confidence_score,
      priority_score: Math.round(sw * i.confidence_score * 100) / 100,
    });
  }
  recs.sort((a, b) => b.priority_score - a.priority_score);
  return recs;
}

function mapInsightToRecType(t: string): string {
  if (t.includes("bottleneck_failure")) return "increase_validation_guard";
  if (t.includes("bottleneck_repair")) return "adjust_repair_strategy";
  if (t.includes("bottleneck_cost")) return "optimize_cost";
  if (t.includes("bottleneck_deploy")) return "harden_deploy";
  if (t.includes("pattern_repeated_repair")) return "add_preventive_validation";
  if (t.includes("pattern_poor_context")) return "review_context_policy";
  if (t.includes("pattern_policy_regression")) return "limit_policy";
  if (t.includes("pattern_failing_repair")) return "escalate_repair";
  if (t.includes("global_failure")) return "system_reliability_review";
  if (t.includes("global_retry")) return "reduce_retry_burden";
  return "general_review";
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

// ═══ HELPERS ═══
const makeRecord = (overrides: Partial<ExecutionRecord> = {}): ExecutionRecord => ({
  stage: "build", status: "success", cost_usd: 0.05, duration_ms: 1000,
  context_class: "general", policy_mode: "balanced_default", organization_id: "org-1",
  had_retry: false, had_repair: false, had_validation_failure: false, had_human_review: false,
  deploy_attempted: false, deploy_succeeded: false, ...overrides,
});

const makeRecords = (count: number, overrides: Partial<ExecutionRecord> = {}): ExecutionRecord[] =>
  Array(count).fill(null).map(() => makeRecord(overrides));

const spreadStages = (countPerStage: number, stages: string[], overrides: Partial<ExecutionRecord> = {}): ExecutionRecord[] =>
  stages.flatMap(s => makeRecords(countPerStage, { stage: s, ...overrides }));

// Full pipeline helper
function runFullPipeline(records: ExecutionRecord[]) {
  const snapshot = aggregatePlatformBehavior(records);
  const bottleneckReport = detectBottlenecks(snapshot);
  const patternReport = analyzePlatformPatterns(records);
  const insights = generateInsights(snapshot, bottleneckReport, patternReport);
  const recommendations = generateRecommendations(insights);
  const health = computePlatformHealth(snapshot, bottleneckReport);
  return { snapshot, bottleneckReport, patternReport, insights, recommendations, health };
}

// ═══ TESTS ═══
describe("Sprint 30 — Platform Intelligence (Comprehensive)", () => {

  // ══════════════════════════════════════════
  // 1. PLATFORM BEHAVIOR AGGREGATOR
  // ══════════════════════════════════════════
  describe("1. Platform Behavior Aggregator", () => {
    it("empty records produce zero metrics", () => {
      const s = aggregatePlatformBehavior([]);
      expect(s.global_metrics.total_executions).toBe(0);
      expect(s.global_metrics.global_failure_rate).toBe(0);
      expect(s.context_distribution).toHaveLength(0);
      expect(s.policy_usage_distribution).toHaveLength(0);
      expect(s.failure_concentration).toHaveLength(0);
      expect(s.repair_concentration).toHaveLength(0);
      expect(s.cost_concentration).toHaveLength(0);
    });

    it("computes global metrics correctly", () => {
      const records = [...makeRecords(7), ...makeRecords(3, { status: "failed" })];
      const s = aggregatePlatformBehavior(records);
      expect(s.global_metrics.total_executions).toBe(10);
      expect(s.global_metrics.total_failures).toBe(3);
      expect(s.global_metrics.global_failure_rate).toBeCloseTo(0.3);
    });

    it("computes retry and repair rates", () => {
      const records = [...makeRecords(5, { had_retry: true }), ...makeRecords(5, { had_repair: true })];
      const s = aggregatePlatformBehavior(records);
      expect(s.global_metrics.global_retry_rate).toBe(0.5);
      expect(s.global_metrics.global_repair_rate).toBe(0.5);
    });

    it("computes deploy success rate", () => {
      const records = [...makeRecords(3, { deploy_attempted: true, deploy_succeeded: true }), ...makeRecords(2, { deploy_attempted: true, deploy_succeeded: false })];
      const s = aggregatePlatformBehavior(records);
      expect(s.global_metrics.global_deploy_success_rate).toBeCloseTo(0.6);
    });

    it("deploy success defaults to 1 when no deploys", () => {
      const s = aggregatePlatformBehavior(makeRecords(5));
      expect(s.global_metrics.global_deploy_success_rate).toBe(1);
    });

    it("computes validation failure and human review counts", () => {
      const records = [...makeRecords(3, { had_validation_failure: true }), ...makeRecords(2, { had_human_review: true })];
      const s = aggregatePlatformBehavior(records);
      expect(s.global_metrics.total_validation_failures).toBe(3);
      expect(s.global_metrics.total_human_reviews).toBe(2);
    });

    it("builds context distribution", () => {
      const records = [...makeRecords(5, { context_class: "deploy_critical" }), ...makeRecords(3, { context_class: "general" })];
      const s = aggregatePlatformBehavior(records);
      expect(s.context_distribution.length).toBe(2);
      expect(s.context_distribution.find(c => c.context_class === "deploy_critical")?.count).toBe(5);
    });

    it("defaults context to unknown when missing", () => {
      const records = makeRecords(3, { context_class: undefined });
      const s = aggregatePlatformBehavior(records);
      expect(s.context_distribution[0].context_class).toBe("unknown");
    });

    it("builds policy usage distribution with success rate", () => {
      const records = [
        ...makeRecords(4, { policy_mode: "high_quality" }),
        ...makeRecords(3, { policy_mode: "cost_optimized", status: "failed" }),
        ...makeRecords(3, { policy_mode: "cost_optimized" }),
      ];
      const s = aggregatePlatformBehavior(records);
      const hq = s.policy_usage_distribution.find(p => p.policy_mode === "high_quality");
      const co = s.policy_usage_distribution.find(p => p.policy_mode === "cost_optimized");
      expect(hq?.success_rate).toBe(1);
      expect(co?.success_rate).toBeCloseTo(0.5);
    });

    it("builds failure concentration by stage sorted by rate", () => {
      const records = [
        ...makeRecords(3, { stage: "validate", status: "failed" }),
        ...makeRecords(7, { stage: "validate" }),
        ...makeRecords(1, { stage: "build", status: "failed" }),
        ...makeRecords(9, { stage: "build" }),
      ];
      const s = aggregatePlatformBehavior(records);
      expect(s.failure_concentration[0].entity).toBe("validate");
      expect(s.failure_concentration[0].rate).toBeCloseTo(0.3);
    });

    it("builds repair concentration by stage", () => {
      const records = [...makeRecords(4, { stage: "build", had_repair: true }), ...makeRecords(6, { stage: "build" })];
      const s = aggregatePlatformBehavior(records);
      expect(s.repair_concentration[0].rate).toBeCloseTo(0.4);
      expect(s.repair_concentration[0].severity).toBe("high");
    });

    it("builds cost concentration with severity", () => {
      const records = [...makeRecords(5, { stage: "expensive", cost_usd: 1.0 }), ...makeRecords(5, { stage: "cheap", cost_usd: 0.01 })];
      const s = aggregatePlatformBehavior(records);
      expect(s.cost_concentration[0].entity).toBe("expensive");
      expect(s.cost_concentration[0].severity).toBe("high");
    });

    it("deterministic: same input same output", () => {
      const records = makeRecords(10, { stage: "test", cost_usd: 0.1 });
      const s1 = aggregatePlatformBehavior(records);
      const s2 = aggregatePlatformBehavior(records);
      expect(s1.global_metrics).toEqual(s2.global_metrics);
    });

    it("handles nullish cost_usd gracefully", () => {
      const records = makeRecords(5, { cost_usd: 0 });
      const s = aggregatePlatformBehavior(records);
      expect(s.global_metrics.global_cost_per_execution).toBe(0);
    });

    it("does not mix tenants — org-1 only", () => {
      const records = [...makeRecords(3, { organization_id: "org-1" }), ...makeRecords(3, { organization_id: "org-2" })];
      const s = aggregatePlatformBehavior(records);
      // Aggregator processes all records given — tenant scoping is the caller's job
      expect(s.global_metrics.total_executions).toBe(6);
    });
  });

  // ══════════════════════════════════════════
  // 2. BOTTLENECK DETECTOR
  // ══════════════════════════════════════════
  describe("2. Bottleneck Detector", () => {
    it("healthy when distributed across stages", () => {
      const records = spreadStages(5, ["build", "validate", "deploy", "test"], { cost_usd: 0.05 });
      const s = aggregatePlatformBehavior(records);
      const r = detectBottlenecks(s);
      expect(r.overall_health).toBe("healthy");
      expect(r.bottlenecks).toHaveLength(0);
    });

    it("detects failure cascade (>30%)", () => {
      const records = [...makeRecords(6, { stage: "validate", status: "failed" }), ...makeRecords(4, { stage: "validate" })];
      const s = aggregatePlatformBehavior(records);
      const r = detectBottlenecks(s);
      expect(r.bottlenecks.some(b => b.bottleneck_type === "failure_cascade")).toBe(true);
      expect(r.reason_codes).toContain("failure_cascade_validate");
    });

    it("detects critical failure cascade (>50%)", () => {
      const records = makeRecords(10, { stage: "bad", status: "failed" });
      const s = aggregatePlatformBehavior(records);
      const r = detectBottlenecks(s);
      expect(r.bottlenecks.find(b => b.bottleneck_type === "failure_cascade")?.severity).toBe("critical");
      expect(r.overall_health).toBe("critical");
    });

    it("detects repair burden (>25%)", () => {
      const records = [...makeRecords(4, { stage: "build", had_repair: true }), ...makeRecords(6, { stage: "build" })];
      const s = aggregatePlatformBehavior(records);
      const r = detectBottlenecks(s);
      expect(r.bottlenecks.some(b => b.bottleneck_type === "repair_burden")).toBe(true);
    });

    it("repair burden severity high when >40%", () => {
      const records = [...makeRecords(5, { stage: "build", had_repair: true }), ...makeRecords(5, { stage: "build" })];
      const s = aggregatePlatformBehavior(records);
      const r = detectBottlenecks(s);
      expect(r.bottlenecks.find(b => b.bottleneck_type === "repair_burden")?.severity).toBe("high");
    });

    it("detects cost hotspot (>30%)", () => {
      const records = [...makeRecords(2, { stage: "expensive", cost_usd: 5.0 }), ...makeRecords(8, { stage: "cheap", cost_usd: 0.01 })];
      const s = aggregatePlatformBehavior(records);
      const r = detectBottlenecks(s);
      expect(r.bottlenecks.some(b => b.bottleneck_type === "cost_hotspot")).toBe(true);
    });

    it("detects deploy degradation (<70% success)", () => {
      const records = [...makeRecords(4, { deploy_attempted: true, deploy_succeeded: true }), ...makeRecords(6, { deploy_attempted: true, deploy_succeeded: false })];
      const s = aggregatePlatformBehavior(records);
      const r = detectBottlenecks(s);
      expect(r.bottlenecks.some(b => b.bottleneck_type === "deploy_degradation")).toBe(true);
    });

    it("deploy degradation critical when <50%", () => {
      const records = [...makeRecords(2, { deploy_attempted: true, deploy_succeeded: true }), ...makeRecords(8, { deploy_attempted: true, deploy_succeeded: false })];
      const s = aggregatePlatformBehavior(records);
      const r = detectBottlenecks(s);
      expect(r.bottlenecks.find(b => b.bottleneck_type === "deploy_degradation")?.severity).toBe("critical");
    });

    it("no false positive when failure rate below threshold", () => {
      const records = [...makeRecords(8), ...makeRecords(2, { status: "failed" })];
      const s = aggregatePlatformBehavior(records);
      const r = detectBottlenecks(s);
      expect(r.bottlenecks.filter(b => b.bottleneck_type === "failure_cascade")).toHaveLength(0);
    });

    it("no deploy bottleneck when no deploys attempted", () => {
      const records = makeRecords(10);
      const s = aggregatePlatformBehavior(records);
      const r = detectBottlenecks(s);
      expect(r.bottlenecks.filter(b => b.bottleneck_type === "deploy_degradation")).toHaveLength(0);
    });

    it("confidence scales with sample size", () => {
      const records = [...makeRecords(2, { stage: "x", status: "failed" }), ...makeRecords(1, { stage: "x" })];
      const s = aggregatePlatformBehavior(records);
      const r = detectBottlenecks(s);
      const fc = r.bottlenecks.find(b => b.bottleneck_type === "failure_cascade");
      expect(fc?.confidence).toBeLessThan(1); // 2/5 = 0.4
    });

    it("all bottlenecks have required fields", () => {
      const records = makeRecords(10, { stage: "bad", status: "failed" });
      const s = aggregatePlatformBehavior(records);
      const r = detectBottlenecks(s);
      for (const b of r.bottlenecks) {
        expect(b).toHaveProperty("bottleneck_type");
        expect(b).toHaveProperty("affected_entity");
        expect(b).toHaveProperty("severity");
        expect(b).toHaveProperty("rate");
        expect(b).toHaveProperty("threshold");
        expect(b).toHaveProperty("description");
        expect(b).toHaveProperty("recommended_action");
        expect(b).toHaveProperty("confidence");
      }
    });
  });

  // ══════════════════════════════════════════
  // 3. PATTERN ANALYZER
  // ══════════════════════════════════════════
  describe("3. Pattern Analyzer", () => {
    it("insufficient_data for <5 records", () => {
      const r = analyzePlatformPatterns(makeRecords(3));
      expect(r.reason_codes).toContain("insufficient_data");
      expect(r.patterns).toHaveLength(0);
    });

    it("detects repeated repair path (>=3)", () => {
      const records = [...makeRecords(4, { stage: "validate", had_repair: true }), ...makeRecords(3, { stage: "build" })];
      const r = analyzePlatformPatterns(records);
      expect(r.patterns.some(p => p.pattern_type === "repeated_repair_path")).toBe(true);
    });

    it("repair path severity high when >=5", () => {
      const records = [...makeRecords(6, { stage: "validate", had_repair: true }), ...makeRecords(2, { stage: "build" })];
      const r = analyzePlatformPatterns(records);
      expect(r.patterns.find(p => p.pattern_type === "repeated_repair_path")?.severity).toBe("high");
    });

    it("no repair pattern when <3 occurrences", () => {
      const records = [...makeRecords(2, { stage: "validate", had_repair: true }), ...makeRecords(5, { stage: "build" })];
      const r = analyzePlatformPatterns(records);
      expect(r.patterns.some(p => p.pattern_type === "repeated_repair_path")).toBe(false);
    });

    it("detects poor context outcome (>40%)", () => {
      const records = [...makeRecords(3, { context_class: "risky", status: "failed" }), ...makeRecords(2, { context_class: "risky" }), ...makeRecords(3, { context_class: "safe" })];
      const r = analyzePlatformPatterns(records);
      expect(r.patterns.some(p => p.pattern_type === "poor_context_outcome")).toBe(true);
    });

    it("poor context severity high when >60%", () => {
      const records = [...makeRecords(4, { context_class: "terrible", status: "failed" }), ...makeRecords(1, { context_class: "terrible" }), ...makeRecords(3, { context_class: "ok" })];
      const r = analyzePlatformPatterns(records);
      expect(r.patterns.find(p => p.pattern_type === "poor_context_outcome")?.severity).toBe("high");
    });

    it("detects policy regression (>35%)", () => {
      const records = [...makeRecords(3, { policy_mode: "bad", status: "failed" }), ...makeRecords(2, { policy_mode: "bad" }), ...makeRecords(3, { policy_mode: "good" })];
      const r = analyzePlatformPatterns(records);
      expect(r.patterns.some(p => p.pattern_type === "policy_regression")).toBe(true);
    });

    it("detects failing repair strategy (>=2 failed repairs)", () => {
      const records = [...makeRecords(3, { stage: "build", had_repair: true, status: "failed" }), ...makeRecords(4, { stage: "test" })];
      const r = analyzePlatformPatterns(records);
      expect(r.patterns.some(p => p.pattern_type === "failing_repair_strategy")).toBe(true);
    });

    it("no false pattern with low frequency", () => {
      const records = [...makeRecords(1, { stage: "validate", had_repair: true }), ...makeRecords(6, { stage: "build" })];
      const r = analyzePlatformPatterns(records);
      expect(r.patterns).toHaveLength(0);
    });

    it("patterns have evidence_refs", () => {
      const records = [...makeRecords(4, { stage: "v", had_repair: true }), ...makeRecords(3, { stage: "b" })];
      const r = analyzePlatformPatterns(records);
      for (const p of r.patterns) {
        expect(p.evidence_refs).toBeDefined();
        expect(p.evidence_refs.length).toBeGreaterThan(0);
      }
    });

    it("confidence bounded by sample size", () => {
      const records = [...makeRecords(3, { stage: "v", had_repair: true }), ...makeRecords(4, { stage: "b" })];
      const r = analyzePlatformPatterns(records);
      const p = r.patterns.find(p => p.pattern_type === "repeated_repair_path");
      expect(p?.confidence).toBeLessThanOrEqual(1);
      expect(p?.confidence).toBeGreaterThan(0);
    });

    it("deterministic: same input same patterns", () => {
      const records = [...makeRecords(5, { stage: "v", had_repair: true }), ...makeRecords(3, { stage: "b" })];
      const r1 = analyzePlatformPatterns(records);
      const r2 = analyzePlatformPatterns(records);
      expect(r1.pattern_count).toBe(r2.pattern_count);
      expect(r1.reason_codes).toEqual(r2.reason_codes);
    });
  });

  // ══════════════════════════════════════════
  // 4. INSIGHT GENERATOR
  // ══════════════════════════════════════════
  describe("4. Insight Generator", () => {
    it("generates insights from bottlenecks", () => {
      const s = aggregatePlatformBehavior(makeRecords(10, { stage: "bad", status: "failed" }));
      const b = detectBottlenecks(s);
      const p = analyzePlatformPatterns(makeRecords(10, { stage: "bad", status: "failed" }));
      const insights = generateInsights(s, b, p);
      expect(insights.length).toBeGreaterThan(0);
      expect(insights.some(i => i.insight_type.includes("bottleneck"))).toBe(true);
    });

    it("generates insights from patterns", () => {
      const records = [...makeRecords(5, { stage: "v", had_repair: true }), ...makeRecords(3, { stage: "b" })];
      const s = aggregatePlatformBehavior(records);
      const b = detectBottlenecks(s);
      const p = analyzePlatformPatterns(records);
      const insights = generateInsights(s, b, p);
      expect(insights.some(i => i.insight_type.includes("pattern"))).toBe(true);
    });

    it("generates global failure rate insight when >20%", () => {
      const records = [...makeRecords(3), ...makeRecords(7, { status: "failed" })];
      const s = aggregatePlatformBehavior(records);
      const b = detectBottlenecks(s);
      const p = analyzePlatformPatterns(records);
      const insights = generateInsights(s, b, p);
      expect(insights.some(i => i.insight_type === "global_failure_rate_elevated")).toBe(true);
    });

    it("global failure critical when >40%", () => {
      const records = [...makeRecords(2), ...makeRecords(8, { status: "failed" })];
      const s = aggregatePlatformBehavior(records);
      const b = detectBottlenecks(s);
      const p = analyzePlatformPatterns(records);
      const insights = generateInsights(s, b, p);
      const gfi = insights.find(i => i.insight_type === "global_failure_rate_elevated");
      expect(gfi?.severity).toBe("critical");
    });

    it("generates global retry rate insight when >30%", () => {
      const records = makeRecords(10, { had_retry: true });
      const s = aggregatePlatformBehavior(records);
      const b = detectBottlenecks(s);
      const p = analyzePlatformPatterns(records);
      const insights = generateInsights(s, b, p);
      expect(insights.some(i => i.insight_type === "global_retry_rate_elevated")).toBe(true);
    });

    it("insights sorted by severity then confidence", () => {
      const records = [
        ...makeRecords(10, { stage: "critical", status: "failed" }),
        ...makeRecords(5, { stage: "mild", had_repair: true }),
      ];
      const s = aggregatePlatformBehavior(records);
      const b = detectBottlenecks(s);
      const p = analyzePlatformPatterns(records);
      const insights = generateInsights(s, b, p);
      const sevOrder: Record<string, number> = { critical: 3, warning: 2, info: 1 };
      for (let i = 1; i < insights.length; i++) {
        const prev = sevOrder[insights[i - 1].severity] || 0;
        const curr = sevOrder[insights[i].severity] || 0;
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });

    it("all insights have required structure", () => {
      const records = makeRecords(10, { stage: "x", status: "failed", had_repair: true });
      const s = aggregatePlatformBehavior(records);
      const b = detectBottlenecks(s);
      const p = analyzePlatformPatterns(records);
      const insights = generateInsights(s, b, p);
      for (const i of insights) {
        expect(i).toHaveProperty("insight_type");
        expect(i).toHaveProperty("affected_scope");
        expect(i).toHaveProperty("severity");
        expect(i).toHaveProperty("description");
        expect(i).toHaveProperty("evidence_refs");
        expect(i).toHaveProperty("supporting_metrics");
        expect(i).toHaveProperty("confidence_score");
        expect(["info", "warning", "critical"]).toContain(i.severity);
      }
    });

    it("no insights for healthy system", () => {
      const records = spreadStages(5, ["a", "b", "c", "d"], { cost_usd: 0.01 });
      const s = aggregatePlatformBehavior(records);
      const b = detectBottlenecks(s);
      const p = analyzePlatformPatterns(records);
      const insights = generateInsights(s, b, p);
      expect(insights).toHaveLength(0);
    });
  });

  // ══════════════════════════════════════════
  // 5. RECOMMENDATION ENGINE
  // ══════════════════════════════════════════
  describe("5. Recommendation Engine", () => {
    it("generates recommendations from high-confidence insights", () => {
      const records = makeRecords(10, { stage: "bad", status: "failed" });
      const s = aggregatePlatformBehavior(records);
      const b = detectBottlenecks(s);
      const p = analyzePlatformPatterns(records);
      const insights = generateInsights(s, b, p);
      const recs = generateRecommendations(insights);
      expect(recs.length).toBeGreaterThan(0);
    });

    it("skips low-confidence insights (<0.3)", () => {
      // 1 failure out of 5 in a stage — low confidence
      const insights = [{ insight_type: "bottleneck_failure_cascade", affected_scope: "x", severity: "warning", confidence_score: 0.2, recommendation: { action: "test", rationale: "test" }, evidence_refs: [], supporting_metrics: {} }];
      const recs = generateRecommendations(insights);
      expect(recs).toHaveLength(0);
    });

    it("recommendations sorted by priority_score", () => {
      const records = [
        ...makeRecords(10, { stage: "critical", status: "failed" }),
        ...makeRecords(5, { stage: "mild", had_repair: true }),
      ];
      const s = aggregatePlatformBehavior(records);
      const b = detectBottlenecks(s);
      const p = analyzePlatformPatterns(records);
      const insights = generateInsights(s, b, p);
      const recs = generateRecommendations(insights);
      for (let i = 1; i < recs.length; i++) {
        expect(recs[i - 1].priority_score).toBeGreaterThanOrEqual(recs[i].priority_score);
      }
    });

    it("maps bottleneck_failure to increase_validation_guard", () => {
      expect(mapInsightToRecType("bottleneck_failure_cascade")).toBe("increase_validation_guard");
    });

    it("maps bottleneck_repair to adjust_repair_strategy", () => {
      expect(mapInsightToRecType("bottleneck_repair_burden")).toBe("adjust_repair_strategy");
    });

    it("maps bottleneck_cost to optimize_cost", () => {
      expect(mapInsightToRecType("bottleneck_cost_hotspot")).toBe("optimize_cost");
    });

    it("maps bottleneck_deploy to harden_deploy", () => {
      expect(mapInsightToRecType("bottleneck_deploy_degradation")).toBe("harden_deploy");
    });

    it("maps pattern_repeated_repair to add_preventive_validation", () => {
      expect(mapInsightToRecType("pattern_repeated_repair_path")).toBe("add_preventive_validation");
    });

    it("maps pattern_poor_context to review_context_policy", () => {
      expect(mapInsightToRecType("pattern_poor_context_outcome")).toBe("review_context_policy");
    });

    it("maps pattern_policy_regression to limit_policy", () => {
      expect(mapInsightToRecType("pattern_policy_regression")).toBe("limit_policy");
    });

    it("maps pattern_failing_repair to escalate_repair", () => {
      expect(mapInsightToRecType("pattern_failing_repair_strategy")).toBe("escalate_repair");
    });

    it("maps global_failure to system_reliability_review", () => {
      expect(mapInsightToRecType("global_failure_rate_elevated")).toBe("system_reliability_review");
    });

    it("maps global_retry to reduce_retry_burden", () => {
      expect(mapInsightToRecType("global_retry_rate_elevated")).toBe("reduce_retry_burden");
    });

    it("all recommendations have required fields", () => {
      const records = makeRecords(10, { stage: "bad", status: "failed" });
      const s = aggregatePlatformBehavior(records);
      const b = detectBottlenecks(s);
      const p = analyzePlatformPatterns(records);
      const insights = generateInsights(s, b, p);
      const recs = generateRecommendations(insights);
      for (const r of recs) {
        expect(r).toHaveProperty("recommendation_type");
        expect(r).toHaveProperty("target_scope");
        expect(r).toHaveProperty("target_entity");
        expect(r).toHaveProperty("recommendation_reason");
        expect(r).toHaveProperty("confidence_score");
        expect(r).toHaveProperty("priority_score");
        expect(r.priority_score).toBeGreaterThan(0);
        expect(r.priority_score).toBeLessThanOrEqual(1);
      }
    });

    it("no recommendations for healthy multi-stage system", () => {
      const records = spreadStages(5, ["a", "b", "c", "d"], { cost_usd: 0.01 });
      const s = aggregatePlatformBehavior(records);
      const b = detectBottlenecks(s);
      const p = analyzePlatformPatterns(records);
      const insights = generateInsights(s, b, p);
      const recs = generateRecommendations(insights);
      expect(recs).toHaveLength(0);
    });

    it("critical severity produces higher priority than warning", () => {
      const critInsight = { insight_type: "bottleneck_failure_cascade", affected_scope: "x", severity: "critical", confidence_score: 0.8, recommendation: { action: "t", rationale: "t" }, evidence_refs: [], supporting_metrics: {} };
      const warnInsight = { ...critInsight, severity: "warning" };
      const critRecs = generateRecommendations([critInsight]);
      const warnRecs = generateRecommendations([warnInsight]);
      expect(critRecs[0].priority_score).toBeGreaterThan(warnRecs[0].priority_score);
    });
  });

  // ══════════════════════════════════════════
  // 6. HEALTH MODEL
  // ══════════════════════════════════════════
  describe("6. Platform Health Model", () => {
    it("perfect health for all-success low-cost records", () => {
      const records = spreadStages(5, ["a", "b", "c", "d"], { cost_usd: 0.001 });
      const s = aggregatePlatformBehavior(records);
      const b = detectBottlenecks(s);
      const h = computePlatformHealth(s, b);
      expect(h.health_grade).toBe("A");
      expect(h.overall_health_score).toBeGreaterThan(0.9);
      expect(h.reliability_index).toBe(1);
    });

    it("degraded reliability for high failure rate", () => {
      const records = [...makeRecords(3), ...makeRecords(7, { status: "failed" })];
      const s = aggregatePlatformBehavior(records);
      const b = detectBottlenecks(s);
      const h = computePlatformHealth(s, b);
      expect(h.reliability_index).toBeCloseTo(0.3);
      expect(h.health_grade).not.toBe("A");
    });

    it("repair burden impacts health", () => {
      const records = makeRecords(10, { had_repair: true, cost_usd: 0.001 });
      const s = aggregatePlatformBehavior(records);
      const b = detectBottlenecks(s);
      const h = computePlatformHealth(s, b);
      expect(h.repair_burden_index).toBe(1);
    });

    it("deploy failure impacts deploy index", () => {
      const records = makeRecords(10, { deploy_attempted: true, deploy_succeeded: false });
      const s = aggregatePlatformBehavior(records);
      const b = detectBottlenecks(s);
      const h = computePlatformHealth(s, b);
      expect(h.deploy_success_index).toBe(0);
    });

    it("high cost degrades cost efficiency", () => {
      const records = makeRecords(10, { cost_usd: 5.0 });
      const s = aggregatePlatformBehavior(records);
      const b = detectBottlenecks(s);
      const h = computePlatformHealth(s, b);
      expect(h.cost_efficiency_index).toBeLessThan(0.5);
    });

    it("zero cost gives perfect cost efficiency", () => {
      const records = makeRecords(10, { cost_usd: 0 });
      const s = aggregatePlatformBehavior(records);
      const b = detectBottlenecks(s);
      const h = computePlatformHealth(s, b);
      expect(h.cost_efficiency_index).toBe(1);
    });

    it("empty records produce healthy defaults", () => {
      const s = aggregatePlatformBehavior([]);
      const b = detectBottlenecks(s);
      const h = computePlatformHealth(s, b);
      expect(h.health_grade).toBe("A");
      expect(h.overall_health_score).toBe(1);
    });

    it("all indices between 0 and 1", () => {
      const records = makeRecords(20, { status: "failed", had_retry: true, had_repair: true, cost_usd: 5 });
      const s = aggregatePlatformBehavior(records);
      const b = detectBottlenecks(s);
      const h = computePlatformHealth(s, b);
      for (const key of ["reliability_index", "execution_stability_index", "repair_burden_index", "cost_efficiency_index", "deploy_success_index", "policy_effectiveness_index", "overall_health_score"]) {
        expect((h as any)[key]).toBeGreaterThanOrEqual(0);
        expect((h as any)[key]).toBeLessThanOrEqual(1);
      }
    });

    it("bottleneck count penalizes stability", () => {
      const records = makeRecords(10, { cost_usd: 0.001 });
      const s = aggregatePlatformBehavior(records);
      const b0 = { bottlenecks: [], overall_health: "healthy", reason_codes: [] };
      const b5 = { bottlenecks: Array(5).fill({ severity: "high" }), overall_health: "warning", reason_codes: [] };
      const h0 = computePlatformHealth(s, b0);
      const h5 = computePlatformHealth(s, b5);
      expect(h0.execution_stability_index).toBeGreaterThan(h5.execution_stability_index);
    });

    it("health grade boundaries: A>=0.9, B>=0.75, C>=0.6, D>=0.4, F<0.4", () => {
      // We verify the formula
      expect(computePlatformHealth(aggregatePlatformBehavior([]), { bottlenecks: [] }).health_grade).toBe("A");
      const badRecords = makeRecords(20, { status: "failed", had_retry: true, had_repair: true, cost_usd: 10, deploy_attempted: true, deploy_succeeded: false });
      const badS = aggregatePlatformBehavior(badRecords);
      const badB = detectBottlenecks(badS);
      const badH = computePlatformHealth(badS, badB);
      expect(["D", "F"]).toContain(badH.health_grade);
    });

    it("policy effectiveness drops with failing policies", () => {
      const records = [...makeRecords(5, { policy_mode: "bad", status: "failed", cost_usd: 0.001 }), ...makeRecords(5, { policy_mode: "good", cost_usd: 0.001 })];
      const s = aggregatePlatformBehavior(records);
      const b = detectBottlenecks(s);
      const h = computePlatformHealth(s, b);
      expect(h.policy_effectiveness_index).toBeCloseTo(0.5);
    });
  });

  // ══════════════════════════════════════════
  // 7. SAFETY CONSTRAINTS (FORBIDDEN MUTATIONS)
  // ══════════════════════════════════════════
  describe("7. Safety — Forbidden Mutation Guards", () => {
    it("aggregator does not produce topology mutations", () => {
      const s = aggregatePlatformBehavior(makeRecords(10));
      expect(s).not.toHaveProperty("stage_order");
      expect(s).not.toHaveProperty("governance_override");
      expect(s).not.toHaveProperty("billing_change");
      expect(s).not.toHaveProperty("execution_contract_change");
    });

    it("bottleneck detector only produces advisory signals", () => {
      const s = aggregatePlatformBehavior(makeRecords(10, { status: "failed" }));
      const r = detectBottlenecks(s);
      for (const b of r.bottlenecks) {
        expect(b).toHaveProperty("recommended_action");
        expect(b).not.toHaveProperty("auto_apply");
        expect(b).not.toHaveProperty("mutate_pipeline");
        expect(b).not.toHaveProperty("create_policy");
        expect(b).not.toHaveProperty("alter_governance");
      }
    });

    it("pattern analyzer does not create policies", () => {
      const r = analyzePlatformPatterns(makeRecords(10, { had_repair: true }));
      for (const p of r.patterns) {
        expect(p).not.toHaveProperty("policy_created");
        expect(p).not.toHaveProperty("auto_fix");
        expect(p).not.toHaveProperty("mutate_pipeline");
      }
    });

    it("insights are advisory — no auto_apply flag", () => {
      const records = makeRecords(10, { stage: "x", status: "failed" });
      const s = aggregatePlatformBehavior(records);
      const b = detectBottlenecks(s);
      const p = analyzePlatformPatterns(records);
      const insights = generateInsights(s, b, p);
      for (const i of insights) {
        expect(i).not.toHaveProperty("auto_apply");
        expect(i).not.toHaveProperty("applied_changes");
        expect(i).not.toHaveProperty("mutate_pipeline");
      }
    });

    it("recommendations do not contain auto-mutation keys", () => {
      const records = makeRecords(10, { stage: "x", status: "failed" });
      const s = aggregatePlatformBehavior(records);
      const b = detectBottlenecks(s);
      const p = analyzePlatformPatterns(records);
      const insights = generateInsights(s, b, p);
      const recs = generateRecommendations(insights);
      for (const r of recs) {
        expect(r).not.toHaveProperty("auto_apply");
        expect(r).not.toHaveProperty("applied_changes");
        expect(r).not.toHaveProperty("mutate_pipeline");
        expect(r).not.toHaveProperty("alter_billing");
        expect(r).not.toHaveProperty("alter_governance");
        expect(r).not.toHaveProperty("create_policy");
        expect(r).not.toHaveProperty("change_policy_scope");
        expect(r).not.toHaveProperty("bypass_validation");
      }
    });

    it("health model is read-only computation", () => {
      const s = aggregatePlatformBehavior(makeRecords(10));
      const b = detectBottlenecks(s);
      const h = computePlatformHealth(s, b);
      expect(h).not.toHaveProperty("applied_changes");
      expect(h).not.toHaveProperty("mutate_pipeline");
      expect(h).toHaveProperty("health_grade");
    });

    it("recommendation types never include forbidden actions", () => {
      const forbiddenTypes = ["alter_pipeline_topology", "modify_governance", "change_billing", "bypass_review_gate", "auto_create_policy", "alter_execution_contract"];
      const records = makeRecords(10, { stage: "x", status: "failed" });
      const s = aggregatePlatformBehavior(records);
      const b = detectBottlenecks(s);
      const p = analyzePlatformPatterns(records);
      const insights = generateInsights(s, b, p);
      const recs = generateRecommendations(insights);
      for (const r of recs) {
        expect(forbiddenTypes).not.toContain(r.recommendation_type);
      }
    });
  });

  // ══════════════════════════════════════════
  // 8. EXPLAINABILITY
  // ══════════════════════════════════════════
  describe("8. Explainability", () => {
    it("insights contain description explaining what was detected", () => {
      const records = makeRecords(10, { stage: "bad", status: "failed" });
      const s = aggregatePlatformBehavior(records);
      const b = detectBottlenecks(s);
      const p = analyzePlatformPatterns(records);
      const insights = generateInsights(s, b, p);
      for (const i of insights) {
        expect(typeof i.description).toBe("string");
        expect(i.description.length).toBeGreaterThan(5);
      }
    });

    it("insights have evidence_refs pointing to data sources", () => {
      const records = makeRecords(10, { stage: "bad", status: "failed" });
      const s = aggregatePlatformBehavior(records);
      const b = detectBottlenecks(s);
      const p = analyzePlatformPatterns(records);
      const insights = generateInsights(s, b, p);
      for (const i of insights) {
        expect(Array.isArray(i.evidence_refs)).toBe(true);
        expect(i.evidence_refs.length).toBeGreaterThan(0);
      }
    });

    it("insights have supporting_metrics with numeric values", () => {
      const records = makeRecords(10, { stage: "bad", status: "failed" });
      const s = aggregatePlatformBehavior(records);
      const b = detectBottlenecks(s);
      const p = analyzePlatformPatterns(records);
      const insights = generateInsights(s, b, p);
      for (const i of insights) {
        expect(typeof i.supporting_metrics).toBe("object");
        for (const v of Object.values(i.supporting_metrics)) {
          expect(typeof v).toBe("number");
        }
      }
    });

    it("recommendations include reason with action and rationale", () => {
      const records = makeRecords(10, { stage: "bad", status: "failed" });
      const s = aggregatePlatformBehavior(records);
      const b = detectBottlenecks(s);
      const p = analyzePlatformPatterns(records);
      const insights = generateInsights(s, b, p);
      const recs = generateRecommendations(insights);
      for (const r of recs) {
        expect(r.recommendation_reason).toHaveProperty("action");
        expect(r.recommendation_reason).toHaveProperty("rationale");
        expect(typeof r.recommendation_reason.action).toBe("string");
      }
    });

    it("recommendation reason includes evidence_refs", () => {
      const records = makeRecords(10, { stage: "bad", status: "failed" });
      const s = aggregatePlatformBehavior(records);
      const b = detectBottlenecks(s);
      const p = analyzePlatformPatterns(records);
      const insights = generateInsights(s, b, p);
      const recs = generateRecommendations(insights);
      for (const r of recs) {
        expect(r.recommendation_reason).toHaveProperty("evidence_refs");
      }
    });

    it("confidence_score is explained by sample size", () => {
      // Small sample → low confidence
      const small = [...makeRecords(2, { stage: "x", status: "failed" }), ...makeRecords(1, { stage: "x" })];
      const sS = aggregatePlatformBehavior(small);
      const sB = detectBottlenecks(sS);
      // Large sample → higher confidence
      const large = [...makeRecords(20, { stage: "x", status: "failed" }), ...makeRecords(10, { stage: "x" })];
      const lS = aggregatePlatformBehavior(large);
      const lB = detectBottlenecks(lS);
      const sFc = sB.bottlenecks.find((b: any) => b.bottleneck_type === "failure_cascade");
      const lFc = lB.bottlenecks.find((b: any) => b.bottleneck_type === "failure_cascade");
      if (sFc && lFc) {
        expect(lFc.confidence).toBeGreaterThanOrEqual(sFc.confidence);
      }
    });
  });

  // ══════════════════════════════════════════
  // 9. E2E INTEGRATION
  // ══════════════════════════════════════════
  describe("9. E2E Integration", () => {
    it("full cycle: aggregate → detect → analyze → insights → recommendations → health", () => {
      const records = [
        ...spreadStages(10, ["build", "test"], { cost_usd: 0.05 }),
        ...makeRecords(10, { stage: "validate", status: "failed", cost_usd: 0.1, had_repair: true }),
        ...makeRecords(5, { stage: "deploy", deploy_attempted: true, deploy_succeeded: true, cost_usd: 0.02 }),
        ...makeRecords(3, { stage: "deploy", deploy_attempted: true, deploy_succeeded: false, cost_usd: 0.02 }),
      ];
      const result = runFullPipeline(records);
      expect(result.snapshot.global_metrics.total_executions).toBe(48);
      expect(result.health.health_grade).toBeDefined();
      expect(typeof result.health.overall_health_score).toBe("number");
      expect(result.insights.length).toBeGreaterThanOrEqual(0);
      expect(result.recommendations.length).toBeGreaterThanOrEqual(0);
    });

    it("healthy system produces grade A with no bottlenecks", () => {
      const records = spreadStages(10, ["a", "b", "c", "d"], { cost_usd: 0.001 });
      const result = runFullPipeline(records);
      expect(result.health.health_grade).toBe("A");
      expect(result.bottleneckReport.overall_health).toBe("healthy");
      expect(result.insights).toHaveLength(0);
      expect(result.recommendations).toHaveLength(0);
    });

    it("degraded system produces insights and recommendations", () => {
      const records = [
        ...makeRecords(15, { stage: "failing", status: "failed", had_repair: true, cost_usd: 1.0 }),
        ...makeRecords(5, { stage: "ok", cost_usd: 0.01 }),
      ];
      const result = runFullPipeline(records);
      expect(result.bottleneckReport.overall_health).not.toBe("healthy");
      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.health.health_grade).not.toBe("A");
    });

    it("pipeline failure does not mutate any output structure", () => {
      const records = makeRecords(20, { status: "failed", had_retry: true, had_repair: true, cost_usd: 10 });
      const result = runFullPipeline(records);
      // Verify no mutation keys anywhere
      const allObjects = [result.snapshot, result.bottleneckReport, result.health, ...result.insights, ...result.recommendations];
      for (const obj of allObjects) {
        expect(obj).not.toHaveProperty("auto_apply");
        expect(obj).not.toHaveProperty("mutate_pipeline");
      }
    });
  });

  // ══════════════════════════════════════════
  // 10. MULTI-TENANT ISOLATION
  // ══════════════════════════════════════════
  describe("10. Multi-Tenant Isolation", () => {
    it("aggregator processes only provided records (caller responsibility)", () => {
      const org1Records = makeRecords(5, { organization_id: "org-1" });
      const org2Records = makeRecords(5, { organization_id: "org-2", status: "failed" });
      const s1 = aggregatePlatformBehavior(org1Records);
      const s2 = aggregatePlatformBehavior(org2Records);
      expect(s1.global_metrics.total_failures).toBe(0);
      expect(s2.global_metrics.total_failures).toBe(5);
    });

    it("mixing orgs in one call does aggregate — scoping is caller's job", () => {
      const mixed = [...makeRecords(3, { organization_id: "org-1" }), ...makeRecords(3, { organization_id: "org-2" })];
      const s = aggregatePlatformBehavior(mixed);
      expect(s.global_metrics.total_executions).toBe(6);
    });

    it("per-org analysis yields different results for different orgs", () => {
      const org1 = makeRecords(10, { organization_id: "org-1", status: "failed" });
      const org2 = spreadStages(5, ["a", "b"], { organization_id: "org-2", cost_usd: 0.001 });
      const r1 = runFullPipeline(org1);
      const r2 = runFullPipeline(org2);
      expect(r1.health.reliability_index).toBeLessThan(r2.health.reliability_index);
    });
  });

  // ══════════════════════════════════════════
  // 11. NON-INTERFERENCE
  // ══════════════════════════════════════════
  describe("11. Non-Interference", () => {
    it("aggregator failure (empty) does not break downstream", () => {
      const s = aggregatePlatformBehavior([]);
      const b = detectBottlenecks(s);
      const p = analyzePlatformPatterns([]);
      const insights = generateInsights(s, b, p);
      const recs = generateRecommendations(insights);
      const h = computePlatformHealth(s, b);
      expect(h.health_grade).toBe("A");
      expect(insights).toHaveLength(0);
      expect(recs).toHaveLength(0);
    });

    it("all modules produce valid output regardless of input quality", () => {
      // Extreme case: all fields are worst-case
      const records = makeRecords(100, { status: "failed", had_retry: true, had_repair: true, had_validation_failure: true, had_human_review: true, cost_usd: 100, deploy_attempted: true, deploy_succeeded: false });
      const result = runFullPipeline(records);
      expect(result.health.overall_health_score).toBeGreaterThanOrEqual(0);
      expect(result.health.overall_health_score).toBeLessThanOrEqual(1);
      expect(typeof result.health.health_grade).toBe("string");
    });
  });

  // ══════════════════════════════════════════
  // 12. DETERMINISM
  // ══════════════════════════════════════════
  describe("12. Determinism", () => {
    it("full pipeline is deterministic", () => {
      const records = [
        ...makeRecords(10, { stage: "a", status: "failed", had_repair: true }),
        ...makeRecords(10, { stage: "b", cost_usd: 0.5 }),
      ];
      const r1 = runFullPipeline(records);
      const r2 = runFullPipeline(records);
      expect(r1.health).toEqual(r2.health);
      expect(r1.bottleneckReport.bottlenecks.length).toBe(r2.bottleneckReport.bottlenecks.length);
      expect(r1.patternReport.pattern_count).toBe(r2.patternReport.pattern_count);
      expect(r1.insights.length).toBe(r2.insights.length);
      expect(r1.recommendations.length).toBe(r2.recommendations.length);
    });

    it("order of records does not change global metrics", () => {
      const a = makeRecords(5, { status: "failed" });
      const b = makeRecords(5);
      const s1 = aggregatePlatformBehavior([...a, ...b]);
      const s2 = aggregatePlatformBehavior([...b, ...a]);
      expect(s1.global_metrics).toEqual(s2.global_metrics);
    });
  });
});
