/**
 * Round-Enough Evaluator — Sprint 65
 * Evaluates whether a domain or the whole platform has reached bounded operational completeness.
 */

export interface RoundEnoughInput {
  completion_score: number;
  governance_maturity_score: number;
  assurance_maturity_score: number;
  canon_integrity_score: number;
  ecosystem_boundedness_score: number;
  pipeline_operability_score: number;
  residual_risk_score: number;
  open_surface_score: number;
}

export interface RoundEnoughResult {
  round_enough_score: number;
  is_round_enough: boolean;
  weak_dimensions: string[];
  rationale: string[];
}

export function evaluateRoundEnough(input: RoundEnoughInput): RoundEnoughResult {
  const rationale: string[] = [];
  const weak: string[] = [];

  const weights = {
    governance_maturity: 0.20,
    assurance_maturity: 0.15,
    canon_integrity: 0.20,
    ecosystem_boundedness: 0.10,
    pipeline_operability: 0.15,
    residual_risk_penalty: 0.10,
    open_surface_penalty: 0.10,
  };

  let score = 0;
  score += input.governance_maturity_score * weights.governance_maturity;
  score += input.assurance_maturity_score * weights.assurance_maturity;
  score += input.canon_integrity_score * weights.canon_integrity;
  score += input.ecosystem_boundedness_score * weights.ecosystem_boundedness;
  score += input.pipeline_operability_score * weights.pipeline_operability;
  score -= input.residual_risk_score * weights.residual_risk_penalty;
  score -= input.open_surface_score * weights.open_surface_penalty;

  score = Math.max(0, Math.min(1, score));

  if (input.governance_maturity_score < 0.5) { weak.push('governance_maturity'); rationale.push('low_governance_maturity_penalizes_completion'); }
  if (input.canon_integrity_score < 0.5) { weak.push('canon_integrity'); rationale.push('weak_canon_integrity_reduces_confidence'); }
  if (input.residual_risk_score > 0.5) { weak.push('residual_risk'); rationale.push('high_residual_risk'); }
  if (input.open_surface_score > 0.4) { weak.push('open_surfaces'); rationale.push('significant_open_surfaces'); }
  if (input.pipeline_operability_score < 0.6) { weak.push('pipeline_operability'); rationale.push('pipeline_not_fully_operable'); }

  const isRoundEnough = score >= 0.65 && weak.length <= 1;
  if (isRoundEnough) rationale.push('round_enough_threshold_met');
  else rationale.push('round_enough_threshold_not_met');

  return {
    round_enough_score: Math.round(score * 10000) / 10000,
    is_round_enough: isRoundEnough,
    weak_dimensions: weak,
    rationale,
  };
}
