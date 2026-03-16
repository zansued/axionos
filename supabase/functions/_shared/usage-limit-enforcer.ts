/**
 * Usage Limit Enforcer
 * Checks workspace/org usage against plan limits before pipeline execution.
 * Returns structured error if limits exceeded.
 * 
 * Sprint 202: Separate master/worker parallel slot counting.
 * Workers don't consume orchestrator slots.
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
    parallel_workers?: number;
  };
  limits: {
    max_initiatives: number;
    max_tokens: number;
    max_deployments: number;
    max_parallel_runs: number;
  };
}

// ── Sprint 202: Stale thresholds by job type ──
const STALE_THRESHOLDS: Record<string, number> = {
  execution_worker: 5 * 60 * 1000,         // 5 min
  execution_orchestrator: 15 * 60 * 1000,   // 15 min (orchestrator can legitimately run longer)
  _default: 10 * 60 * 1000,                 // 10 min for everything else
};

// Stages that count as "master" (orchestrator-level) slots
const MASTER_STAGES = new Set([
  "execution_orchestrator",
  "discovery", "comprehension", "squad_formation",
  "planning", "validation", "publish", "deploy",
  "architecture_simulation", "foundation_scaffold",
  "module_graph_simulation", "dependency_intelligence",
  "deep_validation", "preventive_validation", "full_review",
  "runtime_validation", "fix_orchestrator", "drift_detection",
]);

// Worker stages don't consume master slots
const WORKER_STAGES = new Set([
  "execution_worker",
]);

function getStaleThreshold(stage: string): number {
  return STALE_THRESHOLDS[stage] ?? STALE_THRESHOLDS._default;
}

export async function enforceUsageLimits(
  serviceClient: ReturnType<typeof createClient>,
  organizationId: string,
  stageName?: string
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
    max_tokens_per_month: 10000000,
    max_deployments_per_month: 10,
    max_parallel_runs: 8,
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
    serviceClient
      .from("initiatives")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("created_at", monthStart.toISOString()),
    serviceClient
      .from("agent_outputs")
      .select("tokens_used")
      .eq("organization_id", organizationId)
      .gte("created_at", monthStart.toISOString()),
  ]);

  let deploymentCount = 0;
  let masterSlotCount = 0;
  let workerSlotCount = 0;

  if (orgInitIds.length > 0) {
    const chunkSize = 100;

    for (let i = 0; i < orgInitIds.length; i += chunkSize) {
      const chunk = orgInitIds.slice(i, i + chunkSize);

      // ── Sprint 202: Unified stale cleanup by stage type ──
      const now = Date.now();

      // Cleanup stale worker jobs
      const workerThreshold = new Date(now - getStaleThreshold("execution_worker")).toISOString();
      await serviceClient
        .from("initiative_jobs")
        .update({
          status: "failed",
          error: "Auto-cleanup: worker exceeded stale threshold (5min)",
          completed_at: new Date().toISOString(),
        })
        .in("initiative_id", chunk)
        .eq("status", "running")
        .eq("stage", "execution_worker")
        .lt("created_at", workerThreshold);

      // Cleanup stale orchestrator jobs
      const orchThreshold = new Date(now - getStaleThreshold("execution_orchestrator")).toISOString();
      await serviceClient
        .from("initiative_jobs")
        .update({
          status: "failed",
          error: "Auto-cleanup: orchestrator exceeded stale threshold (15min)",
          completed_at: new Date().toISOString(),
        })
        .in("initiative_id", chunk)
        .eq("status", "running")
        .eq("stage", "execution_orchestrator")
        .lt("created_at", orchThreshold);

      // Cleanup stale other jobs (10min)
      const generalThreshold = new Date(now - getStaleThreshold("_default")).toISOString();
      await serviceClient
        .from("initiative_jobs")
        .update({
          status: "failed",
          error: "Auto-cleanup: exceeded max runtime (10min)",
          completed_at: new Date().toISOString(),
        })
        .in("initiative_id", chunk)
        .eq("status", "running")
        .neq("stage", "execution_worker")
        .neq("stage", "execution_orchestrator")
        .lt("created_at", generalThreshold);

      // ── Sprint 202: Count master and worker slots separately ──
      const [deployRes, masterRes, workerRes] = await Promise.all([
        serviceClient
          .from("initiative_jobs")
          .select("id", { count: "exact", head: true })
          .in("initiative_id", chunk)
          .in("stage", ["publish", "deploy"])
          .eq("status", "success")
          .gte("created_at", monthStart.toISOString()),
        // Master slots: non-worker running jobs
        serviceClient
          .from("initiative_jobs")
          .select("id", { count: "exact", head: true })
          .in("initiative_id", chunk)
          .eq("status", "running")
          .neq("stage", "execution_worker"),
        // Worker slots: worker running jobs (separate pool)
        serviceClient
          .from("initiative_jobs")
          .select("id", { count: "exact", head: true })
          .in("initiative_id", chunk)
          .eq("status", "running")
          .eq("stage", "execution_worker"),
      ]);

      deploymentCount += deployRes.count ?? 0;
      masterSlotCount += masterRes.count ?? 0;
      workerSlotCount += workerRes.count ?? 0;
    }
  }

  const current = {
    initiatives: initCountRes.count ?? 0,
    tokens: (outputsRes.data ?? []).reduce((s, o) => s + (o.tokens_used ?? 0), 0),
    deployments: deploymentCount,
    parallel_runs: masterSlotCount, // Only master jobs count against the parallel limit
    parallel_workers: workerSlotCount,
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

  // Deployment limit only blocks deploy/publish stages
  const deployStages = ["publish", "deploy", "deploy-checker"];
  const isDeployStage = stageName ? deployStages.includes(stageName) : false;
  if (isDeployStage && current.deployments >= limits.max_deployments) {
    return {
      allowed: false,
      reason: `Monthly deployment limit reached (${current.deployments}/${limits.max_deployments})`,
      error_code: "USAGE_LIMIT_EXCEEDED",
      current,
      limits,
    };
  }

  // Sprint 202: Only MASTER jobs count against parallel limit.
  // Workers are bounded by MAX_WORKERS per orchestrator, not by the global limit.
  if (current.parallel_runs >= limits.max_parallel_runs) {
    // If the caller is a worker, let it through — workers are controlled by the orchestrator
    const isWorkerStage = stageName ? WORKER_STAGES.has(stageName) : false;
    if (!isWorkerStage) {
      return {
        allowed: false,
        reason: `Parallel run limit reached (${current.parallel_runs}/${limits.max_parallel_runs})`,
        error_code: "PARALLEL_LIMIT_EXCEEDED",
        current,
        limits,
      };
    }
  }

  // Check org hard limit from org_usage_limits
  const { data: orgLimits } = await serviceClient
    .from("org_usage_limits")
    .select("monthly_budget_usd, hard_limit, alert_threshold_pct")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (orgLimits?.hard_limit && orgInitIds.length > 0) {
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
