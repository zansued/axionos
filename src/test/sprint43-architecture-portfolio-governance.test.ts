import { describe, it, expect } from "vitest";
import { prioritizeMembers } from "../../supabase/functions/_shared/architecture-portfolio/architecture-portfolio-prioritizer";
import { detectPortfolioConflicts } from "../../supabase/functions/_shared/architecture-portfolio/architecture-portfolio-conflict-detector";
import { analyzeCumulativeBlast } from "../../supabase/functions/_shared/architecture-portfolio/architecture-cumulative-blast-analyzer";
import { evaluateConcurrency } from "../../supabase/functions/_shared/architecture-portfolio/architecture-portfolio-concurrency-guard";
import { canTransitionPortfolio, canTransitionMember, getValidPortfolioTransitions, getValidMemberTransitions } from "../../supabase/functions/_shared/architecture-portfolio/architecture-portfolio-lifecycle-manager";
import { generatePortfolioRecommendations } from "../../supabase/functions/_shared/architecture-portfolio/architecture-portfolio-recommendation-engine";
import { computePortfolioHealth } from "../../supabase/functions/_shared/architecture-portfolio/architecture-portfolio-health-model";
import { buildPortfolioExplanation } from "../../supabase/functions/_shared/architecture-portfolio/architecture-portfolio-explainer";

describe("Sprint 43 — Architecture Portfolio Governance", () => {
  describe("Portfolio Prioritizer", () => {
    it("ranks members by priority score", () => {
      const results = prioritizeMembers([
        { member_id: "a", expected_value: 0.9, confidence: 0.8, readiness: 0.9, blast_radius: 0.1, risk_concentration: 0.1, debt_reduction: 0.8, tenant_sensitivity: 0.1, recurrence: 0.7, strategic_alignment: 0.9 },
        { member_id: "b", expected_value: 0.3, confidence: 0.3, readiness: 0.2, blast_radius: 0.8, risk_concentration: 0.2, debt_reduction: 0.2, tenant_sensitivity: 0.5, recurrence: 0.2, strategic_alignment: 0.3 },
      ]);
      expect(results[0].member_id).toBe("a");
      expect(results[0].priority_score).toBeGreaterThan(results[1].priority_score);
    });

    it("defers high blast radius", () => {
      const results = prioritizeMembers([
        { member_id: "x", expected_value: 0.9, confidence: 0.9, readiness: 0.9, blast_radius: 0.8, risk_concentration: 0.1, debt_reduction: 0.9, tenant_sensitivity: 0.1, recurrence: 0.5, strategic_alignment: 0.9 },
      ]);
      expect(results[0].sequencing).toBe("defer");
    });

    it("suppresses high risk concentration", () => {
      const results = prioritizeMembers([
        { member_id: "y", expected_value: 0.9, confidence: 0.9, readiness: 0.9, blast_radius: 0.1, risk_concentration: 0.9, debt_reduction: 0.9, tenant_sensitivity: 0.1, recurrence: 0.5, strategic_alignment: 0.9 },
      ]);
      expect(results[0].sequencing).toBe("suppress");
    });

    it("handles empty input", () => {
      expect(prioritizeMembers([])).toHaveLength(0);
    });
  });

  describe("Conflict Detector", () => {
    it("detects blast zone overlap", () => {
      const conflicts = detectPortfolioConflicts([
        { member_id: "a", member_type: "pilot", scope_refs: ["s1"], blast_zone: "zone1", intent: "increase_modularity", lifecycle_state: "active" },
        { member_id: "b", member_type: "migration", scope_refs: ["s2"], blast_zone: "zone1", intent: "add_abstraction", lifecycle_state: "active" },
      ]);
      expect(conflicts.some(c => c.conflict_type === "blast_zone_overlap")).toBe(true);
    });

    it("detects contradictory intents", () => {
      const conflicts = detectPortfolioConflicts([
        { member_id: "a", member_type: "plan", scope_refs: ["s1"], blast_zone: "z1", intent: "increase_modularity", lifecycle_state: "active" },
        { member_id: "b", member_type: "plan", scope_refs: ["s1"], blast_zone: "z2", intent: "consolidate_services", lifecycle_state: "active" },
      ]);
      expect(conflicts.some(c => c.conflict_type === "contradictory_intent")).toBe(true);
    });

    it("ignores deprecated members", () => {
      const conflicts = detectPortfolioConflicts([
        { member_id: "a", member_type: "plan", scope_refs: ["s1"], blast_zone: "z1", intent: "increase_modularity", lifecycle_state: "deprecated" },
        { member_id: "b", member_type: "plan", scope_refs: ["s1"], blast_zone: "z1", intent: "consolidate_services", lifecycle_state: "active" },
      ]);
      expect(conflicts).toHaveLength(0);
    });

    it("handles empty input", () => {
      expect(detectPortfolioConflicts([])).toHaveLength(0);
    });
  });

  describe("Cumulative Blast Analyzer", () => {
    it("computes cumulative blast", () => {
      const result = analyzeCumulativeBlast([
        { member_id: "a", blast_radius_weight: 0.8, blast_zone: "z1", is_active: true },
        { member_id: "b", blast_radius_weight: 0.6, blast_zone: "z1", is_active: true },
      ]);
      expect(result.cumulative_blast_score).toBeGreaterThan(0.5);
      expect(result.risk_zones.length).toBeGreaterThan(0);
    });

    it("handles empty input", () => {
      const result = analyzeCumulativeBlast([]);
      expect(result.cumulative_blast_score).toBe(0);
    });
  });

  describe("Concurrency Guard", () => {
    it("allows within limits", () => {
      const result = evaluateConcurrency({ active_pilots: 1, active_migrations: 1, cumulative_blast_score: 0.2, unstable_zones: [], max_concurrent_pilots: 3, max_concurrent_migrations: 3 });
      expect(result.allow_new_pilot).toBe(true);
      expect(result.allow_new_migration).toBe(true);
    });

    it("blocks when limits exceeded", () => {
      const result = evaluateConcurrency({ active_pilots: 3, active_migrations: 1, cumulative_blast_score: 0.2, unstable_zones: [], max_concurrent_pilots: 3, max_concurrent_migrations: 3 });
      expect(result.allow_new_pilot).toBe(false);
    });

    it("blocks all on high blast", () => {
      const result = evaluateConcurrency({ active_pilots: 0, active_migrations: 0, cumulative_blast_score: 0.8, unstable_zones: [], max_concurrent_pilots: 3, max_concurrent_migrations: 3 });
      expect(result.allow_new_pilot).toBe(false);
      expect(result.allow_new_migration).toBe(false);
    });
  });

  describe("Lifecycle Manager", () => {
    it("allows valid portfolio transitions", () => {
      expect(canTransitionPortfolio("draft", "active")).toBe(true);
      expect(canTransitionPortfolio("active", "constrained")).toBe(true);
    });
    it("rejects invalid portfolio transitions", () => {
      expect(canTransitionPortfolio("archived", "active")).toBe(false);
      expect(canTransitionPortfolio("draft", "archived")).toBe(false);
    });
    it("allows valid member transitions", () => {
      expect(canTransitionMember("candidate", "active")).toBe(true);
      expect(canTransitionMember("active", "conflicting")).toBe(true);
    });
    it("rejects invalid member transitions", () => {
      expect(canTransitionMember("archived", "active")).toBe(false);
    });
    it("returns valid transitions", () => {
      expect(getValidPortfolioTransitions("active")).toContain("watch");
      expect(getValidMemberTransitions("active")).toContain("paused");
    });
  });

  describe("Recommendation Engine", () => {
    it("generates conflict resolution recs", () => {
      const recs = generatePortfolioRecommendations({ active_members: 5, conflicting_members: 2, cumulative_blast_score: 0.3, stale_member_count: 0, concurrent_pilots: 1, concurrent_migrations: 1 });
      expect(recs.some(r => r.recommendation_type === "resolve_conflicts")).toBe(true);
    });

    it("generates blast reduction recs", () => {
      const recs = generatePortfolioRecommendations({ active_members: 5, conflicting_members: 0, cumulative_blast_score: 0.8, stale_member_count: 0, concurrent_pilots: 1, concurrent_migrations: 1 });
      expect(recs.some(r => r.recommendation_type === "reduce_blast_radius")).toBe(true);
    });

    it("handles healthy state", () => {
      const recs = generatePortfolioRecommendations({ active_members: 2, conflicting_members: 0, cumulative_blast_score: 0.1, stale_member_count: 0, concurrent_pilots: 1, concurrent_migrations: 1 });
      expect(recs).toHaveLength(0);
    });
  });

  describe("Health Model", () => {
    it("computes healthy state", () => {
      const health = computePortfolioHealth({ total_members: 5, active_members: 4, conflicting_members: 0, cumulative_blast_score: 0.1, concurrent_pilots: 1, concurrent_migrations: 0, stale_members: 0, recommendations_open: 0 });
      expect(health.overall_health).toBe("healthy");
    });

    it("detects critical state", () => {
      const health = computePortfolioHealth({ total_members: 5, active_members: 1, conflicting_members: 4, cumulative_blast_score: 0.9, concurrent_pilots: 4, concurrent_migrations: 3, stale_members: 3, recommendations_open: 5 });
      expect(health.overall_health).toBe("critical");
    });
  });

  describe("Portfolio Explainer", () => {
    it("builds complete explanation", () => {
      const explanation = buildPortfolioExplanation(
        { id: "p1", portfolio_theme: "modularity" },
        { overall_health: "healthy", cumulative_blast_index: 0.1 },
        0, 3,
      );
      expect(explanation.portfolio_theme).toBe("modularity");
      expect(explanation.safety_notes.length).toBeGreaterThan(0);
    });

    it("reports conflicts", () => {
      const explanation = buildPortfolioExplanation({ id: "p2", portfolio_theme: "perf" }, { overall_health: "stressed", cumulative_blast_index: 0.6 }, 3, 5);
      expect(explanation.conflicting_members).toBe(3);
    });
  });
});
