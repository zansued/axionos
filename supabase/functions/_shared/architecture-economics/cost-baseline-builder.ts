// Cost Baseline Builder — Sprint 48
// Builds baseline economic context from actual historical execution data.

export interface CostBaseline {
  total_job_cost: number;
  total_repair_cost: number;
  total_deployments: number;
  avg_cost_per_run: number;
  avg_cost_per_deployment: number;
  cost_by_stage: Record<string, number>;
  period_days: number;
  evidence_refs: Record<string, unknown>;
}

export function buildCostBaseline(params: {
  jobs: Array<{ stage: string; cost_usd: number | null; status: string }>;
  periodDays?: number;
}): CostBaseline {
  const { jobs, periodDays = 30 } = params;

  const costByStage: Record<string, number> = {};
  let totalJobCost = 0;
  let totalRepairCost = 0;
  let deployments = 0;

  for (const j of jobs) {
    const cost = Number(j.cost_usd) || 0;
    totalJobCost += cost;
    costByStage[j.stage] = (costByStage[j.stage] || 0) + cost;

    if (["rework", "build_repair", "self_healing"].includes(j.stage)) {
      totalRepairCost += cost;
    }
    if (["publish", "deploy"].includes(j.stage) && j.status === "success") {
      deployments++;
    }
  }

  return {
    total_job_cost: round(totalJobCost),
    total_repair_cost: round(totalRepairCost),
    total_deployments: deployments,
    avg_cost_per_run: jobs.length > 0 ? round(totalJobCost / jobs.length) : 0,
    avg_cost_per_deployment: deployments > 0 ? round(totalJobCost / deployments) : 0,
    cost_by_stage: costByStage,
    period_days: periodDays,
    evidence_refs: { job_count: jobs.length, period_days: periodDays },
  };
}

function round(v: number): number {
  return Math.round(v * 10000) / 10000;
}
