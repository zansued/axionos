/**
 * Platform Stability v2 Health Model — Sprint 46
 * Second-generation stability model with multi-layer metrics.
 * Pure functions. No DB access.
 */

import type { CorrelationResult } from "./cross-layer-instability-correlator.ts";
import type { AdaptivePressureResult } from "./adaptive-pressure-analyzer.ts";

export interface StabilityV2HealthMetrics {
  multi_layer_stability_index: number;
  adaptive_pressure_index: number;
  change_density_resilience_index: number;
  rollout_fragility_containment_index: number;
  tenant_stability_integrity_index: number;
  recovery_velocity_index: number;
  overconstraint_risk_index: number;
  overall_stability_score: number;
}

export function computeStabilityV2Health(
  correlation: CorrelationResult,
  pressure: AdaptivePressureResult,
  activeEnvelopeCount: number,
  recentOutcomeHelpfulRate: number
): StabilityV2HealthMetrics {
  const multiLayer = correlation.clusters.length === 0 ? 1 : Math.max(0, 1 - correlation.clusters.length * 0.15);
  const adaptivePressure = 1 - pressure.adaptive_pressure_score;
  const changeDensity = pressure.within_tolerance ? 0.9 : 0.4;
  const fragility = correlation.max_severity === "critical" ? 0.2 : correlation.max_severity === "high" ? 0.5 : 0.9;
  const tenantStability = pressure.unstable_zones.length === 0 ? 1 : Math.max(0.3, 1 - pressure.unstable_zones.length * 0.15);
  const recoveryVelocity = recentOutcomeHelpfulRate;
  const overconstraint = activeEnvelopeCount > 5 ? 0.3 : activeEnvelopeCount > 2 ? 0.6 : 1;

  const overall = (multiLayer + adaptivePressure + changeDensity + fragility + tenantStability + recoveryVelocity + overconstraint) / 7;

  return {
    multi_layer_stability_index: Math.round(multiLayer * 100) / 100,
    adaptive_pressure_index: Math.round(adaptivePressure * 100) / 100,
    change_density_resilience_index: Math.round(changeDensity * 100) / 100,
    rollout_fragility_containment_index: Math.round(fragility * 100) / 100,
    tenant_stability_integrity_index: Math.round(tenantStability * 100) / 100,
    recovery_velocity_index: Math.round(recoveryVelocity * 100) / 100,
    overconstraint_risk_index: Math.round(overconstraint * 100) / 100,
    overall_stability_score: Math.round(overall * 100) / 100,
  };
}
