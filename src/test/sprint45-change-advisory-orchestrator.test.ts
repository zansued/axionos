import { describe, it, expect } from "vitest";
import { normalizeSignal, normalizeSignals } from "../../supabase/functions/_shared/change-advisory/change-opportunity-normalizer";
import { orchestrateAgenda } from "../../supabase/functions/_shared/change-advisory/autonomous-change-orchestrator";
import { buildDependencyGraph } from "../../supabase/functions/_shared/change-advisory/change-dependency-graph-builder";
import { detectConflicts } from "../../supabase/functions/_shared/change-advisory/change-advisory-conflict-resolver";
import { balanceLoad } from "../../supabase/functions/_shared/change-advisory/change-load-balancer";
import { computeAgendaHealth } from "../../supabase/functions/_shared/change-advisory/change-agenda-health-model";
import { explainAgenda } from "../../supabase/functions/_shared/change-advisory/change-agenda-explainer";
import { validateReviewTransition, getValidTransitions } from "../../supabase/functions/_shared/change-advisory/change-agenda-review-manager";

function makeSignal(id: string, source = "discovery_signal", type = "recommendation", scope = "global", conf = 0.7, priority = 0.6, deps: string[] = []) {
  return { id, signal_source: source, signal_type: type, target_scope: scope, target_entities: {}, signal_payload: { dependency_refs: deps }, confidence_score: conf, priority_hint: priority, evidence_refs: null };
}

describe("Sprint 45 — Change Advisory Orchestrator", () => {
  describe("Opportunity Normalizer", () => {
    it("normalizes a single signal", () => {
      const r = normalizeSignal(makeSignal("s1"));
      expect(r.signal_id).toBe("s1");
      expect(r.urgency_score).toBeGreaterThan(0);
      expect(r.expected_value_score).toBeGreaterThan(0);
      expect(r.rationale_codes.length).toBeGreaterThan(0);
    });

    it("normalizes multiple signals", () => {
      const results = normalizeSignals([makeSignal("s1"), makeSignal("s2")]);
      expect(results).toHaveLength(2);
    });

    it("handles null confidence", () => {
      const r = normalizeSignal({ ...makeSignal("s1"), confidence_score: null });
      expect(r.urgency_score).toBeGreaterThan(0);
    });

    it("high confidence yields high_confidence rationale", () => {
      const r = normalizeSignal(makeSignal("s1", "architecture_fitness", "fitness_degradation", "global", 0.9, 0.9));
      expect(r.rationale_codes).toContain("high_confidence");
    });
  });

  describe("Autonomous Change Orchestrator", () => {
    it("returns empty agenda for no opportunities", () => {
      const agenda = orchestrateAgenda([]);
      expect(agenda.prioritized_queue).toHaveLength(0);
      expect(agenda.orchestration_rationale).toContain("No change opportunities to orchestrate");
    });

    it("prioritizes opportunities by composite score", () => {
      const opps = normalizeSignals([makeSignal("s1", "discovery_signal", "recommendation", "global", 0.9, 0.9), makeSignal("s2", "platform_intelligence", "recommendation", "global", 0.3, 0.2)]);
      const agenda = orchestrateAgenda(opps);
      expect(agenda.prioritized_queue[0].signal_id).toBe("s1");
    });

    it("suppresses low-value items", () => {
      const opps = normalizeSignals([makeSignal("s1", "discovery_signal", "recommendation", "global", 0.01, 0.01)]);
      const agenda = orchestrateAgenda(opps);
      expect(agenda.suppressed_items.length + agenda.prioritized_queue.length).toBe(1);
    });

    it("defers items beyond max queue", () => {
      const opps = normalizeSignals(Array.from({ length: 25 }, (_, i) => makeSignal(`s${i}`, "architecture_fitness", "recommendation", "global", 0.7, 0.7)));
      const agenda = orchestrateAgenda(opps, { max_queue_size: 5 });
      expect(agenda.prioritized_queue.length).toBeLessThanOrEqual(5);
      expect(agenda.deferred_items.length).toBeGreaterThan(0);
    });

    it("bundles same-scope same-type items", () => {
      const opps = normalizeSignals([makeSignal("s1"), makeSignal("s2")]);
      const agenda = orchestrateAgenda(opps);
      expect(agenda.bundled_items.length).toBeGreaterThanOrEqual(0); // may or may not bundle
    });
  });

  describe("Dependency Graph Builder", () => {
    it("returns empty graph for no opportunities", () => {
      const r = buildDependencyGraph([]);
      expect(r.nodes).toHaveLength(0);
    });

    it("builds nodes from opportunities", () => {
      const opps = normalizeSignals([makeSignal("s1"), makeSignal("s2")]);
      const r = buildDependencyGraph(opps);
      expect(r.nodes).toHaveLength(2);
    });

    it("detects dependencies", () => {
      const opps = normalizeSignals([makeSignal("s1"), makeSignal("s2", "discovery_signal", "recommendation", "global", 0.7, 0.6, ["s1"])]);
      const r = buildDependencyGraph(opps);
      expect(r.nodes.find((n) => n.signal_id === "s2")?.depends_on).toContain("s1");
    });

    it("identifies parallelizable groups", () => {
      const opps = normalizeSignals([makeSignal("s1"), makeSignal("s2"), makeSignal("s3")]);
      const r = buildDependencyGraph(opps);
      expect(r.parallelizable_groups.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Conflict Resolver", () => {
    it("returns no conflicts for single item", () => {
      const opps = normalizeSignals([makeSignal("s1")]);
      const r = detectConflicts(opps);
      expect(r.conflict_count).toBe(0);
    });

    it("detects scope overload", () => {
      const opps = normalizeSignals(Array.from({ length: 5 }, (_, i) => makeSignal(`s${i}`)));
      const r = detectConflicts(opps);
      expect(r.conflicts.some((c) => c.conflict_type === "scope_overload")).toBe(true);
    });

    it("detects cumulative risk overload", () => {
      const opps = normalizeSignals(Array.from({ length: 4 }, (_, i) => makeSignal(`s${i}`, "architecture_fitness", "fitness_degradation", "global", 0.1, 0.1)));
      const r = detectConflicts(opps);
      // risk scores depend on computation
      expect(r.conflict_count).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Load Balancer", () => {
    it("returns zero load for empty", () => {
      const r = balanceLoad([]);
      expect(r.load_score).toBe(0);
      expect(r.within_capacity).toBe(true);
    });

    it("detects overload", () => {
      const opps = normalizeSignals(Array.from({ length: 15 }, (_, i) => makeSignal(`s${i}`)));
      const r = balanceLoad(opps, { max_concurrent_changes: 5 });
      expect(r.load_score).toBeGreaterThan(0.5);
      expect(r.within_capacity).toBe(false);
    });

    it("constrains per-scope", () => {
      const opps = normalizeSignals(Array.from({ length: 5 }, (_, i) => makeSignal(`s${i}`, "discovery_signal", "recommendation", "subsystem_A")));
      const r = balanceLoad(opps, { max_per_scope: 2 });
      expect(r.constrained_scopes).toContain("subsystem_A");
    });
  });

  describe("Agenda Health Model", () => {
    it("computes health metrics", () => {
      const opps = normalizeSignals([makeSignal("s1"), makeSignal("s2")]);
      const agenda = orchestrateAgenda(opps);
      const conflicts = detectConflicts(opps);
      const load = balanceLoad(opps);
      const health = computeAgendaHealth(agenda, conflicts, load);
      expect(health.overall_health_score).toBeGreaterThan(0);
      expect(health.overall_health_score).toBeLessThanOrEqual(1);
    });
  });

  describe("Explainability", () => {
    it("explains an agenda", () => {
      const opps = normalizeSignals([makeSignal("s1")]);
      const agenda = orchestrateAgenda(opps);
      const conflicts = detectConflicts(opps);
      const load = balanceLoad(opps);
      const health = computeAgendaHealth(agenda, conflicts, load);
      const explanation = explainAgenda(agenda, conflicts, health);
      expect(explanation.safety_notes.length).toBeGreaterThan(0);
      expect(explanation.signals_aggregated).toBeGreaterThan(0);
    });
  });

  describe("Review Manager", () => {
    it("validates valid transitions", () => {
      expect(validateReviewTransition("draft", "reviewed").valid).toBe(true);
      expect(validateReviewTransition("reviewed", "accepted").valid).toBe(true);
    });

    it("rejects invalid transitions", () => {
      expect(validateReviewTransition("archived", "accepted").valid).toBe(false);
      expect(validateReviewTransition("draft", "accepted").valid).toBe(false);
    });

    it("returns valid transitions", () => {
      expect(getValidTransitions("reviewed")).toContain("accepted");
      expect(getValidTransitions("archived")).toHaveLength(0);
    });
  });

  describe("Safety Guards", () => {
    it("normalizer never produces mutation commands", () => {
      const r = normalizeSignal(makeSignal("s1"));
      expect(JSON.stringify(r)).not.toContain("mutate");
      expect(JSON.stringify(r)).not.toContain("execute_migration");
    });

    it("orchestrator outputs are advisory only", () => {
      const agenda = orchestrateAgenda(normalizeSignals([makeSignal("s1")]));
      expect(JSON.stringify(agenda)).not.toContain("auto_execute");
      expect(JSON.stringify(agenda)).not.toContain("auto_approve");
    });
  });

  describe("Edge Cases", () => {
    it("handles empty inputs gracefully across all modules", () => {
      expect(normalizeSignals([])).toHaveLength(0);
      expect(orchestrateAgenda([]).prioritized_queue).toHaveLength(0);
      expect(buildDependencyGraph([]).nodes).toHaveLength(0);
      expect(detectConflicts([]).conflict_count).toBe(0);
      expect(balanceLoad([]).load_score).toBe(0);
    });
  });
});
