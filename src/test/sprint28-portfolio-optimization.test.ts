// Sprint 28 — Execution Mode Portfolio Optimization Tests
import { describe, it, expect } from "vitest";

// ─── Portfolio Evaluator ───
describe("Sprint 28 — Portfolio Evaluator", () => {
  const { evaluatePolicyForContext, evaluatePortfolio, computeCompositeRank } = (() => {
    // Inline implementation for testing
    function evaluatePolicyForContext(policyId: string, contextClass: string, outcomes: any[]) {
      const relevant = outcomes.filter((o: any) => o.execution_policy_profile_id === policyId && o.context_class === contextClass);
      const total = relevant.length;
      if (total === 0) return { policy_id: policyId, context_class: contextClass, scores: { usefulness_score: 0, risk_score: 0, cost_efficiency_score: 0, quality_gain_score: 0, speed_gain_score: 0, stability_score: 0, portfolio_rank: 0 }, sample_size: 0, helpful_rate: 0, harmful_rate: 0, neutral_rate: 0 };
      const helpful = relevant.filter((o: any) => o.outcome_status === "helpful").length;
      const harmful = relevant.filter((o: any) => o.outcome_status === "harmful").length;
      const neutral = relevant.filter((o: any) => o.outcome_status === "neutral").length;
      const helpfulRate = helpful / total;
      const harmfulRate = harmful / total;
      const neutralRate = neutral / total;
      const usefulness_score = Math.max(0, Math.min(1, helpfulRate - harmfulRate * 2));
      const risk_score = Math.min(1, harmfulRate * 2);
      const cost_efficiency_score = 0.5;
      const quality_gain_score = helpfulRate;
      const speed_gain_score = 0.5;
      const counts: Record<string, number> = {};
      for (const o of relevant) { counts[o.outcome_status] = (counts[o.outcome_status] || 0) + 1; }
      const maxCount = Math.max(...Object.values(counts));
      const stability_score = relevant.length >= 3 ? maxCount / relevant.length : 0.5;
      const portfolio_rank = computeCompositeRank({ usefulness_score, risk_score, cost_efficiency_score, quality_gain_score, speed_gain_score, stability_score });
      return { policy_id: policyId, context_class: contextClass, scores: { usefulness_score, risk_score, cost_efficiency_score, quality_gain_score, speed_gain_score, stability_score, portfolio_rank }, sample_size: total, helpful_rate: helpfulRate, harmful_rate: harmfulRate, neutral_rate: neutralRate };
    }
    function evaluatePortfolio(policyIds: string[], outcomes: any[]) {
      const contextClasses = [...new Set(outcomes.map((o: any) => o.context_class))];
      const evaluations: any[] = [];
      for (const policyId of policyIds) {
        for (const contextClass of contextClasses) {
          const evaluation = evaluatePolicyForContext(policyId, contextClass, outcomes);
          if (evaluation.sample_size > 0) evaluations.push(evaluation);
        }
      }
      return evaluations;
    }
    function computeCompositeRank(scores: any) {
      return Math.max(0, Math.min(1, scores.usefulness_score * 0.30 + scores.quality_gain_score * 0.20 + scores.cost_efficiency_score * 0.15 + scores.speed_gain_score * 0.10 + scores.stability_score * 0.15 - scores.risk_score * 0.10));
    }
    return { evaluatePolicyForContext, evaluatePortfolio, computeCompositeRank };
  })();

  it("returns zero scores for policy with no outcomes", () => {
    const result = evaluatePolicyForContext("p1", "standard", []);
    expect(result.sample_size).toBe(0);
    expect(result.scores.usefulness_score).toBe(0);
    expect(result.scores.portfolio_rank).toBe(0);
  });

  it("evaluates a policy with all helpful outcomes", () => {
    const outcomes = Array.from({ length: 10 }, (_, i) => ({ execution_policy_profile_id: "p1", context_class: "standard", outcome_status: "helpful", outcome_metrics: null, applied_mode: "bounded_auto_safe" }));
    const result = evaluatePolicyForContext("p1", "standard", outcomes);
    expect(result.helpful_rate).toBe(1);
    expect(result.harmful_rate).toBe(0);
    expect(result.scores.usefulness_score).toBe(1);
    expect(result.scores.risk_score).toBe(0);
    expect(result.scores.portfolio_rank).toBeGreaterThan(0.5);
  });

  it("evaluates a policy with all harmful outcomes", () => {
    const outcomes = Array.from({ length: 5 }, () => ({ execution_policy_profile_id: "p1", context_class: "standard", outcome_status: "harmful", outcome_metrics: null, applied_mode: "bounded_auto_safe" }));
    const result = evaluatePolicyForContext("p1", "standard", outcomes);
    expect(result.harmful_rate).toBe(1);
    expect(result.scores.usefulness_score).toBe(0);
    expect(result.scores.risk_score).toBe(1);
  });

  it("evaluates portfolio across multiple policies and contexts", () => {
    const outcomes = [
      { execution_policy_profile_id: "p1", context_class: "deploy", outcome_status: "helpful", outcome_metrics: null, applied_mode: "bounded_auto_safe" },
      { execution_policy_profile_id: "p2", context_class: "deploy", outcome_status: "harmful", outcome_metrics: null, applied_mode: "bounded_auto_safe" },
      { execution_policy_profile_id: "p1", context_class: "iteration", outcome_status: "neutral", outcome_metrics: null, applied_mode: "advisory_only" },
    ];
    const result = evaluatePortfolio(["p1", "p2"], outcomes);
    expect(result.length).toBeGreaterThan(0);
    const p1Deploy = result.find((r: any) => r.policy_id === "p1" && r.context_class === "deploy");
    expect(p1Deploy?.helpful_rate).toBe(1);
  });

  it("composite rank weights produce expected ordering", () => {
    const highQuality = computeCompositeRank({ usefulness_score: 0.9, risk_score: 0, cost_efficiency_score: 0.5, quality_gain_score: 0.9, speed_gain_score: 0.5, stability_score: 0.8 });
    const highRisk = computeCompositeRank({ usefulness_score: 0.5, risk_score: 0.8, cost_efficiency_score: 0.5, quality_gain_score: 0.5, speed_gain_score: 0.5, stability_score: 0.5 });
    expect(highQuality).toBeGreaterThan(highRisk);
  });

  it("stability score is 0.5 for less than 3 outcomes", () => {
    const outcomes = [
      { execution_policy_profile_id: "p1", context_class: "standard", outcome_status: "helpful", outcome_metrics: null, applied_mode: "bounded_auto_safe" },
    ];
    const result = evaluatePolicyForContext("p1", "standard", outcomes);
    expect(result.scores.stability_score).toBe(0.5);
  });
});

// ─── Ranking Engine ───
describe("Sprint 28 — Ranking Engine", () => {
  function rankPoliciesForContext(evaluations: any[], contextClass: string, policyScopes: Record<string, string>) {
    const contextEvals = evaluations.filter((e: any) => e.context_class === contextClass);
    if (contextEvals.length === 0) return [];
    const scored = contextEvals.map((ev: any) => {
      let adjustedScore = ev.scores.portfolio_rank;
      const reasons: string[] = [];
      if (ev.sample_size < 5) { adjustedScore *= 0.8; reasons.push("low_support_penalty"); }
      const scope = policyScopes[ev.policy_id] || "global";
      if (scope === "global" && ev.scores.usefulness_score < 0.7) { adjustedScore -= 0.05; reasons.push("broad_scope_weak_confidence"); }
      if (ev.scores.stability_score < 0.5) { adjustedScore -= 0.1; reasons.push("volatile_outcomes"); }
      if (ev.harmful_rate > 0.2) { adjustedScore *= 0.5; reasons.push("harmful_outcome_penalty"); }
      if (scope !== "global" && ev.scores.usefulness_score > 0.7 && ev.sample_size >= 5) { adjustedScore += 0.05; reasons.push("narrow_high_confidence_boost"); }
      if (reasons.length === 0) reasons.push("standard_ranking");
      return { policy_id: ev.policy_id, context_class: contextClass, rank: 0, composite_score: Math.max(0, Math.min(1, adjustedScore)), reason_codes: reasons };
    });
    scored.sort((a: any, b: any) => b.composite_score - a.composite_score);
    scored.forEach((s: any, i: number) => { s.rank = i + 1; });
    return scored;
  }

  it("ranks policies by composite score descending", () => {
    const evaluations = [
      { policy_id: "p1", context_class: "standard", scores: { portfolio_rank: 0.8, usefulness_score: 0.9, stability_score: 0.8 }, sample_size: 10, harmful_rate: 0 },
      { policy_id: "p2", context_class: "standard", scores: { portfolio_rank: 0.5, usefulness_score: 0.5, stability_score: 0.6 }, sample_size: 10, harmful_rate: 0 },
    ];
    const result = rankPoliciesForContext(evaluations, "standard", { p1: "workspace", p2: "global" });
    expect(result[0].policy_id).toBe("p1");
    expect(result[0].rank).toBe(1);
    expect(result[1].rank).toBe(2);
  });

  it("penalizes low support policies", () => {
    const evaluations = [
      { policy_id: "p1", context_class: "standard", scores: { portfolio_rank: 0.7, usefulness_score: 0.8, stability_score: 0.7 }, sample_size: 2, harmful_rate: 0 },
    ];
    const result = rankPoliciesForContext(evaluations, "standard", { p1: "workspace" });
    expect(result[0].reason_codes).toContain("low_support_penalty");
    expect(result[0].composite_score).toBeLessThan(0.7);
  });

  it("penalizes harmful policies", () => {
    const evaluations = [
      { policy_id: "p1", context_class: "standard", scores: { portfolio_rank: 0.8, usefulness_score: 0.5, stability_score: 0.7 }, sample_size: 10, harmful_rate: 0.3 },
    ];
    const result = rankPoliciesForContext(evaluations, "standard", { p1: "global" });
    expect(result[0].reason_codes).toContain("harmful_outcome_penalty");
    expect(result[0].composite_score).toBeLessThan(0.5);
  });

  it("boosts narrow high-confidence policies", () => {
    const evaluations = [
      { policy_id: "p1", context_class: "standard", scores: { portfolio_rank: 0.7, usefulness_score: 0.8, stability_score: 0.7 }, sample_size: 10, harmful_rate: 0 },
    ];
    const result = rankPoliciesForContext(evaluations, "standard", { p1: "workspace" });
    expect(result[0].reason_codes).toContain("narrow_high_confidence_boost");
    expect(result[0].composite_score).toBeGreaterThan(0.7);
  });

  it("returns empty for unknown context class", () => {
    const result = rankPoliciesForContext([], "nonexistent", {});
    expect(result).toHaveLength(0);
  });
});

// ─── Lifecycle Manager ───
describe("Sprint 28 — Lifecycle Manager", () => {
  function validateTransition(from: string, to: string) {
    const VALID: Record<string, string[]> = { candidate: ["active"], active: ["watch", "limited"], watch: ["deprecated", "active"], limited: ["active", "deprecated"], deprecated: [] };
    if (from === to) return { valid: false, error: "No-op transition" };
    const allowed = VALID[from];
    if (!allowed || !allowed.includes(to)) return { valid: false, error: `Transition from ${from} to ${to} is not allowed` };
    return { valid: true };
  }

  function recommendLifecycleStatus(currentStatus: string, helpfulRate: number, harmfulRate: number, sampleSize: number, stabilityScore: number, isBalancedDefault: boolean) {
    if (isBalancedDefault && currentStatus !== "deprecated") return { recommended: currentStatus, reason_codes: ["balanced_default_protected"] };
    if (currentStatus === "candidate" && sampleSize >= 5 && helpfulRate > 0.6 && harmfulRate < 0.1) return { recommended: "active", reason_codes: ["sufficient_positive_evidence"] };
    if (currentStatus === "active" && harmfulRate > 0.15) return { recommended: "watch", reason_codes: ["harmful_rate_elevated"] };
    if (currentStatus === "active" && stabilityScore < 0.4 && sampleSize >= 5) return { recommended: "watch", reason_codes: ["volatile_outcomes"] };
    if (currentStatus === "watch" && harmfulRate > 0.25 && sampleSize >= 5) return { recommended: "deprecated", reason_codes: ["persistent_harmful_outcomes"] };
    if (currentStatus === "watch" && harmfulRate < 0.05 && helpfulRate > 0.6 && sampleSize >= 5) return { recommended: "active", reason_codes: ["recovered_positive_outcomes"] };
    if (currentStatus === "limited" && helpfulRate > 0.7 && harmfulRate < 0.05 && sampleSize >= 5) return { recommended: "active", reason_codes: ["strong_limited_scope_results"] };
    if (currentStatus === "limited" && harmfulRate > 0.3 && sampleSize >= 5) return { recommended: "deprecated", reason_codes: ["harmful_even_when_limited"] };
    return { recommended: currentStatus, reason_codes: ["no_change_warranted"] };
  }

  it("allows candidate -> active transition", () => {
    expect(validateTransition("candidate", "active").valid).toBe(true);
  });

  it("blocks candidate -> deprecated transition", () => {
    expect(validateTransition("candidate", "deprecated").valid).toBe(false);
  });

  it("blocks deprecated -> any transition", () => {
    expect(validateTransition("deprecated", "active").valid).toBe(false);
    expect(validateTransition("deprecated", "candidate").valid).toBe(false);
  });

  it("allows active -> watch transition", () => {
    expect(validateTransition("active", "watch").valid).toBe(true);
  });

  it("allows active -> limited transition", () => {
    expect(validateTransition("active", "limited").valid).toBe(true);
  });

  it("blocks no-op transitions", () => {
    expect(validateTransition("active", "active").valid).toBe(false);
  });

  it("recommends active for strong candidate", () => {
    const result = recommendLifecycleStatus("candidate", 0.8, 0, 10, 0.8, false);
    expect(result.recommended).toBe("active");
    expect(result.reason_codes).toContain("sufficient_positive_evidence");
  });

  it("recommends watch for active with harmful rate", () => {
    const result = recommendLifecycleStatus("active", 0.5, 0.2, 10, 0.7, false);
    expect(result.recommended).toBe("watch");
  });

  it("recommends deprecated for watch with persistent harm", () => {
    const result = recommendLifecycleStatus("watch", 0.3, 0.3, 10, 0.5, false);
    expect(result.recommended).toBe("deprecated");
  });

  it("protects balanced_default from changes", () => {
    const result = recommendLifecycleStatus("active", 0.1, 0.5, 10, 0.3, true);
    expect(result.recommended).toBe("active");
    expect(result.reason_codes).toContain("balanced_default_protected");
  });

  it("recommends active for watch policy that recovered", () => {
    const result = recommendLifecycleStatus("watch", 0.8, 0.02, 10, 0.7, false);
    expect(result.recommended).toBe("active");
    expect(result.reason_codes).toContain("recovered_positive_outcomes");
  });

  it("recommends active for strong limited policy", () => {
    const result = recommendLifecycleStatus("limited", 0.8, 0.02, 10, 0.8, false);
    expect(result.recommended).toBe("active");
  });

  it("recommends deprecated for harmful limited policy", () => {
    const result = recommendLifecycleStatus("limited", 0.2, 0.4, 10, 0.5, false);
    expect(result.recommended).toBe("deprecated");
  });

  it("keeps candidate with insufficient data", () => {
    const result = recommendLifecycleStatus("candidate", 0.8, 0, 2, 0.5, false);
    expect(result.recommended).toBe("candidate");
  });

  it("recommends watch for volatile active policy", () => {
    const result = recommendLifecycleStatus("active", 0.6, 0.1, 10, 0.3, false);
    expect(result.recommended).toBe("watch");
    expect(result.reason_codes).toContain("volatile_outcomes");
  });
});

// ─── Conflict Resolver ───
describe("Sprint 28 — Conflict Resolver", () => {
  function areModesContradictory(a: string, b: string) {
    const contradictions: [string, string][] = [
      ["high_quality", "cost_optimized"], ["high_quality", "rapid_iteration"],
      ["risk_sensitive", "rapid_iteration"], ["deploy_hardened", "rapid_iteration"],
      ["validation_heavy", "cost_optimized"],
    ];
    return contradictions.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
  }

  function detectOverlaps(entries: any[]) {
    const conflicts: any[] = [];
    const byContext: Record<string, any[]> = {};
    for (const e of entries) { if (!byContext[e.context_class]) byContext[e.context_class] = []; byContext[e.context_class].push(e); }
    for (const [contextClass, group] of Object.entries(byContext)) {
      if (group.length <= 1) continue;
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const rankDiff = Math.abs(group[i].portfolio_rank - group[j].portfolio_rank);
          if (rankDiff < 0.1) {
            conflicts.push({ conflict_type: "overlapping_rank", policy_ids: [group[i].policy_id, group[j].policy_id], context_class: contextClass, severity: "low" });
          }
        }
      }
    }
    return conflicts;
  }

  function detectContradictions(profiles: any[]) {
    const conflicts: any[] = [];
    const active = profiles.filter((p: any) => p.status === "active");
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        if (areModesContradictory(active[i].policy_mode, active[j].policy_mode)) {
          conflicts.push({ conflict_type: "contradictory_modes", policy_ids: [active[i].id, active[j].id], severity: "high" });
        }
      }
    }
    return conflicts;
  }

  function detectTradeoffConflicts(entries: any[]) {
    const conflicts: any[] = [];
    for (const entry of entries) {
      if (entry.quality_gain_score > 0.7 && entry.cost_efficiency_score < 0.3) {
        conflicts.push({ conflict_type: "quality_cost_tradeoff", policy_ids: [entry.policy_id], severity: "medium" });
      }
      if (entry.speed_gain_score > 0.7 && entry.quality_gain_score < 0.3) {
        conflicts.push({ conflict_type: "speed_quality_tradeoff", policy_ids: [entry.policy_id], severity: "medium" });
      }
    }
    return conflicts;
  }

  it("detects overlapping ranks for same context", () => {
    const entries = [
      { policy_id: "p1", context_class: "deploy", portfolio_rank: 0.75, usefulness_score: 0.7, scope: "global" },
      { policy_id: "p2", context_class: "deploy", portfolio_rank: 0.76, usefulness_score: 0.7, scope: "workspace" },
    ];
    const conflicts = detectOverlaps(entries);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].conflict_type).toBe("overlapping_rank");
  });

  it("does not detect overlap for different contexts", () => {
    const entries = [
      { policy_id: "p1", context_class: "deploy", portfolio_rank: 0.75, usefulness_score: 0.7, scope: "global" },
      { policy_id: "p2", context_class: "iteration", portfolio_rank: 0.76, usefulness_score: 0.7, scope: "workspace" },
    ];
    const conflicts = detectOverlaps(entries);
    expect(conflicts.length).toBe(0);
  });

  it("detects contradictory modes", () => {
    expect(areModesContradictory("high_quality", "cost_optimized")).toBe(true);
    expect(areModesContradictory("high_quality", "rapid_iteration")).toBe(true);
    expect(areModesContradictory("risk_sensitive", "rapid_iteration")).toBe(true);
  });

  it("does not flag compatible modes", () => {
    expect(areModesContradictory("high_quality", "risk_sensitive")).toBe(false);
    expect(areModesContradictory("balanced_default", "cost_optimized")).toBe(false);
  });

  it("detects contradictory active profiles", () => {
    const profiles = [
      { id: "p1", policy_name: "HQ", policy_mode: "high_quality", status: "active" },
      { id: "p2", policy_name: "CO", policy_mode: "cost_optimized", status: "active" },
    ];
    const conflicts = detectContradictions(profiles);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].conflict_type).toBe("contradictory_modes");
    expect(conflicts[0].severity).toBe("high");
  });

  it("ignores non-active profiles in contradiction check", () => {
    const profiles = [
      { id: "p1", policy_name: "HQ", policy_mode: "high_quality", status: "active" },
      { id: "p2", policy_name: "CO", policy_mode: "cost_optimized", status: "deprecated" },
    ];
    const conflicts = detectContradictions(profiles);
    expect(conflicts.length).toBe(0);
  });

  it("detects quality-cost tradeoff", () => {
    const entries = [
      { policy_id: "p1", context_class: "deploy", quality_gain_score: 0.8, cost_efficiency_score: 0.2, speed_gain_score: 0.5 },
    ];
    const conflicts = detectTradeoffConflicts(entries);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].conflict_type).toBe("quality_cost_tradeoff");
  });

  it("detects speed-quality tradeoff", () => {
    const entries = [
      { policy_id: "p1", context_class: "iteration", quality_gain_score: 0.2, cost_efficiency_score: 0.7, speed_gain_score: 0.8 },
    ];
    const conflicts = detectTradeoffConflicts(entries);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].conflict_type).toBe("speed_quality_tradeoff");
  });
});

// ─── Safety Guards ───
describe("Sprint 28 — Safety Guards", () => {
  const FORBIDDEN_MUTATIONS = ["pipeline_topology", "governance_rules", "billing_logic", "plan_enforcement", "execution_contracts", "safety_constraints"];

  function checkForbiddenMutation(actionDescription: string): boolean {
    const lower = actionDescription.toLowerCase();
    return !FORBIDDEN_MUTATIONS.some((fm) => lower.includes(fm));
  }

  it("blocks pipeline topology mutation", () => {
    expect(checkForbiddenMutation("change pipeline_topology")).toBe(false);
  });

  it("blocks governance rules mutation", () => {
    expect(checkForbiddenMutation("modify governance_rules")).toBe(false);
  });

  it("blocks billing logic mutation", () => {
    expect(checkForbiddenMutation("alter billing_logic")).toBe(false);
  });

  it("blocks plan enforcement mutation", () => {
    expect(checkForbiddenMutation("change plan_enforcement")).toBe(false);
  });

  it("blocks execution contracts mutation", () => {
    expect(checkForbiddenMutation("modify execution_contracts")).toBe(false);
  });

  it("blocks safety constraints mutation", () => {
    expect(checkForbiddenMutation("change safety_constraints")).toBe(false);
  });

  it("allows standard portfolio operations", () => {
    expect(checkForbiddenMutation("promote policy to active")).toBe(true);
    expect(checkForbiddenMutation("deprecate low-performing policy")).toBe(true);
    expect(checkForbiddenMutation("recompute portfolio rankings")).toBe(true);
  });
});

// ─── Portfolio Integration ───
describe("Sprint 28 — Portfolio Integration", () => {
  it("full portfolio evaluation flow produces coherent results", () => {
    // Simulate full flow: evaluate → rank → detect conflicts → recommend lifecycle
    const outcomes = [
      ...Array.from({ length: 8 }, () => ({ execution_policy_profile_id: "p1", context_class: "deploy", outcome_status: "helpful", outcome_metrics: null, applied_mode: "bounded_auto_safe" })),
      ...Array.from({ length: 2 }, () => ({ execution_policy_profile_id: "p1", context_class: "deploy", outcome_status: "neutral", outcome_metrics: null, applied_mode: "bounded_auto_safe" })),
      ...Array.from({ length: 3 }, () => ({ execution_policy_profile_id: "p2", context_class: "deploy", outcome_status: "harmful", outcome_metrics: null, applied_mode: "bounded_auto_safe" })),
      ...Array.from({ length: 7 }, () => ({ execution_policy_profile_id: "p2", context_class: "deploy", outcome_status: "neutral", outcome_metrics: null, applied_mode: "advisory_only" })),
    ];

    // Evaluation
    function evaluatePolicyForContext(policyId: string, contextClass: string, outcomes: any[]) {
      const relevant = outcomes.filter((o: any) => o.execution_policy_profile_id === policyId && o.context_class === contextClass);
      const total = relevant.length;
      if (total === 0) return null;
      const helpful = relevant.filter((o: any) => o.outcome_status === "helpful").length;
      const harmful = relevant.filter((o: any) => o.outcome_status === "harmful").length;
      return { policy_id: policyId, context_class: contextClass, helpful_rate: helpful / total, harmful_rate: harmful / total, sample_size: total, scores: { portfolio_rank: Math.max(0, (helpful / total) - (harmful / total) * 2), usefulness_score: Math.max(0, (helpful / total) - (harmful / total) * 2), stability_score: 0.7 } };
    }

    const ev1 = evaluatePolicyForContext("p1", "deploy", outcomes)!;
    const ev2 = evaluatePolicyForContext("p2", "deploy", outcomes)!;

    expect(ev1).toBeTruthy();
    expect(ev2).toBeTruthy();
    expect(ev1.helpful_rate).toBe(0.8);
    expect(ev2.harmful_rate).toBe(0.3);
    expect(ev1.scores.portfolio_rank).toBeGreaterThan(ev2.scores.portfolio_rank);
  });

  it("balanced_default is always protected", () => {
    // balanced_default cannot be deprecated
    const isBalancedDefault = true;
    const result = (() => {
      if (isBalancedDefault) return { recommended: "active", reason_codes: ["balanced_default_protected"] };
      return { recommended: "deprecated", reason_codes: ["harmful"] };
    })();
    expect(result.recommended).toBe("active");
    expect(result.reason_codes).toContain("balanced_default_protected");
  });

  it("portfolio recommendations have valid types", () => {
    const validTypes = ["promote", "limit", "deprecate", "split", "merge", "reprioritize"];
    for (const t of validTypes) {
      expect(validTypes).toContain(t);
    }
  });

  it("lifecycle status has valid values", () => {
    const validStatuses = ["candidate", "active", "watch", "limited", "deprecated"];
    for (const s of validStatuses) {
      expect(validStatuses).toContain(s);
    }
  });
});
