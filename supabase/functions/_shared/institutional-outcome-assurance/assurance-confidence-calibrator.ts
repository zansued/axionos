/**
 * Assurance Confidence Calibrator — Sprint 63
 * Evaluates evidence density, confidence bounds, and outcome reliability.
 */

export interface ConfidenceInput {
  evidence_density_score: number;
  stability_score: number;
  variance_score: number;
  sample_size: number;
}

export interface ConfidenceResult {
  assurance_confidence_score: number;
  evidence_sufficiency: string;
  rationale: string[];
}

export function calibrateConfidence(input: ConfidenceInput): ConfidenceResult {
  const rationale: string[] = [];
  let confidence = input.evidence_density_score * 0.4 + input.stability_score * 0.3 + (1 - input.variance_score) * 0.3;

  if (input.sample_size < 3) { confidence *= 0.5; rationale.push('insufficient_samples'); }
  if (input.evidence_density_score < 0.3) { confidence *= 0.6; rationale.push('sparse_evidence'); }

  const sufficiency = confidence >= 0.6 ? 'sufficient' : confidence >= 0.3 ? 'partial' : 'insufficient';

  return {
    assurance_confidence_score: Math.round(Math.max(0, Math.min(1, confidence)) * 10000) / 10000,
    evidence_sufficiency: sufficiency,
    rationale,
  };
}
