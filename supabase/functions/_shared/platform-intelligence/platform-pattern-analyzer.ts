// Sprint 30 — Platform Pattern Analyzer
// Detects cross-platform patterns: repeated repair paths, poor context outcomes, policy regressions

import type { ExecutionRecord } from "./platform-behavior-aggregator.ts";

export interface PlatformPattern {
  pattern_type: "repeated_repair_path" | "poor_context_outcome" | "policy_regression" | "ignored_prediction" | "failing_repair_strategy";
  description: string;
  affected_entities: string[];
  frequency: number;
  severity: "low" | "medium" | "high";
  confidence: number;
  evidence_refs: string[];
}

export interface PatternReport {
  patterns: PlatformPattern[];
  pattern_count: number;
  reason_codes: string[];
}

export function analyzePlatformPatterns(records: ExecutionRecord[]): PatternReport {
  const patterns: PlatformPattern[] = [];
  const reasons: string[] = [];

  if (records.length < 5) {
    return { patterns: [], pattern_count: 0, reason_codes: ["insufficient_data"] };
  }

  // 1. Repeated repair paths by stage
  const repairByStage = new Map<string, number>();
  for (const r of records) {
    if (r.had_repair) {
      repairByStage.set(r.stage, (repairByStage.get(r.stage) || 0) + 1);
    }
  }
  for (const [stage, count] of repairByStage) {
    if (count >= 3) {
      patterns.push({
        pattern_type: "repeated_repair_path",
        description: `Stage "${stage}" triggered repair ${count} times`,
        affected_entities: [stage],
        frequency: count,
        severity: count >= 5 ? "high" : "medium",
        confidence: Math.min(1, count / 10),
        evidence_refs: [`stage:${stage}`, `repair_count:${count}`],
      });
      reasons.push(`repeated_repair_${stage}`);
    }
  }

  // 2. Poor context outcomes
  const ctxOutcomes = new Map<string, { total: number; failed: number }>();
  for (const r of records) {
    const ctx = r.context_class || "unknown";
    const e = ctxOutcomes.get(ctx) || { total: 0, failed: 0 };
    e.total++;
    if (r.status === "failed") e.failed++;
    ctxOutcomes.set(ctx, e);
  }
  for (const [ctx, d] of ctxOutcomes) {
    if (d.total >= 3 && d.failed / d.total > 0.4) {
      patterns.push({
        pattern_type: "poor_context_outcome",
        description: `Context "${ctx}" has ${(d.failed / d.total * 100).toFixed(0)}% failure rate across ${d.total} executions`,
        affected_entities: [ctx],
        frequency: d.failed,
        severity: d.failed / d.total > 0.6 ? "high" : "medium",
        confidence: Math.min(1, d.total / 10),
        evidence_refs: [`context:${ctx}`, `failure_rate:${(d.failed / d.total).toFixed(2)}`],
      });
      reasons.push(`poor_context_${ctx}`);
    }
  }

  // 3. Policy regressions
  const policyOutcomes = new Map<string, { total: number; failed: number; cost: number }>();
  for (const r of records) {
    const pm = r.policy_mode || "unknown";
    const e = policyOutcomes.get(pm) || { total: 0, failed: 0, cost: 0 };
    e.total++;
    if (r.status === "failed") e.failed++;
    e.cost += r.cost_usd;
    policyOutcomes.set(pm, e);
  }
  for (const [pm, d] of policyOutcomes) {
    if (d.total >= 3 && d.failed / d.total > 0.35) {
      patterns.push({
        pattern_type: "policy_regression",
        description: `Policy "${pm}" has ${(d.failed / d.total * 100).toFixed(0)}% failure rate`,
        affected_entities: [pm],
        frequency: d.failed,
        severity: d.failed / d.total > 0.5 ? "high" : "medium",
        confidence: Math.min(1, d.total / 10),
        evidence_refs: [`policy:${pm}`, `failure_rate:${(d.failed / d.total).toFixed(2)}`],
      });
      reasons.push(`policy_regression_${pm}`);
    }
  }

  // 4. Failing repair strategies (stages where repair didn't help)
  const repairFailed = new Map<string, number>();
  for (const r of records) {
    if (r.had_repair && r.status === "failed") {
      repairFailed.set(r.stage, (repairFailed.get(r.stage) || 0) + 1);
    }
  }
  for (const [stage, count] of repairFailed) {
    if (count >= 2) {
      patterns.push({
        pattern_type: "failing_repair_strategy",
        description: `Repair failed ${count} times at stage "${stage}"`,
        affected_entities: [stage],
        frequency: count,
        severity: count >= 4 ? "high" : "medium",
        confidence: Math.min(1, count / 5),
        evidence_refs: [`stage:${stage}`, `failed_repairs:${count}`],
      });
      reasons.push(`failing_repair_${stage}`);
    }
  }

  return { patterns, pattern_count: patterns.length, reason_codes: reasons };
}
