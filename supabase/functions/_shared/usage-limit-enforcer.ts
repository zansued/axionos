/**
 * Usage Limit Enforcer
 * Checks workspace/org usage against plan limits before pipeline execution.
 * Returns structured error if limits exceeded.
 * 
 * IMPORTANT: All queries are org-scoped to prevent cross-tenant data leakage.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface UsageLimitCheck {
  allowed: boolean;
  reason?: string;
  error_code?: string;
  current: {
    initiatives: number;
    tokens: number;
    deployments: number;
    parallel_runs: number;
  };
  limits: {
    max_initiatives: number;
    max_tokens: number;
    max_deployments: number;
    max_parallel_runs: number;
  };
}

export async function enforceUsageLimits(
  serviceClient: ReturnType<typeof createClient>,
  organizationId: string
): Promise<UsageLimitCheck> {
  // Get billing account with plan
  const { data: billing } = await serviceClient
    .from("billing_accounts")
    .select("*, product_plans(*)")
    .eq("organization_id", organizationId)
    .maybeSingle();

  // If no billing account, use Starter defaults
  const plan = billing?.product_plans ?? {
    max_initiatives_per_month: 20,
    max_tokens_per_month: 2000000,
    max_deployments_per_month: 10,
    max_parallel_runs: 2,
  };

  const limits = {
    max_initiatives: plan.max_initiatives_per_month,
    max_tokens: plan.max_tokens_per_month,
    max_deployments: plan.max_deployments_per_month,
    max_parallel_runs: plan.max_parallel_runs,
  };

  // Get current month usage
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // First get org initiative IDs for scoping job queries
  const { data: orgInits } = await serviceClient
    .from("initiatives")
    .select("id")
    .eq("organization_id", organizationId);

  const orgInitIds = (orgInits ?? []).map((i) => i.id);

  const [initCountRes, outputsRes] = await Promise.all([
    // Initiatives created this month
    serviceClient
      .from("initiatives")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("created_at", monthStart.toISOString()),
    // Token usage (already org-scoped)
    serviceClient
      .from("agent_outputs")
      .select("tokens_used")
      .eq("organization_id", organizationId)
      .gte("created_at", monthStart.toISOString()),
  ]);

  // Query jobs scoped to this org's initiatives only
  let deploymentCount = 0;
  let parallelRunCount = 0;

  if (orgInitIds.length > 0) {
    // Batch in chunks to avoid URL length limits
    const chunkSize = 100;
    for (let i = 0; i < orgInitIds.length; i += chunkSize) {
      const chunk = orgInitIds.slice(i, i + chunkSize);

      const [deployRes, activeRes] = await Promise.all([
        serviceClient
          .from("initiative_jobs")
          .select("id", { count: "exact", head: true })
          .in("initiative_id", chunk)
          .in("stage", ["publish", "deploy"])
          .eq("status", "success")
          .gte("created_at", monthStart.toISOString()),
        serviceClient
          .from("initiative_jobs")
          .select("id", { count: "exact", head: true })
          .in("initiative_id", chunk)
          .eq("status", "running"),
      ]);

      deploymentCount += deployRes.count ?? 0;
      parallelRunCount += activeRes.count ?? 0;
    }
  }

  const current = {
    initiatives: initCountRes.count ?? 0,
    tokens: (outputsRes.data ?? []).reduce((s, o) => s + (o.tokens_used ?? 0), 0),
    deployments: deploymentCount,
    parallel_runs: parallelRunCount,
  };

  // Check limits
  if (current.initiatives >= limits.max_initiatives) {
    return {
      allowed: false,
      reason: `Monthly initiative limit reached (${current.initiatives}/${limits.max_initiatives})`,
      error_code: "USAGE_LIMIT_EXCEEDED",
      current,
      limits,
    };
  }

  if (current.tokens >= limits.max_tokens) {
    return {
      allowed: false,
      reason: `Monthly token limit reached (${current.tokens.toLocaleString()}/${limits.max_tokens.toLocaleString()})`,
      error_code: "USAGE_LIMIT_EXCEEDED",
      current,
      limits,
    };
  }

  if (current.deployments >= limits.max_deployments) {
    return {
      allowed: false,
      reason: `Monthly deployment limit reached (${current.deployments}/${limits.max_deployments})`,
      error_code: "USAGE_LIMIT_EXCEEDED",
      current,
      limits,
    };
  }

  if (current.parallel_runs >= limits.max_parallel_runs) {
    return {
      allowed: false,
      reason: `Parallel run limit reached (${current.parallel_runs}/${limits.max_parallel_runs})`,
      error_code: "PARALLEL_LIMIT_EXCEEDED",
      current,
      limits,
    };
  }

  // Check org hard limit from org_usage_limits
  const { data: orgLimits } = await serviceClient
    .from("org_usage_limits")
    .select("monthly_budget_usd, hard_limit, alert_threshold_pct")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (orgLimits?.hard_limit && orgInitIds.length > 0) {
    // Sum costs only for this org's jobs
    let totalCost = 0;
    const chunkSize = 100;
    for (let i = 0; i < orgInitIds.length; i += chunkSize) {
      const chunk = orgInitIds.slice(i, i + chunkSize);
      const { data: costData } = await serviceClient
        .from("initiative_jobs")
        .select("cost_usd")
        .in("initiative_id", chunk)
        .gte("created_at", monthStart.toISOString());

      totalCost += (costData ?? []).reduce((s, j) => s + (Number(j.cost_usd) || 0), 0);
    }

    if (totalCost >= orgLimits.monthly_budget_usd) {
      return {
        allowed: false,
        reason: `Monthly budget exceeded ($${totalCost.toFixed(2)}/$${orgLimits.monthly_budget_usd})`,
        error_code: "BUDGET_LIMIT_EXCEEDED",
        current,
        limits,
      };
    }
  }

  return { allowed: true, current, limits };
}
