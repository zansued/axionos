import { describe, it, expect } from "vitest";
import { selectPilotScope, type PilotScopeCandidate } from "../../supabase/functions/_shared/architecture-pilot/architecture-pilot-scope-selector";
import { evaluatePilotGuardrails } from "../../supabase/functions/_shared/architecture-pilot/architecture-pilot-guardrails";
import { evaluateActivation } from "../../supabase/functions/_shared/architecture-pilot/architecture-pilot-activation-controller";
import { comparePilotToBaseline, type BaselineMetrics } from "../../supabase/functions/_shared/architecture-pilot/architecture-pilot-baseline-comparator";
import { assessPilotRisk } from "../../supabase/functions/_shared/architecture-pilot/architecture-pilot-risk-monitor";
import { evaluateRollback } from "../../supabase/functions/_shared/architecture-pilot/architecture-pilot-rollback-controller";
import { canTransition, getValidTransitions } from "../../supabase/functions/_shared/architecture-pilot/architecture-pilot-review-manager";
import { buildPilotExplanation } from "../../supabase/functions/_shared/architecture-pilot/architecture-pilot-explainer";

describe("Sprint 41 — Architecture Rollout Pilot Governance", () => {
  // Scope Selector
  describe("Pilot Scope Selector", () => {
    it("selects lowest blast radius scope", () => {
      const candidates: PilotScopeCandidate[] = [
        { scope_id: "a", scope_type: "workspace", blast_radius_estimate: 0.1, stability_score: 0.9, observability_coverage: 0.8, baseline_comparability: 0.9, tenant_sensitivity: 0.2, active_pilot_overlap: false },
        { scope_id: "b", scope_type: "workspace", blast_radius_estimate: 0.3, stability_score: 0.9, observability_coverage: 0.8, baseline_comparability: 0.9, tenant_sensitivity: 0.2, active_pilot_overlap: false },
      ];
      const result = selectPilotScope(candidates);
      expect(result.selected_scope?.scope_id).toBe("a");
      expect(result.risk_class).toBe("low");
    });

    it("excludes overlapping pilots", () => {
      const candidates: PilotScopeCandidate[] = [
        { scope_id: "a", scope_type: "workspace", blast_radius_estimate: 0.1, stability_score: 0.9, observability_coverage: 0.8, baseline_comparability: 0.9, tenant_sensitivity: 0.2, active_pilot_overlap: true },
      ];
      const result = selectPilotScope(candidates);
      expect(result.selected_scope).toBeNull();
      expect(result.exclusion_reasons).toHaveLength(1);
    });

    it("handles empty candidates", () => {
      const result = selectPilotScope([]);
      expect(result.selected_scope).toBeNull();
      expect(result.risk_class).toBe("critical");
    });

    it("excludes unstable scopes", () => {
      const candidates: PilotScopeCandidate[] = [
        { scope_id: "a", scope_type: "ws", blast_radius_estimate: 0.1, stability_score: 0.3, observability_coverage: 0.8, baseline_comparability: 0.9, tenant_sensitivity: 0.1, active_pilot_overlap: false },
      ];
      const result = selectPilotScope(candidates);
      expect(result.selected_scope).toBeNull();
    });
  });

  // Guardrails
  describe("Pilot Guardrails", () => {
    it("allows valid pilot", () => {
      const result = evaluatePilotGuardrails({
        blast_radius_estimate: 0.2, rollback_triggers_defined: true, validation_coverage_complete: true,
        target_scope_stable: true, active_stabilization_in_scope: false, conflicting_active_pilots: 0,
        mutation_families: [], tenant_isolation_preserved: true, baseline_comparability: 0.8,
      });
      expect(result.allowed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("blocks forbidden mutations", () => {
      const result = evaluatePilotGuardrails({
        blast_radius_estimate: 0.2, rollback_triggers_defined: true, validation_coverage_complete: true,
        target_scope_stable: true, active_stabilization_in_scope: false, conflicting_active_pilots: 0,
        mutation_families: ["billing_logic", "governance_rules"], tenant_isolation_preserved: true, baseline_comparability: 0.8,
      });
      expect(result.allowed).toBe(false);
    });

    it("blocks tenant isolation breach", () => {
      const result = evaluatePilotGuardrails({
        blast_radius_estimate: 0.2, rollback_triggers_defined: true, validation_coverage_complete: true,
        target_scope_stable: true, active_stabilization_in_scope: false, conflicting_active_pilots: 0,
        mutation_families: [], tenant_isolation_preserved: false, baseline_comparability: 0.8,
      });
      expect(result.allowed).toBe(false);
    });

    it("blocks during active stabilization", () => {
      const result = evaluatePilotGuardrails({
        blast_radius_estimate: 0.2, rollback_triggers_defined: true, validation_coverage_complete: true,
        target_scope_stable: true, active_stabilization_in_scope: true, conflicting_active_pilots: 0,
        mutation_families: [], tenant_isolation_preserved: true, baseline_comparability: 0.8,
      });
      expect(result.allowed).toBe(false);
    });

    it("downgrades to shadow when validation incomplete", () => {
      const result = evaluatePilotGuardrails({
        blast_radius_estimate: 0.2, rollback_triggers_defined: true, validation_coverage_complete: false,
        target_scope_stable: true, active_stabilization_in_scope: false, conflicting_active_pilots: 0,
        mutation_families: [], tenant_isolation_preserved: true, baseline_comparability: 0.8,
      });
      expect(result.allowed).toBe(true);
      expect(result.downgraded_mode).toBe("shadow");
    });

    it("blocks without rollback triggers", () => {
      const result = evaluatePilotGuardrails({
        blast_radius_estimate: 0.2, rollback_triggers_defined: false, validation_coverage_complete: true,
        target_scope_stable: true, active_stabilization_in_scope: false, conflicting_active_pilots: 0,
        mutation_families: [], tenant_isolation_preserved: true, baseline_comparability: 0.8,
      });
      expect(result.allowed).toBe(false);
    });
  });

  // Activation Controller
  describe("Pilot Activation Controller", () => {
    it("allows activation for approved pilot", () => {
      const result = evaluateActivation({
        pilot_id: "p1", pilot_status: "approved", pilot_mode: "shadow",
        activation_window: null, guardrail_result: { allowed: true, violations: [] },
      });
      expect(result.can_activate).toBe(true);
    });

    it("rejects non-approved pilot", () => {
      const result = evaluateActivation({
        pilot_id: "p1", pilot_status: "draft", pilot_mode: "shadow",
        activation_window: null, guardrail_result: { allowed: true, violations: [] },
      });
      expect(result.can_activate).toBe(false);
    });

    it("rejects when guardrails fail", () => {
      const result = evaluateActivation({
        pilot_id: "p1", pilot_status: "approved", pilot_mode: "shadow",
        activation_window: null, guardrail_result: { allowed: false, violations: [{ rule: "test" }] },
      });
      expect(result.can_activate).toBe(false);
    });
  });

  // Baseline Comparator
  describe("Pilot Baseline Comparator", () => {
    const baseline: BaselineMetrics = {
      latency_p50_ms: 100, repair_rate: 0.1, retry_rate: 0.05, validation_failure_rate: 0.08,
      deploy_success_rate: 0.95, observability_clarity: 0.8, tenant_impact_score: 0.1, rollback_signal_count: 0,
    };

    it("detects improvement", () => {
      const pilot: BaselineMetrics = { ...baseline, latency_p50_ms: 80, repair_rate: 0.05, deploy_success_rate: 0.98 };
      const result = comparePilotToBaseline(baseline, pilot);
      expect(result.benefit_score).toBeGreaterThan(0);
      expect(result.recommendation).not.toBe("rollback");
    });

    it("detects degradation", () => {
      const pilot: BaselineMetrics = { ...baseline, latency_p50_ms: 200, repair_rate: 0.3, validation_failure_rate: 0.3, rollback_signal_count: 5 };
      const result = comparePilotToBaseline(baseline, pilot);
      expect(result.harm_score).toBeGreaterThan(0);
    });

    it("handles identical metrics", () => {
      const result = comparePilotToBaseline(baseline, baseline);
      expect(result.benefit_score).toBe(0);
      expect(result.harm_score).toBe(0);
    });
  });

  // Risk Monitor
  describe("Pilot Risk Monitor", () => {
    it("detects low risk", () => {
      const result = assessPilotRisk({
        pilot_id: "p1", harm_score: 0, benefit_score: 0.3, rollback_signal_count: 0,
        oscillation_detected: false, cross_scope_side_effects: [], sandbox_expectation_drift: 0, baseline_mismatch_detected: false,
      });
      expect(result.risk_level).toBe("low");
      expect(result.recommended_action).toBe("continue");
    });

    it("detects critical risk on rollback breach", () => {
      const result = assessPilotRisk({
        pilot_id: "p1", harm_score: 0.1, benefit_score: 0, rollback_signal_count: 5,
        oscillation_detected: false, cross_scope_side_effects: [], sandbox_expectation_drift: 0, baseline_mismatch_detected: false,
      });
      expect(result.risk_level).toBe("critical");
      expect(result.recommended_action).toBe("rollback_immediately");
    });

    it("detects high risk on oscillation", () => {
      const result = assessPilotRisk({
        pilot_id: "p1", harm_score: 0.4, benefit_score: 0, rollback_signal_count: 0,
        oscillation_detected: true, cross_scope_side_effects: [], sandbox_expectation_drift: 0, baseline_mismatch_detected: false,
      });
      expect(result.risk_level).toBe("high");
    });
  });

  // Rollback Controller
  describe("Pilot Rollback Controller", () => {
    it("allows rollback of active pilot", () => {
      const result = evaluateRollback({
        pilot_id: "p1", pilot_status: "active", rollback_mode: "manual",
        rollback_reason: { reason: "test" }, baseline_ref: { plan_id: "plan1" },
      });
      expect(result.can_rollback).toBe(true);
    });

    it("rejects rollback of draft pilot", () => {
      const result = evaluateRollback({
        pilot_id: "p1", pilot_status: "draft", rollback_mode: "manual",
        rollback_reason: {}, baseline_ref: {},
      });
      expect(result.can_rollback).toBe(false);
    });
  });

  // Review Manager
  describe("Pilot Review Manager", () => {
    it("allows valid transitions", () => {
      expect(canTransition("eligible", "approved")).toBe(true);
      expect(canTransition("approved", "paused")).toBe(true);
      expect(canTransition("active", "rolled_back")).toBe(true);
    });

    it("rejects invalid transitions", () => {
      expect(canTransition("draft", "approved")).toBe(false);
      expect(canTransition("archived", "approved")).toBe(false);
    });

    it("returns valid transitions", () => {
      const t = getValidTransitions("eligible");
      expect(t).toContain("approved");
      expect(t).toContain("rejected");
    });
  });

  // Explainer
  describe("Pilot Explainability", () => {
    it("builds complete explanation", () => {
      const explanation = buildPilotExplanation(
        { id: "p1", plan_id: "plan1", pilot_scope: "workspace_a", pilot_mode: "shadow", rollback_triggers: [{ type: "harm" }], stop_conditions: [{ type: "duration" }], baseline_ref: { comparability_score: 0.85 } },
        { plan_name: "Test Plan" },
        ["Minimal blast radius"],
        "low",
      );
      expect(explanation.pilot_id).toBe("p1");
      expect(explanation.scope_selection.risk_class).toBe("low");
      expect(explanation.safety_summary.length).toBeGreaterThan(0);
      expect(explanation.success_criteria.length).toBeGreaterThan(0);
      expect(explanation.failure_criteria.length).toBeGreaterThan(0);
    });
  });
});
