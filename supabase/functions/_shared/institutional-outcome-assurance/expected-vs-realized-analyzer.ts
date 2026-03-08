/**
 * Expected vs Realized Analyzer — Sprint 63
 * Compares expected and realized results across layers.
 */

export interface ComparisonInput {
  expected_outcome_score: number;
  realized_outcome_score: number;
  evidence_density_score: number;
}

export interface ComparisonResult {
  outcome_variance_score: number;
  assurance_confidence_score: number;
  stability_assessment: string;
  rationale: string[];
}

export function analyzeExpectedVsRealized(input: ComparisonInput): ComparisonResult {
  const rationale: string[] = [];
  const variance = Math.abs(input.expected_outcome_score - input.realized_outcome_score);
  let confidence = input.evidence_density_score * 0.6 + (1 - variance) * 0.4;

  if (input.evidence_density_score < 0.3) { confidence *= 0.5; rationale.push('low_evidence_density'); }
  if (variance > 0.4) rationale.push('high_variance');
  if (variance < 0.1) rationale.push('stable_outcome');

  const stability = variance < 0.15 ? 'stable' : variance < 0.35 ? 'monitor' : 'fragile';

  return {
    outcome_variance_score: Math.round(variance * 10000) / 10000,
    assurance_confidence_score: Math.round(Math.max(0, Math.min(1, confidence)) * 10000) / 10000,
    stability_assessment: stability,
    rationale,
  };
}
