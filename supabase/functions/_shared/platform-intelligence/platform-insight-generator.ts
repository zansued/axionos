// Sprint 30 — Platform Insight Generator
// Generates structured, explainable insights from bottlenecks and patterns

import type { Bottleneck, BottleneckReport } from "./platform-bottleneck-detector.ts";
import type { PlatformPattern, PatternReport } from "./platform-pattern-analyzer.ts";
import type { PlatformBehaviorSnapshot } from "./platform-behavior-aggregator.ts";

export interface PlatformInsight {
  insight_type: string;
  affected_scope: string;
  severity: "info" | "warning" | "critical";
  description: string;
  evidence_refs: string[];
  supporting_metrics: Record<string, number>;
  recommendation: { action: string; rationale: string } | null;
  confidence_score: number;
}

export function generateInsights(
  snapshot: PlatformBehaviorSnapshot,
  bottlenecks: BottleneckReport,
  patterns: PatternReport,
): PlatformInsight[] {
  const insights: PlatformInsight[] = [];

  // From bottlenecks
  for (const b of bottlenecks.bottlenecks) {
    insights.push({
      insight_type: `bottleneck_${b.bottleneck_type}`,
      affected_scope: b.affected_entity,
      severity: b.severity === "critical" ? "critical" : b.severity === "high" ? "warning" : "info",
      description: b.description,
      evidence_refs: [`bottleneck:${b.bottleneck_type}`, `entity:${b.affected_entity}`],
      supporting_metrics: { rate: b.rate, threshold: b.threshold },
      recommendation: { action: b.recommended_action, rationale: `Rate ${(b.rate * 100).toFixed(0)}% exceeds threshold ${(b.threshold * 100).toFixed(0)}%` },
      confidence_score: b.confidence,
    });
  }

  // From patterns
  for (const p of patterns.patterns) {
    insights.push({
      insight_type: `pattern_${p.pattern_type}`,
      affected_scope: p.affected_entities.join(", "),
      severity: p.severity === "high" ? "warning" : "info",
      description: p.description,
      evidence_refs: p.evidence_refs,
      supporting_metrics: { frequency: p.frequency },
      recommendation: getPatternRecommendation(p),
      confidence_score: p.confidence,
    });
  }

  // Global health insights
  const gm = snapshot.global_metrics;
  if (gm.total_executions > 0 && gm.global_failure_rate > 0.2) {
    insights.push({
      insight_type: "global_failure_rate_elevated",
      affected_scope: "platform",
      severity: gm.global_failure_rate > 0.4 ? "critical" : "warning",
      description: `Global failure rate is ${(gm.global_failure_rate * 100).toFixed(0)}%`,
      evidence_refs: ["global_metrics"],
      supporting_metrics: { failure_rate: gm.global_failure_rate, total_executions: gm.total_executions },
      recommendation: { action: "Review most-failing stages and consider preventive guards", rationale: "Elevated system-wide failure rate" },
      confidence_score: Math.min(1, gm.total_executions / 20),
    });
  }

  if (gm.total_executions > 0 && gm.global_retry_rate > 0.3) {
    insights.push({
      insight_type: "global_retry_rate_elevated",
      affected_scope: "platform",
      severity: "warning",
      description: `Global retry rate is ${(gm.global_retry_rate * 100).toFixed(0)}%`,
      evidence_refs: ["global_metrics"],
      supporting_metrics: { retry_rate: gm.global_retry_rate },
      recommendation: { action: "Investigate retry causes and consider retry escalation adjustments", rationale: "High retry frequency increases cost and latency" },
      confidence_score: Math.min(1, gm.total_executions / 20),
    });
  }

  // Sort by severity then confidence
  const severityOrder: Record<string, number> = { critical: 3, warning: 2, info: 1 };
  insights.sort((a, b) => {
    const sd = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
    return sd !== 0 ? sd : b.confidence_score - a.confidence_score;
  });

  return insights;
}

function getPatternRecommendation(p: PlatformPattern): { action: string; rationale: string } | null {
  switch (p.pattern_type) {
    case "repeated_repair_path":
      return { action: "Add preventive validation before affected stage", rationale: `${p.frequency} repair occurrences detected` };
    case "poor_context_outcome":
      return { action: "Review execution policy for this context class", rationale: "Consistently poor outcomes" };
    case "policy_regression":
      return { action: "Limit or deprecate underperforming policy", rationale: "Policy producing high failure rate" };
    case "failing_repair_strategy":
      return { action: "Escalate repair strategy or switch fallback", rationale: "Current repair strategy repeatedly fails" };
    case "ignored_prediction":
      return { action: "Increase predictive sensitivity for affected checkpoint", rationale: "Predictive signals being ignored" };
    default:
      return null;
  }
}
