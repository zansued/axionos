import { describe, it, expect } from "vitest";
import { correlateInstability, type StabilityV2Signal } from "../../supabase/functions/_shared/stabilization-v2/cross-layer-instability-correlator";
import { analyzeAdaptivePressure } from "../../supabase/functions/_shared/stabilization-v2/adaptive-pressure-analyzer";
import { validateEnvelopeTransition, getValidEnvelopeTransitions, isOverconstrained } from "../../supabase/functions/_shared/stabilization-v2/stabilization-envelope-manager";
import { computeFreezeDecisions } from "../../supabase/functions/_shared/stabilization-v2/scope-freeze-slowdown-controller";
import { synthesizeRecoveryPath } from "../../supabase/functions/_shared/stabilization-v2/stabilization-recovery-path-synthesizer";
import { analyzeOutcomes } from "../../supabase/functions/_shared/stabilization-v2/platform-stabilization-v2-outcome-tracker";
import { evaluateRollbackNeed } from "../../supabase/functions/_shared/stabilization-v2/platform-stabilization-v2-rollback-controller";
import { computeStabilityV2Health } from "../../supabase/functions/_shared/stabilization-v2/platform-stability-v2-health-model";
import { explainStabilizationV2 } from "../../supabase/functions/_shared/stabilization-v2/platform-stabilization-v2-explainer";

function makeSignal(id: string, layers: string[] = ["strategy_evolution"], severity: "low" | "moderate" | "high" | "critical" = "moderate", status = "watch"): StabilityV2Signal {
  return { id, signal_key: `sig-${id}`, signal_family: "test", source_layers: layers, scope_ref: null, signal_payload: {}, severity, confidence_score: 0.7, status };
}

describe("Sprint 46 — Platform Self-Stabilization v2", () => {
  describe("Cross-Layer Instability Correlator", () => {
    it("returns empty for no signals", () => {
      const r = correlateInstability([]);
      expect(r.clusters).toHaveLength(0);
      expect(r.total_signals).toBe(0);
    });

    it("correlates signals sharing layers", () => {
      const r = correlateInstability([
        makeSignal("s1", ["strategy_evolution", "migration"]),
        makeSignal("s2", ["migration", "tenant"]),
      ]);
      expect(r.clusters.length).toBeGreaterThanOrEqual(1);
      expect(r.total_signals).toBe(2);
    });

    it("detects cross-layer signals", () => {
      const r = correlateInstability([makeSignal("s1", ["a", "b"])]);
      expect(r.cross_layer_count).toBe(1);
    });

    it("tracks max severity", () => {
      const r = correlateInstability([makeSignal("s1", ["a"], "critical")]);
      expect(r.max_severity).toBe("critical");
    });
  });

  describe("Adaptive Pressure Analyzer", () => {
    it("returns zero for empty", () => {
      const r = analyzeAdaptivePressure([]);
      expect(r.adaptive_pressure_score).toBe(0);
      expect(r.within_tolerance).toBe(true);
    });

    it("detects high pressure", () => {
      const signals = Array.from({ length: 10 }, (_, i) => makeSignal(`s${i}`, ["a"], "high", "unstable"));
      const r = analyzeAdaptivePressure(signals, { max_simultaneous: 5 });
      expect(r.adaptive_pressure_score).toBeGreaterThan(0.5);
      expect(r.within_tolerance).toBe(false);
    });

    it("recommends suppression under extreme pressure", () => {
      const signals = Array.from({ length: 10 }, (_, i) => makeSignal(`s${i}`, ["a"], "critical", "critical"));
      const r = analyzeAdaptivePressure(signals, { max_simultaneous: 5 });
      expect(r.suppression_recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("Stabilization Envelope Manager", () => {
    it("validates valid transitions", () => {
      expect(validateEnvelopeTransition("draft", "active").valid).toBe(true);
      expect(validateEnvelopeTransition("active", "watch").valid).toBe(true);
    });

    it("rejects invalid transitions", () => {
      expect(validateEnvelopeTransition("deprecated", "active").valid).toBe(false);
    });

    it("returns valid transitions", () => {
      expect(getValidEnvelopeTransitions("draft")).toContain("active");
      expect(getValidEnvelopeTransitions("deprecated")).toHaveLength(0);
    });

    it("detects overconstraint", () => {
      const envelopes = Array.from({ length: 6 }, (_, i) => ({
        id: `e${i}`, envelope_key: `k${i}`, envelope_name: `n${i}`, target_scope: `scope${i}`, stabilization_controls: {}, activation_mode: "advisory" as const, status: "active",
      }));
      expect(isOverconstrained(envelopes).overconstrained).toBe(true);
    });
  });

  describe("Freeze/Slowdown Controller", () => {
    it("returns no decisions for empty zones", () => {
      const r = computeFreezeDecisions([], 0.3, 0);
      expect(r.decisions).toHaveLength(0);
    });

    it("applies freeze under high pressure", () => {
      const r = computeFreezeDecisions(["zone-a"], 0.9, 3);
      expect(r.decisions.length).toBe(1);
      expect(r.decisions[0].severity).toBe("required");
      expect(r.decisions[0].actions.length).toBeGreaterThan(2);
    });

    it("applies advisory under low pressure", () => {
      const r = computeFreezeDecisions(["zone-a"], 0.3, 0);
      expect(r.decisions[0].severity).toBe("advisory");
    });
  });

  describe("Recovery Path Synthesizer", () => {
    it("synthesizes a recovery path", () => {
      const r = synthesizeRecoveryPath("scope-a", 3, 0.7, 1);
      expect(r.steps.length).toBeGreaterThan(2);
      expect(r.estimated_confidence).toBeGreaterThan(0);
      expect(r.re_entry_conditions.length).toBeGreaterThan(0);
    });
  });

  describe("Outcome Tracker", () => {
    it("returns zeros for empty", () => {
      const r = analyzeOutcomes([]);
      expect(r.total_outcomes).toBe(0);
    });

    it("counts helpful/harmful", () => {
      const r = analyzeOutcomes([
        { id: "o1", outcome_status: "helpful", before_metrics: {}, after_metrics: {} },
        { id: "o2", outcome_status: "harmful", before_metrics: {}, after_metrics: {} },
      ]);
      expect(r.helpful_count).toBe(1);
      expect(r.harmful_count).toBe(1);
    });
  });

  describe("Rollback Controller", () => {
    it("no rollback needed normally", () => {
      const r = evaluateRollbackNeed("active", "helpful", 1, 0);
      expect(r.should_rollback).toBe(false);
    });

    it("triggers rollback on repeated harmful", () => {
      const r = evaluateRollbackNeed("active", "harmful", 1, 2);
      expect(r.should_rollback).toBe(true);
      expect(r.scope).toBe("full");
    });

    it("recommends release on overconstrained duration", () => {
      const r = evaluateRollbackNeed("active", "neutral", 6, 0);
      expect(r.should_rollback).toBe(true);
      expect(r.scope).toBe("release");
    });
  });

  describe("Health Model v2", () => {
    it("computes health metrics", () => {
      const correlation = correlateInstability([makeSignal("s1", ["a", "b"])]);
      const pressure = analyzeAdaptivePressure([makeSignal("s1")]);
      const health = computeStabilityV2Health(correlation, pressure, 1, 0.8);
      expect(health.overall_stability_score).toBeGreaterThan(0);
      expect(health.overall_stability_score).toBeLessThanOrEqual(1);
    });
  });

  describe("Explainability", () => {
    it("explains stabilization state", () => {
      const correlation = correlateInstability([makeSignal("s1", ["a"])]);
      const pressure = analyzeAdaptivePressure([makeSignal("s1")]);
      const health = computeStabilityV2Health(correlation, pressure, 0, 0.5);
      const explanation = explainStabilizationV2(correlation, pressure, health);
      expect(explanation.safety_notes.length).toBeGreaterThan(0);
      expect(explanation.instability_summary).toBeDefined();
    });
  });

  describe("Safety Guards", () => {
    it("correlator never produces mutation commands", () => {
      const r = correlateInstability([makeSignal("s1", ["a"])]);
      expect(JSON.stringify(r)).not.toContain("mutate");
      expect(JSON.stringify(r)).not.toContain("auto_execute");
    });

    it("freeze decisions are bounded", () => {
      const r = computeFreezeDecisions(["zone"], 0.9, 5);
      for (const d of r.decisions) {
        expect(["advisory", "recommended", "required"]).toContain(d.severity);
      }
    });
  });

  describe("Edge Cases", () => {
    it("handles empty inputs across all modules", () => {
      expect(correlateInstability([]).clusters).toHaveLength(0);
      expect(analyzeAdaptivePressure([]).adaptive_pressure_score).toBe(0);
      expect(computeFreezeDecisions([], 0, 0).decisions).toHaveLength(0);
      expect(analyzeOutcomes([]).total_outcomes).toBe(0);
    });
  });
});
