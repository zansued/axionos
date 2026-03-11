/**
 * Central Metric Registry — Phase 3
 *
 * Every metric displayed in AxionOS is declared here.
 * Dashboards MUST reference metrics from this registry.
 *
 * Organized by Telemetry Layer:
 *   1. Execution Telemetry (pipelines, deploys, runtime)
 *   2. Product Telemetry (idea→software, tokens, cost)
 *   3. System Telemetry (health, autonomy, governance)
 */

import type { MetricRegistryEntry } from "./metric-contract";

// ═══════════════════════════════════════════════════════════════════
// 1. EXECUTION TELEMETRY
// ═══════════════════════════════════════════════════════════════════

const executionMetrics: MetricRegistryEntry[] = [
  // ── Runtime Real ──
  {
    key: "system_uptime",
    label: "System Uptime",
    source: "mock",
    unit: "%",
    layer: "execution",
    calculation: "external_runtime_monitor (not yet connected)",
    updateFrequency: "real-time",
    explanation: "Percentage of time the platform has been operational. Currently a placeholder.",
  },
  {
    key: "system_latency",
    label: "System Latency",
    source: "mock",
    unit: "ms",
    layer: "execution",
    calculation: "external_runtime_monitor (not yet connected)",
    updateFrequency: "real-time",
    explanation: "Average response time of the platform. Currently a placeholder.",
  },
  {
    key: "last_incident",
    label: "Last Incident",
    source: "mock",
    unit: "",
    layer: "execution",
    calculation: "incident_tracking (not yet connected)",
    updateFrequency: "on_event",
    explanation: "Time since last system incident. Currently a placeholder.",
  },

  // ── Pipeline Real ──
  {
    key: "pipeline_success_rate",
    label: "Pipeline Success Rate",
    source: "pipeline_real",
    unit: "%",
    layer: "execution",
    calculation: "completed_jobs / total_jobs * 100 (initiative_jobs table, filtered by org)",
    updateFrequency: "per_request",
  },
  {
    key: "deploy_success_rate",
    label: "Deploy Success Rate",
    source: "pipeline_real",
    unit: "%",
    layer: "execution",
    calculation: "AVG(initiative_observability.deploy_success_rate) for org",
    updateFrequency: "per_request",
  },
  {
    key: "repair_success_rate",
    label: "Auto-Repair Success Rate",
    source: "pipeline_real",
    unit: "%",
    layer: "execution",
    calculation: "AVG(initiative_observability.automatic_repair_success_rate) for org",
    updateFrequency: "per_request",
  },
  {
    key: "pipeline_throughput_avg",
    label: "Pipeline Throughput (Avg)",
    source: "mock",
    unit: "%",
    layer: "execution",
    calculation: "Hardcoded bar chart values (not yet connected to real data)",
    updateFrequency: "n/a",
    explanation: "Average pipeline throughput over last 24h. Currently simulated.",
  },
  {
    key: "pipeline_throughput_peak",
    label: "Pipeline Throughput (Peak)",
    source: "mock",
    unit: "%",
    layer: "execution",
    calculation: "Hardcoded bar chart values (not yet connected to real data)",
    updateFrequency: "n/a",
    explanation: "Peak pipeline throughput. Currently simulated.",
  },
  {
    key: "pipeline_errors",
    label: "Pipeline Errors",
    source: "mock",
    unit: "",
    layer: "execution",
    calculation: "Hardcoded count (not yet connected to real data)",
    updateFrequency: "n/a",
    explanation: "Number of pipeline errors in the last 24h. Currently simulated.",
  },
  {
    key: "total_deployments",
    label: "Total Deployments",
    source: "pipeline_real",
    unit: "",
    layer: "execution",
    calculation: "COUNT(initiative_jobs) WHERE stage IN (publish, deploy) AND status = completed",
    updateFrequency: "per_request",
  },
  {
    key: "total_repairs",
    label: "Total Repairs",
    source: "pipeline_real",
    unit: "",
    layer: "execution",
    calculation: "COUNT(initiative_jobs) WHERE stage IN (rework, build_repair, self_healing)",
    updateFrequency: "per_request",
  },
];

// ═══════════════════════════════════════════════════════════════════
// 2. PRODUCT TELEMETRY
// ═══════════════════════════════════════════════════════════════════

const productMetrics: MetricRegistryEntry[] = [
  {
    key: "total_initiatives",
    label: "Total Initiatives",
    source: "pipeline_real",
    unit: "",
    layer: "product",
    calculation: "COUNT(initiatives) WHERE organization_id = org",
    updateFrequency: "per_request",
  },
  {
    key: "deployed_initiatives",
    label: "Deployed Initiatives",
    source: "pipeline_real",
    unit: "",
    layer: "product",
    calculation: "COUNT(initiatives) WHERE stage_status = deployed",
    updateFrequency: "per_request",
  },
  {
    key: "active_agents",
    label: "Active Agents",
    source: "pipeline_real",
    unit: "",
    layer: "product",
    calculation: "COUNT(agents with completed subtasks in story_subtasks)",
    updateFrequency: "per_request",
  },
  {
    key: "monthly_cost",
    label: "Monthly Cost",
    source: "pipeline_real",
    unit: "$",
    layer: "product",
    calculation: "SUM(initiative_jobs.cost_usd) WHERE created_at >= month_start",
    updateFrequency: "per_request",
  },
  {
    key: "tokens_used",
    label: "Tokens Used",
    source: "pipeline_real",
    unit: "",
    layer: "product",
    calculation: "SUM(agent_outputs.tokens_used) WHERE created_at >= month_start",
    updateFrequency: "per_request",
  },
  {
    key: "pending_review",
    label: "Pending Review",
    source: "pipeline_real",
    unit: "",
    layer: "product",
    calculation: "COUNT(agent_outputs) WHERE status = pending_review",
    updateFrequency: "per_request",
  },
  {
    key: "stories_done",
    label: "Stories Completed",
    source: "pipeline_real",
    unit: "",
    layer: "product",
    calculation: "COUNT(stories) WHERE status = done",
    updateFrequency: "per_request",
  },
  {
    key: "stories_total",
    label: "Stories Total",
    source: "pipeline_real",
    unit: "",
    layer: "product",
    calculation: "COUNT(stories)",
    updateFrequency: "per_request",
  },
  {
    key: "approval_rate",
    label: "Approval Rate",
    source: "pipeline_real",
    unit: "%",
    layer: "product",
    calculation: "approved_or_deployed / total_reviewed * 100 (agent_outputs)",
    updateFrequency: "per_request",
  },

  // ── Strategic / Cost Metrics ──
  {
    key: "avg_cost_per_initiative",
    label: "Avg Cost per Initiative",
    source: "calculated",
    unit: "$",
    layer: "product",
    calculation: "total_cost / total_initiatives",
    updateFrequency: "per_request",
    explanation: "Total pipeline cost divided by number of initiatives.",
  },
  {
    key: "total_pipeline_cost",
    label: "Total Pipeline Cost",
    source: "pipeline_real",
    unit: "$",
    layer: "product",
    calculation: "SUM(initiative_jobs.cost_usd) for org jobs",
    updateFrequency: "per_request",
  },
  {
    key: "cost_per_artifact",
    label: "Cost per Artifact",
    source: "calculated",
    unit: "$",
    layer: "product",
    calculation: "SUM(agent_outputs.cost_estimate) / COUNT(agent_outputs)",
    updateFrequency: "per_request",
    explanation: "Average cost per generated artifact.",
  },
  {
    key: "avg_discovery_time",
    label: "Avg Discovery Time",
    source: "pipeline_real",
    unit: "min",
    layer: "product",
    calculation: "AVG(initiative_jobs.duration_ms) WHERE stage = discovery AND status = success / 60000",
    updateFrequency: "per_request",
  },
  {
    key: "avg_planning_time",
    label: "Avg Planning Time",
    source: "pipeline_real",
    unit: "min",
    layer: "product",
    calculation: "AVG(initiative_jobs.duration_ms) WHERE stage = planning AND status = success / 60000",
    updateFrequency: "per_request",
  },
  {
    key: "avg_execution_time",
    label: "Avg Execution Time",
    source: "pipeline_real",
    unit: "min",
    layer: "product",
    calculation: "AVG(initiative_jobs.duration_ms) WHERE stage = execution AND status = success / 60000",
    updateFrequency: "per_request",
  },
  {
    key: "rework_rate",
    label: "Rework Rate",
    source: "calculated",
    unit: "%",
    layer: "product",
    calculation: "rework_jobs / success_jobs * 100",
    updateFrequency: "per_request",
    explanation: "Percentage of pipeline jobs that required rework.",
  },
  {
    key: "rejection_rate",
    label: "Rejection Rate",
    source: "calculated",
    unit: "%",
    layer: "product",
    calculation: "reject_jobs / success_jobs * 100",
    updateFrequency: "per_request",
    explanation: "Percentage of pipeline jobs that were rejected.",
  },
];

// ═══════════════════════════════════════════════════════════════════
// 3. SYSTEM TELEMETRY
// ═══════════════════════════════════════════════════════════════════

const systemMetrics: MetricRegistryEntry[] = [
  {
    key: "pending_approvals",
    label: "Pending Approvals",
    source: "mock",
    unit: "",
    layer: "system",
    calculation: "Hardcoded value (not yet connected to approval queue)",
    updateFrequency: "n/a",
    explanation: "Number of pipeline stages awaiting human approval. Currently a placeholder.",
  },
  {
    key: "blocked_actions",
    label: "Blocked Actions",
    source: "mock",
    unit: "",
    layer: "system",
    calculation: "Hardcoded value (not yet connected to governance engine)",
    updateFrequency: "n/a",
    explanation: "Actions blocked by governance rules. Currently a placeholder.",
  },
  {
    key: "policy_violations",
    label: "Policy Violations",
    source: "mock",
    unit: "",
    layer: "system",
    calculation: "Hardcoded value (not yet connected to policy engine)",
    updateFrequency: "n/a",
    explanation: "Number of policy violations detected. Currently a placeholder.",
  },
  {
    key: "autonomy_score",
    label: "Autonomy Score",
    source: "mock",
    unit: "%",
    layer: "system",
    calculation: "Hardcoded value (not yet connected to autonomy posture engine)",
    updateFrequency: "n/a",
    explanation: "Composite score measuring system's autonomous operation capability. Currently a placeholder.",
  },
  {
    key: "doctrine_compliance",
    label: "Doctrine Compliance",
    source: "mock",
    unit: "%",
    layer: "system",
    calculation: "Hardcoded value (not yet connected to doctrine engine)",
    updateFrequency: "n/a",
    explanation: "Percentage of operations aligned with institutional doctrines. Currently a placeholder.",
  },
];

// ═══════════════════════════════════════════════════════════════════
// COMBINED REGISTRY
// ═══════════════════════════════════════════════════════════════════

export const METRIC_REGISTRY: MetricRegistryEntry[] = [
  ...executionMetrics,
  ...productMetrics,
  ...systemMetrics,
];

/** Lookup a metric definition by key */
export function getRegistryEntry(key: string): MetricRegistryEntry | undefined {
  return METRIC_REGISTRY.find((m) => m.key === key);
}

/** Get all metrics for a telemetry layer */
export function getMetricsByLayer(layer: "execution" | "product" | "system"): MetricRegistryEntry[] {
  return METRIC_REGISTRY.filter((m) => m.layer === layer);
}

/** Get all mock metrics (for transparency) */
export function getMockMetrics(): MetricRegistryEntry[] {
  return METRIC_REGISTRY.filter((m) => m.source === "mock");
}
