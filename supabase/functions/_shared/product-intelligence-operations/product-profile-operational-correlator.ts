/**
 * Product Profile Operational Correlator — Sprint 54
 * Correlates product outcomes with operating profiles, policy packs, and overrides.
 */

export interface ProfileOperationalInput {
  productArea: string;
  adoptionScore: number;
  retentionScore: number;
  frictionScore: number;
  valueScore: number;
  operatingProfileId?: string;
  policyPackId?: string;
  hasOverrides?: boolean;
  profileFitScore?: number;
}

export interface ProfileOperationalResult {
  productArea: string;
  profileAlignmentScore: number;
  overrideImpactScore: number;
  correlationStrength: string;
  confidence: number;
  insight: string;
}

export function correlateProfileOperational(inputs: ProfileOperationalInput[]): ProfileOperationalResult[] {
  return inputs.map(input => {
    const productComposite = input.adoptionScore * 0.3 + input.retentionScore * 0.25 +
      (1 - input.frictionScore) * 0.25 + input.valueScore * 0.2;

    let profileAlignment = 0.5;
    if (input.profileFitScore != null) profileAlignment = input.profileFitScore;
    if (input.operatingProfileId) profileAlignment += 0.05;
    if (input.policyPackId) profileAlignment += 0.05;
    profileAlignment = clamp(profileAlignment);

    const overrideImpact = input.hasOverrides ? 0.15 : 0;
    const confidence = clamp(productComposite * 0.4 + profileAlignment * 0.4 + 0.2 - overrideImpact * 0.5);

    let strength: string;
    if (profileAlignment >= 0.7) strength = 'strong';
    else if (profileAlignment >= 0.4) strength = 'moderate';
    else strength = 'weak';

    let insight: string;
    if (profileAlignment >= 0.7 && productComposite >= 0.6) {
      insight = 'Operating profile well-aligned with product outcomes';
    } else if (profileAlignment < 0.4) {
      insight = 'Low profile alignment — consider profile review for this product area';
    } else if (input.hasOverrides) {
      insight = 'Active overrides may be masking profile-product misalignment';
    } else {
      insight = 'Moderate profile alignment — monitor correlation trends';
    }

    return {
      productArea: input.productArea,
      profileAlignmentScore: round(profileAlignment),
      overrideImpactScore: round(overrideImpact),
      correlationStrength: strength,
      confidence: round(confidence),
      insight,
    };
  });
}

function clamp(v: number): number { return Math.max(0, Math.min(1, v)); }
function round(v: number): number { return Math.round(clamp(v) * 100) / 100; }
