/**
 * Architecture Migration Explainability — Sprint 42
 *
 * Structured explanations for migration executions.
 */

export interface MigrationExplanation {
  migration_id: string;
  plan_reference: string;
  pilot_reference: string | null;
  rollout_profile: Record<string, unknown>;
  active_phase: number;
  total_phases: number;
  current_scope_slice: Record<string, unknown>;
  checkpoint_status: string;
  risk_summary: string[];
  rollback_triggers: string[];
  success_criteria: string[];
  safety_summary: string[];
}

export function buildMigrationExplanation(
  migration: Record<string, unknown>,
  riskFlags: string[],
): MigrationExplanation {
  const phases = Array.isArray(migration.phase_sequence) ? migration.phase_sequence : [];
  const activePhase = Number(migration.active_phase || 0);
  const currentSlice = activePhase < phases.length ? (phases[activePhase] as Record<string, unknown>)?.scope_slice || {} : {};

  return {
    migration_id: String(migration.id || ""),
    plan_reference: String(migration.plan_id || ""),
    pilot_reference: migration.pilot_id ? String(migration.pilot_id) : null,
    rollout_profile: (migration.rollout_profile as Record<string, unknown>) || {},
    active_phase: activePhase,
    total_phases: phases.length,
    current_scope_slice: currentSlice as Record<string, unknown>,
    checkpoint_status: activePhase < phases.length ? "gate_pending" : "all_phases_complete",
    risk_summary: riskFlags.length > 0 ? riskFlags : ["No active risk signals"],
    rollback_triggers: [
      "Checkpoint validation failure",
      "Critical risk detection",
      "Manual operator decision",
      "Tenant impact threshold breach",
    ],
    success_criteria: [
      "All phases completed without rollback",
      "Baseline comparability preserved",
      "No critical risk flags during execution",
      "Tenant isolation maintained throughout",
    ],
    safety_summary: [
      "Cannot expand scope without staged approval",
      "Cannot skip checkpoint validation",
      "Cannot mutate governance/billing/enforcement",
      "Cannot override tenant isolation",
      "All execution remains review-driven and reversible",
    ],
  };
}
