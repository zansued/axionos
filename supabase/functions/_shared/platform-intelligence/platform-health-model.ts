// Sprint 30 — Platform Health Model
// Computes global health indices for reliability, stability, repair, cost, deploy, policy

import type { PlatformBehaviorSnapshot } from "./platform-behavior-aggregator.ts";
import type { BottleneckReport } from "./platform-bottleneck-detector.ts";

export interface PlatformHealthMetrics {
  reliability_index: number;        // 0-1, higher = better
  execution_stability_index: number; // 0-1
  repair_burden_index: number;       // 0-1, lower = better (inverted for display)
  cost_efficiency_index: number;     // 0-1
  deploy_success_index: number;      // 0-1
  policy_effectiveness_index: number; // 0-1
  overall_health_score: number;      // 0-1
  health_grade: "A" | "B" | "C" | "D" | "F";
}

export function computePlatformHealth(
  snapshot: PlatformBehaviorSnapshot,
  bottlenecks: BottleneckReport,
): PlatformHealthMetrics {
  const gm = snapshot.global_metrics;

  // Reliability: 1 - failure_rate
  const reliability_index = gm.total_executions > 0 ? 1 - gm.global_failure_rate : 1;

  // Stability: penalize by retry rate and bottleneck count
  const bottleneckPenalty = Math.min(0.5, bottlenecks.bottlenecks.length * 0.05);
  const execution_stability_index = Math.max(0, 1 - gm.global_retry_rate - bottleneckPenalty);

  // Repair burden: lower is better (we report as burden, but index is 0-1 where 1 = no burden)
  const repair_burden_index = gm.total_executions > 0 ? gm.global_repair_rate : 0;

  // Cost efficiency: normalize. If cost per execution is very low, score high
  // We use a sigmoid-like mapping: $0.01 per exec = 1.0, $1.0 per exec = 0.5, $10.0 = 0.1
  const costPerExec = gm.global_cost_per_execution;
  const cost_efficiency_index = costPerExec > 0 ? Math.max(0, 1 - Math.min(1, costPerExec / 2)) : 1;

  // Deploy success
  const deploy_success_index = gm.total_deploy_attempts > 0 ? gm.global_deploy_success_rate : 1;

  // Policy effectiveness: based on policy usage distribution — average success rate across policies
  const polDist = snapshot.policy_usage_distribution;
  const policy_effectiveness_index = polDist.length > 0
    ? polDist.reduce((s, p) => s + p.success_rate * p.usage_count, 0) / polDist.reduce((s, p) => s + p.usage_count, 0)
    : 1;

  // Overall health: weighted average
  const overall_health_score = (
    reliability_index * 0.25 +
    execution_stability_index * 0.15 +
    (1 - repair_burden_index) * 0.15 +
    cost_efficiency_index * 0.15 +
    deploy_success_index * 0.15 +
    policy_effectiveness_index * 0.15
  );

  const health_grade: PlatformHealthMetrics["health_grade"] =
    overall_health_score >= 0.9 ? "A" :
    overall_health_score >= 0.75 ? "B" :
    overall_health_score >= 0.6 ? "C" :
    overall_health_score >= 0.4 ? "D" : "F";

  return {
    reliability_index: round(reliability_index),
    execution_stability_index: round(execution_stability_index),
    repair_burden_index: round(repair_burden_index),
    cost_efficiency_index: round(cost_efficiency_index),
    deploy_success_index: round(deploy_success_index),
    policy_effectiveness_index: round(policy_effectiveness_index),
    overall_health_score: round(overall_health_score),
    health_grade,
  };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
