import { describe, it, expect } from "vitest";
import { detectDrift } from "../../supabase/functions/_shared/platform-stabilization/platform-drift-detector";
import { detectOscillation } from "../../supabase/functions/_shared/platform-stabilization/platform-oscillation-detector";
import { generateStabilizationProposals, validateStabilizationTarget } from "../../supabase/functions/_shared/platform-stabilization/platform-stability-guard";
import { buildStabilizationAction, buildStabilizationActions } from "../../supabase/functions/_shared/platform-stabilization/platform-stabilization-action-engine";
import { getDefaultSafeModeProfiles, selectSafeModeProfile } from "../../supabase/functions/_shared/platform-stabilization/platform-safe-mode-manager";
import { evaluateOutcome, buildOutcome } from "../../supabase/functions/_shared/platform-stabilization/platform-stabilization-outcome-tracker";
import { buildStabilizationRollback, shouldRollback } from "../../supabase/functions/_shared/platform-stabilization/platform-stabilization-rollback-engine";
import { computeStabilityScores } from "../../supabase/functions/_shared/platform-stabilization/platform-stability-model";

describe("Sprint 34 — Platform Self-Stabilization", () => {
  // ─── Drift Detection ───
  describe("Drift Detector", () => {
    it("returns no signals for healthy input", () => {
      const result = detectDrift({
        policy_lifecycle_churn: 0, strategy_lifecycle_churn: 0,
        calibration_proposal_volatility: 0, harmful_outcome_rate: 0,
        recommendation_queue_size: 0, tenant_tuning_divergence: 0,
        retry_burden_shift: 0, health_index_volatility: 0,
        portfolio_conflict_rate: 0, context_performance_variance: 0,
      });
      expect(result).toHaveLength(0);
    });

    it("detects critical drift", () => {
      const result = detectDrift({
        policy_lifecycle_churn: 0.8, strategy_lifecycle_churn: 0.7,
        calibration_proposal_volatility: 0.9, harmful_outcome_rate: 0.4,
        recommendation_queue_size: 60, tenant_tuning_divergence: 0.8,
        retry_burden_shift: 0.6, health_index_volatility: 0.5,
        portfolio_conflict_rate: 0.6, context_performance_variance: 0.6,
      });
      expect(result.length).toBeGreaterThan(5);
      expect(result.some(s => s.severity === "critical")).toBe(true);
    });

    it("includes recommendation overload signal", () => {
      const result = detectDrift({
        policy_lifecycle_churn: 0, strategy_lifecycle_churn: 0,
        calibration_proposal_volatility: 0, harmful_outcome_rate: 0,
        recommendation_queue_size: 55, tenant_tuning_divergence: 0,
        retry_burden_shift: 0, health_index_volatility: 0,
        portfolio_conflict_rate: 0, context_performance_variance: 0,
      });
      expect(result.some(s => s.drift_type === "recommendation_overload")).toBe(true);
    });

    it("produces explainable evidence refs", () => {
      const result = detectDrift({
        policy_lifecycle_churn: 0.5, strategy_lifecycle_churn: 0,
        calibration_proposal_volatility: 0, harmful_outcome_rate: 0,
        recommendation_queue_size: 0, tenant_tuning_divergence: 0,
        retry_burden_shift: 0, health_index_volatility: 0,
        portfolio_conflict_rate: 0, context_performance_variance: 0,
      });
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].evidence_refs).toBeDefined();
      expect(result[0].rationale_codes.length).toBeGreaterThan(0);
    });
  });

  // ─── Oscillation Detection ───
  describe("Oscillation Detector", () => {
    it("returns empty for empty events", () => {
      expect(detectOscillation([])).toHaveLength(0);
    });

    it("returns empty for non-oscillating events", () => {
      const events = [
        { entity_id: "e1", entity_type: "policy", transition_from: "active", transition_to: "watch", timestamp: new Date().toISOString() },
        { entity_id: "e1", entity_type: "policy", transition_from: "watch", transition_to: "deprecated", timestamp: new Date().toISOString() },
      ];
      expect(detectOscillation(events)).toHaveLength(0);
    });

    it("detects oscillation when entity flip-flops", () => {
      const now = Date.now();
      const events = [
        { entity_id: "e1", entity_type: "policy", transition_from: "active", transition_to: "watch", timestamp: new Date(now - 3000).toISOString() },
        { entity_id: "e1", entity_type: "policy", transition_from: "watch", transition_to: "active", timestamp: new Date(now - 2000).toISOString() },
        { entity_id: "e1", entity_type: "policy", transition_from: "active", transition_to: "watch", timestamp: new Date(now - 1000).toISOString() },
      ];
      const result = detectOscillation(events);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].oscillation_pattern).toBe("policy_oscillation");
    });
  });

  // ─── Stability Guard ───
  describe("Stability Guard", () => {
    it("blocks forbidden targets", () => {
      const result = validateStabilizationTarget({
        action_type: "freeze", target_scope: "global",
        target_entities: ["pipeline_topology"],
        trigger_signals: [], bounded_delta: {},
        expected_outcome: "", rollback_guard: { restore: true },
        expiry_hours: 24, action_mode: "advisory",
      });
      expect(result.allowed).toBe(false);
      expect(result.violations).toContain("forbidden_target_pipeline_topology");
    });

    it("blocks missing rollback guard", () => {
      const result = validateStabilizationTarget({
        action_type: "freeze", target_scope: "global",
        target_entities: ["some_scope"],
        trigger_signals: [], bounded_delta: {},
        expected_outcome: "", rollback_guard: {},
        expiry_hours: 24, action_mode: "advisory",
      });
      expect(result.allowed).toBe(false);
    });

    it("allows valid proposals", () => {
      const result = validateStabilizationTarget({
        action_type: "freeze", target_scope: "global",
        target_entities: ["some_scope"],
        trigger_signals: [], bounded_delta: { freeze: true },
        expected_outcome: "stabilize", rollback_guard: { restore: true },
        expiry_hours: 24, action_mode: "advisory",
      });
      expect(result.allowed).toBe(true);
    });

    it("generates proposals from drift signals", () => {
      const driftSignals = detectDrift({
        policy_lifecycle_churn: 0.7, strategy_lifecycle_churn: 0,
        calibration_proposal_volatility: 0, harmful_outcome_rate: 0,
        recommendation_queue_size: 0, tenant_tuning_divergence: 0,
        retry_burden_shift: 0, health_index_volatility: 0,
        portfolio_conflict_rate: 0, context_performance_variance: 0,
      });
      const proposals = generateStabilizationProposals(driftSignals, []);
      expect(proposals.length).toBeGreaterThan(0);
      expect(proposals[0].rollback_guard).toBeDefined();
    });
  });

  // ─── Action Engine ───
  describe("Stabilization Action Engine", () => {
    it("builds action from proposal", () => {
      const action = buildStabilizationAction({
        action_type: "freeze_policy_transitions",
        target_scope: "execution_policies",
        target_entities: ["execution_policies"],
        trigger_signals: ["policy_churn"],
        bounded_delta: { freeze_duration_hours: 24 },
        expected_outcome: "reduce_policy_transitions",
        rollback_guard: { restore_previous: true },
        expiry_hours: 24,
        action_mode: "advisory",
      });
      expect(action.status).toBe("open");
      expect(action.action_type).toBe("freeze_policy_transitions");
    });

    it("builds multiple actions", () => {
      const actions = buildStabilizationActions([
        { action_type: "a", target_scope: "s", target_entities: [], trigger_signals: [], bounded_delta: {}, expected_outcome: "", rollback_guard: { r: true }, expiry_hours: 24, action_mode: "advisory" },
        { action_type: "b", target_scope: "s", target_entities: [], trigger_signals: [], bounded_delta: {}, expected_outcome: "", rollback_guard: { r: true }, expiry_hours: 24, action_mode: "advisory" },
      ]);
      expect(actions).toHaveLength(2);
    });
  });

  // ─── Safe Mode Manager ───
  describe("Safe Mode Manager", () => {
    it("returns default profiles", () => {
      const profiles = getDefaultSafeModeProfiles();
      expect(profiles.length).toBeGreaterThanOrEqual(6);
    });

    it("selects correct profile for drift type", () => {
      const profiles = getDefaultSafeModeProfiles();
      const p = selectSafeModeProfile("harmful_outcomes", profiles);
      expect(p).not.toBeNull();
      expect(p!.profile_key).toBe("advisory_only_recovery");
    });

    it("returns null for unknown type", () => {
      expect(selectSafeModeProfile("unknown_type", getDefaultSafeModeProfiles())).toBeNull();
    });
  });

  // ─── Outcome Tracker ───
  describe("Outcome Tracker", () => {
    it("evaluates helpful outcome", () => {
      expect(evaluateOutcome({ stability_index: 0.5 }, { stability_index: 0.8 })).toBe("helpful");
    });

    it("evaluates harmful outcome", () => {
      expect(evaluateOutcome({ stability_index: 0.8 }, { stability_index: 0.3 })).toBe("harmful");
    });

    it("evaluates neutral outcome", () => {
      expect(evaluateOutcome({ stability_index: 0.5 }, { stability_index: 0.51 })).toBe("neutral");
    });

    it("evaluates inconclusive for empty", () => {
      expect(evaluateOutcome({}, {})).toBe("inconclusive");
    });

    it("builds outcome record", () => {
      const outcome = buildOutcome("action-1", { churn_index: 0.5 }, { churn_index: 0.2 });
      expect(outcome.stabilization_action_id).toBe("action-1");
      expect(outcome.outcome_status).toBe("helpful");
    });
  });

  // ─── Rollback Engine ───
  describe("Rollback Engine", () => {
    it("builds rollback record", () => {
      const rb = buildStabilizationRollback({
        stabilization_action_id: "act-1",
        restored_state: { value: 0.5 },
        rollback_reason: { manual: true },
      });
      expect(rb.rollback_mode).toBe("manual");
      expect(rb.stabilization_action_id).toBe("act-1");
    });

    it("recommends rollback for harmful", () => {
      expect(shouldRollback("harmful", "advisory").recommend).toBe(true);
    });

    it("recommends rollback for inconclusive bounded_auto", () => {
      expect(shouldRollback("inconclusive", "bounded_auto").recommend).toBe(true);
    });

    it("does not recommend rollback for helpful", () => {
      expect(shouldRollback("helpful", "advisory").recommend).toBe(false);
    });
  });

  // ─── Stability Model ───
  describe("Stability Scoring Model", () => {
    it("computes scores for healthy system", () => {
      const scores = computeStabilityScores({
        healthy_signals: 10, watch_signals: 0, unstable_signals: 0, critical_signals: 0, total_signals: 10,
        policy_transitions: 0, strategy_transitions: 0, calibration_proposals: 0, total_adaptive_events: 10,
        oscillation_count: 0, oscillation_entities: 0,
        helpful_outcomes: 5, harmful_outcomes: 0, total_outcomes: 5,
        successful_rollbacks: 0, total_rollbacks: 0,
        stabilization_applied: 3, stabilization_helpful: 3,
      });
      expect(scores.platform_stability_index).toBe(1);
      expect(scores.oscillation_index).toBe(0);
      expect(scores.recovery_efficiency_index).toBe(1);
    });

    it("computes scores for unstable system", () => {
      const scores = computeStabilityScores({
        healthy_signals: 2, watch_signals: 3, unstable_signals: 3, critical_signals: 2, total_signals: 10,
        policy_transitions: 5, strategy_transitions: 5, calibration_proposals: 5, total_adaptive_events: 15,
        oscillation_count: 4, oscillation_entities: 4,
        helpful_outcomes: 1, harmful_outcomes: 3, total_outcomes: 5,
        successful_rollbacks: 2, total_rollbacks: 2,
        stabilization_applied: 5, stabilization_helpful: 1,
      });
      expect(scores.platform_stability_index).toBeLessThan(0.5);
      expect(scores.adaptation_volatility_index).toBeGreaterThan(0.5);
    });

    it("returns bounded values", () => {
      const scores = computeStabilityScores({
        healthy_signals: 0, watch_signals: 0, unstable_signals: 0, critical_signals: 0, total_signals: 1,
        policy_transitions: 0, strategy_transitions: 0, calibration_proposals: 0, total_adaptive_events: 1,
        oscillation_count: 0, oscillation_entities: 0,
        helpful_outcomes: 0, harmful_outcomes: 0, total_outcomes: 0,
        successful_rollbacks: 0, total_rollbacks: 0,
        stabilization_applied: 0, stabilization_helpful: 0,
      });
      for (const val of Object.values(scores)) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      }
    });
  });

  // ─── Forbidden Mutation Guards ───
  describe("Forbidden Mutation Guards", () => {
    const forbidden = [
      "pipeline_topology", "stage_ordering", "governance_rules",
      "billing_logic", "plan_enforcement", "execution_contracts",
      "hard_safety_constraints", "strategy_family_definitions",
      "execution_policy_definitions",
    ];

    for (const target of forbidden) {
      it(`blocks ${target}`, () => {
        const result = validateStabilizationTarget({
          action_type: "test", target_scope: "global",
          target_entities: [target],
          trigger_signals: [], bounded_delta: {},
          expected_outcome: "", rollback_guard: { r: true },
          expiry_hours: 24, action_mode: "advisory",
        });
        expect(result.allowed).toBe(false);
      });
    }
  });

  // ─── Tenant Isolation ───
  describe("Tenant Isolation", () => {
    it("drift detection is tenant-agnostic (pure function)", () => {
      const r1 = detectDrift({ policy_lifecycle_churn: 0.5, strategy_lifecycle_churn: 0, calibration_proposal_volatility: 0, harmful_outcome_rate: 0, recommendation_queue_size: 0, tenant_tuning_divergence: 0, retry_burden_shift: 0, health_index_volatility: 0, portfolio_conflict_rate: 0, context_performance_variance: 0 });
      const r2 = detectDrift({ policy_lifecycle_churn: 0.5, strategy_lifecycle_churn: 0, calibration_proposal_volatility: 0, harmful_outcome_rate: 0, recommendation_queue_size: 0, tenant_tuning_divergence: 0, retry_burden_shift: 0, health_index_volatility: 0, portfolio_conflict_rate: 0, context_performance_variance: 0 });
      expect(r1).toEqual(r2);
    });
  });
});
