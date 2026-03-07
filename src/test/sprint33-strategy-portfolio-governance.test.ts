/**
 * Sprint 33 — Strategy Portfolio Governance Tests
 * Covers: portfolio analysis, conflict detection, lifecycle transitions, exposure balancing, safety guards
 */
import { describe, it, expect } from "vitest";

// ─── Portfolio Analyzer ───
import { computePortfolioMetrics, identifyDegradingMembers } from "../../supabase/functions/_shared/strategy-portfolio/strategy-portfolio-analyzer";

describe("Strategy Portfolio Analyzer", () => {
  const members = [
    { id: "m1", strategy_family_id: "f1", lifecycle_status: "active", exposure_weight: 3, performance_score: 0.8, stability_score: 0.9, cost_efficiency_score: 0.7 },
    { id: "m2", strategy_family_id: "f2", lifecycle_status: "active", exposure_weight: 1, performance_score: 0.6, stability_score: 0.5, cost_efficiency_score: 0.8 },
    { id: "m3", strategy_family_id: "f3", lifecycle_status: "degrading", exposure_weight: 0.5, performance_score: 0.2, stability_score: 0.3, cost_efficiency_score: 0.4 },
  ];

  it("computes portfolio metrics correctly", () => {
    const outcomes = [
      { outcome_status: "helpful", applied_mode: "variant", outcome_metrics: null },
      { outcome_status: "helpful", applied_mode: "baseline", outcome_metrics: null },
      { outcome_status: "harmful", applied_mode: "variant", outcome_metrics: null },
      { outcome_status: "neutral", applied_mode: "variant", outcome_metrics: null },
    ];
    const m = computePortfolioMetrics(members, outcomes);
    expect(m.member_count).toBe(3);
    expect(m.active_count).toBe(2);
    expect(m.degrading_count).toBe(1);
    expect(m.portfolio_success_rate).toBe(0.5);
    expect(m.portfolio_regression_rate).toBe(0.25);
    expect(m.portfolio_cost_efficiency).toBeGreaterThan(0);
    expect(m.strategy_concentration_index).toBeGreaterThan(0);
  });

  it("returns zero metrics for empty inputs", () => {
    const m = computePortfolioMetrics([], []);
    expect(m.member_count).toBe(0);
    expect(m.portfolio_success_rate).toBe(0);
  });

  it("computes concentration index (Herfindahl)", () => {
    const equalMembers = [
      { id: "m1", strategy_family_id: "f1", lifecycle_status: "active", exposure_weight: 1, performance_score: null, stability_score: null, cost_efficiency_score: null },
      { id: "m2", strategy_family_id: "f2", lifecycle_status: "active", exposure_weight: 1, performance_score: null, stability_score: null, cost_efficiency_score: null },
    ];
    const m = computePortfolioMetrics(equalMembers, []);
    expect(m.strategy_concentration_index).toBe(0.5); // 0.5^2 + 0.5^2 = 0.5
  });
});

// ─── Conflict Detector ───
import { detectConflicts, validateNoForbiddenMutations } from "../../supabase/functions/_shared/strategy-portfolio/strategy-portfolio-conflict-detector";

describe("Strategy Portfolio Conflict Detector", () => {
  it("detects exposure imbalance", () => {
    const members = [
      { member_id: "m1", strategy_family_id: "f1", family_key: "repair_fast", lifecycle_status: "active", exposure_weight: 9, performance_score: 0.8 },
      { member_id: "m2", strategy_family_id: "f2", family_key: "repair_safe", lifecycle_status: "active", exposure_weight: 1, performance_score: 0.6 },
    ];
    const conflicts = detectConflicts(members, []);
    const imbalance = conflicts.find(c => c.conflict_type === "exposure_imbalance");
    expect(imbalance).toBeDefined();
    expect(imbalance!.severity).toBe("high");
  });

  it("detects overlap when >2 active in same domain", () => {
    const members = [
      { member_id: "m1", strategy_family_id: "f1", family_key: "repair_fast", lifecycle_status: "active", exposure_weight: 1, performance_score: 0.8 },
      { member_id: "m2", strategy_family_id: "f2", family_key: "repair_safe", lifecycle_status: "active", exposure_weight: 1, performance_score: 0.6 },
      { member_id: "m3", strategy_family_id: "f3", family_key: "repair_slow", lifecycle_status: "active", exposure_weight: 1, performance_score: 0.5 },
    ];
    const conflicts = detectConflicts(members, []);
    const overlap = conflicts.find(c => c.conflict_type === "overlap");
    expect(overlap).toBeDefined();
  });

  it("detects regression correlation", () => {
    const members = [
      { member_id: "m1", strategy_family_id: "f1", family_key: "a", lifecycle_status: "active", exposure_weight: 1, performance_score: 0.3 },
      { member_id: "m2", strategy_family_id: "f2", family_key: "b", lifecycle_status: "active", exposure_weight: 1, performance_score: 0.3 },
    ];
    const outcomes = [
      ...Array(5).fill(null).map(() => ({ strategy_variant_id: "v1", strategy_family_id: "f1", outcome_status: "harmful", applied_mode: "variant" })),
      ...Array(5).fill(null).map(() => ({ strategy_variant_id: "v2", strategy_family_id: "f2", outcome_status: "harmful", applied_mode: "variant" })),
    ];
    const conflicts = detectConflicts(members, outcomes);
    const regression = conflicts.find(c => c.conflict_type === "regression_correlation");
    expect(regression).toBeDefined();
  });

  it("validates forbidden mutations", () => {
    expect(validateNoForbiddenMutations("repair_escalation")).toBe(true);
    expect(validateNoForbiddenMutations("pipeline_topology_change")).toBe(false);
    expect(validateNoForbiddenMutations("governance_rules_bypass")).toBe(false);
    expect(validateNoForbiddenMutations("billing_logic_update")).toBe(false);
  });

  it("returns no conflicts for clean portfolio", () => {
    const members = [
      { member_id: "m1", strategy_family_id: "f1", family_key: "repair_a", lifecycle_status: "active", exposure_weight: 1, performance_score: 0.8 },
      { member_id: "m2", strategy_family_id: "f2", family_key: "deploy_b", lifecycle_status: "active", exposure_weight: 1, performance_score: 0.7 },
    ];
    const conflicts = detectConflicts(members, []);
    expect(conflicts).toHaveLength(0);
  });
});

// ─── Lifecycle Manager ───
import { validateTransition, shouldAutoDemote, isForbiddenFamily, getValidTransitions } from "../../supabase/functions/_shared/strategy-portfolio/strategy-lifecycle-manager";

describe("Strategy Lifecycle Manager", () => {
  it("allows valid transitions", () => {
    const r = validateTransition({ member_id: "m1", strategy_family_id: "f1", current_status: "proposed", target_status: "experimental", reason: "test", evidence_refs: [] });
    expect(r.allowed).toBe(true);
  });

  it("blocks invalid transitions", () => {
    const r = validateTransition({ member_id: "m1", strategy_family_id: "f1", current_status: "archived", target_status: "active", reason: "test", evidence_refs: [] });
    expect(r.allowed).toBe(false);
  });

  it("requires evidence for experimental → active", () => {
    const r = validateTransition({ member_id: "m1", strategy_family_id: "f1", current_status: "experimental", target_status: "active", reason: "test", evidence_refs: [] });
    expect(r.allowed).toBe(false);
    expect(r.rejection_reason).toContain("evidence");
  });

  it("allows experimental → active with evidence", () => {
    const r = validateTransition({ member_id: "m1", strategy_family_id: "f1", current_status: "experimental", target_status: "active", reason: "test", evidence_refs: [{ metric: "success_rate", value: 0.9 }] });
    expect(r.allowed).toBe(true);
  });

  it("identifies auto-demote conditions", () => {
    expect(shouldAutoDemote(0.1, 0.5, 0.2, 15)).toBe(true);   // low perf
    expect(shouldAutoDemote(0.5, 0.1, 0.2, 15)).toBe(true);   // low stability
    expect(shouldAutoDemote(0.5, 0.5, 0.5, 15)).toBe(true);   // high harmful
    expect(shouldAutoDemote(0.5, 0.5, 0.2, 5)).toBe(false);    // low sample
    expect(shouldAutoDemote(0.5, 0.5, 0.2, 15)).toBe(false);   // all ok
  });

  it("detects forbidden families", () => {
    expect(isForbiddenFamily("pipeline_topology")).toBe(true);
    expect(isForbiddenFamily("governance_rules")).toBe(true);
    expect(isForbiddenFamily("repair_escalation")).toBe(false);
  });

  it("returns valid transitions for each status", () => {
    expect(getValidTransitions("proposed")).toContain("experimental");
    expect(getValidTransitions("active")).toContain("degrading");
    expect(getValidTransitions("archived")).toHaveLength(0);
  });
});

// ─── Exposure Balancer ───
import { computeExposureAdjustments, detectMonoculture } from "../../supabase/functions/_shared/strategy-portfolio/strategy-exposure-balancer";

describe("Strategy Exposure Balancer", () => {
  it("caps dominant strategies", () => {
    const inputs = [
      { strategy_family_id: "f1", family_key: "a", lifecycle_status: "active", current_weight: 1, execution_count: 90, total_executions: 100 },
      { strategy_family_id: "f2", family_key: "b", lifecycle_status: "active", current_weight: 1, execution_count: 10, total_executions: 100 },
    ];
    const adjustments = computeExposureAdjustments(inputs);
    const capped = adjustments.find(a => a.strategy_family_id === "f1");
    expect(capped).toBeDefined();
    expect(capped!.adjusted_weight).toBeLessThan(capped!.current_weight);
  });

  it("boosts underexposed strategies", () => {
    const inputs = [
      { strategy_family_id: "f1", family_key: "a", lifecycle_status: "active", current_weight: 1, execution_count: 96, total_executions: 100 },
      { strategy_family_id: "f2", family_key: "b", lifecycle_status: "active", current_weight: 0.1, execution_count: 4, total_executions: 100 },
    ];
    const adjustments = computeExposureAdjustments(inputs);
    const boosted = adjustments.find(a => a.strategy_family_id === "f2");
    expect(boosted).toBeDefined();
    expect(boosted!.adjusted_weight).toBeGreaterThan(boosted!.current_weight);
  });

  it("returns no adjustments for balanced portfolio", () => {
    const inputs = [
      { strategy_family_id: "f1", family_key: "a", lifecycle_status: "active", current_weight: 1, execution_count: 50, total_executions: 100 },
      { strategy_family_id: "f2", family_key: "b", lifecycle_status: "active", current_weight: 1, execution_count: 50, total_executions: 100 },
    ];
    const adjustments = computeExposureAdjustments(inputs);
    expect(adjustments).toHaveLength(0);
  });

  it("detects monoculture", () => {
    const monoInputs = [
      { strategy_family_id: "f1", family_key: "a", lifecycle_status: "active", current_weight: 1, execution_count: 90, total_executions: 100 },
      { strategy_family_id: "f2", family_key: "b", lifecycle_status: "active", current_weight: 1, execution_count: 10, total_executions: 100 },
    ];
    expect(detectMonoculture(monoInputs)).toBe(true);

    const diverseInputs = [
      { strategy_family_id: "f1", family_key: "a", lifecycle_status: "active", current_weight: 1, execution_count: 50, total_executions: 100 },
      { strategy_family_id: "f2", family_key: "b", lifecycle_status: "active", current_weight: 1, execution_count: 50, total_executions: 100 },
    ];
    expect(detectMonoculture(diverseInputs)).toBe(false);
  });

  it("skips single-member portfolios", () => {
    const inputs = [
      { strategy_family_id: "f1", family_key: "a", lifecycle_status: "active", current_weight: 1, execution_count: 100, total_executions: 100 },
    ];
    expect(computeExposureAdjustments(inputs)).toHaveLength(0);
  });
});

// ─── Portfolio Optimizer ───
import { generateRecommendations, isForbiddenTarget } from "../../supabase/functions/_shared/strategy-portfolio/strategy-portfolio-optimizer";

describe("Strategy Portfolio Optimizer", () => {
  it("detects monoculture risk", () => {
    const members = [
      { id: "m1", strategy_family_id: "f1", lifecycle_status: "active", exposure_weight: 5, performance_score: 0.8, stability_score: 0.9, cost_efficiency_score: 0.7 },
      { id: "m2", strategy_family_id: "f2", lifecycle_status: "active", exposure_weight: 0.5, performance_score: 0.6, stability_score: 0.5, cost_efficiency_score: 0.8 },
    ];
    const metrics = { portfolio_success_rate: 0.7, portfolio_cost_efficiency: 0.7, portfolio_stability_index: 0.7, strategy_concentration_index: 0.84, portfolio_regression_rate: 0.1, member_count: 2, active_count: 2, degrading_count: 0 };
    const recs = generateRecommendations(members, metrics);
    const mono = recs.find(r => r.recommendation_type === "monoculture_risk");
    expect(mono).toBeDefined();
    expect(mono!.advisory_first).toBe(true);
  });

  it("recommends retiring weak strategies", () => {
    const members = [
      { id: "m1", strategy_family_id: "f1", lifecycle_status: "active", exposure_weight: 1, performance_score: 0.1, stability_score: 0.5, cost_efficiency_score: 0.5 },
      { id: "m2", strategy_family_id: "f2", lifecycle_status: "active", exposure_weight: 1, performance_score: 0.9, stability_score: 0.9, cost_efficiency_score: 0.9 },
    ];
    const metrics = { portfolio_success_rate: 0.5, portfolio_cost_efficiency: 0.7, portfolio_stability_index: 0.7, strategy_concentration_index: 0.5, portfolio_regression_rate: 0.1, member_count: 2, active_count: 2, degrading_count: 0 };
    const recs = generateRecommendations(members, metrics);
    expect(recs.find(r => r.recommendation_type === "retire_weak")).toBeDefined();
  });

  it("validates forbidden targets", () => {
    expect(isForbiddenTarget("pipeline_topology")).toBe(true);
    expect(isForbiddenTarget("billing_logic")).toBe(true);
    expect(isForbiddenTarget("repair_escalation")).toBe(false);
  });

  it("all recommendations are advisory_first", () => {
    const members = [
      { id: "m1", strategy_family_id: "f1", lifecycle_status: "active", exposure_weight: 5, performance_score: 0.1, stability_score: 0.5, cost_efficiency_score: 0.5 },
      { id: "m2", strategy_family_id: "f2", lifecycle_status: "degrading", exposure_weight: 0.5, performance_score: 0.1, stability_score: 0.2, cost_efficiency_score: 0.3 },
    ];
    const metrics = { portfolio_success_rate: 0.3, portfolio_cost_efficiency: 0.4, portfolio_stability_index: 0.3, strategy_concentration_index: 0.84, portfolio_regression_rate: 0.4, member_count: 2, active_count: 1, degrading_count: 1 };
    const recs = generateRecommendations(members, metrics);
    for (const r of recs) {
      expect(r.advisory_first).toBe(true);
    }
  });
});
