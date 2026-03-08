/**
 * Product Profile Correlator
 * Links product signals to operating profiles, policy packs, and override contexts.
 */

export interface ProfileCorrelationInput {
  productArea: string;
  frictionScore: number;
  valueScore: number;
  profileFitScore?: number;
  profileDriftScore?: number;
  overridePressure?: number;
}

export interface ProfileCorrelationResult {
  productArea: string;
  profileAlignmentScore: number;
  driftImpact: string;
  overrideRelevance: string;
  recommendation: string;
}

export function correlateWithProfiles(inputs: ProfileCorrelationInput[]): ProfileCorrelationResult[] {
  return inputs.map(input => {
    let alignment = 0.5;
    if (input.profileFitScore != null) alignment += (input.profileFitScore - 0.5) * 0.4;
    if (input.profileDriftScore != null) alignment -= input.profileDriftScore * 0.2;
    if (input.overridePressure != null && input.overridePressure > 0.5) alignment -= 0.1;
    alignment = Math.round(Math.max(0, Math.min(1, alignment)) * 100) / 100;

    const driftImpact = (input.profileDriftScore || 0) >= 0.5
      ? 'Profile drift may amplify product friction' : 'No significant drift impact';

    const overrideRelevance = (input.overridePressure || 0) >= 0.6
      ? 'High override pressure — product signals may justify profile revision' : 'Override pressure within budget';

    let recommendation = 'Product signals are within operating profile expectations';
    if (alignment < 0.4) recommendation = 'Product friction suggests operating profile mismatch — review recommended';
    else if (input.frictionScore >= 0.6) recommendation = 'High friction despite profile alignment — investigate root cause';

    return {
      productArea: input.productArea,
      profileAlignmentScore: alignment,
      driftImpact,
      overrideRelevance,
      recommendation,
    };
  });
}
