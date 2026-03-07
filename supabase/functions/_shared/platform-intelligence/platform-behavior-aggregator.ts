// Sprint 30 — Platform Behavior Aggregator
// Collects signals across execution contexts, tenants, workspaces, policies, repair patterns, etc.

export interface AggregatedMetrics {
  total_executions: number;
  total_failures: number;
  total_retries: number;
  total_repairs: number;
  total_cost_usd: number;
  total_deploy_attempts: number;
  total_deploy_successes: number;
  total_validation_failures: number;
  total_human_reviews: number;
  global_failure_rate: number;
  global_retry_rate: number;
  global_repair_rate: number;
  global_deploy_success_rate: number;
  global_cost_per_execution: number;
}

export interface ContextDistribution {
  context_class: string;
  count: number;
  failure_rate: number;
  avg_cost: number;
}

export interface PolicyUsageDistribution {
  policy_mode: string;
  usage_count: number;
  success_rate: number;
  avg_cost: number;
}

export interface ConcentrationMap {
  entity: string;
  entity_type: string;
  count: number;
  rate: number;
  severity: "low" | "medium" | "high";
}

export interface PlatformBehaviorSnapshot {
  global_metrics: AggregatedMetrics;
  context_distribution: ContextDistribution[];
  policy_usage_distribution: PolicyUsageDistribution[];
  failure_concentration: ConcentrationMap[];
  repair_concentration: ConcentrationMap[];
  cost_concentration: ConcentrationMap[];
  computed_at: string;
}

export interface ExecutionRecord {
  stage: string;
  status: string;
  cost_usd: number;
  duration_ms: number;
  context_class?: string;
  policy_mode?: string;
  organization_id: string;
  workspace_id?: string;
  had_retry: boolean;
  had_repair: boolean;
  had_validation_failure: boolean;
  had_human_review: boolean;
  deploy_attempted: boolean;
  deploy_succeeded: boolean;
}

export function aggregatePlatformBehavior(records: ExecutionRecord[]): PlatformBehaviorSnapshot {
  if (records.length === 0) {
    return {
      global_metrics: {
        total_executions: 0, total_failures: 0, total_retries: 0, total_repairs: 0,
        total_cost_usd: 0, total_deploy_attempts: 0, total_deploy_successes: 0,
        total_validation_failures: 0, total_human_reviews: 0,
        global_failure_rate: 0, global_retry_rate: 0, global_repair_rate: 0,
        global_deploy_success_rate: 0, global_cost_per_execution: 0,
      },
      context_distribution: [],
      policy_usage_distribution: [],
      failure_concentration: [],
      repair_concentration: [],
      cost_concentration: [],
      computed_at: new Date().toISOString(),
    };
  }

  const total = records.length;
  const failures = records.filter(r => r.status === "failed").length;
  const retries = records.filter(r => r.had_retry).length;
  const repairs = records.filter(r => r.had_repair).length;
  const totalCost = records.reduce((s, r) => s + r.cost_usd, 0);
  const deployAttempts = records.filter(r => r.deploy_attempted).length;
  const deploySuccesses = records.filter(r => r.deploy_succeeded).length;
  const validationFailures = records.filter(r => r.had_validation_failure).length;
  const humanReviews = records.filter(r => r.had_human_review).length;

  const global_metrics: AggregatedMetrics = {
    total_executions: total,
    total_failures: failures,
    total_retries: retries,
    total_repairs: repairs,
    total_cost_usd: totalCost,
    total_deploy_attempts: deployAttempts,
    total_deploy_successes: deploySuccesses,
    total_validation_failures: validationFailures,
    total_human_reviews: humanReviews,
    global_failure_rate: failures / total,
    global_retry_rate: retries / total,
    global_repair_rate: repairs / total,
    global_deploy_success_rate: deployAttempts > 0 ? deploySuccesses / deployAttempts : 1,
    global_cost_per_execution: totalCost / total,
  };

  // Context distribution
  const ctxMap = new Map<string, { count: number; failures: number; cost: number }>();
  for (const r of records) {
    const ctx = r.context_class || "unknown";
    const e = ctxMap.get(ctx) || { count: 0, failures: 0, cost: 0 };
    e.count++;
    if (r.status === "failed") e.failures++;
    e.cost += r.cost_usd;
    ctxMap.set(ctx, e);
  }
  const context_distribution: ContextDistribution[] = Array.from(ctxMap.entries()).map(([ctx, d]) => ({
    context_class: ctx, count: d.count,
    failure_rate: d.count > 0 ? d.failures / d.count : 0,
    avg_cost: d.count > 0 ? d.cost / d.count : 0,
  }));

  // Policy usage distribution
  const polMap = new Map<string, { count: number; successes: number; cost: number }>();
  for (const r of records) {
    const pm = r.policy_mode || "unknown";
    const e = polMap.get(pm) || { count: 0, successes: 0, cost: 0 };
    e.count++;
    if (r.status !== "failed") e.successes++;
    e.cost += r.cost_usd;
    polMap.set(pm, e);
  }
  const policy_usage_distribution: PolicyUsageDistribution[] = Array.from(polMap.entries()).map(([pm, d]) => ({
    policy_mode: pm, usage_count: d.count,
    success_rate: d.count > 0 ? d.successes / d.count : 0,
    avg_cost: d.count > 0 ? d.cost / d.count : 0,
  }));

  // Failure concentration by stage
  const stageFailMap = new Map<string, { count: number; total: number }>();
  for (const r of records) {
    const e = stageFailMap.get(r.stage) || { count: 0, total: 0 };
    e.total++;
    if (r.status === "failed") e.count++;
    stageFailMap.set(r.stage, e);
  }
  const failure_concentration: ConcentrationMap[] = Array.from(stageFailMap.entries())
    .filter(([, d]) => d.count > 0)
    .map(([stage, d]) => ({
      entity: stage, entity_type: "stage", count: d.count,
      rate: d.total > 0 ? d.count / d.total : 0,
      severity: d.count / d.total > 0.5 ? "high" : d.count / d.total > 0.25 ? "medium" : "low",
    }))
    .sort((a, b) => b.rate - a.rate);

  // Repair concentration by stage
  const stageRepairMap = new Map<string, { count: number; total: number }>();
  for (const r of records) {
    const e = stageRepairMap.get(r.stage) || { count: 0, total: 0 };
    e.total++;
    if (r.had_repair) e.count++;
    stageRepairMap.set(r.stage, e);
  }
  const repair_concentration: ConcentrationMap[] = Array.from(stageRepairMap.entries())
    .filter(([, d]) => d.count > 0)
    .map(([stage, d]) => ({
      entity: stage, entity_type: "stage", count: d.count,
      rate: d.total > 0 ? d.count / d.total : 0,
      severity: d.count / d.total > 0.4 ? "high" : d.count / d.total > 0.2 ? "medium" : "low",
    }))
    .sort((a, b) => b.rate - a.rate);

  // Cost concentration by stage
  const stageCostMap = new Map<string, number>();
  for (const r of records) {
    stageCostMap.set(r.stage, (stageCostMap.get(r.stage) || 0) + r.cost_usd);
  }
  const cost_concentration: ConcentrationMap[] = Array.from(stageCostMap.entries())
    .map(([stage, cost]) => ({
      entity: stage, entity_type: "stage", count: 1,
      rate: totalCost > 0 ? cost / totalCost : 0,
      severity: (cost / totalCost) > 0.3 ? "high" : (cost / totalCost) > 0.15 ? "medium" : "low",
    }))
    .sort((a, b) => b.rate - a.rate);

  return {
    global_metrics, context_distribution, policy_usage_distribution,
    failure_concentration, repair_concentration, cost_concentration,
    computed_at: new Date().toISOString(),
  };
}
