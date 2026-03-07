// Sprint 30 — Platform Recommendation Engine
// Generates prioritized, actionable recommendations from insights

import type { PlatformInsight } from "./platform-insight-generator.ts";

export interface PlatformRecommendation {
  recommendation_type: string;
  target_scope: string;
  target_entity: Record<string, unknown>;
  recommendation_reason: Record<string, unknown>;
  confidence_score: number;
  priority_score: number;
}

export function generateRecommendations(insights: PlatformInsight[]): PlatformRecommendation[] {
  const recommendations: PlatformRecommendation[] = [];

  for (const insight of insights) {
    if (!insight.recommendation) continue;
    if (insight.confidence_score < 0.3) continue; // Skip low-confidence

    const severityWeight = insight.severity === "critical" ? 1.0 : insight.severity === "warning" ? 0.7 : 0.4;
    const priority = severityWeight * insight.confidence_score;

    recommendations.push({
      recommendation_type: mapInsightToRecommendationType(insight.insight_type),
      target_scope: insight.affected_scope,
      target_entity: { scope: insight.affected_scope, insight_type: insight.insight_type },
      recommendation_reason: {
        action: insight.recommendation.action,
        rationale: insight.recommendation.rationale,
        evidence_refs: insight.evidence_refs,
        supporting_metrics: insight.supporting_metrics,
      },
      confidence_score: insight.confidence_score,
      priority_score: Math.round(priority * 100) / 100,
    });
  }

  recommendations.sort((a, b) => b.priority_score - a.priority_score);
  return recommendations;
}

function mapInsightToRecommendationType(insightType: string): string {
  if (insightType.includes("bottleneck_failure")) return "increase_validation_guard";
  if (insightType.includes("bottleneck_repair")) return "adjust_repair_strategy";
  if (insightType.includes("bottleneck_cost")) return "optimize_cost";
  if (insightType.includes("bottleneck_deploy")) return "harden_deploy";
  if (insightType.includes("pattern_repeated_repair")) return "add_preventive_validation";
  if (insightType.includes("pattern_poor_context")) return "review_context_policy";
  if (insightType.includes("pattern_policy_regression")) return "limit_policy";
  if (insightType.includes("pattern_failing_repair")) return "escalate_repair";
  if (insightType.includes("global_failure")) return "system_reliability_review";
  if (insightType.includes("global_retry")) return "reduce_retry_burden";
  return "general_review";
}
