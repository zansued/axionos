/**
 * Specialization Debt Detector — Sprint 49
 * Detects when local exceptions, special modes, or variants accumulate hidden maintenance cost.
 * Pure functions. No DB access.
 */

export interface DebtInput {
  organization_id: string;
  local_exception_count: number;
  special_mode_count: number;
  variant_count: number;
  override_count: number;
  avg_mode_age_days: number;
  avg_mode_last_review_days: number;
  total_maintenance_hours_monthly: number;
}

export interface DebtResult {
  specialization_debt_score: number;
  debt_sources: string[];
  recommendations: string[];
  rationale_codes: string[];
}

export function detectSpecializationDebt(input: DebtInput): DebtResult {
  const sources: string[] = [];
  const recs: string[] = [];
  const rationale: string[] = [];
  let debt = 0;

  if (input.local_exception_count > 10) {
    debt += 0.2;
    sources.push("excessive_local_exceptions");
    recs.push("consolidate_exceptions_into_modes");
    rationale.push("exception_count_" + input.local_exception_count);
  }

  if (input.special_mode_count > 5) {
    debt += 0.2;
    sources.push("too_many_special_modes");
    recs.push("merge_or_retire_low_value_modes");
  }

  if (input.variant_count > 8) {
    debt += 0.15;
    sources.push("variant_proliferation");
    recs.push("review_variant_redundancy");
  }

  if (input.override_count > 15) {
    debt += 0.15;
    sources.push("override_accumulation");
    recs.push("tighten_override_limits");
  }

  if (input.avg_mode_last_review_days > 90) {
    debt += 0.15;
    sources.push("stale_mode_reviews");
    recs.push("schedule_mode_review_cycle");
  }

  if (input.total_maintenance_hours_monthly > 20) {
    debt += 0.15;
    sources.push("high_maintenance_burden");
    recs.push("reduce_maintenance_through_convergence");
  }

  debt = Math.min(1, debt);

  return {
    specialization_debt_score: Math.round(debt * 10000) / 10000,
    debt_sources: sources,
    recommendations: recs,
    rationale_codes: rationale,
  };
}
