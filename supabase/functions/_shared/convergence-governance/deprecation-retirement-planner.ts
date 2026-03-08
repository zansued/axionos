/**
 * Deprecation & Retirement Planner — Sprint 50
 * Builds safe deprecation / retirement plans for redundant or low-value variants.
 * Pure functions. No DB access.
 */

export interface RetirementInput {
  pattern_key: string;
  pattern_type: string;
  adoption_ratio: number;
  performance_score: number;
  last_used_days_ago: number;
  dependency_count: number;
  replacement_available: boolean;
  confidence: number;
}

export interface RetirementPlan {
  retirement_type: "deprecate" | "retire" | "archive";
  retirement_readiness_score: number;
  migration_path: { strategy: string; replacement_key: string | null };
  dependency_impact: { count: number; risk: string };
  rationale_codes: string[];
  blockers: string[];
}

export function planRetirement(input: RetirementInput): RetirementPlan {
  const rationale: string[] = [];
  const blockers: string[] = [];

  if (input.adoption_ratio < 0.05) rationale.push("near_zero_adoption");
  if (input.last_used_days_ago > 60) rationale.push("stale_pattern");
  if (input.performance_score < 0.3) rationale.push("low_performance");
  if (!input.replacement_available) blockers.push("no_replacement_available");
  if (input.dependency_count > 5) blockers.push("high_dependency_count");

  let retirementType: "deprecate" | "retire" | "archive" = "deprecate";
  if (input.adoption_ratio < 0.02 && input.last_used_days_ago > 90) retirementType = "archive";
  else if (input.adoption_ratio < 0.1 && input.replacement_available) retirementType = "retire";

  const readiness = round(clamp(
    (1 - input.adoption_ratio) * 0.25 +
    (input.last_used_days_ago > 30 ? 0.2 : 0) +
    (1 - input.performance_score) * 0.2 +
    (input.replacement_available ? 0.2 : 0) +
    (input.dependency_count < 3 ? 0.15 : 0),
    0, 1
  ));

  return {
    retirement_type: retirementType,
    retirement_readiness_score: readiness,
    migration_path: {
      strategy: input.replacement_available ? "migrate_to_replacement" : "manual_review_required",
      replacement_key: input.replacement_available ? `default_${input.pattern_type}` : null,
    },
    dependency_impact: {
      count: input.dependency_count,
      risk: input.dependency_count > 5 ? "high" : input.dependency_count > 2 ? "moderate" : "low",
    },
    rationale_codes: rationale,
    blockers,
  };
}

function clamp(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)); }
function round(v: number): number { return Math.round(v * 10000) / 10000; }
