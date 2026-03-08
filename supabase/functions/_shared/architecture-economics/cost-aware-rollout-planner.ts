// Cost-Aware Rollout Planner — Sprint 48
// Proposes phased rollout plans with cost envelopes, stop-loss, and rollback reserve.

export interface RolloutPhase {
  phase_number: number;
  phase_name: string;
  budget_allocation: number;
  cumulative_budget: number;
  stop_loss_threshold: number;
  rollback_reserve: number;
  scope_breadth: number; // 0-1
  validation_depth: string;
}

export interface RolloutEconomicPlan {
  phases: RolloutPhase[];
  total_budget_envelope: number;
  total_rollback_reserve: number;
  stop_loss_thresholds: Record<string, number>;
  confidence_score: number;
  rationale_codes: string[];
}

export function planCostAwareRollout(params: {
  totalProjectedCost: number;
  rollbackCost: number;
  phaseCount?: number;
  riskLevel?: string;
  confidence: number;
}): RolloutEconomicPlan {
  const {
    totalProjectedCost,
    rollbackCost,
    phaseCount = 3,
    riskLevel = "moderate",
    confidence,
  } = params;

  const rationale: string[] = [];
  const count = Math.max(2, Math.min(5, phaseCount));

  // Risk multipliers
  const riskMultiplier = riskLevel === "high" ? 1.4 : riskLevel === "low" ? 1.1 : 1.25;
  const totalBudget = round(totalProjectedCost * riskMultiplier);
  const totalReserve = round(rollbackCost * (riskLevel === "high" ? 0.5 : 0.3));

  rationale.push(`risk_level_${riskLevel}`, `phase_count_${count}`);

  // Progressive scope: each phase gets more scope and budget
  const phases: RolloutPhase[] = [];
  let cumulative = 0;

  for (let i = 0; i < count; i++) {
    const fraction = (i + 1) / ((count * (count + 1)) / 2); // weighted allocation
    const budget = round(totalBudget * fraction);
    cumulative += budget;
    const scopeBreadth = round((i + 1) / count);

    phases.push({
      phase_number: i + 1,
      phase_name: i === 0 ? "pilot" : i === count - 1 ? "full_rollout" : `expansion_${i}`,
      budget_allocation: budget,
      cumulative_budget: round(cumulative),
      stop_loss_threshold: round(budget * 1.5),
      rollback_reserve: round(totalReserve / count),
      scope_breadth: scopeBreadth,
      validation_depth: i === 0 ? "strict" : i === count - 1 ? "standard" : "elevated",
    });
  }

  const stopLossThresholds: Record<string, number> = {};
  for (const p of phases) {
    stopLossThresholds[p.phase_name] = p.stop_loss_threshold;
  }

  return {
    phases,
    total_budget_envelope: totalBudget,
    total_rollback_reserve: totalReserve,
    stop_loss_thresholds: stopLossThresholds,
    confidence_score: round(confidence),
    rationale_codes: rationale,
  };
}

function round(v: number): number {
  return Math.round(v * 10000) / 10000;
}
