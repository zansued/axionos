/**
 * Residual Risk Analyzer — Sprint 65
 * Identifies remaining risks, unresolved surfaces, and incompletely governed areas.
 */

export interface ResidualRiskInput {
  gap_count: number;
  high_severity_gaps: number;
  intentional_opens: number;
  unresolved_count: number;
}

export interface ResidualRiskResult {
  residual_risk_score: number;
  risk_level: string;
  rationale: string[];
}

export function analyzeResidualRisk(input: ResidualRiskInput): ResidualRiskResult {
  const rationale: string[] = [];
  let risk = 0.1;

  if (input.high_severity_gaps > 0) { risk += 0.3 * Math.min(1, input.high_severity_gaps / 3); rationale.push(`${input.high_severity_gaps}_high_severity_gaps`); }
  if (input.unresolved_count > 0) { risk += 0.2 * Math.min(1, input.unresolved_count / 5); rationale.push(`${input.unresolved_count}_unresolved_gaps`); }
  if (input.intentional_opens > 0) { rationale.push(`${input.intentional_opens}_intentional_open_surfaces`); }

  risk = Math.min(1, risk);
  const level = risk >= 0.7 ? 'critical' : risk >= 0.4 ? 'high' : risk >= 0.2 ? 'moderate' : 'low';

  return { residual_risk_score: Math.round(risk * 10000) / 10000, risk_level: level, rationale };
}
