/**
 * Profile Comparator
 * Compares multiple profiles by stability, cost, speed, tenant fit, and rollback safety.
 */

export interface ComparableProfile {
  id: string;
  profile_name: string;
  tenant_fit_score: number;
  stability_bias_score: number;
  cost_bias_score: number;
  speed_bias_score: number;
  governance_strictness_score: number;
  rollback_viability_score: number;
  override_budget_score: number;
  shared_reuse_score: number;
  profile_drift_score: number;
}

export interface ComparisonResult {
  profiles: Array<{
    id: string;
    name: string;
    compositeScore: number;
    strengths: string[];
    weaknesses: string[];
  }>;
  recommended: string;
  reasoning: string;
}

export function compareProfiles(profiles: ComparableProfile[]): ComparisonResult {
  const scored = profiles.map(p => {
    const composite = (
      p.tenant_fit_score * 0.20 +
      p.stability_bias_score * 0.15 +
      (1 - p.cost_bias_score) * 0.10 +
      p.speed_bias_score * 0.10 +
      p.rollback_viability_score * 0.15 +
      p.shared_reuse_score * 0.10 +
      (1 - p.profile_drift_score) * 0.10 +
      p.override_budget_score * 0.10
    );

    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (p.tenant_fit_score >= 0.7) strengths.push('High tenant fit');
    if (p.stability_bias_score >= 0.7) strengths.push('High stability');
    if (p.rollback_viability_score >= 0.7) strengths.push('Easy rollback');
    if (p.shared_reuse_score >= 0.7) strengths.push('High reuse potential');
    if (p.cost_bias_score >= 0.7) weaknesses.push('High cost bias');
    if (p.profile_drift_score >= 0.5) weaknesses.push('Profile drift detected');
    if (p.rollback_viability_score < 0.4) weaknesses.push('Low rollback viability');
    if (p.tenant_fit_score < 0.4) weaknesses.push('Low tenant fit');

    return {
      id: p.id,
      name: p.profile_name,
      compositeScore: Math.round(composite * 100) / 100,
      strengths,
      weaknesses,
    };
  }).sort((a, b) => b.compositeScore - a.compositeScore);

  const best = scored[0];
  const reasoning = scored.length > 1
    ? `${best.name} scores ${best.compositeScore} vs next best ${scored[1].name} at ${scored[1].compositeScore}`
    : `${best.name} is the only candidate with score ${best.compositeScore}`;

  return {
    profiles: scored,
    recommended: best.id,
    reasoning,
  };
}
