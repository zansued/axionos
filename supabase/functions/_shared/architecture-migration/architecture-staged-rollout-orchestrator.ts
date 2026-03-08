/**
 * Architecture Staged Rollout Orchestrator — Sprint 42
 *
 * Executes migration phases in bounded order with checkpoint gating.
 */

export interface MigrationPhase {
  phase_number: number;
  phase_name: string;
  scope_slice: Record<string, unknown>;
  validation_hooks: string[];
  rollback_hooks: string[];
  status: "pending" | "checkpoint_ready" | "executing" | "completed" | "rolled_back" | "failed";
}

export interface PhaseActivationResult {
  can_activate: boolean;
  reason: string;
  phase_number: number;
  scope_slice: Record<string, unknown>;
}

export function canActivateNextPhase(
  phases: MigrationPhase[],
  activePhase: number,
  checkpointPassed: boolean,
): PhaseActivationResult {
  const nextPhase = activePhase + 1;

  if (nextPhase >= phases.length) {
    return { can_activate: false, reason: "All phases completed", phase_number: nextPhase, scope_slice: {} };
  }

  if (activePhase >= 0 && activePhase < phases.length) {
    const current = phases[activePhase];
    if (current.status !== "completed") {
      return { can_activate: false, reason: `Current phase ${activePhase} not completed (status: ${current.status})`, phase_number: nextPhase, scope_slice: {} };
    }
  }

  if (!checkpointPassed) {
    return { can_activate: false, reason: "Checkpoint validation not passed", phase_number: nextPhase, scope_slice: {} };
  }

  return {
    can_activate: true,
    reason: "Prior phase completed and checkpoint passed",
    phase_number: nextPhase,
    scope_slice: phases[nextPhase].scope_slice,
  };
}

export function buildDefaultPhases(scopeSlices: Array<{ name: string; slice: Record<string, unknown> }>): MigrationPhase[] {
  return scopeSlices.map((s, i) => ({
    phase_number: i,
    phase_name: s.name,
    scope_slice: s.slice,
    validation_hooks: ["contract_compliance", "rollback_readiness", "tenant_isolation"],
    rollback_hooks: ["restore_baseline", "verify_restoration"],
    status: "pending" as const,
  }));
}
