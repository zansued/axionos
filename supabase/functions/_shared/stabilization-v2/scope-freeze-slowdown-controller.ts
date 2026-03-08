/**
 * Scope Freeze / Slowdown Controller — Sprint 46
 * Applies bounded slowdown or freeze behavior in fragile scopes.
 * Pure functions. No DB access.
 */

export type FreezeAction = "freeze_strategy_promotion" | "freeze_new_pilots" | "slow_policy_adaptation" | "pause_tenant_tuning" | "reduce_change_density" | "enforce_conservative_rollout";

export interface FreezeDecision {
  scope: string;
  actions: FreezeAction[];
  severity: "advisory" | "recommended" | "required";
  reason: string;
}

export interface FreezeResult {
  decisions: FreezeDecision[];
  total_frozen_scopes: number;
  total_actions: number;
}

export function computeFreezeDecisions(
  unstableZones: string[],
  pressureScore: number,
  criticalSignalCount: number
): FreezeResult {
  const decisions: FreezeDecision[] = [];

  for (const zone of unstableZones) {
    const actions: FreezeAction[] = [];
    let severity: "advisory" | "recommended" | "required" = "advisory";

    if (pressureScore > 0.8) {
      actions.push("freeze_strategy_promotion", "freeze_new_pilots", "reduce_change_density");
      severity = "required";
    } else if (pressureScore > 0.5) {
      actions.push("slow_policy_adaptation", "reduce_change_density");
      severity = "recommended";
    } else {
      actions.push("slow_policy_adaptation");
    }

    if (criticalSignalCount > 2) {
      actions.push("enforce_conservative_rollout", "pause_tenant_tuning");
      severity = "required";
    }

    decisions.push({
      scope: zone,
      actions: [...new Set(actions)],
      severity,
      reason: `Pressure: ${pressureScore}, critical signals: ${criticalSignalCount}`,
    });
  }

  return {
    decisions,
    total_frozen_scopes: decisions.length,
    total_actions: decisions.reduce((s, d) => s + d.actions.length, 0),
  };
}
