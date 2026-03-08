/**
 * Beneficial Specialization Analyzer — Sprint 49
 * Distinguishes healthy bounded specialization from harmful fragmentation.
 * Pure functions. No DB access.
 */

export interface SpecializationInput {
  mode_key: string;
  tenant_fit_score: number;       // 0-1, how well the mode fits tenant needs
  reliability_delta: number;      // improvement vs global default
  stability_delta: number;
  adoption_ratio: number;         // 0-1, fraction of eligible tenants using it
  divergence_score: number;       // 0-1, from divergence detector
  maintenance_cost_ratio: number; // relative cost vs shared default
  outcome_history: Array<{ outcome_status: string }>;
}

export interface SpecializationResult {
  beneficial_specialization_score: number;
  fragmentation_risk_score: number;
  net_specialization_value: number;
  classification: "healthy" | "marginal" | "harmful";
  rationale_codes: string[];
}

export function analyzeSpecialization(input: SpecializationInput): SpecializationResult {
  const rationale: string[] = [];

  // Benefit: tenant fit + reliability + stability + adoption
  const benefit = clamp(
    input.tenant_fit_score * 0.3 +
    Math.max(0, input.reliability_delta) * 0.25 +
    Math.max(0, input.stability_delta) * 0.2 +
    input.adoption_ratio * 0.25,
    0, 1
  );

  // Risk: divergence + maintenance cost + harmful outcomes
  const harmfulRatio = input.outcome_history.length > 0
    ? input.outcome_history.filter(o => o.outcome_status === "harmful").length / input.outcome_history.length
    : 0;
  const risk = clamp(
    input.divergence_score * 0.35 +
    input.maintenance_cost_ratio * 0.3 +
    harmfulRatio * 0.35,
    0, 1
  );

  const netValue = round(benefit - risk);

  if (benefit > 0.5 && risk < 0.3) rationale.push("strong_beneficial_specialization");
  if (benefit < 0.3 && risk > 0.5) rationale.push("harmful_fragmentation");
  if (input.adoption_ratio < 0.1) rationale.push("low_adoption_specialization");
  if (harmfulRatio > 0.3) rationale.push("harmful_outcome_history");
  if (input.maintenance_cost_ratio > 0.7) rationale.push("high_maintenance_cost");

  let classification: "healthy" | "marginal" | "harmful" = "marginal";
  if (netValue > 0.2) classification = "healthy";
  else if (netValue < -0.1) classification = "harmful";

  return {
    beneficial_specialization_score: round(benefit),
    fragmentation_risk_score: round(risk),
    net_specialization_value: netValue,
    classification,
    rationale_codes: rationale,
  };
}

function clamp(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)); }
function round(v: number): number { return Math.round(v * 10000) / 10000; }
