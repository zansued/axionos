/**
 * Architecture Migration Readiness Assessor — Sprint 40
 * Evaluates whether a sandbox rehearsal indicates migration readiness.
 * Pure functions. No DB access.
 */

export interface MigrationReadinessInput {
  sequencing_confidence: number;
  blocked_step_count: number;
  rollback_hook_present: boolean;
  validation_hook_present: boolean;
  fragility_score: number;
  target_scope_size: number;
  tenant_sensitivity: boolean;
  cross_layer_coupling_count: number;
  hidden_coupling_count: number;
}

export interface MigrationReadinessResult {
  migration_readiness_score: number;
  migration_readiness_status: "ready" | "needs_review" | "blocked" | "insufficient";
  rollout_blockers: string[];
  recommended_rehearsal_mode: string;
  required_review_depth: "standard" | "elevated" | "strict";
}

export function assessMigrationReadiness(input: MigrationReadinessInput): MigrationReadinessResult {
  let score = input.sequencing_confidence;
  const blockers: string[] = [];

  // Blocked steps
  if (input.blocked_step_count > 0) {
    score -= 0.3;
    blockers.push(`${input.blocked_step_count} blocked migration steps`);
  }

  // Missing hooks
  if (!input.rollback_hook_present) {
    score -= 0.15;
    blockers.push("Rollback hooks missing");
  }
  if (!input.validation_hook_present) {
    score -= 0.1;
    blockers.push("Validation hooks missing");
  }

  // Fragility
  score -= input.fragility_score * 0.3;
  if (input.fragility_score >= 0.6) blockers.push("High fragility score");

  // Tenant sensitivity
  if (input.tenant_sensitivity) score -= 0.1;

  // Coupling
  if (input.hidden_coupling_count > 2) {
    score -= 0.1;
    blockers.push(`${input.hidden_coupling_count} hidden couplings detected`);
  }

  // Scope size
  if (input.target_scope_size > 10) score -= 0.1;

  score = Math.max(0, Math.min(1, score));

  let status: MigrationReadinessResult["migration_readiness_status"];
  if (blockers.length > 0) status = "blocked";
  else if (score >= 0.7) status = "ready";
  else if (score >= 0.4) status = "needs_review";
  else status = "insufficient";

  let rehearsalMode = "dry_run_only";
  if (status === "ready" && !input.tenant_sensitivity && input.fragility_score < 0.3) {
    rehearsalMode = "shadow_preview_only";
  } else if (status === "ready" && input.tenant_sensitivity) {
    rehearsalMode = "tenant_limited_preview";
  } else if (status === "needs_review") {
    rehearsalMode = "strict_validation_required";
  } else if (status === "blocked") {
    rehearsalMode = "high_risk_manual_only";
  }

  let reviewDepth: MigrationReadinessResult["required_review_depth"] = "standard";
  if (input.fragility_score >= 0.4 || input.tenant_sensitivity) reviewDepth = "elevated";
  if (input.fragility_score >= 0.6 || input.blocked_step_count > 0) reviewDepth = "strict";

  return {
    migration_readiness_score: Math.round(score * 100) / 100,
    migration_readiness_status: status,
    rollout_blockers: blockers,
    recommended_rehearsal_mode: rehearsalMode,
    required_review_depth: reviewDepth,
  };
}
