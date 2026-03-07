import { describe, it, expect } from "vitest";
import { aggregateAdvisorySignals } from "../../supabase/functions/_shared/engineering-advisor/engineering-advisory-signal-aggregator";
import { synthesizeOpportunities } from "../../supabase/functions/_shared/engineering-advisor/engineering-opportunity-synthesizer";
import { generateRecommendations } from "../../supabase/functions/_shared/engineering-advisor/engineering-advisory-recommendation-engine";
import { prioritizeRecommendations } from "../../supabase/functions/_shared/engineering-advisor/engineering-advisory-prioritizer";
import { explainRecommendation } from "../../supabase/functions/_shared/engineering-advisor/engineering-advisory-explainer";
import { clusterRecommendations, isRecommendationStale } from "../../supabase/functions/_shared/engineering-advisor/engineering-advisory-clustering";
import { validateReviewTransition, buildReview, isStale } from "../../supabase/functions/_shared/engineering-advisor/engineering-advisory-review-manager";
import { buildLineage } from "../../supabase/functions/_shared/engineering-advisor/engineering-advisory-lineage";

describe("Sprint 35 — Autonomous Engineering Advisor", () => {
  // ─── Signal Aggregation ───
  describe("Signal Aggregator", () => {
    it("returns empty for empty layers", () => {
      expect(aggregateAdvisorySignals({})).toHaveLength(0);
    });

    it("aggregates platform intelligence signals", () => {
      const result = aggregateAdvisorySignals({
        platform_intelligence: { bottlenecks: 3, insights: 5, health_index: 0.4 },
      });
      expect(result.length).toBe(2);
      expect(result.some(s => s.signal_type === "bottleneck_detected")).toBe(true);
      expect(result.some(s => s.signal_type === "low_health_index")).toBe(true);
    });

    it("aggregates stabilization signals", () => {
      const result = aggregateAdvisorySignals({
        platform_stabilization: { critical_signals: 2, open_actions: 3, oscillation_count: 1 },
      });
      expect(result.some(s => s.signal_type === "critical_stability_signals")).toBe(true);
      expect(result.some(s => s.signal_type === "oscillation_detected")).toBe(true);
    });

    it("aggregates multi-layer signals", () => {
      const result = aggregateAdvisorySignals({
        platform_intelligence: { bottlenecks: 1, insights: 0, health_index: 0.8 },
        strategy_portfolio: { conflicts: 2, degrading_members: 1, exposure_imbalance: 0 },
        tenant_tuning: { drift_signals: 4, divergent_tenants: 2 },
        operational: { retry_rate: 0.1, repair_burden: 0.6 },
      });
      expect(result.length).toBeGreaterThanOrEqual(4);
    });
  });

  // ─── Opportunity Synthesis ───
  describe("Opportunity Synthesizer", () => {
    it("returns empty for empty signals", () => {
      expect(synthesizeOpportunities([])).toHaveLength(0);
    });

    it("synthesizes opportunities from signals", () => {
      const signals = aggregateAdvisorySignals({
        platform_intelligence: { bottlenecks: 5, insights: 0, health_index: 0.3 },
        strategy_portfolio: { conflicts: 3, degrading_members: 2, exposure_imbalance: 0 },
      });
      const opps = synthesizeOpportunities(signals);
      expect(opps.length).toBeGreaterThan(0);
      expect(opps[0].opportunity_type).toBeDefined();
      expect(opps[0].evidence_refs).toBeDefined();
    });
  });

  // ─── Recommendation Generation ───
  describe("Recommendation Engine", () => {
    it("returns empty for no opportunities", () => {
      expect(generateRecommendations([])).toHaveLength(0);
    });

    it("generates recommendations with correct structure", () => {
      const signals = aggregateAdvisorySignals({
        platform_intelligence: { bottlenecks: 3, insights: 0, health_index: 0.2 },
      });
      const opps = synthesizeOpportunities(signals);
      const recs = generateRecommendations(opps);
      expect(recs.length).toBeGreaterThan(0);
      for (const rec of recs) {
        expect(rec.recommendation_type).toBeDefined();
        expect(rec.safety_class).toMatch(/low_risk_review|medium_risk_review|high_risk_review/);
        expect(rec.status).toBe("open");
        expect(rec.priority_score).toBeGreaterThan(0);
        expect(rec.priority_score).toBeLessThanOrEqual(1);
      }
    });
  });

  // ─── Prioritization ───
  describe("Prioritizer", () => {
    it("returns empty for empty input", () => {
      expect(prioritizeRecommendations([])).toHaveLength(0);
    });

    it("sorts by final_priority descending", () => {
      const recs = generateRecommendations(synthesizeOpportunities(aggregateAdvisorySignals({
        platform_intelligence: { bottlenecks: 3, insights: 0, health_index: 0.2 },
        strategy_portfolio: { conflicts: 5, degrading_members: 3, exposure_imbalance: 0 },
        operational: { retry_rate: 0.3, repair_burden: 0.7 },
      })));
      const prioritized = prioritizeRecommendations(recs);
      for (let i = 1; i < prioritized.length; i++) {
        expect(prioritized[i].final_priority).toBeLessThanOrEqual(prioritized[i - 1].final_priority);
      }
    });

    it("includes priority rationale", () => {
      const recs = generateRecommendations(synthesizeOpportunities(aggregateAdvisorySignals({
        platform_intelligence: { bottlenecks: 5, insights: 0, health_index: 0.1 },
      })));
      const prioritized = prioritizeRecommendations(recs);
      expect(prioritized[0].priority_rationale).toBeDefined();
    });
  });

  // ─── Explainability ───
  describe("Explainer", () => {
    it("generates explanation with all required fields", () => {
      const recs = generateRecommendations(synthesizeOpportunities(aggregateAdvisorySignals({
        platform_intelligence: { bottlenecks: 2, insights: 0, health_index: 0.3 },
      })));
      const explanation = explainRecommendation(recs[0]);
      expect(explanation.what_triggered.length).toBeGreaterThan(0);
      expect(explanation.contributing_layers.length).toBeGreaterThan(0);
      expect(explanation.why_now).toBeDefined();
      expect(explanation.likely_tradeoffs.length).toBeGreaterThan(0);
      expect(explanation.review_before_implementation.length).toBeGreaterThan(0);
    });
  });

  // ─── Clustering ───
  describe("Clustering", () => {
    it("returns empty for empty input", () => {
      const result = clusterRecommendations([]);
      expect(result.clusters).toHaveLength(0);
      expect(result.suppressed).toHaveLength(0);
    });

    it("suppresses low-confidence recommendations", () => {
      const recs = [
        { recommendation_type: "test", target_scope: "scope", target_entities: [], rationale_codes: [], evidence_refs: {}, expected_impact: {}, priority_score: 0.5, confidence_score: 0.1, safety_class: "low_risk_review" as const, review_requirements: {}, status: "open" as const },
      ];
      const result = clusterRecommendations(recs);
      expect(result.suppressed.length).toBe(1);
      expect(result.clusters.length).toBe(0);
    });

    it("deduplicates against existing types", () => {
      const recs = [
        { recommendation_type: "test_type", target_scope: "test_scope", target_entities: [], rationale_codes: [], evidence_refs: {}, expected_impact: {}, priority_score: 0.8, confidence_score: 0.9, safety_class: "low_risk_review" as const, review_requirements: {}, status: "open" as const },
      ];
      const existing = new Set(["test_type:test_scope"]);
      const result = clusterRecommendations(recs, existing);
      expect(result.deduplicated_count).toBe(1);
      expect(result.clusters.length).toBe(0);
    });

    it("clusters same type+scope", () => {
      const recs = [
        { recommendation_type: "t", target_scope: "s", target_entities: [], rationale_codes: [], evidence_refs: {}, expected_impact: {}, priority_score: 0.8, confidence_score: 0.9, safety_class: "low_risk_review" as const, review_requirements: {}, status: "open" as const },
        { recommendation_type: "t", target_scope: "s", target_entities: [], rationale_codes: [], evidence_refs: {}, expected_impact: {}, priority_score: 0.6, confidence_score: 0.7, safety_class: "low_risk_review" as const, review_requirements: {}, status: "open" as const },
      ];
      const result = clusterRecommendations(recs);
      expect(result.clusters.length).toBe(1);
      expect(result.clusters[0].recommendations.length).toBe(2);
    });
  });

  // ─── Staleness ───
  describe("Staleness", () => {
    it("detects stale recommendations", () => {
      const old = new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString();
      expect(isRecommendationStale(old)).toBe(true);
      expect(isStale(old)).toBe(true);
    });

    it("does not flag fresh recommendations", () => {
      expect(isRecommendationStale(new Date().toISOString())).toBe(false);
    });
  });

  // ─── Review Workflow ───
  describe("Review Manager", () => {
    it("validates open → reviewed", () => {
      expect(validateReviewTransition("open", "reviewed").valid).toBe(true);
    });

    it("validates reviewed → accepted", () => {
      expect(validateReviewTransition("reviewed", "accepted").valid).toBe(true);
    });

    it("blocks rejected → accepted", () => {
      expect(validateReviewTransition("rejected", "accepted").valid).toBe(false);
    });

    it("blocks implemented → anything", () => {
      expect(validateReviewTransition("implemented", "reviewed").valid).toBe(false);
    });

    it("allows open → dismissed", () => {
      expect(validateReviewTransition("open", "dismissed").valid).toBe(true);
    });

    it("builds review record", () => {
      const review = buildReview({ recommendation_id: "rec-1", review_status: "accepted", review_notes: "LGTM" });
      expect(review.recommendation_id).toBe("rec-1");
      expect(review.review_status).toBe("accepted");
      expect(review.review_notes).toBe("LGTM");
    });
  });

  // ─── Lineage ───
  describe("Lineage", () => {
    it("builds lineage record", () => {
      const lineage = buildLineage({
        recommendation_id: "rec-1",
        rationale_codes: ["bottleneck_detected"],
        evidence_refs: { bottleneck_count: 3 },
        recommendation_type: "review_pipeline_bottleneck_zone",
        contributing_layers: ["platform_intelligence"],
      });
      expect(lineage.source_signals).toContain("bottleneck_detected");
      expect(lineage.source_modules.length).toBeGreaterThan(0);
      expect(lineage.reasoning_chain.length).toBeGreaterThan(0);
    });

    it("captures dismissal rationale", () => {
      const lineage = buildLineage({
        recommendation_id: "rec-2",
        rationale_codes: ["test"],
        evidence_refs: {},
        recommendation_type: "test",
        review_status: "dismissed",
        review_notes: "Not relevant anymore",
      });
      expect(lineage.dismissal_rationale).toBe("Not relevant anymore");
    });
  });

  // ─── Forbidden Mutation Guards ───
  describe("Forbidden Mutation Guards", () => {
    it("recommendations never include forbidden target types", () => {
      const signals = aggregateAdvisorySignals({
        platform_intelligence: { bottlenecks: 5, insights: 10, health_index: 0.1 },
        platform_stabilization: { critical_signals: 5, open_actions: 10, oscillation_count: 5 },
        strategy_portfolio: { conflicts: 5, degrading_members: 5, exposure_imbalance: 1 },
        operational: { retry_rate: 0.5, repair_burden: 0.8 },
      });
      const recs = generateRecommendations(synthesizeOpportunities(signals));
      const forbidden = ["pipeline_topology", "stage_ordering", "governance_rules", "billing_logic", "plan_enforcement", "execution_contracts", "hard_safety_constraints"];
      for (const rec of recs) {
        for (const target of rec.target_entities) {
          expect(forbidden).not.toContain(target);
        }
      }
    });
  });

  // ─── Tenant Isolation ───
  describe("Tenant Isolation", () => {
    it("pure functions produce deterministic output", () => {
      const input = { platform_intelligence: { bottlenecks: 2, insights: 0, health_index: 0.4 } };
      const r1 = aggregateAdvisorySignals(input);
      const r2 = aggregateAdvisorySignals(input);
      expect(r1).toEqual(r2);
    });
  });

  // ─── Deterministic Outputs ───
  describe("Deterministic Outputs", () => {
    it("same input produces same recommendations", () => {
      const layers = { platform_intelligence: { bottlenecks: 3, insights: 0, health_index: 0.3 }, operational: { retry_rate: 0.2, repair_burden: 0.5 } };
      const r1 = generateRecommendations(synthesizeOpportunities(aggregateAdvisorySignals(layers)));
      const r2 = generateRecommendations(synthesizeOpportunities(aggregateAdvisorySignals(layers)));
      expect(r1.length).toBe(r2.length);
      for (let i = 0; i < r1.length; i++) {
        expect(r1[i].recommendation_type).toBe(r2[i].recommendation_type);
        expect(r1[i].priority_score).toBe(r2[i].priority_score);
      }
    });
  });

  // ─── Empty/Worst-case ───
  describe("Edge Cases", () => {
    it("handles all layers empty", () => {
      const signals = aggregateAdvisorySignals({
        platform_intelligence: { bottlenecks: 0, insights: 0, health_index: 1.0 },
        platform_calibration: { proposals: 0, harmful_outcomes: 0, frozen_params: 0 },
        strategy_evolution: { active_experiments: 0, rollbacks: 0, promotions: 0 },
        strategy_portfolio: { conflicts: 0, degrading_members: 0, exposure_imbalance: 0 },
        platform_stabilization: { critical_signals: 0, open_actions: 0, oscillation_count: 0 },
      });
      expect(signals).toHaveLength(0);
    });

    it("handles worst-case all layers critical", () => {
      const signals = aggregateAdvisorySignals({
        platform_intelligence: { bottlenecks: 10, insights: 0, health_index: 0.1 },
        platform_calibration: { proposals: 50, harmful_outcomes: 10, frozen_params: 5 },
        strategy_portfolio: { conflicts: 10, degrading_members: 8, exposure_imbalance: 1 },
        platform_stabilization: { critical_signals: 10, open_actions: 20, oscillation_count: 8 },
        operational: { retry_rate: 0.8, repair_burden: 0.9 },
        tenant_tuning: { drift_signals: 10, divergent_tenants: 5 },
        execution_governance: { policy_churn: 0.8, low_performers: 5 },
        predictive_error: { high_risk_assessments: 20, false_positive_rate: 0.7 },
        cross_stage_learning: { active_policies: 10, spillover_count: 5 },
      });
      expect(signals.length).toBeGreaterThan(5);
      const recs = generateRecommendations(synthesizeOpportunities(signals));
      expect(recs.length).toBeGreaterThan(0);
    });
  });
});
