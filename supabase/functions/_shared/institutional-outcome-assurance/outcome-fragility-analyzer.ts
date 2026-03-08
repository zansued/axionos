/**
 * Outcome Fragility Analyzer — Sprint 63
 * Identifies fragile domains where results are inconsistent or under-evidenced.
 */

export interface FragilityInput {
  variance_score: number;
  evidence_density_score: number;
  stability_score: number;
  recurrence_count: number;
}

export interface FragilityResult {
  fragility_score: number;
  fragility_class: string;
  rationale: string[];
}

export function analyzeFragility(input: FragilityInput): FragilityResult {
  const rationale: string[] = [];
  let fragility = input.variance_score * 0.4 + (1 - input.evidence_density_score) * 0.3 + (1 - input.stability_score) * 0.3;

  if (input.recurrence_count > 3) { fragility += 0.1; rationale.push('recurring_instability'); }
  if (input.evidence_density_score < 0.2) { fragility += 0.1; rationale.push('under_evidenced'); }

  const cls = fragility >= 0.6 ? 'fragile' : fragility >= 0.35 ? 'watch' : 'stable';

  return {
    fragility_score: Math.round(Math.min(1, fragility) * 10000) / 10000,
    fragility_class: cls,
    rationale,
  };
}
