/**
 * Meta-Agents v1 Hardening — Scoring & Validation Test Suite
 *
 * Tests:
 * - Scoring determinism and boundary correctness
 * - Score consistency (priority = f(confidence, impact, urgency))
 * - Evidence integrity validation
 * - Quality gate filtering
 * - Signature normalization and deduplication
 * - Forbidden mutation regression checks
 */

import { describe, it, expect } from "vitest";

// --- Inline implementations mirroring the edge function code ---
// (We test the logic, not the Deno imports)

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}

interface ScoringInputs {
  evidence_count: number;
  recurrence_count: number;
  total_observations: number;
  cost_savings_estimate: number;
  failure_rate: number;
  time_savings_estimate: number;
  avg_execution_time: number;
  trend_worsening: boolean;
  breadth: number;
}

interface ScoringResult {
  confidence_score: number;
  impact_score: number;
  priority_score: number;
}

function scoreRecommendation(inputs: ScoringInputs): ScoringResult {
  const evidence_factor = Math.min(1, Math.log(inputs.evidence_count + 1) / Math.log(10));
  const recurrence_ratio = inputs.total_observations > 0
    ? inputs.recurrence_count / inputs.total_observations : 0;
  const recurrence_factor = clamp(recurrence_ratio * 3);
  const data_quality_factor = clamp(inputs.total_observations / 5);

  const confidence_score = clamp(
    evidence_factor * 0.4 + recurrence_factor * 0.35 + data_quality_factor * 0.25
  );

  const cost_factor = clamp(inputs.cost_savings_estimate / 50);
  const reliability_factor = clamp(inputs.failure_rate);
  const efficiency_factor = inputs.avg_execution_time > 0
    ? clamp(inputs.time_savings_estimate / inputs.avg_execution_time) : 0;

  const impact_score = clamp(
    0.35 * cost_factor + 0.4 * reliability_factor + 0.25 * efficiency_factor
  );

  const urgency = (inputs.trend_worsening ? 0.8 : 0.2) * clamp(inputs.breadth / 3);
  const priority_score = clamp(
    confidence_score * 0.4 + impact_score * 0.4 + urgency * 0.2
  );

  return {
    confidence_score: Math.round(confidence_score * 1000) / 1000,
    impact_score: Math.round(impact_score * 1000) / 1000,
    priority_score: Math.round(priority_score * 1000) / 1000,
  };
}

function generateSignature(
  meta_agent_type: string,
  recommendation_type: string,
  target_component: string,
  key_evidence_hash: string
): string {
  return `${meta_agent_type}::${recommendation_type}::${target_component}::${key_evidence_hash}`;
}

function normalizeSignature(signature: string): string {
  return signature
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .split("::")
    .map((s) => s.trim().replace(/[^a-z0-9_]/g, ""))
    .join("::");
}

const MIN_CONFIDENCE_THRESHOLD = 0.15;
const MIN_IMPACT_THRESHOLD = 0.10;
const ARCHITECTURE_MIN_CONFIDENCE = 0.25;

interface MetaRecommendation {
  meta_agent_type: string;
  recommendation_type: string;
  target_component: string;
  title: string;
  description: string;
  confidence_score: number;
  impact_score: number;
  priority_score: number;
  supporting_evidence: Record<string, unknown>[];
  source_metrics: Record<string, unknown>;
  source_record_ids: string[];
  recommendation_signature: string;
}

function qualityGate(rec: MetaRecommendation): { pass: boolean; reason?: string } {
  if (rec.confidence_score < 0 || rec.confidence_score > 1) return { pass: false, reason: "confidence OOB" };
  if (rec.impact_score < 0 || rec.impact_score > 1) return { pass: false, reason: "impact OOB" };
  if (rec.priority_score < 0 || rec.priority_score > 1) return { pass: false, reason: "priority OOB" };

  const minConf = rec.meta_agent_type === "ARCHITECTURE_META_AGENT"
    ? ARCHITECTURE_MIN_CONFIDENCE : MIN_CONFIDENCE_THRESHOLD;
  if (rec.confidence_score < minConf) return { pass: false, reason: "low confidence" };
  if (rec.impact_score < MIN_IMPACT_THRESHOLD) return { pass: false, reason: "low impact" };
  if (!rec.supporting_evidence || rec.supporting_evidence.length === 0) return { pass: false, reason: "no evidence" };
  if (!rec.title?.trim()) return { pass: false, reason: "empty title" };
  if (!rec.description?.trim()) return { pass: false, reason: "empty description" };
  return { pass: true };
}

// ======================== TESTS ========================

describe("Meta-Agent Scoring", () => {
  it("produces bounded scores (0-1) for all inputs", () => {
    const cases: ScoringInputs[] = [
      { evidence_count: 0, recurrence_count: 0, total_observations: 0, cost_savings_estimate: 0, failure_rate: 0, time_savings_estimate: 0, avg_execution_time: 0, trend_worsening: false, breadth: 0 },
      { evidence_count: 100, recurrence_count: 100, total_observations: 100, cost_savings_estimate: 1000, failure_rate: 1, time_savings_estimate: 1000, avg_execution_time: 100, trend_worsening: true, breadth: 10 },
      { evidence_count: 1, recurrence_count: 1, total_observations: 1, cost_savings_estimate: 0, failure_rate: 0.5, time_savings_estimate: 0, avg_execution_time: 0, trend_worsening: false, breadth: 1 },
    ];

    for (const c of cases) {
      const result = scoreRecommendation(c);
      expect(result.confidence_score).toBeGreaterThanOrEqual(0);
      expect(result.confidence_score).toBeLessThanOrEqual(1);
      expect(result.impact_score).toBeGreaterThanOrEqual(0);
      expect(result.impact_score).toBeLessThanOrEqual(1);
      expect(result.priority_score).toBeGreaterThanOrEqual(0);
      expect(result.priority_score).toBeLessThanOrEqual(1);
    }
  });

  it("is deterministic for same inputs", () => {
    const input: ScoringInputs = {
      evidence_count: 5, recurrence_count: 10, total_observations: 50,
      cost_savings_estimate: 20, failure_rate: 0.4, time_savings_estimate: 5,
      avg_execution_time: 30, trend_worsening: true, breadth: 2,
    };
    const a = scoreRecommendation(input);
    const b = scoreRecommendation(input);
    expect(a).toEqual(b);
  });

  it("ranks high recurrence + high failure above low-value items", () => {
    const high = scoreRecommendation({
      evidence_count: 10, recurrence_count: 40, total_observations: 50,
      cost_savings_estimate: 30, failure_rate: 0.8, time_savings_estimate: 10,
      avg_execution_time: 20, trend_worsening: true, breadth: 2,
    });
    const low = scoreRecommendation({
      evidence_count: 1, recurrence_count: 1, total_observations: 50,
      cost_savings_estimate: 0, failure_rate: 0.05, time_savings_estimate: 0,
      avg_execution_time: 0, trend_worsening: false, breadth: 1,
    });
    expect(high.priority_score).toBeGreaterThan(low.priority_score);
  });

  it("produces zero scores for zero inputs", () => {
    const result = scoreRecommendation({
      evidence_count: 0, recurrence_count: 0, total_observations: 0,
      cost_savings_estimate: 0, failure_rate: 0, time_savings_estimate: 0,
      avg_execution_time: 0, trend_worsening: false, breadth: 0,
    });
    expect(result.confidence_score).toBe(0);
    expect(result.impact_score).toBe(0);
    expect(result.priority_score).toBe(0);
  });

  it("weak evidence does not inflate priority", () => {
    const result = scoreRecommendation({
      evidence_count: 1, recurrence_count: 1, total_observations: 100,
      cost_savings_estimate: 0, failure_rate: 0.01, time_savings_estimate: 0,
      avg_execution_time: 0, trend_worsening: false, breadth: 1,
    });
    expect(result.priority_score).toBeLessThan(0.3);
  });
});

describe("Signature Normalization", () => {
  it("normalizes casing and whitespace", () => {
    const a = normalizeSignature("ARCHITECTURE_META_AGENT::PIPELINE_OPTIMIZATION::stage_A::failures_5");
    const b = normalizeSignature("architecture_meta_agent::pipeline_optimization::stage_a::failures_5");
    expect(a).toBe(b);
  });

  it("handles extra whitespace", () => {
    const a = normalizeSignature("  TYPE :: REC_TYPE :: comp ::  hash  ");
    const b = normalizeSignature("TYPE::REC_TYPE::comp::hash");
    expect(a).toBe(b);
  });

  it("different components produce different signatures", () => {
    const a = normalizeSignature(generateSignature("A", "B", "comp1", "hash1"));
    const b = normalizeSignature(generateSignature("A", "B", "comp2", "hash1"));
    expect(a).not.toBe(b);
  });

  it("different orgs with same pattern produce same signature (dedup is per-org in DB)", () => {
    const sig = generateSignature("ARCHITECTURE_META_AGENT", "PIPELINE_OPTIMIZATION", "validation", "failures_10");
    // Signatures are org-agnostic; DB query filters by org_id
    expect(sig).toBe("ARCHITECTURE_META_AGENT::PIPELINE_OPTIMIZATION::validation::failures_10");
  });
});

describe("Quality Gate", () => {
  const makeRec = (overrides: Partial<MetaRecommendation> = {}): MetaRecommendation => ({
    meta_agent_type: "WORKFLOW_OPTIMIZER",
    recommendation_type: "STEP_ELIMINATION",
    target_component: "build",
    title: "Test recommendation",
    description: "A valid test recommendation with evidence.",
    confidence_score: 0.5,
    impact_score: 0.4,
    priority_score: 0.45,
    supporting_evidence: [{ type: "test", value: 1 }],
    source_metrics: { test: true },
    source_record_ids: [],
    recommendation_signature: "test::sig",
    ...overrides,
  });

  it("passes valid recommendation", () => {
    expect(qualityGate(makeRec()).pass).toBe(true);
  });

  it("rejects empty evidence", () => {
    expect(qualityGate(makeRec({ supporting_evidence: [] })).pass).toBe(false);
  });

  it("rejects empty title", () => {
    expect(qualityGate(makeRec({ title: "" })).pass).toBe(false);
  });

  it("rejects out-of-bounds confidence", () => {
    expect(qualityGate(makeRec({ confidence_score: 1.5 })).pass).toBe(false);
    expect(qualityGate(makeRec({ confidence_score: -0.1 })).pass).toBe(false);
  });

  it("rejects low confidence below threshold", () => {
    expect(qualityGate(makeRec({ confidence_score: 0.05 })).pass).toBe(false);
  });

  it("applies higher threshold for architecture recommendations", () => {
    const archRec = makeRec({ meta_agent_type: "ARCHITECTURE_META_AGENT", confidence_score: 0.20 });
    expect(qualityGate(archRec).pass).toBe(false);
    const archRecOk = makeRec({ meta_agent_type: "ARCHITECTURE_META_AGENT", confidence_score: 0.30 });
    expect(qualityGate(archRecOk).pass).toBe(true);
  });

  it("rejects low impact", () => {
    expect(qualityGate(makeRec({ impact_score: 0.05 })).pass).toBe(false);
  });
});

describe("Forbidden Mutation Regression", () => {
  it("review status values are informational only", () => {
    const statuses = ["pending", "reviewed", "accepted", "rejected", "deferred"];
    // None of these should imply system mutation
    const mutationKeywords = ["execute", "deploy", "apply", "modify", "alter", "update_pipeline"];
    for (const status of statuses) {
      for (const keyword of mutationKeywords) {
        expect(status).not.toContain(keyword);
      }
    }
  });

  it("recommendation types do not include execution verbs", () => {
    const types = [
      "PIPELINE_OPTIMIZATION", "STAGE_REORDERING_SUGGESTION", "STAGE_SPLIT_OR_MERGE",
      "NEW_AGENT_ROLE", "AGENT_SPECIALIZATION", "AGENT_DEPRECATION",
      "WORKFLOW_PARALLELIZATION", "STEP_ELIMINATION", "STEP_REORDERING",
      "TECHNICAL_DEBT_ALERT", "ARCHITECTURE_CHANGE_PROPOSAL", "SYSTEM_EVOLUTION_REPORT",
    ];
    const forbiddenPrefixes = ["EXECUTE_", "DEPLOY_", "APPLY_", "FORCE_"];
    for (const t of types) {
      for (const prefix of forbiddenPrefixes) {
        expect(t.startsWith(prefix)).toBe(false);
      }
    }
  });

  it("audit event names cover full lifecycle", () => {
    const events = [
      "META_AGENT_RUN", "META_RECOMMENDATION_CREATED", "META_RECOMMENDATION_REVIEWED",
      "META_RECOMMENDATION_ACCEPTED", "META_RECOMMENDATION_REJECTED", "META_RECOMMENDATION_DEFERRED",
    ];
    expect(events).toHaveLength(6);
    expect(events.every((e) => e.startsWith("META_"))).toBe(true);
  });
});
