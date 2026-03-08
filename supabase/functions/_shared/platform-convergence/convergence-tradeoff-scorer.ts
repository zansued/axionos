/**
 * Convergence Tradeoff Scorer — Sprint 49
 * Scores convergence proposals against tenant fit, reliability, stability,
 * reversibility, and cost.
 * Pure functions. No DB access.
 */

export interface TradeoffInput {
  beneficial_specialization_score: number;
  fragmentation_risk_score: number;
  economic_redundancy_cost: number;
  rollback_complexity: number;
  tenant_fit_loss: number;      // 0-1, estimated fit loss from convergence
  reliability_impact: number;   // positive = improvement
  stability_impact: number;
  confidence: number;
}

export interface TradeoffResult {
  convergence_priority_score: number;
  convergence_expected_value: number;
  merge_safety_score: number;
  retention_justification_score: number;
  rationale_codes: string[];
}

export function scoreConvergenceTradeoff(input: TradeoffInput): TradeoffResult {
  const rationale: string[] = [];

  // Benefits of converging
  const convergeBenefit = clamp(
    input.fragmentation_risk_score * 0.3 +
    input.economic_redundancy_cost * 0.25 +
    Math.max(0, input.reliability_impact) * 0.2 +
    Math.max(0, input.stability_impact) * 0.15 +
    (1 - input.rollback_complexity) * 0.1,
    0, 1
  );

  // Costs of converging
  const convergeCost = clamp(
    input.beneficial_specialization_score * 0.4 +
    input.tenant_fit_loss * 0.3 +
    input.rollback_complexity * 0.2 +
    Math.max(0, -input.reliability_impact) * 0.1,
    0, 1
  );

  const expectedValue = round(convergeBenefit - convergeCost);
  const priority = round(clamp(expectedValue * input.confidence, -1, 1));
  const mergeSafety = round(clamp(1 - input.rollback_complexity - input.tenant_fit_loss * 0.5, 0, 1));
  const retentionJustification = round(input.beneficial_specialization_score);

  if (expectedValue > 0.3) rationale.push("strong_convergence_case");
  if (expectedValue < -0.1) rationale.push("convergence_not_justified");
  if (input.rollback_complexity > 0.7) rationale.push("high_rollback_complexity");
  if (input.tenant_fit_loss > 0.5) rationale.push("significant_tenant_fit_loss");
  if (input.fragmentation_risk_score > 0.6) rationale.push("high_fragmentation_pressure");

  return {
    convergence_priority_score: priority,
    convergence_expected_value: expectedValue,
    merge_safety_score: mergeSafety,
    retention_justification_score: retentionJustification,
    rationale_codes: rationale,
  };
}

function clamp(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)); }
function round(v: number): number { return Math.round(v * 10000) / 10000; }
