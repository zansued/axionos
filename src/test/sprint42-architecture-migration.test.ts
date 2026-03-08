import { describe, it, expect } from "vitest";
import { canTransition, getValidTransitions, isTerminal, isActive } from "../../supabase/functions/_shared/architecture-migration/architecture-migration-state-machine";
import { canActivateNextPhase, buildDefaultPhases } from "../../supabase/functions/_shared/architecture-migration/architecture-staged-rollout-orchestrator";
import { evaluateCheckpoint } from "../../supabase/functions/_shared/architecture-migration/architecture-checkpoint-gate-engine";
import { selectMigrationSlices } from "../../supabase/functions/_shared/architecture-migration/architecture-migration-slice-selector";
import { assessMigrationRisk } from "../../supabase/functions/_shared/architecture-migration/architecture-migration-risk-monitor";
import { evaluateMigrationRollback } from "../../supabase/functions/_shared/architecture-migration/architecture-migration-rollback-controller";
import { canTransitionReview, getValidReviewTransitions } from "../../supabase/functions/_shared/architecture-migration/architecture-migration-review-manager";
import { buildMigrationExplanation } from "../../supabase/functions/_shared/architecture-migration/architecture-migration-explainer";

describe("Sprint 42 — Controlled Architecture Migration Execution", () => {
  describe("State Machine", () => {
    it("allows valid transitions", () => {
      expect(canTransition("draft", "approved")).toBe(true);
      expect(canTransition("approved", "preparing")).toBe(true);
      expect(canTransition("executing", "paused")).toBe(true);
      expect(canTransition("executing", "completed")).toBe(true);
    });
    it("rejects invalid transitions", () => {
      expect(canTransition("draft", "executing")).toBe(false);
      expect(canTransition("archived", "approved")).toBe(false);
    });
    it("identifies terminal states", () => {
      expect(isTerminal("completed")).toBe(true);
      expect(isTerminal("archived")).toBe(true);
      expect(isTerminal("executing")).toBe(false);
    });
    it("identifies active states", () => {
      expect(isActive("executing")).toBe(true);
      expect(isActive("preparing")).toBe(true);
      expect(isActive("draft")).toBe(false);
    });
    it("returns valid transitions", () => {
      expect(getValidTransitions("executing")).toContain("completed");
      expect(getValidTransitions("archived")).toHaveLength(0);
    });
  });

  describe("Staged Rollout Orchestrator", () => {
    it("allows next phase when current completed and checkpoint passed", () => {
      const phases = buildDefaultPhases([
        { name: "Phase 1", slice: { ws: "a" } },
        { name: "Phase 2", slice: { ws: "b" } },
      ]);
      phases[0].status = "completed";
      const result = canActivateNextPhase(phases, 0, true);
      expect(result.can_activate).toBe(true);
      expect(result.phase_number).toBe(1);
    });
    it("blocks when checkpoint not passed", () => {
      const phases = buildDefaultPhases([{ name: "P1", slice: {} }, { name: "P2", slice: {} }]);
      phases[0].status = "completed";
      expect(canActivateNextPhase(phases, 0, false).can_activate).toBe(false);
    });
    it("blocks when current phase not completed", () => {
      const phases = buildDefaultPhases([{ name: "P1", slice: {} }, { name: "P2", slice: {} }]);
      phases[0].status = "executing";
      expect(canActivateNextPhase(phases, 0, true).can_activate).toBe(false);
    });
    it("handles all phases completed", () => {
      const phases = buildDefaultPhases([{ name: "P1", slice: {} }]);
      phases[0].status = "completed";
      expect(canActivateNextPhase(phases, 0, true).can_activate).toBe(false);
    });
  });

  describe("Checkpoint Gate Engine", () => {
    it("passes valid checkpoint", () => {
      const result = evaluateCheckpoint({
        contract_compliant: true, rollback_ready: true, tenant_isolation_verified: true,
        observability_coverage: 0.8, blast_radius_contained: true, baseline_comparability_preserved: true,
        strategy_policy_compatible: true, semantic_retrieval_deps_ok: true,
      });
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
    it("blocks without contract compliance", () => {
      const result = evaluateCheckpoint({
        contract_compliant: false, rollback_ready: true, tenant_isolation_verified: true,
        observability_coverage: 0.8, blast_radius_contained: true, baseline_comparability_preserved: true,
        strategy_policy_compatible: true, semantic_retrieval_deps_ok: true,
      });
      expect(result.passed).toBe(false);
    });
    it("blocks without rollback readiness", () => {
      const result = evaluateCheckpoint({
        contract_compliant: true, rollback_ready: false, tenant_isolation_verified: true,
        observability_coverage: 0.8, blast_radius_contained: true, baseline_comparability_preserved: true,
        strategy_policy_compatible: true, semantic_retrieval_deps_ok: true,
      });
      expect(result.passed).toBe(false);
    });
    it("blocks low observability", () => {
      const result = evaluateCheckpoint({
        contract_compliant: true, rollback_ready: true, tenant_isolation_verified: true,
        observability_coverage: 0.3, blast_radius_contained: true, baseline_comparability_preserved: true,
        strategy_policy_compatible: true, semantic_retrieval_deps_ok: true,
      });
      expect(result.passed).toBe(false);
    });
    it("warns on moderate observability", () => {
      const result = evaluateCheckpoint({
        contract_compliant: true, rollback_ready: true, tenant_isolation_verified: true,
        observability_coverage: 0.6, blast_radius_contained: true, baseline_comparability_preserved: true,
        strategy_policy_compatible: true, semantic_retrieval_deps_ok: true,
      });
      expect(result.passed).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("Migration Slice Selector", () => {
    it("selects safe slices and excludes risky ones", () => {
      const result = selectMigrationSlices([
        { slice_id: "a", slice_type: "ws", risk_score: 0.1, stability_score: 0.9, observability_coverage: 0.8, under_stabilization: false, active_migration_overlap: false },
        { slice_id: "b", slice_type: "ws", risk_score: 0.8, stability_score: 0.9, observability_coverage: 0.8, under_stabilization: false, active_migration_overlap: false },
        { slice_id: "c", slice_type: "ws", risk_score: 0.1, stability_score: 0.9, observability_coverage: 0.8, under_stabilization: true, active_migration_overlap: false },
      ]);
      expect(result.selected_slices).toHaveLength(1);
      expect(result.selected_slices[0].slice_id).toBe("a");
      expect(result.excluded_slices).toHaveLength(2);
    });
    it("handles empty candidates", () => {
      const result = selectMigrationSlices([]);
      expect(result.selected_slices).toHaveLength(0);
      expect(result.total_risk_score).toBe(0);
    });
  });

  describe("Migration Risk Monitor", () => {
    it("detects low risk", () => {
      const result = assessMigrationRisk({
        migration_id: "m1", phase_number: 0, degradation_vs_baseline: 0, repair_burden_increase: 0,
        validation_failure_increase: 0, tenant_impact_drift: 0, observability_blind_spots: 0,
        rollback_trigger_proximity: 0, policy_strategy_side_effects: [], checkpoint_drift: 0,
      });
      expect(result.risk_level).toBe("low");
      expect(result.recommendation).toBe("continue");
    });
    it("detects critical on rollback proximity", () => {
      const result = assessMigrationRisk({
        migration_id: "m1", phase_number: 0, degradation_vs_baseline: 0, repair_burden_increase: 0,
        validation_failure_increase: 0, tenant_impact_drift: 0, observability_blind_spots: 0,
        rollback_trigger_proximity: 0.9, policy_strategy_side_effects: [], checkpoint_drift: 0,
      });
      expect(result.risk_level).toBe("critical");
      expect(result.recommendation).toBe("rollback");
    });
    it("detects high risk on repair burden spike", () => {
      const result = assessMigrationRisk({
        migration_id: "m1", phase_number: 0, degradation_vs_baseline: 0, repair_burden_increase: 0.5,
        validation_failure_increase: 0, tenant_impact_drift: 0, observability_blind_spots: 0,
        rollback_trigger_proximity: 0, policy_strategy_side_effects: [], checkpoint_drift: 0,
      });
      expect(result.risk_level).toBe("high");
    });
  });

  describe("Rollback Controller", () => {
    it("allows rollback of executing migration", () => {
      const result = evaluateMigrationRollback({
        migration_id: "m1", migration_state: "executing", rollback_scope: "full",
        rollback_mode: "manual", rollback_reason: {}, baseline_ref: {},
      });
      expect(result.can_rollback).toBe(true);
    });
    it("rejects rollback of draft", () => {
      const result = evaluateMigrationRollback({
        migration_id: "m1", migration_state: "draft", rollback_scope: "full",
        rollback_mode: "manual", rollback_reason: {}, baseline_ref: {},
      });
      expect(result.can_rollback).toBe(false);
    });
  });

  describe("Review Manager", () => {
    it("allows valid review transitions", () => {
      expect(canTransitionReview("approved", "preparing")).toBe(true);
      expect(canTransitionReview("executing", "paused")).toBe(true);
    });
    it("rejects invalid review transitions", () => {
      expect(canTransitionReview("archived", "executing")).toBe(false);
    });
    it("returns valid review transitions", () => {
      const t = getValidReviewTransitions("executing");
      expect(t).toContain("completed");
      expect(t).toContain("paused");
    });
  });

  describe("Migration Explainability", () => {
    it("builds complete explanation", () => {
      const explanation = buildMigrationExplanation(
        { id: "m1", plan_id: "p1", pilot_id: "pi1", phase_sequence: [{ scope_slice: { ws: "a" } }], active_phase: 0, rollout_profile: {} },
        ["high_degradation"],
      );
      expect(explanation.migration_id).toBe("m1");
      expect(explanation.pilot_reference).toBe("pi1");
      expect(explanation.risk_summary).toContain("high_degradation");
      expect(explanation.safety_summary.length).toBeGreaterThan(0);
      expect(explanation.success_criteria.length).toBeGreaterThan(0);
    });
    it("handles empty risk flags", () => {
      const explanation = buildMigrationExplanation({ id: "m2", plan_id: "p2", phase_sequence: [], active_phase: 0 }, []);
      expect(explanation.risk_summary).toContain("No active risk signals");
    });
  });
});
