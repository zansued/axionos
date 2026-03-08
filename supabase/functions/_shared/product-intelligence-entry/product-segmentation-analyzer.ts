/**
 * Product Segmentation Analyzer
 * Detects meaningful tenant/workspace/product divergence without triggering fragmentation.
 */

export interface SegmentData {
  scopeType: string;
  scopeId: string;
  productArea: string;
  avgFriction: number;
  avgAdoption: number;
  avgRetention: number;
  avgValue: number;
  signalCount: number;
}

export interface SegmentDivergence {
  scopeType: string;
  scopeId: string;
  productArea: string;
  divergenceScore: number;
  divergenceType: string;
  recommendation: string;
}

export function analyzeSegmentDivergence(
  segments: SegmentData[],
  globalBaseline: { avgFriction: number; avgAdoption: number; avgRetention: number; avgValue: number }
): SegmentDivergence[] {
  return segments
    .map(seg => {
      const frictionDelta = Math.abs(seg.avgFriction - globalBaseline.avgFriction);
      const adoptionDelta = Math.abs(seg.avgAdoption - globalBaseline.avgAdoption);
      const retentionDelta = Math.abs(seg.avgRetention - globalBaseline.avgRetention);
      const valueDelta = Math.abs(seg.avgValue - globalBaseline.avgValue);

      const divergenceScore = Math.round(
        (frictionDelta * 0.3 + adoptionDelta * 0.25 + retentionDelta * 0.25 + valueDelta * 0.2) * 100
      ) / 100;

      let divergenceType = 'minor';
      if (divergenceScore >= 0.5) divergenceType = 'significant';
      else if (divergenceScore >= 0.3) divergenceType = 'moderate';

      let recommendation = 'Within expected range — no action needed';
      if (divergenceScore >= 0.5) recommendation = 'Significant divergence — review for bounded specialization or friction root cause';
      else if (divergenceScore >= 0.3) recommendation = 'Moderate divergence — monitor for trend';

      return {
        scopeType: seg.scopeType,
        scopeId: seg.scopeId,
        productArea: seg.productArea,
        divergenceScore,
        divergenceType,
        recommendation,
      };
    })
    .filter(d => d.divergenceScore > 0.1)
    .sort((a, b) => b.divergenceScore - a.divergenceScore);
}
