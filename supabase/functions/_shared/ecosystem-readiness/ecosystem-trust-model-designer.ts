/**
 * Ecosystem Trust Model Designer — Sprint 56
 * Produces candidate trust model structures for later ecosystem stages.
 */

export interface TrustModelInput {
  trust_model_type: string;
  trust_model_name: string;
  proposed_trust_levels: string[];
  boundary_assumptions: string[];
  governance_coverage_score: number;
  isolation_score: number;
  auditability_score: number;
}

export interface TrustModelCandidate {
  trust_model_type: string;
  trust_model_name: string;
  trust_level_count: number;
  trust_model_confidence_score: number;
  trust_gaps: string[];
  strengths: string[];
  recommendation: 'viable' | 'needs_work' | 'premature';
}

export function designTrustModels(inputs: TrustModelInput[]): TrustModelCandidate[] {
  return inputs.map(input => {
    const gaps: string[] = [];
    const strengths: string[] = [];

    if (input.governance_coverage_score < 0.5) gaps.push('insufficient_governance_coverage');
    else strengths.push('adequate_governance_coverage');

    if (input.isolation_score < 0.6) gaps.push('weak_isolation_boundaries');
    else strengths.push('strong_isolation');

    if (input.auditability_score < 0.5) gaps.push('insufficient_auditability');
    else strengths.push('auditable_trust_boundaries');

    if (input.proposed_trust_levels.length < 2) gaps.push('insufficient_trust_level_granularity');
    if (input.boundary_assumptions.length === 0) gaps.push('no_boundary_assumptions_defined');

    const confidence = (input.governance_coverage_score * 0.35 + input.isolation_score * 0.35 + input.auditability_score * 0.3) * (gaps.length === 0 ? 1 : Math.max(0.2, 1 - gaps.length * 0.15));

    let recommendation: TrustModelCandidate['recommendation'];
    if (confidence >= 0.7 && gaps.length === 0) recommendation = 'viable';
    else if (confidence >= 0.4) recommendation = 'needs_work';
    else recommendation = 'premature';

    return {
      trust_model_type: input.trust_model_type,
      trust_model_name: input.trust_model_name,
      trust_level_count: input.proposed_trust_levels.length,
      trust_model_confidence_score: Math.round(confidence * 10000) / 10000,
      trust_gaps: gaps,
      strengths: strengths,
      recommendation,
    };
  });
}
