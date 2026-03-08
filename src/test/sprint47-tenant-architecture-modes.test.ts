import { describe, it, expect } from "vitest";
import { selectTenantArchitectureMode } from "../../supabase/functions/_shared/tenant-architecture/tenant-architecture-mode-selector";
import { checkFragmentationGuard, validateMutationSafety } from "../../supabase/functions/_shared/tenant-architecture/tenant-architecture-anti-fragmentation-guard";
import { buildEnvelope, mergeEnvelopes, getControlValue } from "../../supabase/functions/_shared/tenant-architecture/tenant-architecture-envelope-manager";
import { detectDivergenceDrift } from "../../supabase/functions/_shared/tenant-architecture/tenant-architecture-divergence-detector";
import { analyzeOutcome } from "../../supabase/functions/_shared/tenant-architecture/tenant-architecture-mode-outcome-tracker";
import { generateRecommendations } from "../../supabase/functions/_shared/tenant-architecture/tenant-architecture-recommendation-engine";
import { computeModeHealth } from "../../supabase/functions/_shared/tenant-architecture/tenant-architecture-mode-health-model";
import { canTransitionModeReview, validateModeReviewTransition } from "../../supabase/functions/_shared/tenant-architecture/tenant-architecture-mode-review-manager";
import { explainModeDecision } from "../../supabase/functions/_shared/tenant-architecture/tenant-architecture-mode-explainer";

describe("Sprint 47 — Tenant-Aware Architecture Modes", () => {
  // Mode Selector
  describe("Mode Selector", () => {
    it("returns null when no active modes", () => {
      const r = selectTenantArchitectureMode([], [], { organization_id: "org1" });
      expect(r.selected_mode).toBeNull();
      expect(r.rationale_codes).toContain("no_active_modes_available");
    });

    it("selects mode with preference boost", () => {
      const modes = [
        { mode_key: "balanced_default_architecture", mode_name: "Default", mode_scope: "global", status: "active", activation_mode: "manual_only", allowed_envelope: {}, anti_fragmentation_constraints: {} },
        { mode_key: "conservative_change_architecture", mode_name: "Conservative", mode_scope: "global", status: "active", activation_mode: "manual_only", allowed_envelope: {}, anti_fragmentation_constraints: {} },
      ];
      const prefs = [{ preferred_mode_refs: [{ mode_key: "conservative_change_architecture", weight: 1 }], status: "active" }];
      const r = selectTenantArchitectureMode(modes, prefs, { organization_id: "org1" });
      expect(r.selected_mode?.mode_key).toBe("conservative_change_architecture");
      expect(r.confidence_score).toBeGreaterThan(0.5);
    });

    it("penalizes growth modes under stability pressure", () => {
      const modes = [
        { mode_key: "balanced_default_architecture", mode_name: "Default", mode_scope: "global", status: "active", activation_mode: "manual_only", allowed_envelope: {}, anti_fragmentation_constraints: {} },
        { mode_key: "tenant_growth_sensitive_architecture", mode_name: "Growth", mode_scope: "global", status: "active", activation_mode: "manual_only", allowed_envelope: {}, anti_fragmentation_constraints: {} },
      ];
      const r = selectTenantArchitectureMode(modes, [], { organization_id: "org1", stability_pressure: 0.9 });
      expect(r.selected_mode?.mode_key).toBe("balanced_default_architecture");
    });
  });

  // Anti-Fragmentation Guard
  describe("Anti-Fragmentation Guard", () => {
    it("blocks forbidden mutations", () => {
      const r = checkFragmentationGuard({
        organization_id: "org1", mode_key: "test", mode_scope: "organization",
        anti_fragmentation_constraints: { alter_governance_rules: true },
        global_mode_count: 3, org_mode_count: 2,
      });
      expect(r.allowed).toBe(false);
      expect(r.blocked_changes).toContain("alter_governance_rules");
    });

    it("flags too many org modes", () => {
      const r = checkFragmentationGuard({
        organization_id: "org1", mode_key: "test", mode_scope: "organization",
        anti_fragmentation_constraints: {},
        global_mode_count: 10, org_mode_count: 6,
      });
      expect(r.divergence_flags).toContain("too_many_org_modes");
    });

    it("validates mutation safety", () => {
      expect(validateMutationSafety("alter_billing_logic").allowed).toBe(false);
      expect(validateMutationSafety("update_mode_preference").allowed).toBe(true);
    });
  });

  // Envelope Manager
  describe("Envelope Manager", () => {
    it("builds envelope from allowed controls", () => {
      const env = buildEnvelope("test_mode", { stricter_observability: true, higher_validation_depth: "strict" }, { org: "1" });
      expect(env.mode_key).toBe("test_mode");
      expect(env.controls.length).toBe(2);
    });

    it("merges envelopes with override priority", () => {
      const base = buildEnvelope("base", { stricter_observability: true }, {});
      const override = buildEnvelope("over", { stricter_observability: false, higher_validation_depth: "strict" }, {});
      const merged = mergeEnvelopes(base, override);
      expect(getControlValue(merged, "stricter_observability")).toBe(false);
      expect(getControlValue(merged, "higher_validation_depth")).toBe("strict");
    });
  });

  // Divergence Detector
  describe("Divergence Detector", () => {
    it("detects divergence from global default", () => {
      const r = detectDivergenceDrift({
        organization_id: "org1", active_mode_key: "custom_mode",
        global_default_mode_key: "balanced_default_architecture",
        local_exception_count: 0, mode_selection_confidence: 0.8,
        mode_stability_history: [], override_count: 0,
      });
      expect(r.divergence_drift_score).toBeGreaterThan(0);
      expect(r.drift_reason_codes).toContain("mode_diverges_from_global_default");
    });

    it("flags excessive local exceptions", () => {
      const r = detectDivergenceDrift({
        organization_id: "org1", active_mode_key: "balanced_default_architecture",
        global_default_mode_key: "balanced_default_architecture",
        local_exception_count: 10, mode_selection_confidence: 0.8,
        mode_stability_history: [], override_count: 0,
      });
      expect(r.drift_reason_codes).toContain("excessive_local_exceptions");
    });

    it("handles empty input gracefully", () => {
      const r = detectDivergenceDrift({
        organization_id: "org1", active_mode_key: "balanced_default_architecture",
        global_default_mode_key: "balanced_default_architecture",
        local_exception_count: 0, mode_selection_confidence: 0.9,
        mode_stability_history: [], override_count: 0,
      });
      expect(r.divergence_drift_score).toBe(0);
    });
  });

  // Outcome Tracker
  describe("Outcome Tracker", () => {
    it("detects helpful outcome", () => {
      const r = analyzeOutcome({
        mode_key: "test", organization_id: "org1",
        baseline: { architecture_fitness: 0.5, stability_score: 0.5, migration_readiness: 0.5 },
        current: { architecture_fitness: 0.7, stability_score: 0.7, migration_readiness: 0.6 },
      });
      expect(r.outcome_status).toBe("helpful");
    });

    it("detects harmful outcome", () => {
      const r = analyzeOutcome({
        mode_key: "test", organization_id: "org1",
        baseline: { architecture_fitness: 0.7, stability_score: 0.7, migration_readiness: 0.7 },
        current: { architecture_fitness: 0.3, stability_score: 0.3, migration_readiness: 0.4 },
      });
      expect(r.outcome_status).toBe("harmful");
    });

    it("returns inconclusive with no data", () => {
      const r = analyzeOutcome({ mode_key: "test", organization_id: "org1", baseline: {}, current: {} });
      expect(r.outcome_status).toBe("inconclusive");
    });
  });

  // Recommendation Engine
  describe("Recommendation Engine", () => {
    it("recommends deprecation for low-value modes", () => {
      const recs = generateRecommendations({
        organization_id: "org1",
        modes: [{ mode_key: "weak_mode", status: "active", support_count: 1, divergence_score: 0.2 }],
        fragmentation_risk_score: 0.3, divergence_drift_score: 0.2,
        outcome_history: [],
      });
      expect(recs.some((r) => r.recommendation_type === "deprecate_low_value_mode")).toBe(true);
    });

    it("recommends return to default on high divergence", () => {
      const recs = generateRecommendations({
        organization_id: "org1", modes: [],
        fragmentation_risk_score: 0.3, divergence_drift_score: 0.8,
        outcome_history: [],
      });
      expect(recs.some((r) => r.recommendation_type === "force_return_to_default")).toBe(true);
    });

    it("returns empty for healthy state", () => {
      const recs = generateRecommendations({
        organization_id: "org1",
        modes: [{ mode_key: "good", status: "active", support_count: 10, divergence_score: 0.1 }],
        fragmentation_risk_score: 0.1, divergence_drift_score: 0.1,
        outcome_history: [],
      });
      expect(recs.length).toBe(0);
    });
  });

  // Health Model
  describe("Health Model", () => {
    it("computes healthy status", () => {
      const h = computeModeHealth({
        active_mode_count: 2, total_mode_count: 5,
        fragmentation_risk_score: 0.1, divergence_drift_score: 0.1,
        mode_stability_score: 0.9, specialization_value_score: 0.8,
        architecture_fitness_score: 0.9, anti_fragmentation_violations: 0,
      });
      expect(h.health_status).toBe("healthy");
      expect(h.overall_health_score).toBeGreaterThan(0.7);
    });

    it("detects critical health", () => {
      const h = computeModeHealth({
        active_mode_count: 10, total_mode_count: 10,
        fragmentation_risk_score: 0.9, divergence_drift_score: 0.9,
        mode_stability_score: 0.1, specialization_value_score: 0.1,
        architecture_fitness_score: 0.1, anti_fragmentation_violations: 5,
      });
      expect(h.health_status).toBe("critical");
    });
  });

  // Review Manager
  describe("Review Manager", () => {
    it("allows valid transitions", () => {
      expect(canTransitionModeReview("reviewed", "accepted")).toBe(true);
      expect(canTransitionModeReview("accepted", "archived")).toBe(true);
    });

    it("blocks invalid transitions", () => {
      expect(canTransitionModeReview("archived", "accepted")).toBe(false);
      expect(canTransitionModeReview("rejected", "reviewed")).toBe(false);
    });

    it("validates transition with reason", () => {
      const r = validateModeReviewTransition("reviewed", "accepted");
      expect(r.valid).toBe(true);
      const r2 = validateModeReviewTransition("archived", "accepted");
      expect(r2.valid).toBe(false);
    });
  });

  // Explainer
  describe("Explainer", () => {
    it("produces complete explanation", () => {
      const e = explainModeDecision({
        selected_mode_key: "conservative_change_architecture",
        scope_ref: { organization_id: "org1", workspace_id: "ws1" },
        envelope_controls: [{ control_type: "stricter_observability", control_value: true }],
        fragmentation_risk_score: 0.2,
        divergence_flags: [],
        recommendations: [],
        rationale_codes: ["selected"],
      });
      expect(e.selected_mode).toBe("conservative_change_architecture");
      expect(e.safety_notes.length).toBeGreaterThan(0);
      expect(e.anti_fragmentation_status).toBe("low_risk");
    });

    it("flags high fragmentation risk", () => {
      const e = explainModeDecision({
        selected_mode_key: "test",
        scope_ref: {},
        envelope_controls: [],
        fragmentation_risk_score: 0.8,
        divergence_flags: ["a", "b", "c"],
        recommendations: [],
        rationale_codes: [],
      });
      expect(e.anti_fragmentation_status).toBe("high_risk");
      expect(e.consolidation_triggers.length).toBeGreaterThan(0);
    });
  });

  // Determinism
  describe("Deterministic Outputs", () => {
    it("produces same result for same input", () => {
      const input = {
        organization_id: "org1", active_mode_key: "test",
        global_default_mode_key: "balanced_default_architecture",
        local_exception_count: 3, mode_selection_confidence: 0.6,
        mode_stability_history: [], override_count: 2,
      };
      const r1 = detectDivergenceDrift(input);
      const r2 = detectDivergenceDrift(input);
      expect(r1.divergence_drift_score).toBe(r2.divergence_drift_score);
    });
  });
});
