/**
 * Pipeline Health Metrics — Sprint 208
 * Aggregates pipeline execution data for observability dashboard.
 * Supports: summary stats, failure timeline, error category breakdown.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    const orgId = url.searchParams.get("organization_id");
    const view = url.searchParams.get("view") || "summary";
    const hours = parseInt(url.searchParams.get("hours") || "72", 10);

    if (!orgId) return errorResponse("organization_id required", 400, corsHeaders);

    const since = new Date(Date.now() - hours * 3600000).toISOString();

    if (view === "summary") {
      const { data: metrics, error } = await supabase
        .from("pipeline_execution_metrics")
        .select("succeeded, latency_ms, tokens_used, cost_usd, retry_count, execution_path, risk_tier, error_category, created_at")
        .eq("organization_id", orgId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) return errorResponse(error.message, 500, corsHeaders);

      const total = metrics?.length || 0;
      const succeeded = metrics?.filter(m => m.succeeded).length || 0;
      const failed = total - succeeded;
      const avgLatency = total > 0 ? Math.round(metrics!.reduce((s, m) => s + (m.latency_ms || 0), 0) / total) : 0;
      const totalTokens = metrics?.reduce((s, m) => s + (m.tokens_used || 0), 0) || 0;
      const totalCost = metrics?.reduce((s, m) => s + Number(m.cost_usd || 0), 0) || 0;
      const retries = metrics?.reduce((s, m) => s + (m.retry_count || 0), 0) || 0;

      // Path distribution
      const pathCounts: Record<string, number> = {};
      const riskCounts: Record<string, number> = {};
      const errorCounts: Record<string, number> = {};

      for (const m of metrics || []) {
        pathCounts[m.execution_path] = (pathCounts[m.execution_path] || 0) + 1;
        riskCounts[m.risk_tier] = (riskCounts[m.risk_tier] || 0) + 1;
        if (m.error_category) {
          errorCounts[m.error_category] = (errorCounts[m.error_category] || 0) + 1;
        }
      }

      // Hourly timeline (last 72h, grouped by hour)
      const hourlyMap: Record<string, { total: number; failed: number }> = {};
      for (const m of metrics || []) {
        const hour = m.created_at.substring(0, 13); // YYYY-MM-DDTHH
        if (!hourlyMap[hour]) hourlyMap[hour] = { total: 0, failed: 0 };
        hourlyMap[hour].total++;
        if (!m.succeeded) hourlyMap[hour].failed++;
      }

      const timeline = Object.entries(hourlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([hour, data]) => ({
          hour: hour + ":00",
          total: data.total,
          failed: data.failed,
          success_rate: data.total > 0 ? Math.round(((data.total - data.failed) / data.total) * 100) : 100,
        }));

      return jsonResponse({
        period_hours: hours,
        total_executions: total,
        succeeded,
        failed,
        success_rate: total > 0 ? Math.round((succeeded / total) * 100) : 100,
        avg_latency_ms: avgLatency,
        total_tokens: totalTokens,
        total_cost_usd: Math.round(totalCost * 10000) / 10000,
        total_retries: retries,
        path_distribution: pathCounts,
        risk_distribution: riskCounts,
        error_categories: errorCounts,
        timeline,
      }, corsHeaders);
    }

    if (view === "failures") {
      const { data: failures, error } = await supabase
        .from("pipeline_execution_metrics")
        .select("id, file_path, file_type, error_message, error_category, retry_count, risk_tier, execution_path, latency_ms, trace_id, attempt_id, created_at")
        .eq("organization_id", orgId)
        .eq("succeeded", false)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) return errorResponse(error.message, 500, corsHeaders);
      return jsonResponse({ failures: failures || [] }, corsHeaders);
    }

    return errorResponse("Invalid view. Use: summary, failures", 400, corsHeaders);
  } catch (err) {
    return errorResponse(err.message || "Internal error", 500, corsHeaders);
  }
});
