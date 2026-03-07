/**
 * Discovery Architecture Opportunity Synthesizer — Sprint 37
 * Detects architectural opportunities from aggregated discovery signals.
 * Pure functions. No DB access.
 */

import { AggregatedDiscoverySignal } from "./discovery-signal-aggregator.ts";

export interface ArchitectureOpportunity {
  opportunity_type: string;
  affected_architecture_scope: string;
  confidence_score: number;
  rationale_codes: string[];
  evidence_refs: Record<string, any>[];
  expected_value: string;
  review_priority: number;
}

const OPPORTUNITY_DETECTORS: Array<{
  type: string;
  detect: (signals: AggregatedDiscoverySignal[]) => ArchitectureOpportunity[];
}> = [
  {
    type: "bottleneck_workflow_pattern",
    detect: (signals) => {
      const bottleneck = signals.filter(s => s.signal_type.includes("bottleneck") && s.recurrence_count >= 3);
      return bottleneck.map(s => ({
        opportunity_type: "bottleneck_workflow_pattern",
        affected_architecture_scope: s.scope_clusters[0] || "platform",
        confidence_score: s.avg_confidence,
        rationale_codes: ["recurring_bottleneck", `recurrence:${s.recurrence_count}`, `trend:${s.trend_direction}`],
        evidence_refs: s.evidence_refs.slice(0, 5),
        expected_value: "Reduce recurring pipeline bottleneck through structural separation",
        review_priority: s.architectural_relevance_score,
      }));
    },
  },
  {
    type: "tenant_segmentation_need",
    detect: (signals) => {
      const tenant = signals.filter(s => s.source_types.includes("tenant_behavior") && s.recurrence_count >= 2 && s.architectural_relevance_score >= 0.5);
      return tenant.map(s => ({
        opportunity_type: "tenant_segmentation_need",
        affected_architecture_scope: "tenant_architecture",
        confidence_score: s.avg_confidence,
        rationale_codes: ["tenant_divergence", `sources:${s.source_types.join(",")}`],
        evidence_refs: s.evidence_refs.slice(0, 5),
        expected_value: "Modularize architecture for divergent tenant segments",
        review_priority: s.architectural_relevance_score,
      }));
    },
  },
  {
    type: "advisory_cluster_missing_capability",
    detect: (signals) => {
      const advisory = signals.filter(s => s.source_types.includes("advisory") && s.recurrence_count >= 3 && s.trend_direction === "increasing");
      return advisory.map(s => ({
        opportunity_type: "advisory_cluster_missing_capability",
        affected_architecture_scope: "system_capability",
        confidence_score: s.avg_confidence,
        rationale_codes: ["recurring_advisory_theme", `trend:increasing`, `count:${s.recurrence_count}`],
        evidence_refs: s.evidence_refs.slice(0, 5),
        expected_value: "Introduce first-class architecture support for recurring advisory need",
        review_priority: s.architectural_relevance_score,
      }));
    },
  },
  {
    type: "strategy_family_overload",
    detect: (signals) => {
      const strat = signals.filter(s => s.signal_type.includes("strategy") && s.max_severity !== "low" && s.recurrence_count >= 2);
      return strat.map(s => ({
        opportunity_type: "strategy_family_overload",
        affected_architecture_scope: "strategy_architecture",
        confidence_score: s.avg_confidence,
        rationale_codes: ["strategy_churn", `severity:${s.max_severity}`],
        evidence_refs: s.evidence_refs.slice(0, 5),
        expected_value: "Consolidate or restructure strategy family to reduce churn",
        review_priority: s.architectural_relevance_score,
      }));
    },
  },
  {
    type: "deploy_critical_pressure",
    detect: (signals) => {
      const deploy = signals.filter(s => s.signal_type.includes("deploy") && s.max_severity !== "low");
      return deploy.map(s => ({
        opportunity_type: "deploy_critical_pressure",
        affected_architecture_scope: "deploy_path",
        confidence_score: s.avg_confidence,
        rationale_codes: ["deploy_pressure", `severity:${s.max_severity}`],
        evidence_refs: s.evidence_refs.slice(0, 5),
        expected_value: "Harden deploy path for critical execution classes",
        review_priority: s.architectural_relevance_score,
      }));
    },
  },
];

export function synthesizeArchitectureOpportunities(signals: AggregatedDiscoverySignal[]): ArchitectureOpportunity[] {
  if (!signals.length) return [];

  const opportunities: ArchitectureOpportunity[] = [];
  for (const detector of OPPORTUNITY_DETECTORS) {
    opportunities.push(...detector.detect(signals));
  }

  return opportunities.sort((a, b) => b.review_priority - a.review_priority);
}
