import { describe, it, expect } from "vitest";
import { aggregateDiscoverySignals, DiscoverySignal } from "../../supabase/functions/_shared/discovery-architecture/discovery-signal-aggregator";
import { synthesizeArchitectureOpportunities } from "../../supabase/functions/_shared/discovery-architecture/discovery-architecture-opportunity-synthesizer";
import { generateArchitectureRecommendations, isForbiddenScope } from "../../supabase/functions/_shared/discovery-architecture/discovery-architecture-recommendation-engine";
import { computeArchitectureStressMap } from "../../supabase/functions/_shared/discovery-architecture/architecture-stress-map";
import { clusterRecommendations, deduplicateRecommendations, filterStaleRecommendations } from "../../supabase/functions/_shared/discovery-architecture/discovery-architecture-clustering";
import { validateReviewTransition } from "../../supabase/functions/_shared/discovery-architecture/discovery-architecture-review-manager";
import { explainRecommendation } from "../../supabase/functions/_shared/discovery-architecture/discovery-architecture-explainer";

function makeSignal(overrides: Partial<DiscoverySignal> = {}): DiscoverySignal {
  return {
    id: crypto.randomUUID(),
    signal_type: "bottleneck_stage_x",
    source_type: "platform_intelligence",
    scope_ref: null,
    signal_payload: {},
    severity: "moderate",
    confidence_score: 0.7,
    evidence_refs: [],
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("Sprint 37 — Discovery-Driven Architecture Signals", () => {
  // ─── Signal Aggregation ───
  describe("Signal Aggregation", () => {
    it("returns empty for no signals", () => {
      expect(aggregateDiscoverySignals([])).toEqual([]);
    });

    it("groups signals by type", () => {
      const signals = [makeSignal({ signal_type: "a" }), makeSignal({ signal_type: "a" }), makeSignal({ signal_type: "b" })];
      const result = aggregateDiscoverySignals(signals);
      expect(result.length).toBe(2);
      const aGroup = result.find(r => r.signal_type === "a");
      expect(aGroup?.recurrence_count).toBe(2);
    });

    it("computes architectural relevance score", () => {
      const signals = [makeSignal({ source_type: "advisory", severity: "high", confidence_score: 0.9 })];
      const result = aggregateDiscoverySignals(signals);
      expect(result[0].architectural_relevance_score).toBeGreaterThan(0);
      expect(result[0].architectural_relevance_score).toBeLessThanOrEqual(1);
    });

    it("determines trend direction", () => {
      const signals = Array.from({ length: 10 }, (_, i) => makeSignal({
        signal_type: "trend_test",
        created_at: new Date(Date.now() - (10 - i) * 3600000).toISOString(),
      }));
      const result = aggregateDiscoverySignals(signals);
      expect(["increasing", "stable", "decreasing"]).toContain(result[0].trend_direction);
    });

    it("tracks max severity", () => {
      const signals = [
        makeSignal({ signal_type: "sev_test", severity: "low" }),
        makeSignal({ signal_type: "sev_test", severity: "critical" }),
      ];
      const result = aggregateDiscoverySignals(signals);
      expect(result[0].max_severity).toBe("critical");
    });
  });

  // ─── Opportunity Synthesis ───
  describe("Opportunity Synthesis", () => {
    it("returns empty for no signals", () => {
      expect(synthesizeArchitectureOpportunities([])).toEqual([]);
    });

    it("detects bottleneck pattern", () => {
      const aggregated = aggregateDiscoverySignals(
        Array.from({ length: 5 }, () => makeSignal({ signal_type: "bottleneck_zone_a" }))
      );
      const opps = synthesizeArchitectureOpportunities(aggregated);
      expect(opps.length).toBeGreaterThanOrEqual(1);
      expect(opps[0].opportunity_type).toBe("bottleneck_workflow_pattern");
    });
  });

  // ─── Recommendation Engine ───
  describe("Recommendation Engine", () => {
    it("returns empty for no opportunities", () => {
      expect(generateArchitectureRecommendations([])).toEqual([]);
    });

    it("generates recommendation from opportunity", () => {
      const recs = generateArchitectureRecommendations([{
        opportunity_type: "bottleneck_workflow_pattern",
        affected_architecture_scope: "pipeline_zone_a",
        confidence_score: 0.8,
        rationale_codes: ["recurring_bottleneck"],
        evidence_refs: [],
        expected_value: "test",
        review_priority: 0.9,
      }]);
      expect(recs.length).toBe(1);
      expect(recs[0].recommendation_type).toBe("split_runtime_path");
    });

    it("blocks forbidden scopes", () => {
      expect(isForbiddenScope("pipeline_topology")).toBe(true);
      expect(isForbiddenScope("governance_rules")).toBe(true);
      expect(isForbiddenScope("billing_logic")).toBe(true);
      expect(isForbiddenScope("some_safe_scope")).toBe(false);
    });

    it("skips recommendations targeting forbidden scopes", () => {
      const recs = generateArchitectureRecommendations([{
        opportunity_type: "bottleneck_workflow_pattern",
        affected_architecture_scope: "pipeline_topology_core",
        confidence_score: 0.9,
        rationale_codes: ["test"],
        evidence_refs: [],
        expected_value: "test",
        review_priority: 1.0,
      }]);
      expect(recs.length).toBe(0);
    });
  });

  // ─── Stress Map ───
  describe("Stress Map", () => {
    it("returns zero stress for no signals", () => {
      const map = computeArchitectureStressMap([]);
      expect(map.overall_stress).toBe(0);
      expect(map.dimensions.length).toBe(7);
    });

    it("computes scores for matching signals", () => {
      const aggregated = aggregateDiscoverySignals(
        Array.from({ length: 5 }, () => makeSignal({ signal_type: "bottleneck_test" }))
      );
      const map = computeArchitectureStressMap(aggregated);
      const runtime = map.dimensions.find(d => d.dimension === "runtime_stress");
      expect(runtime?.score).toBeGreaterThan(0);
    });

    it("identifies hotspots", () => {
      const map = computeArchitectureStressMap([]);
      expect(Array.isArray(map.hotspots)).toBe(true);
    });
  });

  // ─── Clustering ───
  describe("Clustering & Deduplication", () => {
    it("clusters by type + scope", () => {
      const recs = [
        { recommendation_type: "a", target_scope: "s1", target_entities: {}, rationale_codes: ["r1"], evidence_refs: [], expected_impact: {}, confidence_score: 0.5, priority_score: 0.5, safety_class: "advisory_only" as const },
        { recommendation_type: "a", target_scope: "s1", target_entities: {}, rationale_codes: ["r1"], evidence_refs: [], expected_impact: {}, confidence_score: 0.6, priority_score: 0.8, safety_class: "advisory_only" as const },
      ];
      const clusters = clusterRecommendations(recs);
      expect(clusters.length).toBe(1);
      expect(clusters[0].count).toBe(2);
    });

    it("deduplicates identical recommendations", () => {
      const recs = [
        { recommendation_type: "a", target_scope: "s1", target_entities: {}, rationale_codes: ["r1"], evidence_refs: [], expected_impact: {}, confidence_score: 0.5, priority_score: 0.5, safety_class: "advisory_only" as const },
        { recommendation_type: "a", target_scope: "s1", target_entities: {}, rationale_codes: ["r1"], evidence_refs: [], expected_impact: {}, confidence_score: 0.5, priority_score: 0.5, safety_class: "advisory_only" as const },
      ];
      expect(deduplicateRecommendations(recs).length).toBe(1);
    });

    it("filters stale recommendations", () => {
      const stale = filterStaleRecommendations([
        { id: "1", status: "open", created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() },
        { id: "2", status: "open", created_at: new Date().toISOString() },
        { id: "3", status: "accepted", created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() },
      ]);
      expect(stale).toEqual(["1"]);
    });
  });

  // ─── Review Workflow ───
  describe("Review Workflow", () => {
    it("allows open → reviewed", () => {
      const r = validateReviewTransition({ recommendation_id: "x", current_status: "open", target_status: "reviewed" });
      expect(r.allowed).toBe(true);
    });

    it("allows reviewed → accepted", () => {
      const r = validateReviewTransition({ recommendation_id: "x", current_status: "reviewed", target_status: "accepted" });
      expect(r.allowed).toBe(true);
    });

    it("blocks rejected → accepted", () => {
      const r = validateReviewTransition({ recommendation_id: "x", current_status: "rejected", target_status: "accepted" });
      expect(r.allowed).toBe(false);
    });

    it("blocks implemented → reviewed", () => {
      const r = validateReviewTransition({ recommendation_id: "x", current_status: "implemented", target_status: "reviewed" });
      expect(r.allowed).toBe(false);
    });

    it("allows open → dismissed", () => {
      const r = validateReviewTransition({ recommendation_id: "x", current_status: "open", target_status: "dismissed" });
      expect(r.allowed).toBe(true);
    });
  });

  // ─── Explainability ───
  describe("Explainability", () => {
    it("generates explanation for recommendation", () => {
      const exp = explainRecommendation({
        recommendation_type: "split_runtime_path",
        target_scope: "pipeline_zone_a",
        target_entities: {},
        rationale_codes: ["recurring_bottleneck", "tenant_divergence"],
        evidence_refs: [{ ref: "test" }],
        expected_impact: { description: "test impact" },
        confidence_score: 0.8,
        priority_score: 0.9,
        safety_class: "advisory_only",
      });
      expect(exp.recommendation_type).toBe("split_runtime_path");
      expect(exp.what_triggered.length).toBeGreaterThan(0);
      expect(exp.which_layers_contributed.length).toBeGreaterThan(0);
      expect(exp.confidence_level).toBe("high");
      expect(exp.priority_level).toBe("high");
      expect(exp.what_to_review.length).toBeGreaterThan(0);
    });

    it("handles low confidence", () => {
      const exp = explainRecommendation({
        recommendation_type: "test",
        target_scope: "test",
        target_entities: {},
        rationale_codes: [],
        evidence_refs: [],
        expected_impact: {},
        confidence_score: 0.2,
        priority_score: 0.1,
        safety_class: "advisory_only",
      });
      expect(exp.confidence_level).toBe("low");
      expect(exp.priority_level).toBe("low");
    });
  });

  // ─── Deterministic & Safety ───
  describe("Deterministic & Safety", () => {
    it("aggregation is deterministic", () => {
      const signals = [makeSignal({ signal_type: "det" }), makeSignal({ signal_type: "det" })];
      const r1 = aggregateDiscoverySignals(signals);
      const r2 = aggregateDiscoverySignals(signals);
      expect(r1.length).toBe(r2.length);
      expect(r1[0].signal_type).toBe(r2[0].signal_type);
    });

    it("stress map is deterministic", () => {
      const aggregated = aggregateDiscoverySignals([makeSignal()]);
      const m1 = computeArchitectureStressMap(aggregated);
      const m2 = computeArchitectureStressMap(aggregated);
      expect(m1.dimensions.map(d => d.score)).toEqual(m2.dimensions.map(d => d.score));
    });
  });
});
