/**
 * Divergence Signal Aggregator — Sprint 49
 * Aggregates divergence signals across architecture modes, tenant tuning,
 * stabilization patterns, rollout history, and economics.
 * Pure functions. No DB access.
 */

export interface DivergenceSignalInput {
  organization_id: string;
  architecture_mode_divergences: Array<{ mode_key: string; divergence_score: number; support_count: number }>;
  strategy_variant_count: number;
  calibration_override_count: number;
  tenant_exception_count: number;
  economic_redundancy_indicators: number;
  stabilization_pressure_score: number;
}

export interface AggregatedDivergenceSignal {
  overall_divergence_score: number;
  architecture_mode_divergence: number;
  strategy_redundancy_score: number;
  calibration_drift_score: number;
  tenant_exception_pressure: number;
  economic_redundancy_score: number;
  stabilization_pressure: number;
  hotspot_domains: string[];
  rationale_codes: string[];
}

export function aggregateDivergenceSignals(input: DivergenceSignalInput): AggregatedDivergenceSignal {
  const rationale: string[] = [];
  const hotspots: string[] = [];

  // Architecture mode divergence
  const modeDivergences = input.architecture_mode_divergences.map(m => m.divergence_score);
  const archModeDivergence = modeDivergences.length > 0
    ? modeDivergences.reduce((a, b) => a + b, 0) / modeDivergences.length
    : 0;
  if (archModeDivergence > 0.5) { hotspots.push("architecture_modes"); rationale.push("high_mode_divergence"); }

  // Strategy redundancy
  const stratRedundancy = clamp(input.strategy_variant_count > 5 ? (input.strategy_variant_count - 5) * 0.1 : 0, 0, 1);
  if (stratRedundancy > 0.3) { hotspots.push("strategy_variants"); rationale.push("strategy_redundancy"); }

  // Calibration drift
  const calibDrift = clamp(input.calibration_override_count * 0.05, 0, 1);
  if (calibDrift > 0.3) { hotspots.push("calibration_overrides"); rationale.push("calibration_drift"); }

  // Tenant exception pressure
  const tenantPressure = clamp(input.tenant_exception_count * 0.04, 0, 1);
  if (tenantPressure > 0.3) { hotspots.push("tenant_exceptions"); rationale.push("tenant_exception_pressure"); }

  // Economic redundancy
  const econRedundancy = clamp(input.economic_redundancy_indicators * 0.1, 0, 1);
  if (econRedundancy > 0.3) { hotspots.push("economic_redundancy"); rationale.push("economic_redundancy"); }

  // Stabilization pressure
  const stabPressure = clamp(input.stabilization_pressure_score, 0, 1);
  if (stabPressure > 0.5) { hotspots.push("stabilization_pressure"); rationale.push("high_stabilization_pressure"); }

  const overall = clamp(
    archModeDivergence * 0.25 + stratRedundancy * 0.2 + calibDrift * 0.15 +
    tenantPressure * 0.15 + econRedundancy * 0.15 + stabPressure * 0.1,
    0, 1
  );

  return {
    overall_divergence_score: round(overall),
    architecture_mode_divergence: round(archModeDivergence),
    strategy_redundancy_score: round(stratRedundancy),
    calibration_drift_score: round(calibDrift),
    tenant_exception_pressure: round(tenantPressure),
    economic_redundancy_score: round(econRedundancy),
    stabilization_pressure: round(stabPressure),
    hotspot_domains: hotspots,
    rationale_codes: rationale,
  };
}

function clamp(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)); }
function round(v: number): number { return Math.round(v * 10000) / 10000; }
