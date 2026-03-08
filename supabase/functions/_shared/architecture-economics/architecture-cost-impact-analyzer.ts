// Architecture Cost Impact Analyzer — Sprint 48
// Estimates direct and indirect cost impact of architecture/policy/strategy changes.

export interface CostImpactAnalysis {
  projected_change_cost: number;
  projected_operational_cost_delta: number;
  projected_reliability_gain: number;
  projected_stability_gain: number;
  projected_rollback_cost: number;
  tenant_divergence_cost: number;
  cost_to_reliability_ratio: number;
  cost_to_stability_ratio: number;
  confidence_score: number;
  rationale_codes: string[];
}

export function analyzeCostImpact(params: {
  changeType: string;
  baselineCostPerRun: number;
  estimatedRunsDelta?: number;
  reliabilityGainEstimate?: number;
  stabilityGainEstimate?: number;
  rollbackComplexity?: number;
  tenantScopeCount?: number;
  evidenceDensity?: number;
}): CostImpactAnalysis {
  const {
    changeType,
    baselineCostPerRun,
    estimatedRunsDelta = 0,
    reliabilityGainEstimate = 0,
    stabilityGainEstimate = 0,
    rollbackComplexity = 0.5,
    tenantScopeCount = 1,
    evidenceDensity = 0,
  } = params;

  const rationale: string[] = [];

  // Implementation cost: estimated additional runs * baseline cost
  const projectedChangeCost = round(Math.abs(estimatedRunsDelta) * baselineCostPerRun * 1.2);
  rationale.push("change_cost_from_estimated_runs");

  // Operational delta: positive = savings, negative = increase
  const operationalDelta = round(estimatedRunsDelta * baselineCostPerRun * -1);
  if (operationalDelta > 0) rationale.push("operational_savings_projected");
  if (operationalDelta < 0) rationale.push("operational_cost_increase_projected");

  // Reliability and stability gains (0-1 scale)
  const reliabilityGain = clamp(reliabilityGainEstimate, 0, 1);
  const stabilityGain = clamp(stabilityGainEstimate, 0, 1);

  // Rollback cost: proportional to change cost and complexity
  const rollbackCost = round(projectedChangeCost * rollbackComplexity);
  rationale.push("rollback_cost_from_complexity");

  // Tenant divergence cost: grows with scope
  const divergenceCost = tenantScopeCount > 1
    ? round(projectedChangeCost * 0.1 * (tenantScopeCount - 1))
    : 0;
  if (divergenceCost > 0) rationale.push("tenant_divergence_cost_applied");

  // Ratios
  const costToReliability = reliabilityGain > 0
    ? round(projectedChangeCost / reliabilityGain)
    : projectedChangeCost > 0 ? 9999 : 0;

  const costToStability = stabilityGain > 0
    ? round(projectedChangeCost / stabilityGain)
    : projectedChangeCost > 0 ? 9999 : 0;

  // Confidence based on evidence density and change type
  let confidence = 0.3 + (evidenceDensity * 0.05);
  if (changeType === "strategy") confidence += 0.1;
  if (changeType === "policy") confidence += 0.05;
  confidence = clamp(confidence, 0.1, 0.95);
  rationale.push(`confidence_from_evidence_density_${evidenceDensity}`);

  return {
    projected_change_cost: projectedChangeCost,
    projected_operational_cost_delta: operationalDelta,
    projected_reliability_gain: round(reliabilityGain),
    projected_stability_gain: round(stabilityGain),
    projected_rollback_cost: rollbackCost,
    tenant_divergence_cost: divergenceCost,
    cost_to_reliability_ratio: costToReliability,
    cost_to_stability_ratio: costToStability,
    confidence_score: round(confidence),
    rationale_codes: rationale,
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round(v: number): number {
  return Math.round(v * 10000) / 10000;
}
