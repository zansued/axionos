/**
 * Billing Calculator
 * Computes cost breakdowns from existing usage data.
 * 
 * Cost model:
 * - PRIMARY source of truth: initiative_jobs.cost_usd (recorded per-job by pipeline)
 * - SECONDARY: agent_outputs.cost_estimate (per-output cost)
 * - token_cost is informational only, NOT added to estimated_monthly_cost
 *   because cost_usd already accounts for token costs at the job level.
 * 
 * All queries are org-scoped to prevent cross-tenant data leakage.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface BillingBreakdown {
  estimated_monthly_cost: number;
  token_cost_informational: number;
  job_cost: number;
  repair_cost: number;
  total_tokens: number;
  total_runs: number;
  total_deployments: number;
  total_repairs: number;
  cost_by_stage: Record<string, number>;
  cost_by_model: Record<string, number>;
}

// Informational only — for display, not billing
const INFORMATIONAL_COST_PER_1K_TOKENS = 0.002;

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

  // Get initiative IDs for this org (org-scoped)
  const { data: inits } = await serviceClient
    .from("initiatives")
    .select("id")
    .eq("organization_id", organizationId);

  const initIds = (inits ?? []).map((i) => i.id);

  // Fetch outputs (already org-scoped via organization_id)
  const { data: outputs } = await serviceClient
    .from("agent_outputs")
    .select("id, tokens_used, cost_estimate, model_used, created_at")
    .eq("organization_id", organizationId)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  const allOutputs = outputs ?? [];

  // Fetch jobs in org-scoped chunks to avoid cross-tenant leakage
  let allOrgJobs: any[] = [];
  const chunkSize = 100;
  for (let i = 0; i < initIds.length; i += chunkSize) {
    const chunk = initIds.slice(i, i + chunkSize);
    const { data: jobChunk } = await serviceClient
      .from("initiative_jobs")
      .select("id, initiative_id, stage, cost_usd, model, status, created_at")
      .in("initiative_id", chunk)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());
    allOrgJobs = allOrgJobs.concat(jobChunk ?? []);
  }

  // Aggregate
  const total_tokens = allOutputs.reduce((s, o) => s + (o.tokens_used ?? 0), 0);
  const token_cost_informational = (total_tokens / 1000) * INFORMATIONAL_COST_PER_1K_TOKENS;

  const cost_by_stage: Record<string, number> = {};
  const cost_by_model: Record<string, number> = {};
  let repair_runs = 0;
  let repair_cost = 0;

  allOrgJobs.forEach((j) => {
    const cost = Number(j.cost_usd) || 0;
    cost_by_stage[j.stage] = (cost_by_stage[j.stage] || 0) + cost;

    if (j.model) {
      cost_by_model[j.model] = (cost_by_model[j.model] || 0) + cost;
    }

    if (j.stage === "rework" || j.stage === "build_repair" || j.stage === "self_healing") {
      repair_runs++;
      repair_cost += cost;
    }
  });

  // Primary cost source: sum of all job costs (already includes token costs)
  const job_cost = allOrgJobs.reduce((s, j) => s + (Number(j.cost_usd) || 0), 0);

  const deployJobs = allOrgJobs.filter((j) =>
    ["publish", "deploy"].includes(j.stage) && j.status === "success"
  );

  return {
    // Single source of truth: job-level recorded costs
    estimated_monthly_cost: job_cost,
    token_cost_informational,
    job_cost,
    repair_cost,
    total_tokens,
    total_runs: allOrgJobs.length,
    total_deployments: deployJobs.length,
    total_repairs: repair_runs,
    cost_by_stage,
    cost_by_model,
  };
}
