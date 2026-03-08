/**
 * Baseline Certification Engine — Sprint 65
 * Prepares candidate baseline snapshots for mature operating canon certification.
 */

export interface CertificationInput {
  round_enough_score: number;
  residual_risk_score: number;
  canon_integrity_score: number;
  governance_maturity_score: number;
  open_surface_count: number;
}

export interface CertificationResult {
  certification_readiness_score: number;
  recommended_action: string;
  rationale: string[];
}

export function evaluateCertificationReadiness(input: CertificationInput): CertificationResult {
  const rationale: string[] = [];
  let readiness = input.round_enough_score * 0.4 + input.canon_integrity_score * 0.25 + input.governance_maturity_score * 0.2;
  readiness -= input.residual_risk_score * 0.15;
  readiness = Math.max(0, Math.min(1, readiness));

  if (input.residual_risk_score > 0.5) { rationale.push('high_residual_risk_blocks_certification'); readiness *= 0.7; }
  if (input.canon_integrity_score < 0.5) { rationale.push('canon_integrity_insufficient'); readiness *= 0.8; }
  if (input.open_surface_count > 5) { rationale.push('too_many_open_surfaces'); readiness *= 0.9; }

  let action: string;
  if (readiness >= 0.7) { action = 'certify_baseline'; rationale.push('ready_for_certification'); }
  else if (readiness >= 0.5) { action = 'review_gap'; rationale.push('needs_gap_review_before_certification'); }
  else { action = 'postpone_completion_claim'; rationale.push('not_ready_for_certification'); }

  return { certification_readiness_score: Math.round(readiness * 10000) / 10000, recommended_action: action, rationale };
}
