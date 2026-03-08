/**
 * Retention Justification Analyzer — Sprint 50
 * Explains why a specialization should remain local.
 * Pure functions. No DB access.
 */

export interface RetentionInput {
  tenant_fit_score: number;
  local_performance_gain: number;
  adoption_ratio: number;
  unique_requirements: number; // 0-1
  convergence_cost_if_merged: number;
  confidence: number;
}

export interface RetentionResult {
  retention_justification_score: number;
  justification_reasons: string[];
  risk_if_converged: string[];
}

export function analyzeRetentionJustification(input: RetentionInput): RetentionResult {
  const reasons: string[] = [];
  const risks: string[] = [];

  if (input.tenant_fit_score > 0.7) reasons.push("strong_tenant_fit");
  if (input.local_performance_gain > 0.3) reasons.push("measurable_performance_gain");
  if (input.unique_requirements > 0.5) reasons.push("unique_domain_requirements");
  if (input.adoption_ratio > 0.5) reasons.push("high_local_adoption");

  if (input.convergence_cost_if_merged > 0.5) risks.push("high_convergence_cost");
  if (input.tenant_fit_score > 0.6 && input.convergence_cost_if_merged > 0.3) risks.push("tenant_regression_risk");

  const score = round(clamp(
    input.tenant_fit_score * 0.3 + input.local_performance_gain * 0.25 +
    input.unique_requirements * 0.2 + input.adoption_ratio * 0.15 +
    input.convergence_cost_if_merged * 0.1,
    0, 1
  ));

  return { retention_justification_score: score, justification_reasons: reasons, risk_if_converged: risks };
}

function clamp(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)); }
function round(v: number): number { return Math.round(v * 10000) / 10000; }
