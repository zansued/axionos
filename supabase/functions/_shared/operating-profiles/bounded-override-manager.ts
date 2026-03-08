/**
 * Bounded Override Manager
 * Manages local overrides without losing shared profile lineage.
 */

export interface OverrideInput {
  organizationId: string;
  profileId: string;
  overrideKey: string;
  overrideValue: Record<string, unknown>;
  justification: string;
  overrideScope: string;
  scopeId: string;
}

export function computeOverridePressure(existingOverrides: number, overrideBudget: number): number {
  if (overrideBudget <= 0) return 1;
  const pressure = existingOverrides / (overrideBudget * 10);
  return Math.round(Math.min(1, pressure) * 100) / 100;
}

export function shouldPromoteOverride(
  overridePressure: number,
  usageCount: number,
  positiveOutcomes: number
): boolean {
  return overridePressure >= 0.6 && usageCount >= 3 && positiveOutcomes / Math.max(usageCount, 1) > 0.7;
}

export function buildOverrideRecord(input: OverrideInput, overridePressure: number) {
  return {
    organization_id: input.organizationId,
    profile_id: input.profileId,
    override_key: input.overrideKey,
    override_value: input.overrideValue,
    justification: input.justification,
    override_scope: input.overrideScope,
    scope_id: input.scopeId,
    override_pressure_score: overridePressure,
    promotion_candidate: false,
    review_status: 'pending',
    reviewer_ref: {},
  };
}
