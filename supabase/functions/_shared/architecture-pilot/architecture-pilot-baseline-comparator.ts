/**
 * Architecture Pilot Baseline Comparator — Sprint 41
 *
 * Compares pilot behavior against baseline across multiple dimensions.
 */

export interface BaselineMetrics {
  latency_p50_ms: number;
  repair_rate: number;
  retry_rate: number;
  validation_failure_rate: number;
  deploy_success_rate: number;
  observability_clarity: number; // 0-1
  tenant_impact_score: number; // 0-1
  rollback_signal_count: number;
}

export interface PilotDeltaSummary {
  dimension: string;
  baseline_value: number;
  pilot_value: number;
  delta: number;
  delta_percent: number;
  direction: "improved" | "degraded" | "neutral";
}

export interface PilotComparisonResult {
  deltas: PilotDeltaSummary[];
  benefit_score: number; // 0-1
  harm_score: number; // 0-1
  confidence_score: number; // 0-1
  recommendation: "continue" | "pause" | "rollback" | "complete_success";
}

function computeDelta(baseline: number, pilot: number, lowerIsBetter: boolean): PilotDeltaSummary & { _benefit: number; _harm: number } {
  const delta = pilot - baseline;
  const delta_percent = baseline !== 0 ? (delta / baseline) * 100 : 0;
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  const degraded = lowerIsBetter ? delta > 0 : delta < 0;

  return {
    dimension: "",
    baseline_value: baseline,
    pilot_value: pilot,
    delta,
    delta_percent: Math.round(delta_percent * 100) / 100,
    direction: improved ? "improved" : degraded ? "degraded" : "neutral",
    _benefit: improved ? Math.abs(delta_percent) / 100 : 0,
    _harm: degraded ? Math.abs(delta_percent) / 100 : 0,
  };
}

export function comparePilotToBaseline(
  baseline: BaselineMetrics,
  pilot: BaselineMetrics,
): PilotComparisonResult {
  const dimensions: Array<{ key: keyof BaselineMetrics; label: string; lowerIsBetter: boolean; weight: number }> = [
    { key: "latency_p50_ms", label: "Latency (p50)", lowerIsBetter: true, weight: 0.15 },
    { key: "repair_rate", label: "Repair Rate", lowerIsBetter: true, weight: 0.15 },
    { key: "retry_rate", label: "Retry Rate", lowerIsBetter: true, weight: 0.1 },
    { key: "validation_failure_rate", label: "Validation Failure Rate", lowerIsBetter: true, weight: 0.15 },
    { key: "deploy_success_rate", label: "Deploy Success Rate", lowerIsBetter: false, weight: 0.15 },
    { key: "observability_clarity", label: "Observability Clarity", lowerIsBetter: false, weight: 0.1 },
    { key: "tenant_impact_score", label: "Tenant Impact", lowerIsBetter: true, weight: 0.1 },
    { key: "rollback_signal_count", label: "Rollback Signals", lowerIsBetter: true, weight: 0.1 },
  ];

  let totalBenefit = 0;
  let totalHarm = 0;
  const deltas: PilotDeltaSummary[] = [];

  for (const dim of dimensions) {
    const result = computeDelta(baseline[dim.key], pilot[dim.key], dim.lowerIsBetter);
    result.dimension = dim.label;
    totalBenefit += result._benefit * dim.weight;
    totalHarm += result._harm * dim.weight;
    deltas.push({
      dimension: result.dimension,
      baseline_value: result.baseline_value,
      pilot_value: result.pilot_value,
      delta: result.delta,
      delta_percent: result.delta_percent,
      direction: result.direction,
    });
  }

  const benefit_score = Math.min(totalBenefit, 1);
  const harm_score = Math.min(totalHarm, 1);
  const confidence_score = deltas.filter((d) => d.direction !== "neutral").length / deltas.length;

  let recommendation: PilotComparisonResult["recommendation"] = "continue";
  if (harm_score > 0.3) recommendation = "rollback";
  else if (harm_score > 0.15) recommendation = "pause";
  else if (benefit_score > 0.2 && harm_score < 0.05) recommendation = "complete_success";

  return { deltas, benefit_score, harm_score, confidence_score, recommendation };
}
