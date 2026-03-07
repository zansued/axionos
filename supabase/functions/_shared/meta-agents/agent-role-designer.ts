/**
 * Agent Role Designer Meta-Agent — Sprint 13
 *
 * Detects when current agent role structure is insufficient or overloaded.
 * Proposes new roles, specializations, or deprecations.
 *
 * SAFETY: Read-only. Only produces recommendations, never creates agents.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MetaRecommendation } from "./types.ts";
import { scoreRecommendation, generateSignature } from "./scoring.ts";

export async function runAgentRoleDesigner(
  sc: SupabaseClient,
  organizationId: string
): Promise<MetaRecommendation[]> {
  const recommendations: MetaRecommendation[] = [];

  // 1. Analyze repair loop concentration by error category
  const { data: errorPatterns } = await sc
    .from("error_patterns")
    .select("id, title, error_category, frequency, success_rate, successful_strategies, failed_strategies")
    .eq("organization_id", organizationId)
    .order("frequency", { ascending: false })
    .limit(50);

  if (!errorPatterns || errorPatterns.length === 0) return recommendations;

  // Group by error category
  const categoryStats: Record<string, { total_freq: number; avg_success: number; count: number; patterns: string[] }> = {};
  for (const ep of errorPatterns) {
    const cat = ep.error_category || "unknown";
    if (!categoryStats[cat]) categoryStats[cat] = { total_freq: 0, avg_success: 0, count: 0, patterns: [] };
    categoryStats[cat].total_freq += ep.frequency;
    categoryStats[cat].avg_success += Number(ep.success_rate);
    categoryStats[cat].count++;
    categoryStats[cat].patterns.push(ep.id);
  }

  const totalFreq = Object.values(categoryStats).reduce((a, b) => a + b.total_freq, 0);

  // 2. Detect categories with high frequency + low success → candidate for specialized agent
  for (const [category, stats] of Object.entries(categoryStats)) {
    const ratio = totalFreq > 0 ? stats.total_freq / totalFreq : 0;
    const avgSuccess = stats.count > 0 ? stats.avg_success / stats.count : 0;

    // Threshold: >20% of all errors AND <50% average repair success
    if (ratio > 0.20 && avgSuccess < 50 && stats.total_freq >= 3) {
      const scores = scoreRecommendation({
        evidence_count: stats.count,
        recurrence_count: stats.total_freq,
        total_observations: totalFreq,
        cost_savings_estimate: 0,
        failure_rate: 1 - avgSuccess / 100,
        time_savings_estimate: 0,
        avg_execution_time: 0,
        trend_worsening: avgSuccess < 30,
        breadth: 1,
      });

      const agentName = category
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join("") + "Agent";

      recommendations.push({
        meta_agent_type: "AGENT_ROLE_DESIGNER",
        recommendation_type: "NEW_AGENT_ROLE",
        target_component: category,
        title: `Create dedicated ${agentName}`,
        description: `Error category "${category}" represents ${(ratio * 100).toFixed(1)}% of all repair attempts (${stats.total_freq}/${totalFreq}) with only ${avgSuccess.toFixed(1)}% success rate. A specialized agent could improve repair effectiveness for this pattern.`,
        ...scores,
        supporting_evidence: [
          { type: "error_category_analysis", category, frequency: stats.total_freq, ratio, avg_success: avgSuccess },
          { type: "pattern_ids", ids: stats.patterns.slice(0, 5) },
        ],
        source_metrics: { category_stats: categoryStats },
        source_record_ids: stats.patterns.slice(0, 10),
        recommendation_signature: generateSignature(
          "AGENT_ROLE_DESIGNER", "NEW_AGENT_ROLE", category, `freq_${stats.total_freq}`
        ),
      });
    }
  }

  return recommendations;
}
