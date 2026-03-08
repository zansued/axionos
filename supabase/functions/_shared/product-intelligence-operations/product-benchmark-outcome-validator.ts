/**
 * Product Benchmark Outcome Validator — Sprint 54
 * Tracks whether product-informed operational recommendations proved useful.
 */

export interface OutcomeInput {
  id: string;
  expectedImpact: number;
  realizedImpact: number;
  usefulnessScore: number;
  falsePositive: boolean;
  driftDetected: boolean;
}

export interface OutcomeValidation {
  id: string;
  outcomeStatus: string;
  impactDelta: number;
  usefulnessScore: number;
  falsePositive: boolean;
  driftDetected: boolean;
  assessment: string;
}

export function validateBenchmarkOutcomes(inputs: OutcomeInput[]): OutcomeValidation[] {
  return inputs.map(input => {
    const delta = input.realizedImpact - input.expectedImpact;
    let status: string;

    if (input.falsePositive) {
      status = 'harmful';
    } else if (input.usefulnessScore >= 0.6 && delta >= -0.1) {
      status = 'helpful';
    } else if (input.usefulnessScore < 0.3 || delta < -0.3) {
      status = 'harmful';
    } else if (Math.abs(delta) < 0.15) {
      status = 'neutral';
    } else {
      status = 'inconclusive';
    }

    let assessment: string;
    if (status === 'helpful') assessment = 'Recommendation proved operationally useful';
    else if (status === 'harmful') assessment = input.falsePositive
      ? 'False positive — recommendation did not apply'
      : 'Recommendation had negative or no useful impact';
    else if (status === 'neutral') assessment = 'No measurable impact detected';
    else assessment = 'Insufficient evidence to determine usefulness';

    if (input.driftDetected) assessment += ' — benchmark drift detected';

    return {
      id: input.id,
      outcomeStatus: status,
      impactDelta: Math.round(delta * 100) / 100,
      usefulnessScore: input.usefulnessScore,
      falsePositive: input.falsePositive,
      driftDetected: input.driftDetected,
      assessment,
    };
  });
}
