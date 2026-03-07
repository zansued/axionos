/**
 * Billing Calculator
 * Computes cost breakdowns from existing usage data.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface BillingBreakdown {
  estimated_monthly_cost: number;
  token_cost: number;
  compute_cost: number;
  repair_cost: number;
  total_tokens: number;
  total_runs: number;
  total_deployments: number;
  total_repairs: number;
  cost_by_stage: Record<string, number>;
  cost_by_model: Record<string, number>;
}

// Approximate cost per token (varies by model)
const DEFAULT_COST_PER_1K_TOKENS = 0.002;
const REPAIR_COST_MULTIPLIER = 1.3; // repairs cost ~30% more due to retries

export async function calculateBilling(
  serviceClient: ReturnType<typeof createClient>,
  organizationId: string,
  periodStart?: Date,
  periodEnd?: Date,
): Promise<BillingBreakdown> {
  const start = periodStart ?? (() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  const end = periodEnd ?? new Date();

  // Get initiative IDs for this org
  const { data: inits } = await serviceClient
    .from("initiatives")
    .select("id")
    .eq("organization_id", organizationId);

  const initIds = new Set((inits ?? []).map((i) => i.id));

  // Fetch jobs and outputs in parallel
  const [jobsRes, outputsRes] = await Promise.all([
    serviceClient
      .from("initiative_jobs")
      .select("id, stage, cost_usd, model, status, created_at")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString()),
    serviceClient
      .from("agent_outputs")
      .select("id, tokens_used, cost_estimate, model_used, created_at")
      .eq("organization_id", organizationId)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString()),
  ]);

  const orgJobs = (jobsRes.data ?? []).filter((j) => initIds.has(j.initiative_id));
  const outputs = outputsRes.data ?? [];

  // Aggregate
  const total_tokens = outputs.reduce((s, o) => s + (o.tokens_used ?? 0), 0);
  const token_cost = (total_tokens / 1000) * DEFAULT_COST_PER_1K_TOKENS;

  const cost_by_stage: Record<string, number> = {};
  const cost_by_model: Record<string, number> = {};
  let repair_runs = 0;

  orgJobs.forEach((j) => {
    const cost = Number(j.cost_usd) || 0;
    cost_by_stage[j.stage] = (cost_by_stage[j.stage] || 0) + cost;

    if (j.model) {
      cost_by_model[j.model] = (cost_by_model[j.model] || 0) + cost;
    }

    if (j.stage === "rework" || j.stage === "build_repair" || j.stage === "self_healing") {
      repair_runs++;
    }
  });

  const compute_cost = orgJobs.reduce((s, j) => s + (Number(j.cost_usd) || 0), 0);
  const repair_cost = repair_runs * DEFAULT_COST_PER_1K_TOKENS * REPAIR_COST_MULTIPLIER * 50; // rough estimate

  const deployJobs = orgJobs.filter((j) =>
    ["publish", "deploy"].includes(j.stage) && j.status === "completed"
  );

  return {
    estimated_monthly_cost: compute_cost + token_cost,
    token_cost,
    compute_cost,
    repair_cost,
    total_tokens,
    total_runs: orgJobs.length,
    total_deployments: deployJobs.length,
    total_repairs: repair_runs,
    cost_by_stage,
    cost_by_model,
  };
}
