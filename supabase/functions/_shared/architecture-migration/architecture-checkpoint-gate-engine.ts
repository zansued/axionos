/**
 * Architecture Checkpoint Gate Engine — Sprint 42
 *
 * Validates checkpoint gates between migration phases.
 */

export interface CheckpointContext {
  contract_compliant: boolean;
  rollback_ready: boolean;
  tenant_isolation_verified: boolean;
  observability_coverage: number; // 0-1
  blast_radius_contained: boolean;
  baseline_comparability_preserved: boolean;
  strategy_policy_compatible: boolean;
  semantic_retrieval_deps_ok: boolean;
}

export interface CheckpointResult {
  passed: boolean;
  violations: CheckpointViolation[];
  warnings: string[];
}

export interface CheckpointViolation {
  check: string;
  severity: "hard_block" | "soft_warning";
  description: string;
}

export function evaluateCheckpoint(ctx: CheckpointContext): CheckpointResult {
  const violations: CheckpointViolation[] = [];
  const warnings: string[] = [];

  if (!ctx.contract_compliant) {
    violations.push({ check: "contract_compliance", severity: "hard_block", description: "Contract compliance not verified" });
  }
  if (!ctx.rollback_ready) {
    violations.push({ check: "rollback_readiness", severity: "hard_block", description: "Rollback not ready" });
  }
  if (!ctx.tenant_isolation_verified) {
    violations.push({ check: "tenant_isolation", severity: "hard_block", description: "Tenant isolation not verified" });
  }
  if (!ctx.blast_radius_contained) {
    violations.push({ check: "blast_radius", severity: "hard_block", description: "Blast radius not contained" });
  }
  if (!ctx.baseline_comparability_preserved) {
    violations.push({ check: "baseline_comparability", severity: "hard_block", description: "Baseline comparability lost" });
  }
  if (ctx.observability_coverage < 0.5) {
    violations.push({ check: "observability_coverage", severity: "hard_block", description: `Observability coverage ${ctx.observability_coverage} below minimum 0.5` });
  } else if (ctx.observability_coverage < 0.7) {
    warnings.push("Observability coverage below recommended 0.7");
  }
  if (!ctx.strategy_policy_compatible) {
    warnings.push("Strategy/policy compatibility not confirmed");
  }
  if (!ctx.semantic_retrieval_deps_ok) {
    warnings.push("Semantic retrieval dependencies not fully verified");
  }

  const hardBlocks = violations.filter(v => v.severity === "hard_block");
  return { passed: hardBlocks.length === 0, violations, warnings };
}
