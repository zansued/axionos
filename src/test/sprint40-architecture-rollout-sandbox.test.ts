import { describe, it, expect } from "vitest";
import { rehearseMigrationSequence } from "../../supabase/functions/_shared/architecture-rollout/architecture-migration-sequence-rehearsal";
import { analyzeFragility } from "../../supabase/functions/_shared/architecture-rollout/architecture-rollout-fragility-analyzer";
import { assessMigrationReadiness } from "../../supabase/functions/_shared/architecture-rollout/architecture-migration-readiness-assessor";
import { rehearseRollbackViability } from "../../supabase/functions/_shared/architecture-rollout/architecture-rollback-viability-rehearsal";
import { validateSandboxGuardrails } from "../../supabase/functions/_shared/architecture-rollout/architecture-rollout-sandbox-guardrails";
import { validateSandboxReviewTransition } from "../../supabase/functions/_shared/architecture-rollout/architecture-rollout-sandbox-review-manager";
import { explainSandbox } from "../../supabase/functions/_shared/architecture-rollout/architecture-rollout-sandbox-explainer";

describe("architecture-migration-sequence-rehearsal", () => {
  it("generates staged sequence from dependency graph", () => {
    const r = rehearseMigrationSequence({
      dependency_graph: [
        { entity: "a", layer: "execution", risk_level: "low", depends_on: [] },
        { entity: "b", layer: "execution", risk_level: "moderate", depends_on: ["a"] },
      ],
      blast_radius: {}, rollback_blueprint: {}, target_scope: "execution",
    });
    expect(r.staged_sequence.length).toBe(2);
    expect(r.staged_sequence[0].entity).toBe("a");
    expect(r.staged_sequence[1].entity).toBe("b");
  });
  it("detects forbidden entities", () => {
    const r = rehearseMigrationSequence({
      dependency_graph: [{ entity: "billing_logic", layer: "governance", risk_level: "critical", depends_on: [] }],
      blast_radius: {}, rollback_blueprint: {}, target_scope: "governance",
    });
    expect(r.blocked_steps.length).toBeGreaterThan(0);
  });
  it("handles empty graph", () => {
    const r = rehearseMigrationSequence({ dependency_graph: [], blast_radius: {}, rollback_blueprint: {}, target_scope: "x" });
    expect(r.staged_sequence.length).toBe(0);
    expect(r.rationale_codes).toContain("empty_dependency_graph");
  });
  it("is deterministic", () => {
    const input = { dependency_graph: [{ entity: "x", layer: "l", risk_level: "low", depends_on: [] }], blast_radius: {}, rollback_blueprint: {}, target_scope: "s" };
    expect(rehearseMigrationSequence(input).sequencing_confidence).toBe(rehearseMigrationSequence(input).sequencing_confidence);
  });
});

describe("architecture-rollout-fragility-analyzer", () => {
  it("flags missing rollback as critical", () => {
    const r = analyzeFragility({ blast_radius: {}, dependency_graph: [{ entity: "a", layer: "l", depends_on: [] }], rollback_blueprint: {}, validation_requirements: {}, target_scope: "x", tenant_impact: false, affected_layers: [] });
    expect(r.findings.some(f => f.fragility_type === "rollback_absence")).toBe(true);
  });
  it("flags tenant sensitivity", () => {
    const r = analyzeFragility({ blast_radius: {}, dependency_graph: [], rollback_blueprint: { steps: [{}] }, validation_requirements: {}, target_scope: "x", tenant_impact: true, affected_layers: [] });
    expect(r.findings.some(f => f.fragility_type === "tenant_blast_sensitivity")).toBe(true);
  });
  it("critical blast radius raises fragility", () => {
    const r = analyzeFragility({ blast_radius: { size: "critical" }, dependency_graph: [], rollback_blueprint: { steps: [{}] }, validation_requirements: { checkpoints: [{ priority: "required" }] }, target_scope: "x", tenant_impact: false, affected_layers: [] });
    expect(r.findings.some(f => f.fragility_type === "scope_breadth_risk")).toBe(true);
  });
});

describe("architecture-migration-readiness-assessor", () => {
  it("returns ready for clean input", () => {
    const r = assessMigrationReadiness({ sequencing_confidence: 0.9, blocked_step_count: 0, rollback_hook_present: true, validation_hook_present: true, fragility_score: 0.1, target_scope_size: 2, tenant_sensitivity: false, cross_layer_coupling_count: 1, hidden_coupling_count: 0 });
    expect(r.migration_readiness_status).toBe("ready");
    expect(r.migration_readiness_score).toBeGreaterThanOrEqual(0.7);
  });
  it("blocks when steps are blocked", () => {
    const r = assessMigrationReadiness({ sequencing_confidence: 0.8, blocked_step_count: 2, rollback_hook_present: true, validation_hook_present: true, fragility_score: 0.1, target_scope_size: 2, tenant_sensitivity: false, cross_layer_coupling_count: 1, hidden_coupling_count: 0 });
    expect(r.migration_readiness_status).toBe("blocked");
  });
  it("requires strict review for high fragility", () => {
    const r = assessMigrationReadiness({ sequencing_confidence: 0.7, blocked_step_count: 0, rollback_hook_present: true, validation_hook_present: true, fragility_score: 0.7, target_scope_size: 5, tenant_sensitivity: false, cross_layer_coupling_count: 2, hidden_coupling_count: 0 });
    expect(r.required_review_depth).toBe("strict");
  });
});

describe("architecture-rollback-viability-rehearsal", () => {
  it("returns viable for good rollback", () => {
    const r = rehearseRollbackViability({ rollback_blueprint: { steps: [{ entity: "a", action: "restore" }] }, dependency_graph: [{ entity: "a", layer: "l", depends_on: [] }], tenant_impact: false, blast_radius_size: "small", affected_layers: ["execution"] });
    expect(r.viability_status).toBe("viable");
    expect(r.ordered_rollback_preview.length).toBe(1);
  });
  it("not viable without steps", () => {
    const r = rehearseRollbackViability({ rollback_blueprint: {}, dependency_graph: [], tenant_impact: false, blast_radius_size: "small", affected_layers: [] });
    expect(r.viability_status).toBe("not_viable");
  });
  it("adds tenant constraints when impacted", () => {
    const r = rehearseRollbackViability({ rollback_blueprint: { steps: [{}] }, dependency_graph: [], tenant_impact: true, blast_radius_size: "small", affected_layers: [] });
    expect(r.tenant_constraints.length).toBeGreaterThan(0);
  });
});

describe("architecture-rollout-sandbox-guardrails", () => {
  it("allows valid sandbox", () => {
    const r = validateSandboxGuardrails({ target_scope: "execution", target_entities: { engine: {} }, rehearsal_mode: "dry_run", blast_radius_size: "small", affected_layers: ["execution"], validation_hooks_defined: true, rollback_hooks_defined: true });
    expect(r.allowed).toBe(true);
  });
  it("rejects forbidden entities", () => {
    const r = validateSandboxGuardrails({ target_scope: "x", target_entities: { billing_logic: {} }, rehearsal_mode: "dry_run", blast_radius_size: "small", affected_layers: [], validation_hooks_defined: true, rollback_hooks_defined: true });
    expect(r.allowed).toBe(false);
  });
  it("downgrades mode when hooks missing", () => {
    const r = validateSandboxGuardrails({ target_scope: "x", target_entities: { a: {} }, rehearsal_mode: "shadow_readiness", blast_radius_size: "small", affected_layers: [], validation_hooks_defined: false, rollback_hooks_defined: true });
    expect(r.downgraded_mode).toBeTruthy();
  });
});

describe("architecture-rollout-sandbox-review-manager", () => {
  it("allows valid transitions", () => {
    expect(validateSandboxReviewTransition({ sandbox_id: "s1", current_status: "prepared", target_review_status: "blocked", blocker_reasons: ["x"] }).allowed).toBe(true);
  });
  it("rejects invalid transitions", () => {
    expect(validateSandboxReviewTransition({ sandbox_id: "s1", current_status: "archived", target_review_status: "reviewed" }).allowed).toBe(false);
  });
  it("requires blocker reasons for block", () => {
    expect(validateSandboxReviewTransition({ sandbox_id: "s1", current_status: "prepared", target_review_status: "blocked" }).allowed).toBe(false);
  });
});

describe("architecture-rollout-sandbox-explainer", () => {
  it("generates explanation", () => {
    const r = explainSandbox({ sandbox_name: "Test", plan_name: "Plan A", target_scope: "exec", rehearsal_mode: "dry_run", rehearsal_summary: { staged_sequence: [{ step_id: "1" }] }, fragility_findings: [], readiness_summary: { migration_readiness_score: 0.8, migration_readiness_status: "ready", required_review_depth: "standard" }, rollback_viability_summary: { viability_score: 0.7, viability_status: "viable" }, blocked_steps: [], validation_hooks_count: 2, rollback_hooks_count: 1 });
    expect(r.summary).toContain("Test");
    expect(r.what_is_rehearsed).toContain("Plan A");
  });
  it("handles empty inputs", () => {
    const r = explainSandbox({ sandbox_name: "", plan_name: "", target_scope: "", rehearsal_mode: "", rehearsal_summary: {}, fragility_findings: [], readiness_summary: {}, rollback_viability_summary: {}, blocked_steps: [], validation_hooks_count: 0, rollback_hooks_count: 0 });
    expect(r.summary).toBeDefined();
    expect(r.blockers.length).toBeGreaterThan(0);
  });
});
