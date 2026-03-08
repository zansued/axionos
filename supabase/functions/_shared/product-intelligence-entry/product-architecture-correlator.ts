/**
 * Product Architecture Correlator
 * Links product signals to architecture modes, stability, and technical constraints.
 */

export interface ArchCorrelationInput {
  productArea: string;
  frictionScore: number;
  adoptionScore: number;
  architectureMode?: string;
  stabilityScore?: number;
  fitnessScore?: number;
}

export interface ArchCorrelationResult {
  productArea: string;
  architectureAlignmentScore: number;
  stabilityImpact: string;
  fitnessImpact: string;
  recommendation: string;
}

export function correlateWithArchitecture(inputs: ArchCorrelationInput[]): ArchCorrelationResult[] {
  return inputs.map(input => {
    let alignment = 0.5;
    if (input.stabilityScore != null) alignment += (input.stabilityScore - 0.5) * 0.3;
    if (input.fitnessScore != null) alignment += (input.fitnessScore - 0.5) * 0.3;
    if (input.architectureMode) alignment += 0.1;
    alignment = Math.round(Math.max(0, Math.min(1, alignment)) * 100) / 100;

    const stabilityImpact = input.frictionScore >= 0.6 ? 'high friction may degrade stability' :
      input.frictionScore >= 0.3 ? 'moderate friction — monitor stability' : 'low friction impact';

    const fitnessImpact = input.adoptionScore < 0.3 ? 'low adoption may indicate architectural misfit' :
      input.adoptionScore >= 0.7 ? 'strong adoption — architecture well-aligned' : 'moderate adoption — review fit';

    let recommendation = 'Monitor product signals alongside architecture metrics';
    if (alignment < 0.4) recommendation = 'Product signals suggest architectural review needed';
    else if (alignment >= 0.7) recommendation = 'Product and architecture well-aligned — maintain current posture';

    return {
      productArea: input.productArea,
      architectureAlignmentScore: alignment,
      stabilityImpact,
      fitnessImpact,
      recommendation,
    };
  });
}
