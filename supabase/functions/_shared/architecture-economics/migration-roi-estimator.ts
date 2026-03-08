// Migration ROI Estimator — Sprint 48
// Estimates migration ROI using reliability/stability gains vs cost exposure.

export interface MigrationROI {
  migration_roi_30d: number;
  migration_roi_90d: number;
  break_even_days: number | null;
  total_investment: number;
  projected_monthly_savings: number;
  rollback_exposure: number;
  confidence_score: number;
  rationale_codes: string[];
}

export function estimateMigrationROI(params: {
  implementationCost: number;
  rollbackCost: number;
  projectedMonthlySavings: number;
  reliabilityGain: number;
  stabilityGain: number;
  evidenceDensity?: number;
}): MigrationROI {
  const {
    implementationCost,
    rollbackCost,
    projectedMonthlySavings,
    reliabilityGain,
    stabilityGain,
    evidenceDensity = 0,
  } = params;

  const rationale: string[] = [];
  const totalInvestment = implementationCost + rollbackCost * 0.3; // risk-adjusted reserve
  rationale.push("investment_includes_rollback_reserve");

  // 30-day ROI
  const roi30d = totalInvestment > 0
    ? round((projectedMonthlySavings - totalInvestment) / totalInvestment)
    : 0;

  // 90-day ROI
  const savings90d = projectedMonthlySavings * 3;
  const roi90d = totalInvestment > 0
    ? round((savings90d - totalInvestment) / totalInvestment)
    : 0;

  // Break-even
  const breakEvenDays = projectedMonthlySavings > 0
    ? Math.ceil((totalInvestment / projectedMonthlySavings) * 30)
    : null;

  if (breakEvenDays !== null && breakEvenDays <= 30) rationale.push("fast_break_even");
  if (breakEvenDays !== null && breakEvenDays > 90) rationale.push("slow_break_even");

  // Confidence: penalize low evidence, reward high reliability+stability gains
  let confidence = 0.3;
  confidence += evidenceDensity * 0.05;
  confidence += reliabilityGain * 0.2;
  confidence += stabilityGain * 0.15;
  confidence = Math.min(0.95, Math.max(0.1, confidence));

  if (confidence < 0.4) rationale.push("low_confidence_estimate");

  return {
    migration_roi_30d: roi30d,
    migration_roi_90d: roi90d,
    break_even_days: breakEvenDays,
    total_investment: round(totalInvestment),
    projected_monthly_savings: round(projectedMonthlySavings),
    rollback_exposure: round(rollbackCost),
    confidence_score: round(confidence),
    rationale_codes: rationale,
  };
}

function round(v: number): number {
  return Math.round(v * 10000) / 10000;
}
