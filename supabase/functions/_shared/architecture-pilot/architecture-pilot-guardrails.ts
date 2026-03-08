/**
 * Architecture Pilot Guardrails — Sprint 41
 *
 * Hard guardrails for pilot governance. Rejects or downgrades pilots
 * that violate safety constraints.
 */

export interface PilotGuardrailContext {
  blast_radius_estimate: number;
  rollback_triggers_defined: boolean;
  validation_coverage_complete: boolean;
  target_scope_stable: boolean;
  active_stabilization_in_scope: boolean;
  conflicting_active_pilots: number;
  mutation_families: string[];
  tenant_isolation_preserved: boolean;
  baseline_comparability: number;
}

export interface PilotGuardrailResult {
  allowed: boolean;
  violations: PilotGuardrailViolation[];
  warnings: string[];
  downgraded_mode: string | null;
}

export interface PilotGuardrailViolation {
  rule: string;
  severity: "hard_block" | "soft_warning";
  description: string;
}

const FORBIDDEN_MUTATIONS = [
  "pipeline_topology",
  "stage_ordering",
  "governance_rules",
  "billing_logic",
  "plan_enforcement",
  "execution_contracts",
  "hard_safety_constraints",
  "tenant_isolation_rules",
];

export function evaluatePilotGuardrails(
  ctx: PilotGuardrailContext,
  maxBlastRadius: number = 0.5,
): PilotGuardrailResult {
  const violations: PilotGuardrailViolation[] = [];
  const warnings: string[] = [];
  let downgraded_mode: string | null = null;

  if (ctx.blast_radius_estimate > maxBlastRadius) {
    violations.push({
      rule: "blast_radius_limit",
      severity: "hard_block",
      description: `Blast radius ${ctx.blast_radius_estimate} exceeds limit ${maxBlastRadius}`,
    });
  }

  if (!ctx.rollback_triggers_defined) {
    violations.push({
      rule: "rollback_triggers_required",
      severity: "hard_block",
      description: "Pilot requires defined rollback triggers",
    });
  }

  if (!ctx.validation_coverage_complete) {
    warnings.push("Validation coverage incomplete — pilot downgraded to shadow mode");
    downgraded_mode = "shadow";
  }

  if (ctx.active_stabilization_in_scope) {
    violations.push({
      rule: "no_pilot_during_stabilization",
      severity: "hard_block",
      description: "Target scope is under active stabilization",
    });
  }

  if (ctx.conflicting_active_pilots > 0) {
    violations.push({
      rule: "no_overlapping_pilots",
      severity: "hard_block",
      description: `${ctx.conflicting_active_pilots} conflicting active pilot(s) in scope`,
    });
  }

  const forbidden = ctx.mutation_families.filter((m) => FORBIDDEN_MUTATIONS.includes(m));
  if (forbidden.length > 0) {
    violations.push({
      rule: "forbidden_mutations",
      severity: "hard_block",
      description: `Forbidden mutation families: ${forbidden.join(", ")}`,
    });
  }

  if (!ctx.tenant_isolation_preserved) {
    violations.push({
      rule: "tenant_isolation",
      severity: "hard_block",
      description: "Pilot would break tenant isolation",
    });
  }

  if (ctx.baseline_comparability < 0.3) {
    violations.push({
      rule: "baseline_comparability",
      severity: "hard_block",
      description: "Insufficient baseline comparability for meaningful pilot evaluation",
    });
  }

  const hardBlocks = violations.filter((v) => v.severity === "hard_block");

  return {
    allowed: hardBlocks.length === 0,
    violations,
    warnings,
    downgraded_mode,
  };
}
