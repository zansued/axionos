/**
 * Platform Stabilization v2 Explainability Layer — Sprint 46
 * Pure functions. No DB access.
 */

import type { CorrelationResult } from "./cross-layer-instability-correlator.ts";
import type { AdaptivePressureResult } from "./adaptive-pressure-analyzer.ts";
import type { StabilityV2HealthMetrics } from "./platform-stability-v2-health-model.ts";

export interface StabilizationV2Explanation {
  instability_summary: string;
  cluster_count: number;
  cross_layer_count: number;
  max_severity: string;
  pressure_score: number;
  unstable_zones: string[];
  health_summary: Record<string, number>;
  recovery_notes: string[];
  safety_notes: string[];
}

export function explainStabilizationV2(
  correlation: CorrelationResult,
  pressure: AdaptivePressureResult,
  health: StabilityV2HealthMetrics
): StabilizationV2Explanation {
  const recoveryNotes: string[] = [];
  if (correlation.clusters.length > 0) recoveryNotes.push(`${correlation.clusters.length} instability clusters detected across layers`);
  if (pressure.adaptive_pressure_score > 0.6) recoveryNotes.push("Adaptive pressure is elevated — consider reducing concurrent adaptations");
  if (health.overconstraint_risk_index < 0.5) recoveryNotes.push("Overconstraint risk is high — review active envelopes for release");
  if (health.overall_stability_score < 0.5) recoveryNotes.push("Overall stability is low — prioritize containment");

  return {
    instability_summary: `${correlation.total_signals} signals, ${correlation.clusters.length} clusters, max severity: ${correlation.max_severity}`,
    cluster_count: correlation.clusters.length,
    cross_layer_count: correlation.cross_layer_count,
    max_severity: correlation.max_severity,
    pressure_score: pressure.adaptive_pressure_score,
    unstable_zones: pressure.unstable_zones,
    health_summary: { ...health },
    recovery_notes: recoveryNotes,
    safety_notes: [
      "Cannot mutate topology directly",
      "Cannot alter governance/billing",
      "Cannot override tenant isolation",
      "Cannot impose permanent freezes without review",
      "All outputs bounded, reversible, review-driven",
    ],
  };
}
