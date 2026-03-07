import { describe, it, expect } from "vitest";
import { interpretStrategySignals } from "../../supabase/functions/_shared/execution-strategy/execution-strategy-signal-interpreter";
import { synthesizeVariant } from "../../supabase/functions/_shared/execution-strategy/execution-strategy-variant-synthesizer";
import { validateStrategyVariant } from "../../supabase/functions/_shared/execution-strategy/execution-strategy-guardrails";
import { assignExecution, computeExperimentStatus } from "../../supabase/functions/_shared/execution-strategy/execution-strategy-experiment-runner";
import { compareOutcomes } from "../../supabase/functions/_shared/execution-strategy/execution-strategy-outcome-tracker";
import { evaluatePromotion } from "../../supabase/functions/_shared/execution-strategy/execution-strategy-promotion-rules";
import { evaluateRollback } from "../../supabase/functions/_shared/execution-strategy/execution-strategy-rollback-engine";
import { buildLineageRecord, buildExplainability } from "../../supabase/functions/_shared/execution-strategy/execution-strategy-lineage";

// ═══ Signal Interpreter ═══
describe("Execution Strategy Signal Interpreter", () => {
  // uses top-level import

  const emptyInput = {
    retry_metrics: [], repair_metrics: [], validation_metrics: [],
    predictive_metrics: [], review_metrics: [], deploy_metrics: [], cross_stage_spillover: [],
  };

  it("returns empty for clean metrics", () => {
    expect(interpretStrategySignals(emptyInput)).toEqual([]);
  });

  it("detects repair escalation opportunity", () => {
    const input = { ...emptyInput, repair_metrics: [{ stage: "build", repair_rate: 0.45, success_rate: 0.6 }] };
    const signals = interpretStrategySignals(input);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0].target_family_key).toBe("repair_escalation_sequencing");
    expect(signals[0].rationale_codes).toContain("high_repair_burden");
  });

  it("detects retry switching opportunity", () => {
    const input = { ...emptyInput, retry_metrics: [{ stage: "validate", retry_rate: 0.4, avg_retries: 3.5 }] };
    const signals = interpretStrategySignals(input);
    expect(signals.some(s => s.target_family_key === "retry_switching_heuristics")).toBe(true);
  });

  it("detects validation intensity imbalance", () => {
    const input = { ...emptyInput, validation_metrics: [{ stage: "static", false_positive_rate: 0.35, false_negative_rate: 0.05 }] };
    const signals = interpretStrategySignals(input);
    expect(signals.some(s => s.target_family_key === "validation_intensity_ladders")).toBe(true);
    expect(signals.find(s => s.target_family_key === "validation_intensity_ladders")!.rationale_codes).toContain("validation_overfire");
  });

  it("detects deploy hardening gap", () => {
    const input = { ...emptyInput, deploy_metrics: [{ success_rate: 0.7, hardening_cost: 5 }] };
    const signals = interpretStrategySignals(input);
    expect(signals.some(s => s.target_family_key === "deploy_hardening_sequencing")).toBe(true);
  });

  it("sorts by opportunity score descending", () => {
    const input = {
      ...emptyInput,
      repair_metrics: [{ stage: "build", repair_rate: 0.5, success_rate: 0.5 }],
      retry_metrics: [{ stage: "validate", retry_rate: 0.3, avg_retries: 2 }],
    };
    const signals = interpretStrategySignals(input);
    for (let i = 1; i < signals.length; i++) {
      expect(signals[i].opportunity_score).toBeLessThanOrEqual(signals[i - 1].opportunity_score);
    }
  });

  it("filters out low opportunity scores", () => {
    const input = { ...emptyInput, retry_metrics: [{ stage: "x", retry_rate: 0.01, avg_retries: 0.1 }] };
    const signals = interpretStrategySignals(input);
    signals.forEach(s => expect(s.opportunity_score).toBeGreaterThan(0.1));
  });

  it("detects review escalation timing", () => {
    const input = { ...emptyInput, review_metrics: [{ stage: "review", escalation_rate: 0.5, avg_review_time_hours: 6 }] };
    const signals = interpretStrategySignals(input);
    expect(signals.some(s => s.target_family_key === "review_escalation_timing")).toBe(true);
  });

  it("detects predictive checkpoint imbalance", () => {
    const input = { ...emptyInput, predictive_metrics: [{ stage: "pred", fp_rate: 0.3, fn_rate: 0.25 }] };
    const signals = interpretStrategySignals(input);
    expect(signals.some(s => s.target_family_key === "predictive_checkpoint_ordering")).toBe(true);
  });
});

// ═══ Variant Synthesizer ═══
describe("Execution Strategy Variant Synthesizer", () => {
  // uses top-level import

  const family = {
    id: "fam-1", strategy_family_key: "repair_escalation", status: "active", rollout_mode: "bounded_experiment",
    baseline_strategy_definition: { threshold: 0.5, max_retries: 3 },
    allowed_mutation_envelope: { threshold: { min: 0.2, max: 0.8 }, max_retries: { min: 1, max: 5 } },
    evaluation_metrics: ["repair_burden", "success_rate"],
  };

  const signal = {
    target_family_key: "repair_escalation", opportunity_score: 0.7,
    rationale_codes: ["high_repair_burden"], evidence_refs: [{ stage: "build" }],
    expected_improvement_area: "repair_burden_reduction",
  };

  it("synthesizes a variant with bounded mutations", () => {
    const result = synthesizeVariant(family, signal);
    expect(result).not.toBeNull();
    expect(result!.strategy_family_id).toBe("fam-1");
    expect(result!.hypothesis).toBeTruthy();
    expect(result!.confidence_score).toBeGreaterThan(0);
    expect(result!.confidence_score).toBeLessThanOrEqual(0.9);
  });

  it("respects mutation envelope", () => {
    const result = synthesizeVariant(family, signal);
    expect(result).not.toBeNull();
    for (const [key, delta] of Object.entries(result!.mutation_delta as Record<string, number>)) {
      expect(Math.abs(delta)).toBeLessThanOrEqual(0.25);
    }
  });

  it("returns null for frozen family", () => {
    expect(synthesizeVariant({ ...family, status: "frozen" }, signal)).toBeNull();
  });

  it("returns null for deprecated family", () => {
    expect(synthesizeVariant({ ...family, status: "deprecated" }, signal)).toBeNull();
  });

  it("includes rollback guard", () => {
    const result = synthesizeVariant(family, signal);
    expect(result!.rollback_guard).toBeDefined();
    expect(result!.rollback_guard.auto_rollback_on_harmful).toBe(true);
  });

  it("sets bounded_experiment_candidate mode for experiment families", () => {
    const result = synthesizeVariant(family, signal);
    expect(result!.variant_mode).toBe("bounded_experiment_candidate");
  });

  it("sets advisory_candidate for manual families", () => {
    const result = synthesizeVariant({ ...family, rollout_mode: "manual_only" }, signal);
    expect(result!.variant_mode).toBe("advisory_candidate");
  });
});

// ═══ Guardrails ═══
describe("Execution Strategy Guardrails", () => {
  // uses top-level import

  const family = { status: "active", allowed_mutation_envelope: { threshold: { min: 0, max: 1 } }, rollout_mode: "bounded_experiment", allowed_variant_scope: "global" };
  const validVariant = { mutation_delta: { threshold: 0.1 }, variant_mode: "bounded_experiment_candidate", rollback_guard: { max_degradation_pct: 10 } };

  it("passes valid variant", () => {
    const result = validateStrategyVariant(family, validVariant);
    expect(result.safe).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("blocks frozen family", () => {
    const result = validateStrategyVariant({ ...family, status: "frozen" }, validVariant);
    expect(result.safe).toBe(false);
    expect(result.violations.some(v => v.includes("frozen"))).toBe(true);
  });

  it("blocks deprecated family", () => {
    const result = validateStrategyVariant({ ...family, status: "deprecated" }, validVariant);
    expect(result.safe).toBe(false);
  });

  it("blocks forbidden fields in delta", () => {
    const result = validateStrategyVariant(family, { ...validVariant, mutation_delta: { pipeline_topology_change: 1 } });
    expect(result.safe).toBe(false);
    expect(result.violations.some(v => v.includes("Forbidden"))).toBe(true);
  });

  it("blocks governance_rules mutation", () => {
    const result = validateStrategyVariant(family, { ...validVariant, mutation_delta: { governance_rules_level: 0.5 } });
    expect(result.safe).toBe(false);
  });

  it("blocks billing_logic mutation", () => {
    const result = validateStrategyVariant(family, { ...validVariant, mutation_delta: { billing_logic_override: 1 } });
    expect(result.safe).toBe(false);
  });

  it("blocks delta exceeding max", () => {
    const result = validateStrategyVariant(family, { ...validVariant, mutation_delta: { threshold: 0.5 } });
    expect(result.safe).toBe(false);
    expect(result.violations.some(v => v.includes("exceeds max"))).toBe(true);
  });

  it("blocks experiment mode when family is manual_only", () => {
    const result = validateStrategyVariant({ ...family, rollout_mode: "manual_only" }, validVariant);
    expect(result.safe).toBe(false);
  });

  it("blocks missing rollback guard", () => {
    const result = validateStrategyVariant(family, { mutation_delta: { threshold: 0.1 }, variant_mode: "bounded_experiment_candidate" });
    expect(result.safe).toBe(false);
    expect(result.violations.some(v => v.includes("Rollback guard"))).toBe(true);
  });
});

// ═══ Experiment Runner ═══
describe("Execution Strategy Experiment Runner", () => {
  // uses top-level import

  const config = {
    experiment_id: "exp-1", variant_id: "var-1", family_id: "fam-1",
    baseline_definition: { threshold: 0.5 }, variant_definition: { threshold: 0.4 },
    experiment_cap: { max_executions: 10 }, assignment_mode: "bounded_experiment",
  };

  it("alternates baseline and variant assignments", () => {
    const status = { total_assignments: 0, baseline_count: 0, variant_count: 0, cap_reached: false, can_continue: true };
    const a0 = assignExecution(config, status, 0);
    const a1 = assignExecution(config, status, 1);
    expect(a0.applied_mode).toBe("baseline");
    expect(a1.applied_mode).toBe("variant");
  });

  it("falls back to baseline when cap reached", () => {
    const status = { total_assignments: 10, baseline_count: 5, variant_count: 5, cap_reached: true, can_continue: false };
    const a = assignExecution(config, status, 11);
    expect(a.applied_mode).toBe("baseline");
  });

  it("computes status correctly", () => {
    const outcomes = [
      { applied_mode: "baseline", outcome_status: "helpful" },
      { applied_mode: "variant", outcome_status: "helpful" },
      { applied_mode: "baseline", outcome_status: "neutral" },
    ];
    const status = computeExperimentStatus(outcomes, { max_executions: 10 });
    expect(status.baseline_count).toBe(2);
    expect(status.variant_count).toBe(1);
    expect(status.cap_reached).toBe(false);
    expect(status.can_continue).toBe(true);
  });

  it("stops when harmful rate exceeds threshold", () => {
    const outcomes = Array.from({ length: 10 }, (_, i) => ({
      applied_mode: i % 2 === 0 ? "baseline" : "variant",
      outcome_status: i % 2 === 1 ? "harmful" : "helpful",
    }));
    const status = computeExperimentStatus(outcomes, { max_executions: 50 });
    expect(status.can_continue).toBe(false);
  });
});

// ═══ Outcome Tracker ═══
describe("Execution Strategy Outcome Tracker", () => {
  // uses top-level import

  it("detects improvement when variant is better", () => {
    const baseline = Array.from({ length: 15 }, () => ({ outcome_metrics: { retry_count: 4, success_rate: 0.7 } }));
    const variant = Array.from({ length: 15 }, () => ({ outcome_metrics: { retry_count: 2, success_rate: 0.85 } }));
    const report = compareOutcomes(baseline, variant, "exp-1", "var-1", ["retry_count", "success_rate"]);
    expect(report.overall_verdict).toBe("helpful");
    expect(report.recommendation).toBe("promote");
  });

  it("detects harmful variant", () => {
    const baseline = Array.from({ length: 15 }, () => ({ outcome_metrics: { retry_count: 2, success_rate: 0.9 } }));
    const variant = Array.from({ length: 15 }, () => ({ outcome_metrics: { retry_count: 6, success_rate: 0.5 } }));
    const report = compareOutcomes(baseline, variant, "exp-1", "var-1", ["retry_count", "success_rate"]);
    expect(report.overall_verdict).toBe("harmful");
    expect(report.recommendation).toBe("rollback");
  });

  it("returns inconclusive with low sample", () => {
    const baseline = [{ outcome_metrics: { retry_count: 3 } }];
    const variant = [{ outcome_metrics: { retry_count: 2 } }];
    const report = compareOutcomes(baseline, variant, "exp-1", "var-1", ["retry_count"]);
    expect(report.overall_verdict).toBe("inconclusive");
  });

  it("confidence scales with sample size", () => {
    const mk = (n: number) => Array.from({ length: n }, () => ({ outcome_metrics: { retry_count: 3 } }));
    const r10 = compareOutcomes(mk(10), mk(10), "e", "v", ["retry_count"]);
    const r30 = compareOutcomes(mk(30), mk(30), "e", "v", ["retry_count"]);
    expect(r30.confidence).toBeGreaterThan(r10.confidence);
  });
});

// ═══ Promotion Rules ═══
describe("Execution Strategy Promotion Rules", () => {
  // uses top-level import

  it("allows promotion for helpful verdict with sufficient evidence", () => {
    const result = evaluatePromotion({
      verdict: "helpful", confidence: 0.7, sample_size: 20, scope_breadth: "narrow",
      family_status: "active", comparisons: [{ direction: "better", metric: "retry_count" }],
    });
    expect(result.can_promote).toBe(true);
  });

  it("blocks promotion for harmful verdict", () => {
    const result = evaluatePromotion({
      verdict: "harmful", confidence: 0.8, sample_size: 30, scope_breadth: "narrow",
      family_status: "active", comparisons: [],
    });
    expect(result.can_promote).toBe(false);
  });

  it("blocks promotion for low confidence", () => {
    const result = evaluatePromotion({
      verdict: "helpful", confidence: 0.2, sample_size: 20, scope_breadth: "medium",
      family_status: "active", comparisons: [{ direction: "better", metric: "retry_count" }],
    });
    expect(result.can_promote).toBe(false);
  });

  it("blocks promotion for low sample size", () => {
    const result = evaluatePromotion({
      verdict: "helpful", confidence: 0.8, sample_size: 5, scope_breadth: "narrow",
      family_status: "active", comparisons: [{ direction: "better", metric: "x" }],
    });
    expect(result.can_promote).toBe(false);
  });

  it("requires higher confidence for broad scope", () => {
    const narrow = evaluatePromotion({
      verdict: "helpful", confidence: 0.5, sample_size: 20, scope_breadth: "narrow",
      family_status: "active", comparisons: [{ direction: "better", metric: "x" }],
    });
    const broad = evaluatePromotion({
      verdict: "helpful", confidence: 0.5, sample_size: 20, scope_breadth: "broad",
      family_status: "active", comparisons: [{ direction: "better", metric: "x" }],
    });
    expect(narrow.can_promote).toBe(true);
    expect(broad.can_promote).toBe(false);
  });

  it("blocks frozen family", () => {
    const result = evaluatePromotion({
      verdict: "helpful", confidence: 0.9, sample_size: 50, scope_breadth: "narrow",
      family_status: "frozen", comparisons: [],
    });
    expect(result.can_promote).toBe(false);
  });

  it("blocks when metrics show degradation", () => {
    const result = evaluatePromotion({
      verdict: "helpful", confidence: 0.7, sample_size: 20, scope_breadth: "narrow",
      family_status: "active", comparisons: [{ direction: "worse", metric: "cost" }],
    });
    expect(result.can_promote).toBe(false);
  });
});

// ═══ Rollback Engine ═══
describe("Execution Strategy Rollback Engine", () => {
  // uses top-level import

  it("triggers immediate rollback for harmful with auto-rollback", () => {
    const result = evaluateRollback({
      verdict: "harmful", harmful_rate: 0.5, sample_size: 10, experiment_status: "active",
      variant_status: "active_experiment", rollback_guard: { auto_rollback_on_harmful: true },
    });
    expect(result.should_rollback).toBe(true);
    expect(result.urgency).toBe("immediate");
  });

  it("does not rollback for helpful verdict", () => {
    const result = evaluateRollback({
      verdict: "helpful", harmful_rate: 0.05, sample_size: 20, experiment_status: "active",
      variant_status: "active_experiment", rollback_guard: { auto_rollback_on_harmful: true },
    });
    expect(result.should_rollback).toBe(false);
  });

  it("skips if already rolled back", () => {
    const result = evaluateRollback({
      verdict: "harmful", harmful_rate: 1, sample_size: 10, experiment_status: "rolled_back",
      variant_status: "rolled_back", rollback_guard: { auto_rollback_on_harmful: true },
    });
    expect(result.should_rollback).toBe(false);
  });

  it("triggers on high harmful rate even without explicit harmful verdict", () => {
    const result = evaluateRollback({
      verdict: "inconclusive", harmful_rate: 0.4, sample_size: 10, experiment_status: "active",
      variant_status: "active_experiment", rollback_guard: {},
    });
    expect(result.should_rollback).toBe(true);
  });
});

// ═══ Lineage ═══
describe("Execution Strategy Lineage", () => {
  // uses top-level import

  it("builds lineage record with timestamp", () => {
    const record = buildLineageRecord({
      variant_id: "v1", family_key: "repair", source_signals: [{ type: "repair" }],
      baseline_definition: { threshold: 0.5 }, mutation_delta: { threshold: -0.1 }, hypothesis: "Test",
    });
    expect(record.created_at).toBeTruthy();
    expect(record.variant_id).toBe("v1");
  });

  it("builds explainability with advisory_first flag", () => {
    const lineage = buildLineageRecord({
      variant_id: "v1", family_key: "repair", source_signals: [{ rationale_codes: ["high_repair"] }],
      baseline_definition: {}, mutation_delta: { threshold: -0.1 }, hypothesis: "Reduce threshold",
    });
    const explain = buildExplainability(lineage);
    expect(explain.advisory_first).toBe(true);
    expect(explain.what_changed).toBeDefined();
    expect(explain.why_proposed).toBeDefined();
  });
});

// ═══ Safety & Forbidden Mutation Guards ═══
describe("Strategy Evolution Safety Guards", () => {
  const { validateStrategyVariant } = require("../../supabase/functions/_shared/execution-strategy/execution-strategy-guardrails");
  const { synthesizeVariant } = require("../../supabase/functions/_shared/execution-strategy/execution-strategy-variant-synthesizer");

  const family = { status: "active", allowed_mutation_envelope: { x: { min: 0, max: 1 } }, rollout_mode: "bounded_experiment", allowed_variant_scope: "global" };

  it("blocks execution_contracts mutation", () => {
    const r = validateStrategyVariant(family, { mutation_delta: { execution_contracts_flag: 1 }, variant_mode: "bounded_experiment_candidate", rollback_guard: {} });
    expect(r.safe).toBe(false);
  });

  it("blocks hard_safety_constraints mutation", () => {
    const r = validateStrategyVariant(family, { mutation_delta: { hard_safety_constraints_val: 1 }, variant_mode: "bounded_experiment_candidate", rollback_guard: {} });
    expect(r.safe).toBe(false);
  });

  it("blocks plan_enforcement mutation", () => {
    const r = validateStrategyVariant(family, { mutation_delta: { plan_enforcement_override: 1 }, variant_mode: "bounded_experiment_candidate", rollback_guard: {} });
    expect(r.safe).toBe(false);
  });

  it("synthesizer respects envelope max delta", () => {
    const fam = {
      id: "f1", strategy_family_key: "test", status: "active", rollout_mode: "manual_only",
      baseline_strategy_definition: { sensitivity: 0.5 },
      allowed_mutation_envelope: { sensitivity: { min: 0.1, max: 0.9 } },
      evaluation_metrics: ["success_rate"],
    };
    const sig = { target_family_key: "test", opportunity_score: 0.9, rationale_codes: ["high_repair_burden"], evidence_refs: [], expected_improvement_area: "test" };
    const result = synthesizeVariant(fam, sig);
    if (result) {
      for (const delta of Object.values(result.mutation_delta) as number[]) {
        expect(Math.abs(delta)).toBeLessThanOrEqual(0.25);
      }
    }
  });
});

// ═══ Determinism ═══
describe("Strategy Evolution Determinism", () => {
  const { interpretStrategySignals } = require("../../supabase/functions/_shared/execution-strategy/execution-strategy-signal-interpreter");
  const { compareOutcomes } = require("../../supabase/functions/_shared/execution-strategy/execution-strategy-outcome-tracker");

  it("signal interpretation is deterministic", () => {
    const input = { retry_metrics: [{ stage: "x", retry_rate: 0.4, avg_retries: 3 }], repair_metrics: [], validation_metrics: [], predictive_metrics: [], review_metrics: [], deploy_metrics: [], cross_stage_spillover: [] };
    const r1 = interpretStrategySignals(input);
    const r2 = interpretStrategySignals(input);
    expect(r1).toEqual(r2);
  });

  it("outcome comparison is deterministic", () => {
    const b = Array.from({ length: 15 }, () => ({ outcome_metrics: { retry_count: 3 } }));
    const v = Array.from({ length: 15 }, () => ({ outcome_metrics: { retry_count: 2 } }));
    const r1 = compareOutcomes(b, v, "e", "v", ["retry_count"]);
    const r2 = compareOutcomes(b, v, "e", "v", ["retry_count"]);
    expect(r1.overall_verdict).toBe(r2.overall_verdict);
    expect(r1.confidence).toBe(r2.confidence);
  });
});
