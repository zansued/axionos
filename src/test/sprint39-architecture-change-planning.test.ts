import { describe, it, expect } from "vitest";
import { planDependencies } from "../../supabase/functions/_shared/architecture-planning/architecture-change-dependency-planner";
import { assessReadiness } from "../../supabase/functions/_shared/architecture-planning/architecture-rollout-readiness-assessor";
import { synthesizeValidationBlueprint } from "../../supabase/functions/_shared/architecture-planning/architecture-validation-blueprint-synthesizer";
import { synthesizeRollbackBlueprint } from "../../supabase/functions/_shared/architecture-planning/architecture-rollback-blueprint-synthesizer";
import { detectDuplicatePlan, identifyStalePlans, detectConflictingPlans } from "../../supabase/functions/_shared/architecture-planning/architecture-plan-clustering";
import { validatePlanReviewTransition } from "../../supabase/functions/_shared/architecture-planning/architecture-change-plan-review-manager";
import { explainPlan } from "../../supabase/functions/_shared/architecture-planning/architecture-change-plan-explainer";

// ─── Dependency Planner ───
describe("architecture-change-dependency-planner", () => {
  it("generates dependency graph and blast radius", () => {
    const result = planDependencies({
      proposal_type: "split_runtime_path",
      target_scope: "execution",
      target_entities: { execution_engine: {}, repair_router: {} },
      affected_layers: ["execution", "repair"],
      simulation_summary: {},
      plan_payload: {},
    });
    expect(result.dependency_graph.length).toBeGreaterThan(0);
    expect(result.blast_radius.affected_module_count).toBe(2);
    expect(result.blast_radius.affected_layer_count).toBe(2);
    expect(["small", "medium", "large", "critical"]).toContain(result.blast_radius.size);
  });

  it("detects tenant impact", () => {
    const result = planDependencies({
      proposal_type: "isolate_tenant",
      target_scope: "tenant",
      target_entities: { tenant_boundary: {} },
      affected_layers: ["tenant"],
      simulation_summary: {},
      plan_payload: {},
    });
    expect(result.blast_radius.tenant_impact).toBe(true);
  });

  it("detects forbidden dependencies", () => {
    const result = planDependencies({
      proposal_type: "test",
      target_scope: "billing",
      target_entities: { billing_logic: {}, governance_rules: {} },
      affected_layers: ["governance"],
      simulation_summary: {},
      plan_payload: {},
    });
    expect(result.blocked_dependencies.length).toBeGreaterThan(0);
  });

  it("handles empty entities", () => {
    const result = planDependencies({
      proposal_type: "noop",
      target_scope: "unknown",
      target_entities: {},
      affected_layers: [],
      simulation_summary: {},
      plan_payload: {},
    });
    expect(result.dependency_graph.length).toBeGreaterThanOrEqual(1); // at least layer node
    expect(result.blast_radius.size).toBe("small");
  });

  it("produces deterministic output", () => {
    const input = {
      proposal_type: "split",
      target_scope: "execution",
      target_entities: { a: {}, b: {} },
      affected_layers: ["execution"],
      simulation_summary: {},
      plan_payload: {},
    };
    const r1 = planDependencies(input);
    const r2 = planDependencies(input);
    expect(r1.blast_radius.size).toBe(r2.blast_radius.size);
    expect(r1.dependency_graph.length).toBe(r2.dependency_graph.length);
  });
});

// ─── Readiness Assessor ───
describe("architecture-rollout-readiness-assessor", () => {
  it("returns ready for high-confidence small-blast plan", () => {
    const result = assessReadiness({
      simulation_confidence: 0.9,
      blast_radius_size: "small",
      dependency_completeness: true,
      rollback_blueprint_present: true,
      validation_blueprint_present: true,
      tenant_scope_affected: false,
      high_risk_node_count: 0,
      blocked_dependency_count: 0,
      plan_status: "draft",
    });
    expect(result.readiness_status).toBe("ready");
    expect(result.readiness_score).toBeGreaterThanOrEqual(0.7);
  });

  it("blocks when dependencies are blocked", () => {
    const result = assessReadiness({
      simulation_confidence: 0.8,
      blast_radius_size: "small",
      dependency_completeness: true,
      rollback_blueprint_present: true,
      validation_blueprint_present: true,
      tenant_scope_affected: false,
      high_risk_node_count: 0,
      blocked_dependency_count: 2,
      plan_status: "draft",
    });
    expect(result.readiness_status).toBe("blocked");
    expect(result.blocking_reasons.length).toBeGreaterThan(0);
  });

  it("penalizes missing rollback blueprint", () => {
    const withRollback = assessReadiness({
      simulation_confidence: 0.8,
      blast_radius_size: "small",
      dependency_completeness: true,
      rollback_blueprint_present: true,
      validation_blueprint_present: true,
      tenant_scope_affected: false,
      high_risk_node_count: 0,
      blocked_dependency_count: 0,
      plan_status: "draft",
    });
    const withoutRollback = assessReadiness({
      simulation_confidence: 0.8,
      blast_radius_size: "small",
      dependency_completeness: true,
      rollback_blueprint_present: false,
      validation_blueprint_present: true,
      tenant_scope_affected: false,
      high_risk_node_count: 0,
      blocked_dependency_count: 0,
      plan_status: "draft",
    });
    expect(withRollback.readiness_score).toBeGreaterThan(withoutRollback.readiness_score);
  });

  it("requires review for tenant impact", () => {
    const result = assessReadiness({
      simulation_confidence: 0.85,
      blast_radius_size: "small",
      dependency_completeness: true,
      rollback_blueprint_present: true,
      validation_blueprint_present: true,
      tenant_scope_affected: true,
      high_risk_node_count: 0,
      blocked_dependency_count: 0,
      plan_status: "draft",
    });
    expect(result.review_requirements.length).toBeGreaterThan(0);
  });

  it("critical blast radius forces high_review_required", () => {
    const result = assessReadiness({
      simulation_confidence: 0.9,
      blast_radius_size: "critical",
      dependency_completeness: true,
      rollback_blueprint_present: true,
      validation_blueprint_present: true,
      tenant_scope_affected: false,
      high_risk_node_count: 0,
      blocked_dependency_count: 0,
      plan_status: "draft",
    });
    expect(result.recommended_rollout_mode).toBe("high_review_required");
  });
});

// ─── Validation Blueprint ───
describe("architecture-validation-blueprint-synthesizer", () => {
  it("generates checkpoints for affected layers", () => {
    const result = synthesizeValidationBlueprint({
      proposal_type: "split",
      target_scope: "execution",
      affected_layers: ["execution", "governance"],
      blast_radius_size: "medium",
      tenant_impact: false,
      high_risk_nodes: [],
    });
    expect(result.checkpoints.length).toBeGreaterThan(0);
    expect(result.checkpoints.some((c) => c.target_layer === "execution")).toBe(true);
  });

  it("adds tenant isolation checkpoint when tenant impacted", () => {
    const result = synthesizeValidationBlueprint({
      proposal_type: "isolate",
      target_scope: "tenant",
      affected_layers: ["tenant"],
      blast_radius_size: "medium",
      tenant_impact: true,
      high_risk_nodes: [],
    });
    expect(result.checkpoints.some((c) => c.checkpoint_type === "tenant_isolation_verification")).toBe(true);
  });

  it("estimates effort correctly", () => {
    const small = synthesizeValidationBlueprint({
      proposal_type: "small",
      target_scope: "local",
      affected_layers: ["memory"],
      blast_radius_size: "small",
      tenant_impact: false,
      high_risk_nodes: [],
    });
    expect(["low", "moderate"]).toContain(small.estimated_validation_effort);
  });
});

// ─── Rollback Blueprint ───
describe("architecture-rollback-blueprint-synthesizer", () => {
  it("generates rollback steps from dependency graph", () => {
    const result = synthesizeRollbackBlueprint({
      proposal_type: "split",
      target_scope: "execution",
      affected_layers: ["execution"],
      dependency_graph: [
        { entity: "a", layer: "execution", depends_on: ["b"] },
        { entity: "b", layer: "execution", depends_on: [] },
      ],
      tenant_impact: false,
      blast_radius_size: "small",
    });
    expect(result.steps.length).toBe(2);
    expect(result.rollback_order.length).toBe(2);
    expect(result.rollback_confidence).toBeGreaterThan(0);
  });

  it("adds tenant constraints when tenant impacted", () => {
    const result = synthesizeRollbackBlueprint({
      proposal_type: "isolate",
      target_scope: "tenant",
      affected_layers: ["tenant"],
      dependency_graph: [{ entity: "t1", layer: "tenant", depends_on: [] }],
      tenant_impact: true,
      blast_radius_size: "medium",
    });
    expect(result.tenant_rollback_constraints.length).toBeGreaterThan(0);
  });

  it("lowers confidence for critical blast radius", () => {
    const small = synthesizeRollbackBlueprint({
      proposal_type: "test",
      target_scope: "local",
      affected_layers: ["memory"],
      dependency_graph: [{ entity: "m1", layer: "memory", depends_on: [] }],
      tenant_impact: false,
      blast_radius_size: "small",
    });
    const critical = synthesizeRollbackBlueprint({
      proposal_type: "test",
      target_scope: "local",
      affected_layers: ["memory"],
      dependency_graph: [{ entity: "m1", layer: "memory", depends_on: [] }],
      tenant_impact: false,
      blast_radius_size: "critical",
    });
    expect(small.rollback_confidence).toBeGreaterThan(critical.rollback_confidence);
  });
});

// ─── Plan Clustering ───
describe("architecture-plan-clustering", () => {
  it("detects duplicate plans", () => {
    const result = detectDuplicatePlan(
      { target_scope: "execution", proposal_id: "p1", plan_name: "test" },
      [{ id: "x1", proposal_id: "p1", plan_name: "test", target_scope: "execution", status: "draft", created_at: new Date().toISOString(), implementation_risk: "low" }]
    );
    expect(result.is_duplicate).toBe(true);
    expect(result.duplicate_of).toBe("x1");
  });

  it("ignores rejected plans for duplicates", () => {
    const result = detectDuplicatePlan(
      { target_scope: "execution", proposal_id: "p1", plan_name: "test" },
      [{ id: "x1", proposal_id: "p1", plan_name: "test", target_scope: "execution", status: "rejected", created_at: new Date().toISOString(), implementation_risk: "low" }]
    );
    expect(result.is_duplicate).toBe(false);
  });

  it("detects conflicting plans", () => {
    const conflicts = detectConflictingPlans([
      { id: "a", proposal_id: "p1", plan_name: "A", target_scope: "execution", status: "draft", created_at: new Date().toISOString(), implementation_risk: "low" },
      { id: "b", proposal_id: "p2", plan_name: "B", target_scope: "execution", status: "reviewed", created_at: new Date().toISOString(), implementation_risk: "moderate" },
    ]);
    expect(conflicts.length).toBe(1);
  });

  it("identifies stale plans", () => {
    const old = new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString();
    const stale = identifyStalePlans([
      { id: "s1", proposal_id: "p1", plan_name: "old", target_scope: "x", status: "draft", created_at: old, implementation_risk: "low" },
      { id: "s2", proposal_id: "p2", plan_name: "new", target_scope: "y", status: "draft", created_at: new Date().toISOString(), implementation_risk: "low" },
    ]);
    expect(stale).toContain("s1");
    expect(stale).not.toContain("s2");
  });
});

// ─── Review Manager ───
describe("architecture-change-plan-review-manager", () => {
  it("allows valid transitions", () => {
    expect(validatePlanReviewTransition({
      plan_id: "p1", current_status: "draft", target_review_status: "reviewed",
    }).allowed).toBe(true);

    expect(validatePlanReviewTransition({
      plan_id: "p1", current_status: "reviewed", target_review_status: "ready_for_rollout",
    }).allowed).toBe(true);
  });

  it("rejects invalid transitions", () => {
    expect(validatePlanReviewTransition({
      plan_id: "p1", current_status: "archived", target_review_status: "reviewed",
    }).allowed).toBe(false);

    expect(validatePlanReviewTransition({
      plan_id: "p1", current_status: "rejected", target_review_status: "ready_for_rollout",
    }).allowed).toBe(false);
  });

  it("requires blocker reasons for block action", () => {
    expect(validatePlanReviewTransition({
      plan_id: "p1", current_status: "reviewed", target_review_status: "blocked",
    }).allowed).toBe(false);

    expect(validatePlanReviewTransition({
      plan_id: "p1", current_status: "reviewed", target_review_status: "blocked", blocker_reasons: ["dependency missing"],
    }).allowed).toBe(true);
  });
});

// ─── Explainer ───
describe("architecture-change-plan-explainer", () => {
  it("generates structured explanation", () => {
    const result = explainPlan({
      plan_name: "Test Plan",
      proposal_type: "split_runtime",
      target_scope: "execution",
      blast_radius: { size: "medium", high_risk_nodes: ["engine"], cross_layer_dependencies: 2, tenant_impact: false },
      dependency_graph: [{ entity: "engine", layer: "execution", depends_on: [] }],
      validation_requirements: { checkpoints: [{ priority: "required", description: "Runtime check" }] },
      rollback_blueprint: { steps: [{ step_id: "rb-1" }], estimated_rollback_complexity: "moderate" },
      readiness_score: 0.75,
      implementation_risk: "moderate",
      affected_layers: ["execution"],
      simulation_confidence: 0.8,
    });
    expect(result.summary).toContain("Test Plan");
    expect(result.what_is_planned).toContain("execution");
    expect(result.risk_assessment).toContain("moderate");
    expect(result.validation_required.length).toBeGreaterThan(0);
    expect(result.rollback_path).toContain("1 step");
  });

  it("flags missing rollback as blocker", () => {
    const result = explainPlan({
      plan_name: "No Rollback",
      proposal_type: "test",
      target_scope: "local",
      blast_radius: {},
      dependency_graph: [],
      validation_requirements: {},
      rollback_blueprint: {},
      readiness_score: 0.3,
      implementation_risk: "high",
      affected_layers: [],
      simulation_confidence: 0.5,
    });
    expect(result.rollout_blockers.some((b) => b.includes("rollback"))).toBe(true);
  });

  it("includes recommendation source when present", () => {
    const result = explainPlan({
      plan_name: "Linked",
      proposal_type: "test",
      target_scope: "x",
      blast_radius: {},
      dependency_graph: [],
      validation_requirements: {},
      rollback_blueprint: {},
      readiness_score: 0.5,
      implementation_risk: "low",
      affected_layers: [],
      simulation_confidence: 0.7,
      source_recommendation_id: "rec-123",
    });
    expect(result.why_proposed).toContain("rec-123");
  });

  it("handles empty inputs gracefully", () => {
    const result = explainPlan({
      plan_name: "",
      proposal_type: "",
      target_scope: "",
      blast_radius: {},
      dependency_graph: [],
      validation_requirements: {},
      rollback_blueprint: {},
      readiness_score: 0,
      implementation_risk: "low",
      affected_layers: [],
      simulation_confidence: 0,
    });
    expect(result.summary).toBeDefined();
    expect(result.confidence_statement).toBeDefined();
  });
});
