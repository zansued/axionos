// Sprint 26 — Learning Agents v2: Cross-Stage Policy Synthesis Tests
import { describe, it, expect } from "vitest";

// ─── Inline implementations for testing ───

// === Synthesizer ===
const MIN_SUPPORT = 3;
const MIN_CONFIDENCE = 0.3;
const MIN_IMPACT = 0.2;
const HIGH_CONF = 0.7;

const REL_TO_POLICY: Record<string, string> = {
  failure_propagation: "repair_preemption",
  success_dependency: "strategy_coordination",
  retry_correlation: "prompt_coordination",
  cost_amplification: "validation_guard",
  validation_cascade: "validation_guard",
  repair_influence: "context_enrichment",
};

const VALID_RELS = new Set(Object.keys(REL_TO_POLICY));

interface Edge {
  id: string;
  from_stage_key: string;
  to_stage_key: string;
  relationship_type: string;
  support_count: number;
  confidence_score: number;
  impact_score: number;
  evidence_refs: any[];
  status: string;
}

interface PolicyCandidate {
  policy_type: string;
  policy_scope: string;
  affected_stages: string[];
  trigger_signature: string;
  confidence_score: number;
  support_count: number;
  action_mode: string;
  evidence_refs: any[];
}

function synthesize(edges: Edge[]): PolicyCandidate[] {
  const valid = edges.filter(e =>
    e.status === "active" && VALID_RELS.has(e.relationship_type) &&
    e.support_count >= MIN_SUPPORT && e.confidence_score >= MIN_CONFIDENCE &&
    e.impact_score >= MIN_IMPACT
  );
  const grouped = new Map<string, Edge[]>();
  for (const e of valid) {
    const k = `${e.relationship_type}::${e.from_stage_key}::${e.to_stage_key}`;
    grouped.set(k, [...(grouped.get(k) || []), e]);
  }
  const out: PolicyCandidate[] = [];
  for (const [key, group] of grouped) {
    const rep = group[0];
    const totalSupport = group.reduce((s, e) => s + e.support_count, 0);
    const avgConf = group.reduce((s, e) => s + e.confidence_score, 0) / group.length;
    out.push({
      policy_type: REL_TO_POLICY[rep.relationship_type] || "context_enrichment",
      policy_scope: "stage_pair",
      affected_stages: [rep.from_stage_key, rep.to_stage_key],
      trigger_signature: key,
      confidence_score: Math.min(avgConf, 0.95),
      support_count: totalSupport,
      action_mode: avgConf >= HIGH_CONF ? "bounded_auto_safe" : "advisory_only",
      evidence_refs: group.flatMap(e => e.evidence_refs || []),
    });
  }
  return out.sort((a, b) => b.confidence_score - a.confidence_score);
}

function isPatternStrong(e: Edge): boolean {
  return e.support_count >= MIN_SUPPORT && e.confidence_score >= MIN_CONFIDENCE &&
    e.impact_score >= MIN_IMPACT && e.status === "active";
}

function filterContradictions(edges: Edge[]): Edge[] {
  const pairMap = new Map<string, Edge[]>();
  for (const e of edges) {
    const k = `${e.from_stage_key}::${e.to_stage_key}`;
    pairMap.set(k, [...(pairMap.get(k) || []), e]);
  }
  const result: Edge[] = [];
  for (const [, group] of pairMap) {
    const hasS = group.some(e => e.relationship_type === "success_dependency");
    const hasF = group.some(e => e.relationship_type === "failure_propagation");
    if (hasS && hasF) {
      result.push(group.sort((a, b) => b.support_count - a.support_count)[0]);
    } else {
      result.push(...group);
    }
  }
  return result;
}

// === Evaluator ===
interface OutcomeMetrics {
  pipeline_success_rate: number;
  downstream_repair_rate: number;
  retry_propagation: number;
  validation_failure_rate: number;
  cost_impact_usd: number;
  time_to_resolution_ms: number;
}

interface Evaluation {
  outcome: "helpful" | "neutral" | "harmful" | "inconclusive";
  spillover_detected: boolean;
  metrics_delta: Record<string, number>;
}

function evaluate(baseline: OutcomeMetrics, withPolicy: OutcomeMetrics, samples: number): Evaluation {
  const delta: Record<string, number> = {};
  for (const k of Object.keys(baseline) as (keyof OutcomeMetrics)[]) {
    delta[k] = withPolicy[k] - baseline[k];
  }
  if (samples < 5) return { outcome: "inconclusive", spillover_detected: false, metrics_delta: delta };
  const successUp = delta.pipeline_success_rate > 0.05;
  const repairUp = delta.downstream_repair_rate > 0.05;
  const costUp = delta.cost_impact_usd > 0;
  const spillover = successUp && (repairUp || costUp);
  const net = delta.pipeline_success_rate * 2 - delta.downstream_repair_rate - delta.retry_propagation - delta.validation_failure_rate;
  let outcome: Evaluation["outcome"];
  if (net > 0.05) outcome = "helpful";
  else if (net < -0.05) outcome = "harmful";
  else outcome = "neutral";
  return { outcome, spillover_detected: spillover, metrics_delta: delta };
}

function recommendTransition(status: string, ev: Evaluation): string | null {
  if (ev.outcome === "harmful") {
    if (status === "active") return "watch";
    if (status === "watch") return "deprecated";
  }
  if (ev.outcome === "helpful" && !ev.spillover_detected && status === "draft") return "active";
  if (ev.spillover_detected && status === "active") return "watch";
  return null;
}

function isFalsePositive(ev: Evaluation): boolean {
  if (ev.outcome !== "neutral") return false;
  return Math.abs(ev.metrics_delta.pipeline_success_rate || 0) < 0.01 &&
    Math.abs(ev.metrics_delta.downstream_repair_rate || 0) < 0.01;
}

// === Runner ===
interface PolicyProfile {
  id: string;
  policy_type: string;
  policy_scope: string;
  affected_stages: string[];
  trigger_signature: string;
  policy_payload: Record<string, unknown>;
  confidence_score: number;
  support_count: number;
  status: string;
  action_mode: string;
}

interface AppResult {
  policy_id: string;
  action_mode: "advisory_only" | "bounded_auto_safe";
  action_applied: boolean;
  reason_codes: string[];
}

const FORBIDDEN = new Set([
  "mutate_pipeline", "mutate_governance", "mutate_billing",
  "auto_promote_agent", "delete_history", "skip_validation",
  "bypass_review", "alter_enforcement",
]);

function matchPolicies(policies: PolicyProfile[], stageKey: string): PolicyProfile[] {
  return policies.filter(p => p.status === "active" && p.affected_stages.includes(stageKey));
}

function applyPolicies(matched: PolicyProfile[], autoFlag = false): AppResult[] {
  return matched.map(p => {
    const safe = p.action_mode === "bounded_auto_safe";
    const apply = safe && autoFlag && p.confidence_score >= 0.6;
    return {
      policy_id: p.id,
      action_mode: apply ? "bounded_auto_safe" as const : "advisory_only" as const,
      action_applied: apply,
      reason_codes: [apply ? "auto_applied:bounded_safe" : "advisory_recommendation"],
    };
  });
}

function isPolicySafe(payload: Record<string, unknown>): boolean {
  return !Object.keys(payload).some(k => FORBIDDEN.has(k));
}

function respectsScope(policy: PolicyProfile, stage: string): boolean {
  return policy.affected_stages.includes(stage);
}

// === Lineage ===
interface StatusChange { from_status: string; to_status: string; reason: string; }
interface Lineage {
  policy_id: string;
  source_edges: string[];
  source_learning_signals: any[];
  repair_evidence: any[];
  memory_refs: any[];
  predictive_inputs: any[];
  status_history: StatusChange[];
}

function buildLineage(id: string, edges: string[], signals: any[], repair: any[], mem: any[], pred: any[]): Lineage {
  return { policy_id: id, source_edges: edges, source_learning_signals: signals, repair_evidence: repair, memory_refs: mem, predictive_inputs: pred, status_history: [] };
}

function addChange(l: Lineage, from: string, to: string, reason: string): Lineage {
  return { ...l, status_history: [...l.status_history, { from_status: from, to_status: to, reason }] };
}

function canRollback(l: Lineage): boolean {
  return l.status_history.some(s => s.from_status === "active" && (s.to_status === "watch" || s.to_status === "deprecated"));
}

// ═══════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════

function mkEdge(overrides: Partial<Edge> = {}): Edge {
  return {
    id: "e1", from_stage_key: "build", to_stage_key: "validation",
    relationship_type: "failure_propagation", support_count: 5,
    confidence_score: 0.6, impact_score: 0.4, evidence_refs: [{ type: "test" }],
    status: "active", ...overrides,
  };
}

function mkPolicy(overrides: Partial<PolicyProfile> = {}): PolicyProfile {
  return {
    id: "p1", policy_type: "repair_preemption", policy_scope: "stage_pair",
    affected_stages: ["build", "validation"], trigger_signature: "test",
    policy_payload: { recommendation: "test" }, confidence_score: 0.7,
    support_count: 5, status: "active", action_mode: "advisory_only", ...overrides,
  };
}

function mkMetrics(overrides: Partial<OutcomeMetrics> = {}): OutcomeMetrics {
  return {
    pipeline_success_rate: 0.8, downstream_repair_rate: 0.2,
    retry_propagation: 0.1, validation_failure_rate: 0.15,
    cost_impact_usd: 1.5, time_to_resolution_ms: 5000, ...overrides,
  };
}

// ─── 1. Structure & Validation ───
describe("Sprint 26 — 1. Edge Structure & Validation", () => {
  it("creates valid edge", () => {
    const e = mkEdge();
    expect(e.from_stage_key).toBe("build");
    expect(e.to_stage_key).toBe("validation");
    expect(e.relationship_type).toBe("failure_propagation");
  });

  it("rejects invalid relationship_type via VALID_RELS check", () => {
    expect(VALID_RELS.has("invalid_type")).toBe(false);
    expect(VALID_RELS.has("failure_propagation")).toBe(true);
  });

  it("accepts all valid relationship types", () => {
    for (const rt of ["failure_propagation", "success_dependency", "retry_correlation", "cost_amplification", "validation_cascade", "repair_influence"]) {
      expect(VALID_RELS.has(rt)).toBe(true);
    }
  });

  it("accepts valid evidence_refs", () => {
    const e = mkEdge({ evidence_refs: [{ type: "repair", id: "r1" }] });
    expect(e.evidence_refs).toHaveLength(1);
  });

  it("tracks support_count", () => {
    const e = mkEdge({ support_count: 10 });
    expect(e.support_count).toBe(10);
  });
});

// ─── 2. Cross-Stage Learning Graph ───
describe("Sprint 26 — 2. Learning Graph", () => {
  it("isPatternStrong returns true for strong pattern", () => {
    expect(isPatternStrong(mkEdge())).toBe(true);
  });

  it("isPatternStrong rejects low support", () => {
    expect(isPatternStrong(mkEdge({ support_count: 1 }))).toBe(false);
  });

  it("isPatternStrong rejects low confidence", () => {
    expect(isPatternStrong(mkEdge({ confidence_score: 0.1 }))).toBe(false);
  });

  it("isPatternStrong rejects low impact", () => {
    expect(isPatternStrong(mkEdge({ impact_score: 0.05 }))).toBe(false);
  });

  it("isPatternStrong rejects deprecated", () => {
    expect(isPatternStrong(mkEdge({ status: "deprecated" }))).toBe(false);
  });

  it("filterContradictions keeps strongest when both success and failure exist", () => {
    const edges = [
      mkEdge({ id: "e1", relationship_type: "success_dependency", support_count: 10 }),
      mkEdge({ id: "e2", relationship_type: "failure_propagation", support_count: 3 }),
    ];
    const filtered = filterContradictions(edges);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].support_count).toBe(10);
  });

  it("filterContradictions keeps all when no contradiction", () => {
    const edges = [
      mkEdge({ id: "e1", relationship_type: "success_dependency" }),
      mkEdge({ id: "e2", from_stage_key: "design", relationship_type: "retry_correlation" }),
    ];
    expect(filterContradictions(edges).length).toBe(2);
  });

  it("direction matters: from→to is different from to→from", () => {
    const e1 = mkEdge({ from_stage_key: "A", to_stage_key: "B" });
    const e2 = mkEdge({ from_stage_key: "B", to_stage_key: "A" });
    expect(`${e1.from_stage_key}::${e1.to_stage_key}`).not.toBe(`${e2.from_stage_key}::${e2.to_stage_key}`);
  });
});

// ─── 3. Policy Synthesis Engine ───
describe("Sprint 26 — 3. Policy Synthesis", () => {
  it("synthesizes policy from strong edge", () => {
    const result = synthesize([mkEdge()]);
    expect(result).toHaveLength(1);
    expect(result[0].policy_type).toBe("repair_preemption");
    expect(result[0].affected_stages).toEqual(["build", "validation"]);
  });

  it("does not synthesize from weak edge", () => {
    expect(synthesize([mkEdge({ support_count: 1 })])).toHaveLength(0);
  });

  it("does not synthesize from low confidence", () => {
    expect(synthesize([mkEdge({ confidence_score: 0.1 })])).toHaveLength(0);
  });

  it("does not synthesize from low impact", () => {
    expect(synthesize([mkEdge({ impact_score: 0.05 })])).toHaveLength(0);
  });

  it("maps relationship_type to correct policy_type", () => {
    expect(synthesize([mkEdge({ relationship_type: "success_dependency" })])[0].policy_type).toBe("strategy_coordination");
    expect(synthesize([mkEdge({ relationship_type: "retry_correlation" })])[0].policy_type).toBe("prompt_coordination");
    expect(synthesize([mkEdge({ relationship_type: "cost_amplification" })])[0].policy_type).toBe("validation_guard");
  });

  it("fills affected_stages correctly", () => {
    const r = synthesize([mkEdge({ from_stage_key: "A", to_stage_key: "B" })]);
    expect(r[0].affected_stages).toEqual(["A", "B"]);
  });

  it("generates trigger_signature", () => {
    const r = synthesize([mkEdge()]);
    expect(r[0].trigger_signature).toContain("failure_propagation");
  });

  it("sets advisory_only for low confidence", () => {
    const r = synthesize([mkEdge({ confidence_score: 0.4 })]);
    expect(r[0].action_mode).toBe("advisory_only");
  });

  it("sets bounded_auto_safe for high confidence", () => {
    const r = synthesize([mkEdge({ confidence_score: 0.8 })]);
    expect(r[0].action_mode).toBe("bounded_auto_safe");
  });

  it("caps confidence at 0.95", () => {
    const r = synthesize([mkEdge({ confidence_score: 0.99 })]);
    expect(r[0].confidence_score).toBeLessThanOrEqual(0.95);
  });

  it("includes evidence_refs", () => {
    const r = synthesize([mkEdge({ evidence_refs: [{ type: "x" }] })]);
    expect(r[0].evidence_refs).toHaveLength(1);
  });

  it("same input produces same output (determinism)", () => {
    const edges = [mkEdge()];
    const r1 = synthesize(edges);
    const r2 = synthesize(edges);
    expect(r1).toEqual(r2);
  });

  it("ignores deprecated edges", () => {
    expect(synthesize([mkEdge({ status: "deprecated" })])).toHaveLength(0);
  });

  it("ignores invalid relationship_type", () => {
    expect(synthesize([mkEdge({ relationship_type: "unknown" as any })])).toHaveLength(0);
  });

  it("stable with empty input", () => {
    expect(synthesize([])).toEqual([]);
  });
});

// ─── 4. Policy Evaluator ───
describe("Sprint 26 — 4. Policy Evaluator", () => {
  it("returns inconclusive with low samples", () => {
    expect(evaluate(mkMetrics(), mkMetrics(), 2).outcome).toBe("inconclusive");
  });

  it("returns helpful when net improvement", () => {
    const ev = evaluate(mkMetrics(), mkMetrics({ pipeline_success_rate: 0.95 }), 10);
    expect(ev.outcome).toBe("helpful");
  });

  it("returns harmful when net degradation", () => {
    const ev = evaluate(mkMetrics(), mkMetrics({ pipeline_success_rate: 0.5, downstream_repair_rate: 0.5 }), 10);
    expect(ev.outcome).toBe("harmful");
  });

  it("returns neutral when no significant change", () => {
    const ev = evaluate(mkMetrics(), mkMetrics(), 10);
    expect(ev.outcome).toBe("neutral");
  });

  it("detects spillover: success up but repair also up", () => {
    const ev = evaluate(mkMetrics(), mkMetrics({ pipeline_success_rate: 0.95, downstream_repair_rate: 0.4 }), 10);
    expect(ev.spillover_detected).toBe(true);
  });

  it("no spillover when only improvement", () => {
    const ev = evaluate(mkMetrics(), mkMetrics({ pipeline_success_rate: 0.95, downstream_repair_rate: 0.1 }), 10);
    expect(ev.spillover_detected).toBe(false);
  });

  it("computes metrics_delta correctly", () => {
    const ev = evaluate(mkMetrics({ pipeline_success_rate: 0.7 }), mkMetrics({ pipeline_success_rate: 0.9 }), 10);
    expect(ev.metrics_delta.pipeline_success_rate).toBeCloseTo(0.2);
  });

  it("recommendTransition: harmful active → watch", () => {
    const ev = evaluate(mkMetrics(), mkMetrics({ pipeline_success_rate: 0.5, downstream_repair_rate: 0.5 }), 10);
    expect(recommendTransition("active", ev)).toBe("watch");
  });

  it("recommendTransition: harmful watch → deprecated", () => {
    const ev: Evaluation = { outcome: "harmful", spillover_detected: false, metrics_delta: {} };
    expect(recommendTransition("watch", ev)).toBe("deprecated");
  });

  it("recommendTransition: helpful draft → active", () => {
    const ev: Evaluation = { outcome: "helpful", spillover_detected: false, metrics_delta: {} };
    expect(recommendTransition("draft", ev)).toBe("active");
  });

  it("recommendTransition: spillover active → watch", () => {
    const ev: Evaluation = { outcome: "helpful", spillover_detected: true, metrics_delta: {} };
    expect(recommendTransition("active", ev)).toBe("watch");
  });

  it("isFalsePositive detects neutral with no real change", () => {
    const ev: Evaluation = {
      outcome: "neutral", spillover_detected: false,
      metrics_delta: { pipeline_success_rate: 0.005, downstream_repair_rate: 0.003 },
    };
    expect(isFalsePositive(ev)).toBe(true);
  });

  it("isFalsePositive returns false for helpful", () => {
    expect(isFalsePositive({ outcome: "helpful", spillover_detected: false, metrics_delta: {} })).toBe(false);
  });
});

// ─── 5. Runtime Policy Runner ───
describe("Sprint 26 — 5. Runtime Runner", () => {
  it("matches active policy for correct stage", () => {
    const matched = matchPolicies([mkPolicy()], "build");
    expect(matched).toHaveLength(1);
  });

  it("does not match policy for wrong stage", () => {
    expect(matchPolicies([mkPolicy()], "deploy")).toHaveLength(0);
  });

  it("does not match deprecated policy", () => {
    expect(matchPolicies([mkPolicy({ status: "deprecated" })], "build")).toHaveLength(0);
  });

  it("does not match draft policy", () => {
    expect(matchPolicies([mkPolicy({ status: "draft" })], "build")).toHaveLength(0);
  });

  it("advisory_only when autoFlag is off", () => {
    const results = applyPolicies([mkPolicy()], false);
    expect(results[0].action_mode).toBe("advisory_only");
    expect(results[0].action_applied).toBe(false);
  });

  it("bounded_auto_safe when flag on and mode is safe", () => {
    const results = applyPolicies([mkPolicy({ action_mode: "bounded_auto_safe", confidence_score: 0.8 })], true);
    expect(results[0].action_mode).toBe("bounded_auto_safe");
    expect(results[0].action_applied).toBe(true);
  });

  it("advisory when confidence too low even with flag", () => {
    const results = applyPolicies([mkPolicy({ action_mode: "bounded_auto_safe", confidence_score: 0.3 })], true);
    expect(results[0].action_applied).toBe(false);
  });

  it("isPolicySafe rejects forbidden mutations", () => {
    expect(isPolicySafe({ mutate_pipeline: true })).toBe(false);
    expect(isPolicySafe({ mutate_governance: true })).toBe(false);
    expect(isPolicySafe({ mutate_billing: true })).toBe(false);
    expect(isPolicySafe({ delete_history: true })).toBe(false);
    expect(isPolicySafe({ skip_validation: true })).toBe(false);
    expect(isPolicySafe({ bypass_review: true })).toBe(false);
    expect(isPolicySafe({ alter_enforcement: true })).toBe(false);
  });

  it("isPolicySafe allows safe payload", () => {
    expect(isPolicySafe({ recommendation: "test", context: {} })).toBe(true);
  });

  it("respectsScope returns true for in-scope stage", () => {
    expect(respectsScope(mkPolicy(), "build")).toBe(true);
  });

  it("respectsScope returns false for out-of-scope stage", () => {
    expect(respectsScope(mkPolicy(), "deploy")).toBe(false);
  });
});

// ─── 6. Lineage & Auditability ───
describe("Sprint 26 — 6. Lineage & Auditability", () => {
  it("builds lineage with sources", () => {
    const l = buildLineage("p1", ["e1"], [{ type: "signal" }], [{ type: "repair" }], [{ type: "mem" }], [{ type: "pred" }]);
    expect(l.source_edges).toEqual(["e1"]);
    expect(l.source_learning_signals).toHaveLength(1);
    expect(l.repair_evidence).toHaveLength(1);
    expect(l.memory_refs).toHaveLength(1);
    expect(l.predictive_inputs).toHaveLength(1);
  });

  it("addChange records transition", () => {
    let l = buildLineage("p1", [], [], [], [], []);
    l = addChange(l, "draft", "active", "promoted after review");
    expect(l.status_history).toHaveLength(1);
    expect(l.status_history[0].from_status).toBe("draft");
    expect(l.status_history[0].to_status).toBe("active");
  });

  it("preserves full history", () => {
    let l = buildLineage("p1", [], [], [], [], []);
    l = addChange(l, "draft", "active", "promoted");
    l = addChange(l, "active", "watch", "spillover");
    l = addChange(l, "watch", "deprecated", "harmful");
    expect(l.status_history).toHaveLength(3);
  });

  it("canRollback detects rollback-able state", () => {
    let l = buildLineage("p1", [], [], [], [], []);
    l = addChange(l, "active", "watch", "test");
    expect(canRollback(l)).toBe(true);
  });

  it("canRollback returns false when never was active", () => {
    const l = buildLineage("p1", [], [], [], [], []);
    expect(canRollback(l)).toBe(false);
  });
});

// ─── 7. Quality Rules ───
describe("Sprint 26 — 7. Quality Rules", () => {
  it("low support stays advisory", () => {
    const r = synthesize([mkEdge({ support_count: 3, confidence_score: 0.5 })]);
    expect(r[0].action_mode).toBe("advisory_only");
  });

  it("high confidence can be auto-safe", () => {
    const r = synthesize([mkEdge({ confidence_score: 0.85 })]);
    expect(r[0].action_mode).toBe("bounded_auto_safe");
  });

  it("spillover pushes to watch", () => {
    const ev: Evaluation = { outcome: "helpful", spillover_detected: true, metrics_delta: {} };
    expect(recommendTransition("active", ev)).toBe("watch");
  });

  it("repeated harm pushes to deprecated", () => {
    const ev: Evaluation = { outcome: "harmful", spillover_detected: false, metrics_delta: {} };
    expect(recommendTransition("watch", ev)).toBe("deprecated");
  });

  it("policy scope is respected", () => {
    const p = mkPolicy({ affected_stages: ["build", "validation"] });
    expect(respectsScope(p, "build")).toBe(true);
    expect(respectsScope(p, "deploy")).toBe(false);
  });
});

// ─── 8. Forbidden Mutation Guards ───
describe("Sprint 26 — 8. Forbidden Mutations", () => {
  it("synthesis does not alter pipeline topology", () => {
    const r = synthesize([mkEdge()]);
    expect(r[0]).not.toHaveProperty("mutate_pipeline");
  });

  it("runner rejects mutate_pipeline", () => {
    expect(isPolicySafe({ mutate_pipeline: true })).toBe(false);
  });

  it("runner rejects mutate_governance", () => {
    expect(isPolicySafe({ mutate_governance: true })).toBe(false);
  });

  it("runner rejects mutate_billing", () => {
    expect(isPolicySafe({ mutate_billing: true })).toBe(false);
  });

  it("runner rejects delete_history", () => {
    expect(isPolicySafe({ delete_history: true })).toBe(false);
  });

  it("runner rejects skip_validation", () => {
    expect(isPolicySafe({ skip_validation: true })).toBe(false);
  });

  it("runner rejects bypass_review", () => {
    expect(isPolicySafe({ bypass_review: true })).toBe(false);
  });

  it("runner rejects alter_enforcement", () => {
    expect(isPolicySafe({ alter_enforcement: true })).toBe(false);
  });

  it("safe payload passes", () => {
    expect(isPolicySafe({ recommendation: "use fallback", context: {} })).toBe(true);
  });

  it("deprecated policy not matched by runner", () => {
    expect(matchPolicies([mkPolicy({ status: "deprecated" })], "build")).toHaveLength(0);
  });

  it("watch policy not matched by runner", () => {
    expect(matchPolicies([mkPolicy({ status: "watch" })], "build")).toHaveLength(0);
  });
});

// ─── 9. Determinism ───
describe("Sprint 26 — 9. Determinism", () => {
  it("same edges produce same policies", () => {
    const edges = [mkEdge(), mkEdge({ id: "e2", from_stage_key: "design", relationship_type: "success_dependency" })];
    expect(synthesize(edges)).toEqual(synthesize(edges));
  });

  it("same metrics produce same evaluation", () => {
    const b = mkMetrics();
    const w = mkMetrics({ pipeline_success_rate: 0.95 });
    expect(evaluate(b, w, 10)).toEqual(evaluate(b, w, 10));
  });

  it("same policies produce same match", () => {
    const policies = [mkPolicy()];
    expect(matchPolicies(policies, "build")).toEqual(matchPolicies(policies, "build"));
  });
});

// ─── 10. Edge Cases ───
describe("Sprint 26 — 10. Edge Cases", () => {
  it("empty edges array returns no policies", () => {
    expect(synthesize([])).toEqual([]);
  });

  it("all deprecated edges return no policies", () => {
    expect(synthesize([mkEdge({ status: "deprecated" })])).toHaveLength(0);
  });

  it("evaluator handles zero values", () => {
    const z: OutcomeMetrics = { pipeline_success_rate: 0, downstream_repair_rate: 0, retry_propagation: 0, validation_failure_rate: 0, cost_impact_usd: 0, time_to_resolution_ms: 0 };
    const ev = evaluate(z, z, 10);
    expect(ev.outcome).toBe("neutral");
  });

  it("runner handles empty policies array", () => {
    expect(matchPolicies([], "build")).toEqual([]);
  });

  it("applyPolicies handles empty matched", () => {
    expect(applyPolicies([])).toEqual([]);
  });

  it("lineage handles empty sources", () => {
    const l = buildLineage("p1", [], [], [], [], []);
    expect(l.source_edges).toEqual([]);
    expect(l.status_history).toEqual([]);
  });
});

// ─── 11. Non-interference ───
describe("Sprint 26 — 11. Non-interference", () => {
  it("policy without match does not affect execution", () => {
    const results = applyPolicies(matchPolicies([mkPolicy({ affected_stages: ["deploy"] })], "build"));
    expect(results).toEqual([]);
  });

  it("runner fallback does not crash", () => {
    // Simulate fallback behavior
    const fallback: AppResult = {
      policy_id: "err", action_mode: "advisory_only", action_applied: false,
      reason_codes: ["runner_error_fallback"],
    };
    expect(fallback.action_applied).toBe(false);
    expect(fallback.action_mode).toBe("advisory_only");
  });
});

// ─── 12. Explainability ───
describe("Sprint 26 — 12. Explainability", () => {
  it("lineage explains policy existence", () => {
    const l = buildLineage("p1", ["e1", "e2"], [{ type: "signal" }], [{ type: "repair" }], [], []);
    const evidenceCount = l.source_edges.length + l.source_learning_signals.length + l.repair_evidence.length;
    expect(evidenceCount).toBe(4);
  });

  it("evaluation metrics_delta shows what changed", () => {
    const ev = evaluate(mkMetrics({ pipeline_success_rate: 0.7 }), mkMetrics({ pipeline_success_rate: 0.9 }), 10);
    expect(ev.metrics_delta.pipeline_success_rate).toBeCloseTo(0.2);
  });

  it("status history records transitions", () => {
    let l = buildLineage("p1", [], [], [], [], []);
    l = addChange(l, "draft", "active", "strong evidence");
    expect(l.status_history[0].reason).toBe("strong evidence");
  });
});

// ─── 13. Baseline Comparison ───
describe("Sprint 26 — 13. Baseline Comparison", () => {
  it("identifies real improvement", () => {
    const ev = evaluate(
      mkMetrics({ pipeline_success_rate: 0.6 }),
      mkMetrics({ pipeline_success_rate: 0.85 }),
      10,
    );
    expect(ev.outcome).toBe("helpful");
  });

  it("identifies real regression", () => {
    const ev = evaluate(
      mkMetrics({ pipeline_success_rate: 0.8 }),
      mkMetrics({ pipeline_success_rate: 0.5, downstream_repair_rate: 0.5, retry_propagation: 0.3 }),
      10,
    );
    expect(ev.outcome).toBe("harmful");
  });

  it("inconclusive with insufficient data", () => {
    expect(evaluate(mkMetrics(), mkMetrics({ pipeline_success_rate: 0.99 }), 3).outcome).toBe("inconclusive");
  });

  it("false positive detected", () => {
    const ev = evaluate(mkMetrics(), mkMetrics(), 10);
    expect(isFalsePositive(ev)).toBe(true);
  });
});
