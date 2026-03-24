/**
 * useQualityDashboard — Sprint 217
 * Aggregates pipeline_execution_metrics + operational_learning_signals
 * to surface build quality, top errors, and deploy feedback.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export interface QualityMetrics {
  totalExecutions: number;
  succeeded: number;
  failed: number;
  successRate: number;
  avgLatencyMs: number;
  totalCostUsd: number;
  totalTokens: number;
  totalRetries: number;
  topErrors: { category: string; count: number }[];
  riskDistribution: { tier: string; count: number }[];
  recentFailures: {
    id: string;
    file_path: string;
    error_category: string | null;
    error_message: string | null;
    risk_tier: string;
    created_at: string;
  }[];
  deploySignals: {
    total: number;
    successful: number;
    failed: number;
    topCategories: { category: string; count: number }[];
  };
  hourlyTimeline: {
    hour: string;
    total: number;
    failed: number;
    successRate: number;
  }[];
}

export function useQualityDashboard(hours = 72) {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  return useQuery<QualityMetrics>({
    queryKey: ["quality-dashboard", orgId, hours],
    enabled: !!orgId,
    staleTime: 60_000,
    refetchInterval: 120_000,
    queryFn: async () => {
      const since = new Date(Date.now() - hours * 3600000).toISOString();

      const [metricsRes, failuresRes, signalsRes] = await Promise.all([
        supabase
          .from("pipeline_execution_metrics")
          .select("succeeded, latency_ms, tokens_used, cost_usd, retry_count, risk_tier, error_category, created_at")
          .eq("organization_id", orgId!)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("pipeline_execution_metrics")
          .select("id, file_path, error_category, error_message, risk_tier, created_at")
          .eq("organization_id", orgId!)
          .eq("succeeded", false)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("operational_learning_signals")
          .select("signal_type, outcome_success, payload, created_at")
          .eq("organization_id", orgId!)
          .eq("signal_type", "deploy_outcome")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      const metrics = metricsRes.data ?? [];
      const failures = failuresRes.data ?? [];
      const signals = signalsRes.data ?? [];

      const total = metrics.length;
      const succeeded = metrics.filter(m => m.succeeded).length;
      const failed = total - succeeded;
      const avgLatency = total > 0 ? Math.round(metrics.reduce((s, m) => s + (m.latency_ms || 0), 0) / total) : 0;
      const totalTokens = metrics.reduce((s, m) => s + (m.tokens_used || 0), 0);
      const totalCost = metrics.reduce((s, m) => s + Number(m.cost_usd || 0), 0);
      const totalRetries = metrics.reduce((s, m) => s + (m.retry_count || 0), 0);

      // Top errors
      const errorMap: Record<string, number> = {};
      for (const m of metrics) {
        if (m.error_category) {
          errorMap[m.error_category] = (errorMap[m.error_category] || 0) + 1;
        }
      }
      const topErrors = Object.entries(errorMap)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Risk distribution
      const riskMap: Record<string, number> = {};
      for (const m of metrics) {
        riskMap[m.risk_tier] = (riskMap[m.risk_tier] || 0) + 1;
      }
      const riskDistribution = Object.entries(riskMap)
        .map(([tier, count]) => ({ tier, count }));

      // Hourly timeline
      const hourlyMap: Record<string, { total: number; failed: number }> = {};
      for (const m of metrics) {
        const hour = m.created_at.substring(0, 13);
        if (!hourlyMap[hour]) hourlyMap[hour] = { total: 0, failed: 0 };
        hourlyMap[hour].total++;
        if (!m.succeeded) hourlyMap[hour].failed++;
      }
      const hourlyTimeline = Object.entries(hourlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([hour, data]) => ({
          hour: hour + ":00",
          total: data.total,
          failed: data.failed,
          successRate: data.total > 0 ? Math.round(((data.total - data.failed) / data.total) * 100) : 100,
        }));

      // Deploy signals
      const deploySuccessful = signals.filter(s => s.outcome_success === true).length;
      const deployFailed = signals.filter(s => s.outcome_success === false).length;
      const deployCatMap: Record<string, number> = {};
      for (const s of signals) {
        if (!s.outcome_success && s.payload) {
          const p = s.payload as Record<string, unknown>;
          const cat = (p.error_category as string) || "unknown";
          deployCatMap[cat] = (deployCatMap[cat] || 0) + 1;
        }
      }
      const deployTopCategories = Object.entries(deployCatMap)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalExecutions: total,
        succeeded,
        failed,
        successRate: total > 0 ? Math.round((succeeded / total) * 100) : 100,
        avgLatencyMs: avgLatency,
        totalCostUsd: Math.round(totalCost * 10000) / 10000,
        totalTokens,
        totalRetries,
        topErrors,
        riskDistribution,
        recentFailures: failures,
        deploySignals: {
          total: signals.length,
          successful: deploySuccessful,
          failed: deployFailed,
          topCategories: deployTopCategories,
        },
        hourlyTimeline,
      };
    },
  });
}
