import { describe, it, expect } from "vitest";
import { simulateArchitectureImpact } from "../../supabase/functions/_shared/architecture-simulation/architecture-impact-simulator";
import { analyzeArchitectureBoundaries } from "../../supabase/functions/_shared/architecture-simulation/architecture-boundary-analyzer";
import { evaluateGuardrails } from "../../supabase/functions/_shared/architecture-simulation/architecture-simulation-guardrails";
import { linkRecommendationToProposal, isDuplicateProposal, isStaleProposal } from "../../supabase/functions/_shared/architecture-simulation/architecture-recommendation-linker";
import { validateSimReviewTransition } from "../../supabase/functions/_shared/architecture-simulation/architecture-simulation-review-manager";
import { explainSimulation } from "../../supabase/functions/_shared/architecture-simulation/architecture-simulation-explainer";

describe("Sprint 38 — Architecture Change Simulation & Governance", () => {
  // ─── Impact Simulator ───
  describe("Architecture Impact Simulator", () => {
    it("returns benefits for runtime_path_split", () => {
      const result = simulateArchitectureImpact({
        proposal_type: "runtime_path_split",
        target_scope: "execution_kernel",
        target_entities: { deploy_critical: true },
        proposal_payload: {},
        confidence_score: 0.8,
      });
      expect(result.affected_layers).toContain("execution");
      expect(result.expected_benefits.length).toBeGreaterThan(0);
      expect(result.confidence_score).toBeGreaterThan(0);
    });

    it("returns tradeoffs for tenant_boundary_specialization", () => {
      const result = simulateArchitectureImpact({
        proposal_type: "tenant_boundary_specialization",
        target_scope: "tenant_policy",
        target_entities: { tenant_a: true, tenant_b: true },
        proposal_payload: {},
        confidence_score: 0.6,
      });
      expect(result.expected_tradeoffs.length).toBeGreaterThan(0);
      expect(result.risk_flags).toContain("tenant_isolation_sensitivity");
    });

    it("handles empty entities gracefully", () => {
      const result = simulateArchitectureImpact({
        proposal_type: "unknown_type",
        target_scope: "unknown",
        target_entities: {},
        proposal_payload: {},
        confidence_score: 0.5,
      });
      expect(result.affected_layers).toBeDefined();
      expect(result.simulation_summary).toBeDefined();
    });

    it("flags low confidence", () => {
      const result = simulateArchitectureImpact({
        proposal_type: "runtime_path_split",
        target_scope: "execution",
        target_entities: { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, j: 10, k: 11 },
        proposal_payload: {},
        confidence_score: 0.2,
      });
      expect(result.risk_flags).toContain("low_confidence_simulation");
      expect(result.risk_flags).toContain("broad_scope_risk");
    });

    it("produces deterministic results", () => {
      const input = {
        proposal_type: "observability_consolidation",
        target_scope: "data",
        target_entities: { flow_a: true },
        proposal_payload: {},
        confidence_score: 0.7,
      };
      const r1 = simulateArchitectureImpact(input);
      const r2 = simulateArchitectureImpact(input);
      expect(r1).toEqual(r2);
    });
  });

  // ─── Boundary Analyzer ───
  describe("Architecture Boundary Analyzer", () => {
    it("detects isolation risk for tenant scope", () => {
      const result = analyzeArchitectureBoundaries({
        proposal_type: "tenant_boundary_specialization",
        target_scope: "tenant_policy",
        target_entities: { tenant_a: true },
        proposal_payload: {},
      });
      expect(result.issues.some((i) => i.issue_type === "isolation_risk")).toBe(true);
      expect(result.isolation_intact).toBe(false);
    });

    it("detects boundary ambiguity", () => {
      const result = analyzeArchitectureBoundaries({
        proposal_type: "unknown",
        target_scope: "",
        target_entities: {},
        proposal_payload: {},
      });
      expect(result.issues.some((i) => i.issue_type === "boundary_ambiguity")).toBe(true);
    });

    it("detects cross-layer ripple for broad entities", () => {
      const result = analyzeArchitectureBoundaries({
        proposal_type: "subsystem_modularization",
        target_scope: "execution_kernel",
        target_entities: { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 },
        proposal_payload: {},
      });
      expect(result.issues.some((i) => i.issue_type === "cross_layer_ripple")).toBe(true);
    });

    it("returns healthy score for clean input", () => {
      const result = analyzeArchitectureBoundaries({
        proposal_type: "observability_consolidation",
        target_scope: "data_plane",
        target_entities: { flow_a: true },
        proposal_payload: {},
      });
      expect(result.boundary_health_score).toBeGreaterThan(0.5);
    });
  });

  // ─── Guardrails ───
  describe("Architecture Simulation Guardrails", () => {
    it("blocks forbidden mutation families", () => {
      const result = evaluateGuardrails({
        proposal_type: "modify",
        target_scope: "billing_logic",
        target_entities: {},
        proposal_payload: {},
        safety_class: "advisory_only",
      });
      expect(result.allowed).toBe(false);
      expect(result.blocked_reasons.length).toBeGreaterThan(0);
    });

    it("blocks auto_apply in payload", () => {
      const result = evaluateGuardrails({
        proposal_type: "runtime_split",
        target_scope: "execution",
        target_entities: {},
        proposal_payload: { mode: "auto_apply" },
        safety_class: "advisory_only",
      });
      expect(result.allowed).toBe(false);
    });

    it("allows clean proposals", () => {
      const result = evaluateGuardrails({
        proposal_type: "runtime_path_split",
        target_scope: "execution_kernel",
        target_entities: { deploy_critical: true },
        proposal_payload: {},
        safety_class: "advisory_only",
      });
      expect(result.allowed).toBe(true);
    });

    it("downgrades extremely broad scope", () => {
      const entities: Record<string, any> = {};
      for (let i = 0; i < 20; i++) entities[`e${i}`] = true;
      const result = evaluateGuardrails({
        proposal_type: "test",
        target_scope: "execution",
        target_entities: entities,
        proposal_payload: {},
        safety_class: "high_review_required",
      });
      expect(result.downgraded).toBe(true);
      expect(result.effective_safety_class).toBe("advisory_only");
    });

    it("respects scope profile forbidden entities", () => {
      const result = evaluateGuardrails({
        proposal_type: "test",
        target_scope: "execution",
        target_entities: { secret_module: true },
        proposal_payload: {},
        safety_class: "advisory_only",
        scope_profile: {
          forbidden_entities: ["secret_module"],
          simulation_mode: "local_only",
        },
      });
      expect(result.allowed).toBe(false);
    });
  });

  // ─── Recommendation Linker ───
  describe("Architecture Recommendation Linker", () => {
    it("links recommendation to proposal draft", () => {
      const draft = linkRecommendationToProposal({
        recommendation_id: "rec-1",
        recommendation_type: "split_runtime_path",
        target_scope: "execution",
        target_entities: { deploy: true },
        rationale_codes: ["perf"],
        evidence_refs: [{ type: "signal" }],
        confidence_score: 0.8,
        priority_score: 0.7,
        safety_class: "advisory_only",
      });
      expect(draft.proposal_type).toBe("runtime_path_split");
      expect(draft.source_recommendation_id).toBe("rec-1");
      expect(draft.confidence_score).toBe(0.8);
    });

    it("detects duplicate proposals", () => {
      const existing = [{ proposal_type: "runtime_path_split", target_scope: "execution", status: "draft" }];
      const draft = { proposal_type: "runtime_path_split", target_scope: "execution" } as any;
      expect(isDuplicateProposal(existing, draft)).toBe(true);
    });

    it("allows proposal when existing is rejected", () => {
      const existing = [{ proposal_type: "runtime_path_split", target_scope: "execution", status: "rejected" }];
      const draft = { proposal_type: "runtime_path_split", target_scope: "execution" } as any;
      expect(isDuplicateProposal(existing, draft)).toBe(false);
    });

    it("detects stale proposals", () => {
      const old = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
      expect(isStaleProposal(old)).toBe(true);
    });

    it("does not flag fresh proposals as stale", () => {
      expect(isStaleProposal(new Date().toISOString())).toBe(false);
    });
  });

  // ─── Review Manager ───
  describe("Architecture Simulation Review Manager", () => {
    it("allows generated → reviewed", () => {
      const result = validateSimReviewTransition({
        simulation_outcome_id: "sim-1",
        current_status: "generated",
        target_status: "reviewed",
      });
      expect(result.allowed).toBe(true);
      expect(result.new_outcome_status).toBe("reviewed");
    });

    it("allows reviewed → accepted", () => {
      const result = validateSimReviewTransition({
        simulation_outcome_id: "sim-1",
        current_status: "reviewed",
        target_status: "accepted",
      });
      expect(result.allowed).toBe(true);
    });

    it("blocks generated → accepted (must review first)", () => {
      const result = validateSimReviewTransition({
        simulation_outcome_id: "sim-1",
        current_status: "generated",
        target_status: "accepted",
      });
      expect(result.allowed).toBe(false);
    });

    it("blocks rejected → any transition", () => {
      const result = validateSimReviewTransition({
        simulation_outcome_id: "sim-1",
        current_status: "rejected",
        target_status: "reviewed",
      });
      expect(result.allowed).toBe(false);
    });

    it("allows generated → dismissed", () => {
      const result = validateSimReviewTransition({
        simulation_outcome_id: "sim-1",
        current_status: "generated",
        target_status: "dismissed",
      });
      expect(result.allowed).toBe(true);
    });
  });

  // ─── Explainer ───
  describe("Architecture Simulation Explainer", () => {
    it("generates complete explanation", () => {
      const explanation = explainSimulation({
        proposal_type: "runtime_path_split",
        target_scope: "execution_kernel",
        target_entities: { deploy_critical: true },
        affected_layers: ["execution", "control"],
        expected_benefits: [{ dimension: "execution_latency", direction: "positive", magnitude: 0.6, rationale: "Less contention" }],
        expected_tradeoffs: [],
        risk_flags: [],
        confidence_score: 0.8,
        source_recommendation_id: "rec-1",
      });
      expect(explanation.summary).toContain("runtime_path_split");
      expect(explanation.confidence_label).toBe("high");
      expect(explanation.what_is_simulated).toContain("deploy_critical");
      expect(explanation.why_proposed).toContain("rec-1");
    });

    it("handles no benefits or tradeoffs", () => {
      const explanation = explainSimulation({
        proposal_type: "unknown",
        target_scope: "unknown",
        target_entities: {},
        affected_layers: [],
        expected_benefits: [],
        expected_tradeoffs: [],
        risk_flags: [],
        confidence_score: 0.1,
      });
      expect(explanation.confidence_label).toBe("very_low");
      expect(explanation.expected_upside).toContain("No significant");
      expect(explanation.expected_downside).toContain("No significant");
    });

    it("includes risk guidance for multiple tradeoffs", () => {
      const explanation = explainSimulation({
        proposal_type: "test",
        target_scope: "test",
        target_entities: {},
        affected_layers: [],
        expected_benefits: [],
        expected_tradeoffs: [],
        risk_flags: ["multiple_negative_tradeoffs", "broad_scope_risk"],
        confidence_score: 0.5,
      });
      expect(explanation.review_guidance.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ─── Forbidden Mutation Guards ───
  describe("Forbidden Mutation Guards", () => {
    const forbidden = [
      "pipeline_topology", "governance_rules", "billing_logic",
      "plan_enforcement", "execution_contracts", "hard_safety_constraints",
      "tenant_isolation_rules",
    ];

    for (const family of forbidden) {
      it(`blocks proposals touching ${family}`, () => {
        const result = evaluateGuardrails({
          proposal_type: "test",
          target_scope: family,
          target_entities: {},
          proposal_payload: {},
          safety_class: "advisory_only",
        });
        expect(result.allowed).toBe(false);
      });
    }
  });

  // ─── Empty / Worst-Case Inputs ───
  describe("Non-interference under empty inputs", () => {
    it("simulator handles empty input", () => {
      const result = simulateArchitectureImpact({
        proposal_type: "",
        target_scope: "",
        target_entities: {},
        proposal_payload: {},
        confidence_score: 0,
      });
      expect(result).toBeDefined();
      expect(result.simulation_summary).toBeDefined();
    });

    it("boundary analyzer handles empty input", () => {
      const result = analyzeArchitectureBoundaries({
        proposal_type: "",
        target_scope: "",
        target_entities: {},
        proposal_payload: {},
      });
      expect(result).toBeDefined();
      expect(result.boundary_health_score).toBeLessThanOrEqual(1);
    });

    it("guardrails handle empty input", () => {
      const result = evaluateGuardrails({
        proposal_type: "",
        target_scope: "",
        target_entities: {},
        proposal_payload: {},
        safety_class: "",
      });
      expect(result).toBeDefined();
    });
  });
});
