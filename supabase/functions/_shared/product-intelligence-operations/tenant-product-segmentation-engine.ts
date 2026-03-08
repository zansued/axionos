/**
 * Tenant Product Segmentation Engine — Sprint 54
 * Distinguishes meaningful segment patterns from random divergence.
 */

export interface SegmentInput {
  scopeId: string;
  scopeType: string;
  adoptionScore: number;
  retentionScore: number;
  frictionScore: number;
  valueScore: number;
}

export interface SegmentResult {
  scopeId: string;
  scopeType: string;
  compositeScore: number;
  divergenceFromMean: number;
  isMeaningfulDivergence: boolean;
  segmentLabel: string;
}

export function analyzeSegmentation(inputs: SegmentInput[]): SegmentResult[] {
  if (inputs.length < 2) {
    return inputs.map(i => ({
      scopeId: i.scopeId, scopeType: i.scopeType,
      compositeScore: composite(i), divergenceFromMean: 0,
      isMeaningfulDivergence: false, segmentLabel: 'insufficient_data',
    }));
  }

  const composites = inputs.map(composite);
  const mean = composites.reduce((a, b) => a + b, 0) / composites.length;
  const stddev = Math.sqrt(composites.reduce((sum, c) => sum + (c - mean) ** 2, 0) / composites.length);
  const threshold = Math.max(0.1, stddev * 1.5);

  return inputs.map((input, i) => {
    const c = composites[i];
    const divergence = Math.abs(c - mean);
    const meaningful = divergence > threshold && inputs.length >= 3;

    let label: string;
    if (!meaningful) label = 'within_normal_range';
    else if (c > mean) label = 'above_average_performance';
    else label = 'below_average_performance';

    return {
      scopeId: input.scopeId, scopeType: input.scopeType,
      compositeScore: round(c), divergenceFromMean: round(divergence),
      isMeaningfulDivergence: meaningful, segmentLabel: label,
    };
  });
}

function composite(i: SegmentInput): number {
  return i.adoptionScore * 0.3 + i.retentionScore * 0.25 + (1 - i.frictionScore) * 0.25 + i.valueScore * 0.2;
}
function round(v: number): number { return Math.round(Math.max(0, Math.min(1, v)) * 100) / 100; }
