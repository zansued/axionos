import { describe, it, expect } from "vitest";
import { aggregateFitnessSignals } from "../../supabase/functions/_shared/architecture-fitness/architecture-fitness-signal-aggregator";
import { scoreDimension, scoreAllDimensions } from "../../supabase/functions/_shared/architecture-fitness/architecture-fitness-scoring-engine";
import { analyzeBoundaryFitness } from "../../supabase/functions/_shared/architecture-fitness/architecture-boundary-fitness-analyzer";
import { analyzeIsolationFitness } from "../../supabase/functions/_shared/architecture-fitness/architecture-isolation-fitness-analyzer";
import { analyzeObservabilityFitness } from "../../supabase/functions/_shared/architecture-fitness/architecture-observability-fitness-analyzer";
import { trackFitnessTrend } from "../../supabase/functions/_shared/architecture-fitness/architecture-fitness-trend-tracker";
import { generateFitnessRecommendations } from "../../supabase/functions/_shared/architecture-fitness/architecture-fitness-recommendation-engine";
import { canTransitionRecommendation, canTransitionReview } from "../../supabase/functions/_shared/architecture-fitness/architecture-fitness-review-manager";
import { computeFitnessHealth } from "../../supabase/functions/_shared/architecture-fitness/architecture-fitness-health-model";
import { buildFitnessExplanation } from "../../supabase/functions/_shared/architecture-fitness/architecture-fitness-explainer";

describe("Sprint 44 — Architecture Fitness Functions", () => {
  describe("Signal Aggregator", () => {
    it("aggregates signals by dimension", () => {
      const result = aggregateFitnessSignals([
        { source_layer: "intelligence", signal_type: "metric", dimension_key: "boundary_clarity", value: 0.8, scope_ref: "s1", recurrence: 1, timestamp: "2026-01-01" },
        { source_layer: "calibration", signal_type: "metric", dimension_key: "boundary_clarity", value: 0.6, scope_ref: "s2", recurrence: 2, timestamp: "2026-01-02" },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].signal_count).toBe(2);
      expect(result[0].average_value).toBe(0.7);
    });
    it("handles empty input", () => {
      expect(aggregateFitnessSignals([])).toHaveLength(0);
    });
    it("detects degradation indicator", () => {
      const result = aggregateFitnessSignals([
        { source_layer: "a", signal_type: "m", dimension_key: "d1", value: 0.3, scope_ref: "s", recurrence: 5, timestamp: "2026-01-01" },
      ]);
      expect(result[0].degradation_indicator).toBe(true);
    });
  });

  describe("Scoring Engine", () => {
    it("scores dimension within healthy range", () => {
      const result = scoreDimension({ dimension_key: "d1", signals: [{ value: 0.9, weight: 1, recurrence: 0 }], warning_threshold: 0.5, critical_threshold: 0.3 });
      expect(result.degradation_status).toBe("healthy");
      expect(result.dimension_score).toBe(0.9);
    });
    it("scores critical dimension", () => {
      const result = scoreDimension({ dimension_key: "d2", signals: [{ value: 0.2, weight: 1, recurrence: 0 }], warning_threshold: 0.5, critical_threshold: 0.3 });
      expect(result.degradation_status).toBe("critical");
    });
    it("scores degrading dimension", () => {
      const result = scoreDimension({ dimension_key: "d3", signals: [{ value: 0.4, weight: 1, recurrence: 0 }], warning_threshold: 0.5, critical_threshold: 0.3 });
      expect(result.degradation_status).toBe("degrading");
    });
    it("handles no signals", () => {
      const result = scoreDimension({ dimension_key: "empty", signals: [], warning_threshold: 0.5, critical_threshold: 0.3 });
      expect(result.dimension_score).toBe(1);
    });
    it("scores all dimensions sorted", () => {
      const results = scoreAllDimensions([
        { dimension_key: "a", signals: [{ value: 0.9, weight: 1, recurrence: 0 }], warning_threshold: 0.5, critical_threshold: 0.3 },
        { dimension_key: "b", signals: [{ value: 0.2, weight: 1, recurrence: 0 }], warning_threshold: 0.5, critical_threshold: 0.3 },
      ]);
      expect(results[0].dimension_key).toBe("b");
    });
  });

  describe("Boundary Fitness Analyzer", () => {
    it("analyzes healthy boundaries", () => {
      const result = analyzeBoundaryFitness([{ boundary_id: "b1", boundary_name: "B1", cross_layer_leakage_count: 0, coupling_score: 0.1, workaround_count: 0, responsibility_clarity: 0.9 }]);
      expect(result.coupling_risk).toBe("low");
      expect(result.boundary_fitness_score).toBeGreaterThan(0.5);
    });
    it("detects high coupling", () => {
      const result = analyzeBoundaryFitness([{ boundary_id: "b2", boundary_name: "B2", cross_layer_leakage_count: 5, coupling_score: 0.9, workaround_count: 3, responsibility_clarity: 0.3 }]);
      expect(result.coupling_risk).not.toBe("low");
      expect(result.ambiguity_flags.length).toBeGreaterThan(0);
    });
    it("handles empty", () => {
      const result = analyzeBoundaryFitness([]);
      expect(result.boundary_fitness_score).toBe(1);
    });
  });

  describe("Isolation Fitness Analyzer", () => {
    it("analyzes healthy isolation", () => {
      const result = analyzeIsolationFitness([{ scope_id: "s1", scope_name: "S1", tenant_isolation_stress: 0.1, scope_overlap_risk: 0.1, migration_pressure: 0.1, retrieval_leakage_risk: 0.1, tenant_divergence: 0.1 }]);
      expect(result.isolation_fitness_score).toBeGreaterThan(0.7);
    });
    it("detects leakage risk", () => {
      const result = analyzeIsolationFitness([{ scope_id: "s2", scope_name: "S2", tenant_isolation_stress: 0.8, scope_overlap_risk: 0.7, migration_pressure: 0.6, retrieval_leakage_risk: 0.8, tenant_divergence: 0.6 }]);
      expect(result.leakage_risk_flags.length).toBeGreaterThan(0);
    });
    it("handles empty", () => {
      expect(analyzeIsolationFitness([]).isolation_fitness_score).toBe(1);
    });
  });

  describe("Observability Fitness Analyzer", () => {
    it("analyzes good coverage", () => {
      const result = analyzeObservabilityFitness([{ layer_id: "l1", layer_name: "L1", telemetry_coverage: 0.9, explainability_density: 0.8, blind_spot_count: 0, critical_path_coverage: 0.9 }]);
      expect(result.observability_fitness_score).toBeGreaterThan(0.7);
    });
    it("detects blind spots", () => {
      const result = analyzeObservabilityFitness([{ layer_id: "l2", layer_name: "L2", telemetry_coverage: 0.3, explainability_density: 0.2, blind_spot_count: 3, critical_path_coverage: 0.4 }]);
      expect(result.blind_spot_flags.length).toBeGreaterThan(0);
    });
    it("handles empty", () => {
      expect(analyzeObservabilityFitness([]).observability_fitness_score).toBe(1);
    });
  });

  describe("Trend Tracker", () => {
    it("detects improving trend", () => {
      const trends = trackFitnessTrend([
        { dimension_key: "d1", score: 0.3, timestamp: "2026-01-01" },
        { dimension_key: "d1", score: 0.5, timestamp: "2026-01-02" },
        { dimension_key: "d1", score: 0.7, timestamp: "2026-01-03" },
        { dimension_key: "d1", score: 0.9, timestamp: "2026-01-04" },
      ]);
      expect(trends[0].trend).toBe("improving");
    });
    it("detects degrading trend", () => {
      const trends = trackFitnessTrend([
        { dimension_key: "d2", score: 0.9, timestamp: "2026-01-01" },
        { dimension_key: "d2", score: 0.7, timestamp: "2026-01-02" },
        { dimension_key: "d2", score: 0.5, timestamp: "2026-01-03" },
        { dimension_key: "d2", score: 0.3, timestamp: "2026-01-04" },
      ]);
      expect(trends[0].trend).toBe("degrading");
    });
    it("handles single point", () => {
      const trends = trackFitnessTrend([{ dimension_key: "d3", score: 0.5, timestamp: "2026-01-01" }]);
      expect(trends[0].trend).toBe("stable");
    });
  });

  describe("Recommendation Engine", () => {
    it("generates critical recs", () => {
      const recs = generateFitnessRecommendations([{ dimension_key: "d1", score: 0.1, degradation_status: "critical", trend: "degrading", affected_scopes: ["global"], confidence: 0.9 }]);
      expect(recs.some(r => r.recommendation_type === "urgent_architecture_review")).toBe(true);
    });
    it("generates trend recs", () => {
      const recs = generateFitnessRecommendations([{ dimension_key: "d2", score: 0.6, degradation_status: "watch", trend: "degrading", affected_scopes: ["org1"], confidence: 0.7 }]);
      expect(recs.some(r => r.recommendation_type === "trend_intervention")).toBe(true);
    });
    it("generates stabilize recs for oscillating", () => {
      const recs = generateFitnessRecommendations([{ dimension_key: "d3", score: 0.5, degradation_status: "watch", trend: "oscillating", affected_scopes: [], confidence: 0.6 }]);
      expect(recs.some(r => r.recommendation_type === "stabilize_dimension")).toBe(true);
    });
  });

  describe("Review Manager", () => {
    it("allows valid rec transitions", () => {
      expect(canTransitionRecommendation("open", "reviewed")).toBe(true);
      expect(canTransitionRecommendation("reviewed", "accepted")).toBe(true);
    });
    it("rejects invalid rec transitions", () => {
      expect(canTransitionRecommendation("accepted", "open")).toBe(false);
    });
    it("allows valid review transitions", () => {
      expect(canTransitionReview("reviewed", "accepted")).toBe(true);
      expect(canTransitionReview("accepted", "archived")).toBe(true);
    });
    it("rejects invalid review transitions", () => {
      expect(canTransitionReview("archived", "reviewed")).toBe(false);
    });
  });

  describe("Health Model", () => {
    it("computes healthy state", () => {
      const health = computeFitnessHealth({ boundary_fitness: 0.9, isolation_fitness: 0.9, observability_fitness: 0.8, change_density_resilience: 0.8, migration_readiness: 0.8, adaptation_stability: 0.8, dimension_count: 5, critical_dimensions: 0, degrading_dimensions: 0 });
      expect(health.overall_health).toBe("healthy");
    });
    it("detects critical state", () => {
      const health = computeFitnessHealth({ boundary_fitness: 0.2, isolation_fitness: 0.2, observability_fitness: 0.2, change_density_resilience: 0.2, migration_readiness: 0.2, adaptation_stability: 0.2, dimension_count: 5, critical_dimensions: 2, degrading_dimensions: 3 });
      expect(health.overall_health).toBe("critical");
    });
  });

  describe("Explainer", () => {
    it("builds complete explanation", () => {
      const exp = buildFitnessExplanation({ dimension_key: "boundary_clarity", score: 0.7, degradation_status: "healthy", signals: ["s1", "s2"], trend: "stable", scopes: ["global"], recommendation: "No action" });
      expect(exp.safety_notes.length).toBeGreaterThan(0);
      expect(exp.dimension_key).toBe("boundary_clarity");
    });
  });
});
