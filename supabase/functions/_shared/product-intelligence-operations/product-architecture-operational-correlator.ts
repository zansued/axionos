/**
 * Product Architecture Operational Correlator — Sprint 54
 * Correlates product outcomes with architecture modes, fitness, and stability signals.
 */

export interface ArchOperationalInput {
  productArea: string;
  adoptionScore: number;
  retentionScore: number;
  frictionScore: number;
  valueScore: number;
  architectureMode?: string;
  stabilityScore?: number;
  fitnessScore?: number;
}

export interface ArchOperationalResult {
  productArea: string;
  architectureAlignmentScore: number;
  stabilityImpactScore: number;
  fitnessImpactScore: number;
  correlationStrength: string;
  confidence: number;
  insight: string;
}

export function correlateArchitectureOperational(inputs: ArchOperationalInput[]): ArchOperationalResult[] {
  return inputs.map(input => {
    const productComposite = input.adoptionScore * 0.3 + input.retentionScore * 0.25 +
      (1 - input.frictionScore) * 0.25 + input.valueScore * 0.2;

    let alignment = 0.5;
    let stabilityImpact = 0.5;
    let fitnessImpact = 0.5;

    if (input.stabilityScore != null) {
      stabilityImpact = input.stabilityScore;
      alignment += (input.stabilityScore - 0.5) * 0.3;
    }
    if (input.fitnessScore != null) {
      fitnessImpact = input.fitnessScore;
      alignment += (input.fitnessScore - 0.5) * 0.3;
    }
    if (input.architectureMode) alignment += 0.05;

    alignment = clamp(alignment);
    const confidence = clamp(productComposite * 0.4 + alignment * 0.3 + (input.stabilityScore != null ? 0.15 : 0) + (input.fitnessScore != null ? 0.15 : 0));

    let strength: string;
    if (Math.abs(alignment - productComposite) < 0.15) strength = 'strong';
    else if (Math.abs(alignment - productComposite) < 0.3) strength = 'moderate';
    else strength = 'weak';

    let insight: string;
    if (alignment >= 0.7 && productComposite >= 0.6) {
      insight = 'Architecture and product outcomes are well-aligned — maintain posture';
    } else if (alignment < 0.4) {
      insight = 'Low architecture alignment — product outcomes may benefit from architectural review';
    } else {
      insight = 'Moderate alignment — monitor for drift between product outcomes and architecture posture';
    }

    return {
      productArea: input.productArea,
      architectureAlignmentScore: round(alignment),
      stabilityImpactScore: round(stabilityImpact),
      fitnessImpactScore: round(fitnessImpact),
      correlationStrength: strength,
      confidence: round(confidence),
      insight,
    };
  });
}

function clamp(v: number): number { return Math.max(0, Math.min(1, v)); }
function round(v: number): number { return Math.round(clamp(v) * 100) / 100; }
