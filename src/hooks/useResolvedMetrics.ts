/**
 * useResolvedMetrics — Phase 3
 *
 * Bridges existing data hooks (useDashboardKPIs, useProductDashboard)
 * into the Metric Data Contract.
 *
 * All dashboards should consume metrics through this hook.
 */

import { useMemo } from "react";
import { useDashboardKPIs } from "@/hooks/useDashboardKPIs";
import { useProductDashboard } from "@/hooks/useProductDashboard";
import { resolveMetrics, type Metric } from "@/lib/metrics";

export function useResolvedMetrics() {
  const { data: kpis, dataUpdatedAt: kpisUpdatedAt } = useDashboardKPIs();
  const { data: product, dataUpdatedAt: productUpdatedAt } = useProductDashboard();

  const now = new Date().toISOString();
  const kpisTs = kpisUpdatedAt ? new Date(kpisUpdatedAt).toISOString() : now;
  const productTs = productUpdatedAt ? new Date(productUpdatedAt).toISOString() : now;

  const metrics = useMemo<Metric[]>(() => {
    return resolveMetrics([
      // ── Execution Telemetry ──
      { key: "system_uptime", value: "99.97%", updatedAt: now },
      { key: "system_latency", value: "42ms", updatedAt: now },
      { key: "last_incident", value: "3d ago", updatedAt: now },
      {
        key: "pipeline_success_rate",
        value: product?.pipelineSuccessRate ?? null,
        updatedAt: productTs,
        trend: "up",
        thresholds: { warning: 70, error: 50, inverted: true },
      },
      {
        key: "deploy_success_rate",
        value: product?.deploySuccessRate ?? null,
        updatedAt: productTs,
        trend: "up",
        thresholds: { warning: 70, error: 50, inverted: true },
      },
      {
        key: "repair_success_rate",
        value: product?.repairSuccessRate ?? null,
        updatedAt: productTs,
      },
      { key: "pipeline_throughput_avg", value: "78%", updatedAt: now },
      { key: "pipeline_throughput_peak", value: "94%", updatedAt: now },
      { key: "pipeline_errors", value: 2, updatedAt: now },
      {
        key: "total_deployments",
        value: product?.totalDeployments ?? null,
        updatedAt: productTs,
      },
      {
        key: "total_repairs",
        value: product?.totalRepairs ?? null,
        updatedAt: productTs,
      },

      // ── Product Telemetry ──
      {
        key: "total_initiatives",
        value: product?.totalInitiatives ?? null,
        updatedAt: productTs,
        trend: "up",
      },
      {
        key: "deployed_initiatives",
        value: product?.deployedCount ?? null,
        updatedAt: productTs,
      },
      {
        key: "active_agents",
        value: kpis?.topAgents.length ?? null,
        updatedAt: kpisTs,
        trend: "neutral",
      },
      {
        key: "monthly_cost",
        value: product?.monthlyCost ?? null,
        updatedAt: productTs,
        trend: "neutral",
      },
      {
        key: "tokens_used",
        value: product?.tokensUsed ?? null,
        updatedAt: productTs,
      },
      {
        key: "pending_review",
        value: kpis?.pendingReview ?? null,
        updatedAt: kpisTs,
        trend: kpis?.pendingReview && kpis.pendingReview > 5 ? "down" : "neutral",
      },
      {
        key: "stories_done",
        value: kpis?.storiesDone ?? null,
        updatedAt: kpisTs,
      },
      {
        key: "stories_total",
        value: kpis?.storiesTotal ?? null,
        updatedAt: kpisTs,
      },
      {
        key: "approval_rate",
        value: kpis?.approvalRate ?? null,
        updatedAt: kpisTs,
      },

      // ── System Telemetry (mock) ──
      { key: "pending_approvals", value: 3, updatedAt: now },
      { key: "blocked_actions", value: 1, updatedAt: now },
      { key: "policy_violations", value: 0, updatedAt: now },
      { key: "autonomy_score", value: "87%", updatedAt: now },
      { key: "doctrine_compliance", value: 94, updatedAt: now },
    ]);
  }, [kpis, product, kpisTs, productTs, now]);

  /** Lookup a single resolved metric by key */
  const getMetric = (key: string): Metric | undefined =>
    metrics.find((m) => m.key === key);

  /** Get all metrics for a telemetry layer */
  const getByLayer = (layer: "execution" | "product" | "system") =>
    metrics.filter((m) => m.layer === layer);

  /** Get all mock metrics for transparency */
  const mockMetrics = metrics.filter((m) => m.source === "mock");

  return {
    metrics,
    getMetric,
    getByLayer,
    mockMetrics,
    loading: !kpis && !product,
  };
}
