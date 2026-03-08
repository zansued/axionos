/**
 * Product Signal Quality Calibrator — Sprint 54
 * Evaluates quality, consistency, confidence, and noise of product signals over time.
 */

export interface SignalQualityInput {
  signalId: string;
  signalType: string;
  productArea?: string;
  qualityScore: number;
  confidenceScore: number;
  noisePenalty: number;
  occurrenceCount: number;
  consistencyOverTime: number;
}

export interface SignalQualityResult {
  signalId: string;
  signalType: string;
  productArea?: string;
  calibratedQualityScore: number;
  consistencyScore: number;
  noisePenaltyScore: number;
  calibratedConfidence: number;
  isDecisionGrade: boolean;
  reasoning: string;
}

export function calibrateSignalQuality(inputs: SignalQualityInput[]): SignalQualityResult[] {
  return inputs.map(input => {
    const consistency = Math.min(1, input.consistencyOverTime * (Math.min(input.occurrenceCount, 10) / 10));
    const noisePenalty = input.noisePenalty + (input.occurrenceCount < 3 ? 0.15 : 0);
    const calibratedQuality = Math.max(0, input.qualityScore * 0.6 + consistency * 0.4 - noisePenalty * 0.3);
    const calibratedConfidence = Math.max(0, Math.min(1, input.confidenceScore * 0.5 + consistency * 0.3 + calibratedQuality * 0.2));
    const isDecisionGrade = calibratedQuality >= 0.6 && calibratedConfidence >= 0.5 && noisePenalty < 0.2;

    let reasoning = '';
    if (!isDecisionGrade) {
      const reasons: string[] = [];
      if (calibratedQuality < 0.6) reasons.push('quality below threshold');
      if (calibratedConfidence < 0.5) reasons.push('confidence too low');
      if (noisePenalty >= 0.2) reasons.push('high noise penalty');
      reasoning = `Not decision-grade: ${reasons.join(', ')}`;
    } else {
      reasoning = 'Signal meets decision-grade criteria';
    }

    return {
      signalId: input.signalId,
      signalType: input.signalType,
      productArea: input.productArea,
      calibratedQualityScore: round(calibratedQuality),
      consistencyScore: round(consistency),
      noisePenaltyScore: round(Math.min(1, noisePenalty)),
      calibratedConfidence: round(calibratedConfidence),
      isDecisionGrade,
      reasoning,
    };
  });
}

function round(v: number): number {
  return Math.round(Math.max(0, Math.min(1, v)) * 100) / 100;
}
