// Tenant Fragmentation Cost Analyzer — Sprint 48
// Quantifies cost of bounded tenant specialization vs system fragmentation risk.

export interface FragmentationAnalysis {
  fragmentation_score: number; // 0-1, higher = more fragmented
  specialization_benefit: number; // 0-1
  net_economic_value: number; // positive = beneficial
  fragmentation_cost: number;
  coordination_overhead: number;
  divergence_risk: string;
  rationale_codes: string[];
}

export function analyzeFragmentationCost(params: {
  tenantModeCount: number;
  tenantCount: number;
  avgModeDivergence: number; // 0-1, how much modes differ from global baseline
  avgModeAdoption: number; // 0-1, fraction of tenants using specialized modes
  reliabilityDelta: number; // improvement from specialization
  stabilityDelta: number;
  baseOperatingCost: number;
}): FragmentationAnalysis {
  const {
    tenantModeCount,
    tenantCount,
    avgModeDivergence,
    avgModeAdoption,
    reliabilityDelta,
    stabilityDelta,
    baseOperatingCost,
  } = params;

  const rationale: string[] = [];

  // Fragmentation grows with mode count, divergence, and adoption spread
  const modeRatio = tenantCount > 0 ? Math.min(1, tenantModeCount / Math.max(1, tenantCount)) : 0;
  const fragmentationScore = round(clamp(
    (modeRatio * 0.3) + (avgModeDivergence * 0.4) + ((1 - avgModeAdoption) * 0.3),
    0, 1
  ));

  // Specialization benefit from reliability + stability improvement
  const specializationBenefit = round(clamp(
    (reliabilityDelta * 0.5) + (stabilityDelta * 0.3) + (avgModeAdoption * 0.2),
    0, 1
  ));

  // Fragmentation cost: coordination overhead grows quadratically with mode count
  const coordinationOverhead = round(baseOperatingCost * 0.02 * Math.pow(tenantModeCount, 1.3));
  const fragmentationCost = round(coordinationOverhead + (baseOperatingCost * avgModeDivergence * 0.1));

  // Net value: specialization savings minus fragmentation cost
  const savingsFromSpecialization = round(baseOperatingCost * specializationBenefit * 0.15);
  const netValue = round(savingsFromSpecialization - fragmentationCost);

  // Divergence risk classification
  let divergenceRisk = "low";
  if (fragmentationScore > 0.7) { divergenceRisk = "critical"; rationale.push("critical_fragmentation"); }
  else if (fragmentationScore > 0.5) { divergenceRisk = "high"; rationale.push("high_fragmentation"); }
  else if (fragmentationScore > 0.3) { divergenceRisk = "moderate"; rationale.push("moderate_fragmentation"); }
  else { rationale.push("low_fragmentation"); }

  if (netValue > 0) rationale.push("positive_net_economic_value");
  else rationale.push("negative_net_economic_value");

  if (coordinationOverhead > baseOperatingCost * 0.1) rationale.push("high_coordination_overhead");

  return {
    fragmentation_score: fragmentationScore,
    specialization_benefit: specializationBenefit,
    net_economic_value: netValue,
    fragmentation_cost: fragmentationCost,
    coordination_overhead: coordinationOverhead,
    divergence_risk: divergenceRisk,
    rationale_codes: rationale,
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round(v: number): number {
  return Math.round(v * 10000) / 10000;
}
